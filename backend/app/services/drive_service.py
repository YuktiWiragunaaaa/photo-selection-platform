import os
import re
from typing import List, Optional
from googleapiclient.discovery import build
from google.oauth2 import service_account
from ..config import get_settings
from ..schemas import DrivePhotoItem

settings = get_settings()

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
]

def _get_drive_service():
    """Build and return an authenticated Google Drive service."""
    sa_file = settings.google_service_account_file
    if not os.path.exists(sa_file):
        raise FileNotFoundError(
            f"Service account file not found: {sa_file}. "
            "Please create a Google Cloud Service Account and download the JSON key."
        )
    credentials = service_account.Credentials.from_service_account_file(
        sa_file, scopes=SCOPES
    )
    return build("drive", "v3", credentials=credentials)

def _get_name_without_ext(filename: str) -> str:
    """Remove extension from filename. DSC_0012.JPG -> DSC_0012"""
    return os.path.splitext(filename)[0]

def list_photos_in_folder(folder_id: str) -> List[DrivePhotoItem]:
    """
    List all image files in a Google Drive folder.
    Returns photo metadata including thumbnail and view URLs.
    """
    try:
        service = _get_drive_service()
    except FileNotFoundError:
        # In development without service account, return mock data
        return _mock_photos()

    results = []
    page_token = None
    mime_query = " or ".join([f"mimeType='{m}'" for m in IMAGE_MIME_TYPES])
    query = f"('{folder_id}' in parents) and ({mime_query}) and trashed=false"

    while True:
        response = (
            service.files()
            .list(
                q=query,
                spaces="drive",
                fields="nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink)",
                pageToken=page_token,
                orderBy="name",
                pageSize=200,
            )
            .execute()
        )

        for f in response.get("files", []):
            file_id = f["id"]
            filename = f["name"]
            # Use Google Drive's thumbnail URL with larger size
            thumbnail = f.get("thumbnailLink", "").replace("=s220", "=s800") if f.get("thumbnailLink") else ""
            # Direct view URL
            view_url = f"https://drive.google.com/uc?export=view&id={file_id}"
            if not thumbnail:
                thumbnail = view_url

            results.append(DrivePhotoItem(
                file_id=file_id,
                filename=filename,
                name_without_ext=_get_name_without_ext(filename),
                thumbnail_url=thumbnail,
                view_url=view_url,
            ))

        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return results

def validate_folder_access(folder_id: str) -> bool:
    """Check if the service account can access the given folder."""
    try:
        service = _get_drive_service()
        service.files().get(fileId=folder_id, fields="id, name").execute()
        return True
    except Exception:
        return False

def _mock_photos() -> List[DrivePhotoItem]:
    """Return mock photo data for development without a service account."""
    photos = []
    for i in range(1, 21):
        filename = f"DSC_{i:04d}.jpg"
        photos.append(DrivePhotoItem(
            file_id=f"mock_file_id_{i}",
            filename=filename,
            name_without_ext=f"DSC_{i:04d}",
            thumbnail_url=f"https://picsum.photos/seed/{i}/800/533",
            view_url=f"https://picsum.photos/seed/{i}/1920/1280",
        ))
    return photos
