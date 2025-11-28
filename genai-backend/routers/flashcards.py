from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from models.db import get_db
from models.tables import Project as ProjectORM, Flashcard as FlashcardORM

router = APIRouter(tags=["flashcards"])

class FlashcardBase(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    level: Optional[int] = 0

class Flashcard(FlashcardBase):
    id: str
    important: int = 0
    review_count: int = 0

class FlashcardCreate(BaseModel):
    question: str
    answer: str
    level: Optional[int] = 0

class FlashcardUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    level: Optional[int] = None
    important: Optional[int] = None
    review_count: Optional[int] = None

class FlashcardLevelUpdate(BaseModel):
    level: Optional[int] = None
    review_count: Optional[int] = None


@router.get("/projects/{project_id}/flashcards", response_model=List[Flashcard])
def get_flashcards(project_id: str, db: Session = Depends(get_db)):
    """Alle Flashcards eines Projekts abrufen"""
    project = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    items = db.query(FlashcardORM).filter(FlashcardORM.project_id == project_id).all()
    return [
        Flashcard(
            id=i.id,
            question=i.question,
            answer=i.answer,
            level=i.level,
            important=i.important if i.important is not None else 0,
            review_count=i.review_count if i.review_count is not None else 0
        ) for i in items
    ]


@router.post("/projects/{project_id}/flashcards", response_model=Flashcard)
def create_flashcard(project_id: str, card: FlashcardCreate, db: Session = Depends(get_db)):
    """Neue Flashcard erstellen"""
    project = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    
    obj = FlashcardORM(
        question=card.question,
        answer=card.answer,
        level=card.level if card.level is not None else 0,
        important=0,
        review_count=0,
        project_id=project_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return Flashcard(
        id=obj.id,
        question=obj.question,
        answer=obj.answer,
        level=obj.level,
        important=obj.important if obj.important is not None else 0,
        review_count=obj.review_count if obj.review_count is not None else 0
    )


@router.patch("/projects/{project_id}/flashcards/{card_id}", response_model=Flashcard)
def update_flashcard(project_id: str, card_id: str, updates: FlashcardUpdate, db: Session = Depends(get_db)):
    """Flashcard aktualisieren (Frage, Antwort, Level, Important, Review Count)"""
    obj = db.query(FlashcardORM).filter(
        FlashcardORM.id == card_id,
        FlashcardORM.project_id == project_id
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    update_dict = updates.dict(exclude_unset=True)
    print(f"[DEBUG] PATCH /flashcards/{card_id} received payload: {update_dict}")
    
    for k, v in update_dict.items():
        setattr(obj, k, v)
    
    db.commit()
    db.refresh(obj)
    
    print(f"[DEBUG] After commit: id={obj.id}, important={obj.important}, review_count={obj.review_count}")
    
    return Flashcard(
        id=obj.id,
        question=obj.question,
        answer=obj.answer,
        level=obj.level,
        important=obj.important if obj.important is not None else 0,
        review_count=obj.review_count if obj.review_count is not None else 0
    )


@router.delete("/projects/{project_id}/flashcards/{card_id}")
def delete_flashcard(project_id: str, card_id: str, db: Session = Depends(get_db)):
    """Flashcard löschen"""
    obj = db.query(FlashcardORM).filter(
        FlashcardORM.id == card_id,
        FlashcardORM.project_id == project_id
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    db.delete(obj)
    db.commit()
    return {"status": "success"}


@router.post("/projects/{project_id}/flashcards/{card_id}/level", response_model=Flashcard)
def update_flashcard_level(project_id: str, card_id: str, level_data: FlashcardLevelUpdate, db: Session = Depends(get_db)):
    """Flashcard Level aktualisieren und Review Count erhöhen"""
    obj = db.query(FlashcardORM).filter(
        FlashcardORM.id == card_id,
        FlashcardORM.project_id == project_id
    ).first()
    
    if not obj:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    if level_data.level is not None:
        obj.level = level_data.level
    
    if level_data.review_count is not None:
        obj.review_count = level_data.review_count
    else:
        obj.review_count = (obj.review_count or 0) + 1
    
    db.commit()
    db.refresh(obj)
    
    return Flashcard(
        id=obj.id,
        question=obj.question,
        answer=obj.answer,
        level=obj.level,
        important=obj.important if obj.important is not None else 0,
        review_count=obj.review_count if obj.review_count is not None else 0
    )
