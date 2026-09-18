import re
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session as DbSession

from ..auth import create_access_token, require_admin, verify_admin_password
from ..config import get_settings
from ..database import get_db
from ..models import PhotoSession
from ..schemas import (
    Branding,
    BrandingUpdate,
    CacheStatus,
    FolderCheck,
    FolderCheckOut,
    LoginRequest,
    SessionCreate,
    SessionDetailOut,
    SessionOut,
    SessionUpdate,
    TokenResponse,
)
from ..services import branding, drive_service, xmp_service
from .gallery import gallery_token, hash_pin

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _out(s: PhotoSession) -> dict:
    cols = ("id", "slug", "client_name", "drive_folder_id", "photo_limit", "max_limit", "status", "notes", "expires_at", "created_at", "submitted_at")
    return {
        **{c: getattr(s, c) for c in cols},
        "has_pin": bool(s.pin_hash),
        "selected_count": len(s.selected_photos),
        "extra_count": sum(1 for p in s.selected_photos if p.is_extra),
        "gallery_url": f"{get_settings().frontend_url.rstrip('/')}/g/{s.slug}",
        "selected_photos": s.selected_photos,
        "gallery_token": gallery_token(s) if s.pin_hash else None,
    }


def _get_or_404(db: DbSession, session_id: str) -> PhotoSession:
    s = db.get(PhotoSession, session_id)
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    return s


