# [ID] Titik awal server: backup database harian, peringatan pengaturan, dan menyajikan website hasil build.
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import SessionLocal, migrate
from .models import PhotoSession, SessionStatus, utcnow
from .routers import admin, gallery
from .services import backup, drive_service

settings = get_settings()
log = logging.getLogger("uvicorn.error")


def cleanup_cache() -> None:
    """Keep image cache only for folders of sessions that are pending or recently completed."""
    cutoff = utcnow() - timedelta(days=settings.cache_retention_days)
    with SessionLocal() as db:
        keep = {
            s.drive_folder_id
            for s in db.query(PhotoSession).all()
            if s.status == SessionStatus.pending or (s.submitted_at and s.submitted_at.replace(tzinfo=cutoff.tzinfo) > cutoff)
        }
    removed = drive_service.purge_except(keep)
    if removed:
        log.info("cache cleanup: removed %d folder cache(s)", removed)


def warn_insecure_defaults() -> None:
    if settings.admin_password in {"admin123", "changeme123"}:
        log.warning("!! ADMIN_PASSWORD masih default. Ganti di backend/.env sebelum dibuka ke internet.")
    if settings.secret_key.startswith(("dev-secret", "your-super-secret")):
        log.warning("!! SECRET_KEY masih default. (Catatan: menggantinya membuat PIN sesi lama tidak berlaku.)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    backup.backup_db()
    warn_insecure_defaults()
    migrate()
    cleanup_cache()
    yield


app = FastAPI(
    title="Photo Selection Platform",
    description="Client-proofing untuk fotografer: klien memilih foto, fotografer dapat XMP.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# [ID] Header keamanan: web tidak bisa disisipkan di situs lain, hanya menjalankan skrip dari server
# sendiri (+ font Google), dan tidak diindeks mesin pencari.
CSP = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
)
SECURITY_HEADERS = {
    "Content-Security-Policy": CSP,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
}


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    for k, v in SECURITY_HEADERS.items():
        response.headers.setdefault(k, v)
    if request.url.scheme == "https":  # only over HTTPS, or browsers would refuse plain-HTTP testing
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
    return response


app.include_router(admin.router)
app.include_router(gallery.router)


@app.get("/api/health")
def health():
    """Ringkasan kesehatan server: database, Google Drive, backup terakhir, jumlah sesi aktif."""
    info: dict = {"status": "ok", "drive_mode": drive_service.mode()}
    try:
        with SessionLocal() as db:
            info["sessions_pending"] = db.query(PhotoSession).filter(PhotoSession.status == SessionStatus.pending).count()
            info["sessions_total"] = db.query(PhotoSession).count()
        info["database"] = "ok"
    except Exception as e:  # database tidak terbaca = masalah serius, tetap dilaporkan
        info["database"] = f"error: {e}"
        info["status"] = "degraded"
    if settings.database_url.startswith("sqlite:///"):
        backups = sorted((Path(settings.database_url.removeprefix("sqlite:///")).parent / "backups").glob("*.db"))
        info["last_backup"] = backups[-1].name if backups else None
        if not backups:
            info["status"] = "degraded"  # backup harian belum pernah jalan
    return info


# ---------------------------------------------------------------- production frontend
# After `npm run build`, the backend also serves the built website, so everything runs on
# one address/port (fast: a few bundled files instead of hundreds of dev-server modules).
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if (DIST / "index.html").exists():
    if (DIST / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            from fastapi import HTTPException

            raise HTTPException(404)
        f = (DIST / full_path).resolve()
        if full_path and f.is_file() and DIST.resolve() in f.parents:
            return FileResponse(f)
        # index.html must never be cached, so a new build shows up right away
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
