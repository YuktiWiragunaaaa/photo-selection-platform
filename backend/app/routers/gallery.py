import hashlib
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DbSession

from ..config import get_settings
from ..database import get_db
from ..models import PhotoSession, SelectedPhoto, SessionStatus, utcnow
from ..schemas import Branding, GalleryMeta, GalleryOut, Photo, SubmitOut, SubmitRequest, UnlockOut, UnlockRequest
from ..services import branding, drive_service

router = APIRouter(prefix="/api", tags=["gallery"])

NOTE_MAX = 300


# ---------------------------------------------------------------- pin helpers
def hash_pin(pin: str) -> str:
    return hashlib.sha256(f"{get_settings().secret_key}:{pin}".encode()).hexdigest()


def gallery_token(s: PhotoSession) -> str:
    """Stateless proof that the client unlocked this gallery (valid while the PIN is unchanged)."""
    return hmac.new(get_settings().secret_key.encode(), f"{s.slug}:{s.pin_hash}".encode(), "sha256").hexdigest()[:32]


def _session(db: DbSession, slug: str) -> PhotoSession:
    s = db.query(PhotoSession).filter(PhotoSession.slug == slug).first()
    if not s:
        raise HTTPException(404, "Galeri tidak ditemukan atau link tidak valid.")
    return s


def _expired(s: PhotoSession) -> bool:
    if not s.expires_at:
        return False
    exp = s.expires_at if s.expires_at.tzinfo else s.expires_at.replace(tzinfo=utcnow().tzinfo)
    return exp < utcnow()


def _authorize(s: PhotoSession, token: str | None) -> None:
    if _expired(s):
        raise HTTPException(410, "Link galeri ini sudah kedaluwarsa. Hubungi fotografer Anda.")
    if s.pin_hash and not (token and hmac.compare_digest(token, gallery_token(s))):
        raise HTTPException(401, "Galeri ini dilindungi PIN.")


def _img(slug: str, file_id: str, size: str, token: str | None) -> str:
    url = f"/api/gallery/{slug}/img/{file_id}?size={size}"
    return f"{url}&t={token}" if token else url


# ---------------------------------------------------------------- endpoints
@router.get("/branding/logo")
def branding_logo():
    p = branding.logo_path()
    if not p:
        raise HTTPException(404)
    return FileResponse(p, headers={"Cache-Control": "public, max-age=86400"})


@router.get("/gallery/{slug}/meta", response_model=GalleryMeta)
def gallery_meta(slug: str, db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    return GalleryMeta(client_name=s.client_name, locked=bool(s.pin_hash), expired=_expired(s), branding=branding.get(db))


@router.post("/gallery/{slug}/unlock", response_model=UnlockOut)
def unlock(slug: str, body: UnlockRequest, db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    if _expired(s):
        raise HTTPException(410, "Link galeri ini sudah kedaluwarsa.")
    if not s.pin_hash or not hmac.compare_digest(hash_pin(body.pin.strip()), s.pin_hash):
        raise HTTPException(401, "PIN salah.")
    return UnlockOut(token=gallery_token(s))


@router.get("/gallery/{slug}", response_model=GalleryOut)
def get_gallery(slug: str, db: DbSession = Depends(get_db), x_gallery_token: str | None = Header(None)):
    s = _session(db, slug)
    _authorize(s, x_gallery_token)
    try:
        photos = drive_service.list_photos(s.drive_folder_id)
    except drive_service.DriveError as e:
        raise HTTPException(502, str(e))

    tok = gallery_token(s) if s.pin_hash else None
    return GalleryOut(
        client_name=s.client_name,
        photo_limit=s.photo_limit,
        max_limit=s.hard_limit,
        status=s.status,
        photos=[
            Photo(
                file_id=p.file_id,
                filename=p.filename,
                name=p.name,
                width=p.width,
                height=p.height,
                thumb_url=_img(slug, p.file_id, "thumb", tok),
                full_url=_img(slug, p.file_id, "full", tok),
            )
            for p in photos
        ],
        selected_ids=[p.drive_file_id for p in s.selected_photos],
        notes={p.drive_file_id: p.note for p in s.selected_photos if p.note},
        branding=branding.get(db),
    )


@router.get("/gallery/{slug}/img/{file_id}")
async def get_image(slug: str, file_id: str, size: str = "thumb", t: str | None = Query(None), db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    _authorize(s, t)
    size = "full" if size == "full" else "thumb"
    try:
        data, media_type = await run_in_threadpool(drive_service.get_image, s.drive_folder_id, file_id, size)
    except drive_service.DriveError as e:
        raise HTTPException(404, str(e))
    return Response(data, media_type=media_type, headers={"Cache-Control": "private, max-age=604800, immutable"})


@router.post("/gallery/{slug}/submit", response_model=SubmitOut)
def submit(slug: str, body: SubmitRequest, db: DbSession = Depends(get_db), x_gallery_token: str | None = Header(None)):
    s = _session(db, slug)
    _authorize(s, x_gallery_token)
    if s.status == SessionStatus.completed:
        raise HTTPException(400, "Pilihan sudah dikirim sebelumnya. Galeri ini sekarang hanya bisa dilihat.")

    ids = list(dict.fromkeys(body.file_ids))  # de-dupe, keep selection order
    if len(ids) > s.hard_limit:
        raise HTTPException(400, f"Maksimal {s.hard_limit} foto, Anda memilih {len(ids)}.")

    by_id = {p.file_id: p for p in drive_service.list_photos(s.drive_folder_id)}
    if any(i not in by_id for i in ids):
        raise HTTPException(400, "Beberapa foto tidak dikenali. Muat ulang halaman dan coba lagi.")

    for idx, i in enumerate(ids):
        note = (body.notes.get(i) or "").strip()[:NOTE_MAX] or None
        s.selected_photos.append(
            SelectedPhoto(drive_file_id=i, filename=by_id[i].filename, note=note, is_extra=idx >= s.photo_limit)
        )
    s.status = SessionStatus.completed
    s.submitted_at = utcnow()
    db.commit()

    extra = max(0, len(ids) - s.photo_limit)
    msg = f"Terima kasih! {len(ids)} foto pilihan Anda sudah tersimpan."
    if extra:
        msg += f" {extra} di antaranya di luar paket."
    return SubmitOut(selected_count=len(ids), extra_count=extra, message=msg)
