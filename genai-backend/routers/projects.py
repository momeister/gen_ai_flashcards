from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from typing import Optional
import os
from models.db import get_db
from models.tables import Project as ProjectORM, Flashcard as FlashcardORM

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    flashcard_scope: Optional[str] = "all_slides"  # all_slides, per_set, per_slide
    flashcard_density: Optional[int] = 5  # 1-10 scale

class Project(ProjectBase):
    id: str
    cardCount: int = 0
    description: Optional[str] = None
    flashcard_scope: str = "all_slides"
    flashcard_density: int = 5

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass


@router.get("", response_model=List[Project])
def get_projects(db: Session = Depends(get_db)):
    """Retrieve all projects"""
    items = db.query(ProjectORM).all()
    result = []
    for p in items:
        card_count = db.query(FlashcardORM).filter(FlashcardORM.project_id == p.id).count()
        result.append(Project(
            id=p.id, 
            title=p.title, 
            description=p.description, 
            cardCount=card_count,
            flashcard_scope=p.flashcard_scope or "all_slides",
            flashcard_density=p.flashcard_density or 5
        ))
    return result


@router.post("", response_model=Project)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create new project"""
    obj = ProjectORM(
        title=project.title, 
        description=project.description,
        flashcard_scope=project.flashcard_scope or "all_slides",
        flashcard_density=project.flashcard_density or 5
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return Project(
        id=obj.id, 
        title=obj.title, 
        description=obj.description, 
        cardCount=0,
        flashcard_scope=obj.flashcard_scope,
        flashcard_density=obj.flashcard_density
    )


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Retrieve single project"""
    obj = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    card_count = db.query(FlashcardORM).filter(FlashcardORM.project_id == obj.id).count()
    return Project(
        id=obj.id, 
        title=obj.title, 
        description=obj.description, 
        cardCount=card_count,
        flashcard_scope=obj.flashcard_scope or "all_slides",
        flashcard_density=obj.flashcard_density or 5
    )


@router.patch("/{project_id}", response_model=Project)
def update_project(project_id: str, updates: ProjectUpdate, db: Session = Depends(get_db)):
    """Update project (e.g. rename)"""
    obj = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    for k, v in updates.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    card_count = db.query(FlashcardORM).filter(FlashcardORM.project_id == obj.id).count()
    return Project(
        id=obj.id, 
        title=obj.title, 
        description=obj.description, 
        cardCount=card_count,
        flashcard_scope=obj.flashcard_scope or "all_slides",
        flashcard_density=obj.flashcard_density or 5
    )


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete project and remove related files from disk"""
    obj = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    # Remove files from filesystem (raw + extracted)
    try:
        upload_dir = "uploads"
        extracted_dir = os.path.join(upload_dir, "extracted")
        for f in list(obj.files or []):
            if f.stored_path and os.path.exists(f.stored_path):
                try:
                    os.remove(f.stored_path)
                except Exception as e:
                    print(f"Warning: failed to remove file {f.stored_path}: {e}")
            # Remove extracted artifacts (.md and .json if present)
            for ext in (".md", ".json"):
                extracted_path = os.path.join(extracted_dir, f"{f.id}{ext}")
                if os.path.exists(extracted_path):
                    try:
                        os.remove(extracted_path)
                    except Exception as e:
                        print(f"Warning: failed to remove extracted file {extracted_path}: {e}")
    except Exception as e:
        print(f"Warning during filesystem cleanup: {e}")
    db.delete(obj)
    db.commit()
    return {"status": "success"}
