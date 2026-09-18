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
from .services import drive_service

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


def backup_db(keep: int = 14) -> None:
    """Daily copy of the SQLite database into backend/backups/ (keeps the last `keep` days)."""
    url = settings.database_url
    if not url.startswith("sqlite:///"):
        return
    db = Path(url.removeprefix("sqlite:///"))
    if not db.exists():
        return
    import shutil
    from datetime import date

    folder = db.parent / "backups"
    folder.mkdir(exist_ok=True)
    target = folder / f"{db.stem}-{date.today():%Y-%m-%d}.db"
    if not target.exists():
        shutil.copy2(db, target)
        log.info("database backup: %s", target.name)
    for old in sorted(folder.glob(f"{db.stem}-*.db"))[:-keep]:
        old.unlink(missing_ok=True)


def warn_insecure_defaults() -> None:
    if settings.admin_password in {"admin123", "changeme123"}:
        log.warning("!! ADMIN_PASSWORD masih default. Ganti di backend/.env sebelum dibuka ke internet.")
    if settings.secret_key.startswith(("dev-secret", "your-super-secret")):
        log.warning("!! SECRET_KEY masih default. (Catatan: menggantinya membuat PIN sesi lama tidak berlaku.)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    backup_db()
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

app.include_router(admin.router)
app.include_router(gallery.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "drive_mode": drive_service.mode()}


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
