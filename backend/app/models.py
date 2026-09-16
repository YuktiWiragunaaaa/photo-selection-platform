import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base
import enum

class SessionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"

class PhotoSession(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String(64), unique=True, nullable=False, index=True)
    client_name = Column(String(255), nullable=False)
    drive_folder_id = Column(String(255), nullable=False)
    photo_limit = Column(Integer, nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    selected_photos = relationship("SelectedPhoto", back_populates="session", cascade="all, delete-orphan")

class SelectedPhoto(Base):
    __tablename__ = "selected_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(512), nullable=False)
    drive_file_id = Column(String(255), nullable=True)
    selected_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("PhotoSession", back_populates="selected_photos")
