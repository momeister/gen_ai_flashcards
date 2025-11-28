from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .db import Base

def _uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    files = relationship("File", back_populates="project", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="project", cascade="all, delete-orphan")

class File(Base):
    __tablename__ = "files"
    id = Column(String, primary_key=True, default=_uuid)
    original_filename = Column(String, index=True)
    stored_path = Column(String)
    mime_type = Column(String)
    size = Column(Integer)
    project_id = Column(String, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="files")

class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(String, primary_key=True, default=_uuid)
    question = Column(Text)
    answer = Column(Text)
    level = Column(Integer, default=0)
    important = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    project_id = Column(String, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project = relationship("Project", back_populates="flashcards")