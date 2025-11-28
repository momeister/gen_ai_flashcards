from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from typing import Optional
from models.db import get_db
from models.tables import Project as ProjectORM, Flashcard as FlashcardORM

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None

class Project(ProjectBase):
    id: str
    cardCount: int = 0
    description: Optional[str] = None

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
        result.append(Project(id=p.id, title=p.title, description=p.description, cardCount=card_count))
    return result


@router.post("", response_model=Project)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create new project"""
    obj = ProjectORM(title=project.title, description=project.description)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return Project(id=obj.id, title=obj.title, description=obj.description, cardCount=0)


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Retrieve single project"""
    obj = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    card_count = db.query(FlashcardORM).filter(FlashcardORM.project_id == obj.id).count()
    return Project(id=obj.id, title=obj.title, description=obj.description, cardCount=card_count)


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
    return Project(id=obj.id, title=obj.title, description=obj.description, cardCount=card_count)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete project"""
    obj = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(obj)
    db.commit()
    return {"status": "success"}
