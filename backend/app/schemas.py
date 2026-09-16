from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .models import SessionStatus

# Auth
class LoginRequest(BaseModel):
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Session
class SessionCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=255)
    drive_folder_id: str = Field(..., min_length=1)
    photo_limit: int = Field(..., ge=1, le=500)
    notes: Optional[str] = None

class SelectedPhotoOut(BaseModel):
    id: int
    filename: str
    drive_file_id: Optional[str]
    selected_at: datetime

    class Config:
        from_attributes = True

class SessionOut(BaseModel):
    id: str
    slug: str
    client_name: str
    drive_folder_id: str
    photo_limit: int
    status: SessionStatus
    created_at: datetime
    submitted_at: Optional[datetime]
    notes: Optional[str]
    selected_count: int = 0
    gallery_url: str = ""

    class Config:
        from_attributes = True

class SessionDetailOut(SessionOut):
    selected_photos: List[SelectedPhotoOut] = []

# Gallery (public)
class DrivePhotoItem(BaseModel):
    file_id: str
    filename: str
    name_without_ext: str
    thumbnail_url: str
    view_url: str

class GalleryInfoResponse(BaseModel):
    session_id: str
    client_name: str
    photo_limit: int
    status: SessionStatus
    photos: List[DrivePhotoItem]
    total_photos: int

class SubmitSelectionRequest(BaseModel):
    selected_files: List[dict] = Field(..., description="List of {file_id, filename, name_without_ext}")

class SubmitSelectionResponse(BaseModel):
    success: bool
    message: str
    selected_count: int
