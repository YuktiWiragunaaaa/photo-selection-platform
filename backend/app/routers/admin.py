import re
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DbSession

from ..auth import create_access_token, require_admin, verify_admin_password
from ..config import get_settings
from ..database import get_db
from ..models import PhotoSession
from ..schemas import (
    FolderCheck,
    FolderCheckOut,
    LoginRequest,
    SessionCreate,
    SessionDetailOut,
    SessionOut,
    TokenResponse,
)
from ..services import drive_service, xmp_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _out(s: PhotoSession) -> dict:
    return {
        **{c: getattr(s, c) for c in ("id", "slug", "client_name", "drive_folder_id", "photo_limit", "status", "notes", "created_at", "submitted_at")},
        "selected_count": len(s.selected_photos),
        "gallery_url": f"{get_settings().frontend_url.rstrip('/')}/g/{s.slug}",
        "selected_photos": s.selected_photos,
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
        notes=body.notes,
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


@router.delete("/sessions/{session_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_session(session_id: str, db: DbSession = Depends(get_db)):
    db.delete(_get_or_404(db, session_id))
    db.commit()
    return Response(status_code=204)


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
    data = xmp_service.build_zip(s.client_name, [p.filename for p in s.selected_photos])
    fname = f"{_safe(s.client_name)}_xmp.zip"
    return Response(data, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@router.get("/sessions/{session_id}/export/filenames", dependencies=[Depends(require_admin)])
def export_filenames(session_id: str, db: DbSession = Depends(get_db)):
    s = _completed_or_400(db, session_id)
    return {"filenames": xmp_service.filenames_string([p.filename for p in s.selected_photos]), "count": len(s.selected_photos)}


@router.get("/sessions/{session_id}/export/csv", dependencies=[Depends(require_admin)])
def export_csv(session_id: str, db: DbSession = Depends(get_db)):
    s = _completed_or_400(db, session_id)
    data = xmp_service.build_csv(s.client_name, [p.filename for p in s.selected_photos])
    fname = f"{_safe(s.client_name)}_selected.csv"
    return Response(data, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{quote(fname)}"'})
