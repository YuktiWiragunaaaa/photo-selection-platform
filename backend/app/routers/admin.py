from datetime import timedelta
from typing import List
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session as DbSession
import io

from ..database import get_db
from ..models import PhotoSession, SelectedPhoto, SessionStatus
from ..schemas import (
    LoginRequest, TokenResponse,
    SessionCreate, SessionOut, SessionDetailOut,
)
from ..auth import create_access_token, verify_admin_password, get_current_admin
from ..services.xmp_service import generate_zip, generate_filenames_string, generate_csv
from ..services.drive_service import validate_folder_access
from ..config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/admin", tags=["admin"])

def _build_session_out(session: PhotoSession) -> SessionOut:
    gallery_url = f"{settings.base_url.rstrip('/')}/g/{session.slug}"
    return SessionOut(
        id=session.id,
        slug=session.slug,
        client_name=session.client_name,
        drive_folder_id=session.drive_folder_id,
        photo_limit=session.photo_limit,
        status=session.status,
        created_at=session.created_at,
        submitted_at=session.submitted_at,
        notes=session.notes,
        selected_count=len(session.selected_photos),
        gallery_url=gallery_url,
    )

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """Admin login with password."""
    if not verify_admin_password(request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )
    token = create_access_token(
        data={"sub": "admin"},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=token)

@router.get("/sessions", response_model=List[SessionOut])
def list_sessions(
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """List all sessions ordered by creation date."""
    sessions = db.query(PhotoSession).order_by(PhotoSession.created_at.desc()).all()
    return [_build_session_out(s) for s in sessions]

@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Create a new photo selection session."""
    slug = secrets.token_urlsafe(10)
    session = PhotoSession(
        client_name=payload.client_name,
        drive_folder_id=payload.drive_folder_id,
        photo_limit=payload.photo_limit,
        notes=payload.notes,
        slug=slug,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _build_session_out(session)

@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: str,
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Get session details including selected photos."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    out = _build_session_out(session)
    return SessionDetailOut(
        **out.model_dump(),
        selected_photos=session.selected_photos,
    )

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Delete a session and all its selected photos."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()

@router.get("/sessions/{session_id}/export/zip")
def export_zip(
    session_id: str,
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Download a ZIP of .xmp sidecar files for all selected photos."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.completed:
        raise HTTPException(status_code=400, detail="Session is not yet completed")

    filenames = [p.filename for p in session.selected_photos]
    if not filenames:
        raise HTTPException(status_code=400, detail="No photos selected")

    zip_bytes = generate_zip(session.client_name, filenames)
    safe_name = session.client_name.replace(" ", "_").replace("/", "_")
    filename = f"{safe_name}_selections.zip"

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/sessions/{session_id}/export/filenames")
def export_filenames(
    session_id: str,
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Get comma-separated list of selected filenames."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    filenames = [p.filename for p in session.selected_photos]
    return {
        "client_name": session.client_name,
        "filenames": filenames,
        "filenames_string": generate_filenames_string(filenames),
        "count": len(filenames),
    }

@router.get("/sessions/{session_id}/export/csv")
def export_csv(
    session_id: str,
    db: DbSession = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Download selected photos as CSV file."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    filenames = [p.filename for p in session.selected_photos]
    csv_bytes = generate_csv(session.client_name, filenames)
    safe_name = session.client_name.replace(" ", "_")

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_selections.csv"'},
    )

@router.post("/validate-folder")
def validate_folder(
    payload: dict,
    _: str = Depends(get_current_admin),
):
    """Validate that a Google Drive folder ID is accessible."""
    folder_id = payload.get("folder_id", "")
    if not folder_id:
        raise HTTPException(status_code=400, detail="folder_id is required")
    accessible = validate_folder_access(folder_id)
    return {"accessible": accessible, "folder_id": folder_id}