def _extract_folder_id(value: str) -> str:
    """Accept a raw folder ID or a full Drive URL."""
    m = re.search(r"/folders/([A-Za-z0-9_-]+)", value)
    return m.group(1) if m else value.strip()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if not verify_admin_password(body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Password salah")
    return TokenResponse(access_token=create_access_token())


@router.get("/sessions", response_model=list[SessionOut], dependencies=[Depends(require_admin)])
def list_sessions(db: DbSession = Depends(get_db)):
    rows = db.query(PhotoSession).order_by(PhotoSession.created_at.desc()).all()
    return [_out(s) for s in rows]


@router.post("/sessions", response_model=SessionOut, status_code=201, dependencies=[Depends(require_admin)])
def create_session(body: SessionCreate, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    folder_id = _extract_folder_id(body.drive_folder_id)
    try:
        photos = drive_service.list_photos(folder_id, refresh=True)
    except drive_service.DriveError as e:
        raise HTTPException(400, str(e))
    if not photos:
        raise HTTPException(400, "Folder tidak berisi foto JPEG/PNG.")

    s = PhotoSession(
        client_name=body.client_name.strip(),
        drive_folder_id=folder_id,
        photo_limit=body.photo_limit,
        max_limit=body.max_limit if body.max_limit and body.max_limit > body.photo_limit else None,
        notes=body.notes,
        pin_hash=hash_pin(body.pin) if body.pin else None,
        expires_at=body.expires_at,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    background.add_task(drive_service.warm_cache, folder_id)
    return _out(s)


@router.post("/check-folder", response_model=FolderCheckOut, dependencies=[Depends(require_admin)])
def check_folder(body: FolderCheck):
    folder_id = _extract_folder_id(body.drive_folder_id)
    try:
        photos = drive_service.list_photos(folder_id, refresh=True)
    except drive_service.DriveError as e:
        return FolderCheckOut(ok=False, photo_count=0, mock=drive_service.is_mock(), message=str(e))
    mock = drive_service.is_mock()
    msg = f"{len(photos)} foto ditemukan" + (" (mode mock — Google Drive belum dihubungkan)" if mock else "")
    return FolderCheckOut(ok=len(photos) > 0, photo_count=len(photos), mock=mock, message=msg)


@router.get("/sessions/{session_id}", response_model=SessionDetailOut, dependencies=[Depends(require_admin)])
def get_session(session_id: str, db: DbSession = Depends(get_db)):
    return _out(_get_or_404(db, session_id))


@router.patch("/sessions/{session_id}", response_model=SessionDetailOut, dependencies=[Depends(require_admin)])
def update_session(session_id: str, body: SessionUpdate, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    if body.client_name is not None:
        s.client_name = body.client_name.strip()
    if body.photo_limit is not None:
        s.photo_limit = body.photo_limit
    if body.max_limit is not None:
        s.max_limit = body.max_limit if body.max_limit > s.photo_limit else None
    if body.notes is not None:
        s.notes = body.notes or None
    if body.pin is not None:
        if body.pin == "":
            s.pin_hash = None
        elif not (body.pin.isdigit() and 4 <= len(body.pin) <= 8):
            raise HTTPException(400, "PIN harus 4–8 digit angka.")
        else:
            s.pin_hash = hash_pin(body.pin)
    if body.clear_expiry:
        s.expires_at = None
    elif body.expires_at is not None:
        s.expires_at = body.expires_at
    db.commit()
    db.refresh(s)
    return _out(s)


@router.delete("/sessions/{session_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_session(session_id: str, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    s = _get_or_404(db, session_id)
    folder = s.drive_folder_id
    db.delete(s)
    db.commit()
    still_used = db.query(PhotoSession).filter(PhotoSession.drive_folder_id == folder).count()
    if not still_used:
        background.add_task(drive_service.purge_folder, folder)
    return Response(status_code=204)


@router.get("/sessions/{session_id}/cache", response_model=CacheStatus, dependencies=[Depends(require_admin)])
def session_cache(session_id: str, db: DbSession = Depends(get_db)):
    st = drive_service.cache_status(_get_or_404(db, session_id).drive_folder_id)
    return CacheStatus(**st, ready=st["total"] > 0 and st["thumb"] >= st["total"])


@router.post("/sessions/{session_id}/sync", response_model=SessionDetailOut, dependencies=[Depends(require_admin)])
def sync_session(session_id: str, background: BackgroundTasks, db: DbSession = Depends(get_db)):
    """Re-read the Drive folder (photos added/removed after the session was created) and warm the cache."""
    s = _get_or_404(db, session_id)
    try:
        photos = drive_service.list_photos(s.drive_folder_id, refresh=True)
    except drive_service.DriveError as e:
        raise HTTPException(400, str(e))
    if not photos:
        raise HTTPException(400, "Folder tidak berisi foto JPEG/PNG.")
    background.add_task(drive_service.warm_cache, s.drive_folder_id)
    return _out(s)


@router.post("/sessions/{session_id}/reopen", response_model=SessionOut, dependencies=[Depends(require_admin)])
def reopen_session(session_id: str, db: DbSession = Depends(get_db)):
    """Let the client pick again (clears the previous selection)."""
    s = _get_or_404(db, session_id)
    s.selected_photos.clear()
    s.status = "pending"
    s.submitted_at = None
    db.commit()
    db.refresh(s)
    return _out(s)


def _completed_or_400(db: DbSession, session_id: str) -> PhotoSession:
    s = _get_or_404(db, session_id)
    if not s.selected_photos:
        raise HTTPException(400, "Klien belum mengirim pilihan.")
    return s


def _safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_") or "client"


@router.get("/sessions/{session_id}/export/xmp", dependencies=[Depends(require_admin)])
def export_xmp(session_id: str, db: DbSession = Depends(get_db)):
    s = _completed_or_400(db, session_id)
    data = xmp_service.build_zip(s.client_name, s.selected_photos)
    fname = f"{_safe(s.client_name)}_xmp.zip"
    return Response(data, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@router.get("/sessions/{session_id}/export/filenames", dependencies=[Depends(require_admin)])
def export_filenames(session_id: str, db: DbSession = Depends(get_db)):
    s = _completed_or_400(db, session_id)
    return {"filenames": xmp_service.filenames_string([p.filename for p in s.selected_photos]), "count": len(s.selected_photos)}


@router.get("/sessions/{session_id}/export/csv", dependencies=[Depends(require_admin)])
def export_csv(session_id: str, db: DbSession = Depends(get_db)):
    s = _completed_or_400(db, session_id)
    data = xmp_service.build_csv(s.client_name, s.selected_photos)
    fname = f"{_safe(s.client_name)}_selected.csv"
    return Response(data, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{quote(fname)}"'})


# ---------------------------------------------------------------- branding
@router.get("/branding", response_model=Branding, dependencies=[Depends(require_admin)])
def get_branding(db: DbSession = Depends(get_db)):
    return branding.get(db)


@router.put("/branding", response_model=Branding, dependencies=[Depends(require_admin)])
def put_branding(body: BrandingUpdate, db: DbSession = Depends(get_db)):
    branding.set_values(db, body.model_dump())
    return branding.get(db)


@router.post("/branding/logo", response_model=Branding, dependencies=[Depends(require_admin)])
async def upload_logo(file: UploadFile = File(...), db: DbSession = Depends(get_db)):
    if file.content_type not in branding.LOGO_TYPES:
        raise HTTPException(400, "Logo harus PNG, JPG, SVG, atau WebP.")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(400, "Logo maksimal 2 MB.")
    branding.save_logo(content, file.content_type)
    return branding.get(db)


@router.delete("/branding/logo", response_model=Branding, dependencies=[Depends(require_admin)])
def delete_logo(db: DbSession = Depends(get_db)):
    branding.remove_logo()
    return branding.get(db)
