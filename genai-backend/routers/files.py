from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from typing import Optional
import shutil
import os
from models.db import get_db
from models.tables import Project as ProjectORM, File as FileORM, Flashcard as FlashcardORM
from services.extractor import ContentExtractor
from services.card_generator import CardGenerator

router = APIRouter(tags=["files"])

# Upload directories
UPLOAD_DIR = "uploads"
LECTURE_NOTES_DIR = os.path.join(UPLOAD_DIR, "lecture_notes")
EXTENDED_INFO_DIR = os.path.join(UPLOAD_DIR, "extended_info")
EXTRACTED_DIR = os.path.join(UPLOAD_DIR, "extracted")
EXTRACTED_LECTURE_DIR = os.path.join(EXTRACTED_DIR, "lecture_notes")
EXTRACTED_EXTENDED_DIR = os.path.join(EXTRACTED_DIR, "extended_info")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(LECTURE_NOTES_DIR, exist_ok=True)
os.makedirs(EXTENDED_INFO_DIR, exist_ok=True)
os.makedirs(EXTRACTED_DIR, exist_ok=True)
os.makedirs(EXTRACTED_LECTURE_DIR, exist_ok=True)
os.makedirs(EXTRACTED_EXTENDED_DIR, exist_ok=True)

extractor = ContentExtractor()

class FileMeta(BaseModel):
    id: str
    original_filename: str
    mime_type: Optional[str]
    size: int
    category: str = "lecture_notes"  # lecture_notes or extended_info


