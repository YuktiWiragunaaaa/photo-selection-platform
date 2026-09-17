from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session as DbSession

from ..database import get_db
from ..models import PhotoSession, SelectedPhoto, SessionStatus, utcnow
from ..schemas import GalleryOut, Photo, SubmitOut, SubmitRequest
from ..services import drive_service

router = APIRouter(prefix="/api/gallery", tags=["gallery"])


def _session(db: DbSession, slug: str) -> PhotoSession:
    s = db.query(PhotoSession).filter(PhotoSession.slug == slug).first()
    if not s:
        raise HTTPException(404, "Galeri tidak ditemukan atau link tidak valid.")
    return s


@router.get("/{slug}", response_model=GalleryOut)
def get_gallery(slug: str, db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    try:
        photos = drive_service.list_photos(s.drive_folder_id)
    except drive_service.DriveError as e:
        raise HTTPException(502, str(e))

    return GalleryOut(
        client_name=s.client_name,
        photo_limit=s.photo_limit,
        status=s.status,
        photos=[
            Photo(
                file_id=p.file_id,
                filename=p.filename,
                name=p.name,
                width=p.width,
                height=p.height,
                thumb_url=f"/api/gallery/{slug}/img/{p.file_id}?size=thumb",
                full_url=f"/api/gallery/{slug}/img/{p.file_id}?size=full",
            )
            for p in photos
        ],
        selected_ids=[p.drive_file_id for p in s.selected_photos],
    )


@router.get("/{slug}/img/{file_id}")
async def get_image(slug: str, file_id: str, size: str = "thumb", db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    size = "full" if size == "full" else "thumb"
    try:
        data, media_type = await run_in_threadpool(drive_service.get_image, s.drive_folder_id, file_id, size)
    except drive_service.DriveError as e:
        raise HTTPException(404, str(e))
    return Response(data, media_type=media_type, headers={"Cache-Control": "public, max-age=604800, immutable"})


@router.post("/{slug}/submit", response_model=SubmitOut)
def submit(slug: str, body: SubmitRequest, db: DbSession = Depends(get_db)):
    s = _session(db, slug)
    if s.status == SessionStatus.completed:
        raise HTTPException(400, "Pilihan sudah dikirim sebelumnya. Galeri ini sekarang hanya bisa dilihat.")

    ids = list(dict.fromkeys(body.file_ids))  # de-dupe, keep order
    if len(ids) > s.photo_limit:
        raise HTTPException(400, f"Maksimal {s.photo_limit} foto, Anda memilih {len(ids)}.")

    by_id = {p.file_id: p for p in drive_service.list_photos(s.drive_folder_id)}
    unknown = [i for i in ids if i not in by_id]
    if unknown:
        raise HTTPException(400, "Beberapa foto tidak dikenali. Muat ulang halaman dan coba lagi.")

    for i in ids:
        s.selected_photos.append(SelectedPhoto(drive_file_id=i, filename=by_id[i].filename))
    s.status = SessionStatus.completed
    s.submitted_at = utcnow()
    db.commit()

    return SubmitOut(selected_count=len(ids), message=f"Terima kasih! {len(ids)} foto pilihan Anda sudah tersimpan.")
