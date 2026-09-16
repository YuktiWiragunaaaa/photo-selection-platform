from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from ..database import get_db
from ..models import PhotoSession, SelectedPhoto, SessionStatus
from ..schemas import GalleryInfoResponse, SubmitSelectionRequest, SubmitSelectionResponse
from ..services.drive_service import list_photos_in_folder

router = APIRouter(prefix="/api/gallery", tags=["gallery"])

@router.get("/{slug}", response_model=GalleryInfoResponse)
def get_gallery(slug: str, db: DbSession = Depends(get_db)):
    """
    Public endpoint for client gallery.
    Returns session info and list of photos from Google Drive.
    """
    session = db.query(PhotoSession).filter(PhotoSession.slug == slug).first()
    if not session:
        raise HTTPException(status_code=404, detail="Gallery not found")

    # Fetch photos from Google Drive
    photos = list_photos_in_folder(session.drive_folder_id)

    # If already completed, include which photos were selected
    selected_filenames = set()
    if session.status == SessionStatus.completed:
        selected_filenames = {p.filename for p in session.selected_photos}

    # Mark selected photos (slot for future enhancement)
    for photo in photos:
        photo_dict = photo.model_dump() if hasattr(photo, 'model_dump') else photo.__dict__

    return GalleryInfoResponse(
        session_id=session.id,
        client_name=session.client_name,
        photo_limit=session.photo_limit,
        status=session.status,
        photos=photos,
        total_photos=len(photos),
    )

@router.post("/{slug}/submit", response_model=SubmitSelectionResponse)
def submit_selection(
    slug: str,
    payload: SubmitSelectionRequest,
    db: DbSession = Depends(get_db),
):
    """
    Submit photo selections for a client session.
    Locks the session after submission.
    """
    session = db.query(PhotoSession).filter(PhotoSession.slug == slug).first()
    if not session:
        raise HTTPException(status_code=404, detail="Gallery not found")

    if session.status == SessionStatus.completed:
        raise HTTPException(
            status_code=400,
            detail="This gallery has already been submitted and is now read-only."
        )

    selected = payload.selected_files

    if len(selected) == 0:
        raise HTTPException(status_code=400, detail="Please select at least 1 photo.")

    if len(selected) > session.photo_limit:
        raise HTTPException(
            status_code=400,
            detail=f"You selected {len(selected)} photos but the limit is {session.photo_limit}."
        )

    # Save selected photos
    for item in selected:
        photo = SelectedPhoto(
            session_id=session.id,
            filename=item.get("name_without_ext", item.get("filename", "")),
            drive_file_id=item.get("file_id"),
        )
        db.add(photo)

    # Mark session as completed
    session.status = SessionStatus.completed
    session.submitted_at = datetime.utcnow()

    db.commit()

    return SubmitSelectionResponse(
        success=True,
        message=f"Terima kasih! {len(selected)} foto berhasil dikirim.",
        selected_count=len(selected),
    )