@router.post("/projects/{project_id}/files", response_model=List[dict])
async def upload_files(
    project_id: str,
    files: List[UploadFile] = File(...),
    provider: str = "lmstudio",
    category: str = "lecture_notes",
    openai_api_key: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Upload and process files for a project
    - Stores the file on the filesystem in category-specific subdirectory
    - Extracts text with OCR (PDF/Image)
    - Stores extraction as JSON and Markdown
    - Generates flashcards using specified LLM provider
    
    Query parameters:
    - provider: "lmstudio" (default) or "openai"
    - openai_api_key: Required if provider is "openai"
    - category: "lecture_notes" (default) or "extended_info"
    """
    project = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    category = category or "lecture_notes"
    if category not in ("lecture_notes", "extended_info"):
        raise HTTPException(status_code=400, detail="Invalid category")
    category_dir = LECTURE_NOTES_DIR if category == "lecture_notes" else EXTENDED_INFO_DIR
    
    # Initialize CardGenerator with selected provider
    try:
        if provider == "openai":
            if not openai_api_key:
                raise HTTPException(
                    status_code=400,
                    detail="openai_api_key is required when using OpenAI provider"
                )
            generator = CardGenerator(provider="openai", openai_api_key=openai_api_key)
        else:
            generator = CardGenerator(provider="lmstudio")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    results = []
    for f in files:
        safe_filename = f"{project_id}_{f.filename}"
        file_path = os.path.join(category_dir, safe_filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            
            size = os.path.getsize(file_path)
            file_record = FileORM(
                original_filename=f.filename,
                stored_path=file_path,
                mime_type=f.content_type,
                size=size,
                category=category,
                project_id=project_id
            )
            db.add(file_record)
            db.commit()
            db.refresh(file_record)
            
            # Extract text from PDF/image
            processed = extractor.process_file(file_path, f.filename)
            
            # Save as JSON (segregated by category)
            target_extracted_dir = EXTRACTED_LECTURE_DIR if file_record.category == "lecture_notes" else EXTRACTED_EXTENDED_DIR
            extracted_json_path = os.path.join(target_extracted_dir, f"{file_record.id}.json")
            with open(extracted_json_path, "w", encoding="utf-8") as jf:
                jf.write(processed.json())
            
            # Save as Markdown (better for LLM processing)
            extracted_md_path = os.path.join(target_extracted_dir, f"{file_record.id}.md")
            md_lines = [f"# {processed.filename}\n", f"**Total Pages:** {processed.total_pages}\n\n"]
            for chunk in processed.chunks:
                md_lines.append(f"## Page {chunk.page_number}\n\n{chunk.text}\n\n---\n\n")
            with open(extracted_md_path, "w", encoding="utf-8") as mf:
                mf.writelines(md_lines)
            
            # Generate flashcards automatically
            generated_cards = generator.generate_cards_from_document(
                document=processed,
                cards_per_chunk=3,
                difficulty_level=0
            )
            
            # Save generated cards to database
            cards_saved = []
            for card in generated_cards:
                flashcard = FlashcardORM(
                    question=card.question,
                    answer=card.answer,
                    level=card.level,
                    important=0,
                    review_count=0,
                    project_id=project_id
                )
                db.add(flashcard)
                db.commit()
                db.refresh(flashcard)
                cards_saved.append({
                    "id": flashcard.id,
                    "question": flashcard.question,
                    "answer": flashcard.answer,
                    "level": flashcard.level
                })
            
            results.append({
                "file": {
                    "id": file_record.id,
                    "original_filename": file_record.original_filename,
                    "mime_type": file_record.mime_type,
                    "size": file_record.size,
                    "category": file_record.category
                },
                "processed": processed.dict(),
                "generated_cards": cards_saved,
                "cards_count": len(cards_saved)
            })
        
        except Exception as e:
            print(f"Error processing {f.filename}: {e}")
            continue
    
    return results


@router.get("/projects/{project_id}/files", response_model=List[FileMeta])
def list_files(project_id: str, db: Session = Depends(get_db)):
    """List all files of a project"""
    project = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = db.query(FileORM).filter(FileORM.project_id == project_id).all()
    return [
        FileMeta(
            id=f.id,
            original_filename=f.original_filename,
            mime_type=f.mime_type,
            size=f.size,
            category=f.category or "lecture_notes"
        ) for f in files
    ]


@router.delete("/projects/{project_id}/files/{file_id}")
def delete_file(project_id: str, file_id: str, db: Session = Depends(get_db)):
    """Delete a file from a project"""
    file_obj = db.query(FileORM).filter(
        FileORM.id == file_id,
        FileORM.project_id == project_id
    ).first()
    
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        if os.path.exists(file_obj.stored_path):
            os.remove(file_obj.stored_path)
    except Exception as e:
        print(f"Error deleting file from filesystem: {e}")
    
    db.delete(file_obj)
    db.commit()
    return {"status": "success"}


@router.get("/files/{file_id}")
def get_file_raw(file_id: str, db: Session = Depends(get_db)):
    """
    Download raw file or display inline
    - PDFs are displayed inline in the browser
    - Content-Disposition: inline prevents automatic download
    """
    file_obj = db.query(FileORM).filter(FileORM.id == file_id).first()
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.exists(file_obj.stored_path):
        raise HTTPException(status_code=404, detail="Filesystem path missing")
    
    # Use inline to prevent download prompt for PDFs/images
    headers = {"Content-Disposition": f'inline; filename="{file_obj.original_filename}"'}
    return FileResponse(
        file_obj.stored_path,
        media_type=file_obj.mime_type or "application/octet-stream",
        headers=headers
    )


@router.get("/files/{file_id}/extracted")
def get_file_extracted(file_id: str, format: str = "json"):
    """
    Retrieve extracted text of a file
    - format=json: Structured JSON with pages
    - format=md: Markdown format for LLM processing
    """
    ext = "json" if format == "json" else "md"
    # Try lecture_notes first, then extended_info
    candidates = [
        os.path.join(EXTRACTED_LECTURE_DIR, f"{file_id}.{ext}"),
        os.path.join(EXTRACTED_EXTENDED_DIR, f"{file_id}.{ext}")
    ]
    extracted_path = next((p for p in candidates if os.path.exists(p)), None)
    
    if not extracted_path:
        raise HTTPException(status_code=404, detail="Extraction file not found")
    
    with open(extracted_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if format == "md":
        return PlainTextResponse(content=content, media_type="text/markdown")
    
    return JSONResponse(content=content)
