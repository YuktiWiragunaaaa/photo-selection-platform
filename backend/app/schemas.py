from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import SessionStatus


# ---- Auth ----
class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Photos ----
class Photo(BaseModel):
    file_id: str
    filename: str
    name: str  # filename without extension
    width: int
    height: int
    thumb_url: str
    full_url: str


# ---- Admin sessions ----
class SessionCreate(BaseModel):
    client_name: str = Field(min_length=1, max_length=255)
    drive_folder_id: str = Field(min_length=1, max_length=255)
    photo_limit: int = Field(ge=1, le=1000)
    notes: str | None = None


class SelectedPhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    drive_file_id: str
    filename: str


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug: str
    client_name: str
    drive_folder_id: str
    photo_limit: int
    status: SessionStatus
    notes: str | None
    created_at: datetime
    submitted_at: datetime | None
    selected_count: int
    gallery_url: str


class SessionDetailOut(SessionOut):
    selected_photos: list[SelectedPhotoOut]


class FolderCheck(BaseModel):
    drive_folder_id: str = Field(min_length=1)


class FolderCheckOut(BaseModel):
    ok: bool
    photo_count: int
    mock: bool
    message: str


# ---- Public gallery ----
class GalleryOut(BaseModel):
    client_name: str
    photo_limit: int
    status: SessionStatus
    photos: list[Photo]
    selected_ids: list[str]


class SubmitRequest(BaseModel):
    file_ids: list[str] = Field(min_length=1)


class SubmitOut(BaseModel):
    selected_count: int
    message: str
