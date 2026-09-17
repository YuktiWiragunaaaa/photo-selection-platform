import enum
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_slug() -> str:
    return secrets.token_urlsafe(9)


class SessionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"


class PhotoSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=new_slug)
    client_name: Mapped[str] = mapped_column(String(255))
    drive_folder_id: Mapped[str] = mapped_column(String(255))
    photo_limit: Mapped[int] = mapped_column(Integer)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.pending)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    selected_photos: Mapped[list["SelectedPhoto"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="SelectedPhoto.filename"
    )


class SelectedPhoto(Base):
    __tablename__ = "selected_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    drive_file_id: Mapped[str] = mapped_column(String(255))
    filename: Mapped[str] = mapped_column(String(512))
    selected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    session: Mapped[PhotoSession] = relationship(back_populates="selected_photos")
