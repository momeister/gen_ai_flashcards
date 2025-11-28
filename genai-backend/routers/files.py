from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from typing import Optional
import shutil
import os
from models.db import get_db
from models.tables import Project as ProjectORM, File as FileORM
from services.extractor import ContentExtractor

router = APIRouter(tags=["files"])

# Upload directories
UPLOAD_DIR = "uploads"
EXTRACTED_DIR = os.path.join(UPLOAD_DIR, "extracted")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXTRACTED_DIR, exist_ok=True)

extractor = ContentExtractor()

class FileMeta(BaseModel):
    id: str
    original_filename: str
    mime_type: Optional[str]
    size: int


@router.post("/projects/{project_id}/files", response_model=List[dict])
async def upload_files(project_id: str, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """
    Upload and process files for a project
    - Stores the file on the filesystem
    - Extracts text with OCR (PDF/Image)
    - Stores extraction as JSON and Markdown
    """
    project = db.query(ProjectORM).filter(ProjectORM.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    results = []
    for f in files:
        safe_filename = f"{project_id}_{f.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
            
            size = os.path.getsize(file_path)
            file_record = FileORM(
                original_filename=f.filename,
                stored_path=file_path,
                mime_type=f.content_type,
                size=size,
                project_id=project_id
            )
            db.add(file_record)
            db.commit()
            db.refresh(file_record)
            
            # Extract text from PDF/image
            processed = extractor.process_file(file_path, f.filename)
            
            # Save as JSON
            extracted_json_path = os.path.join(EXTRACTED_DIR, f"{file_record.id}.json")
            with open(extracted_json_path, "w", encoding="utf-8") as jf:
                jf.write(processed.json())
            
            # Save as Markdown (better for LLM processing)
            extracted_md_path = os.path.join(EXTRACTED_DIR, f"{file_record.id}.md")
            md_lines = [f"# {processed.filename}\n", f"**Total Pages:** {processed.total_pages}\n\n"]
            for chunk in processed.chunks:
                md_lines.append(f"## Page {chunk.page_number}\n\n{chunk.text}\n\n---\n\n")
            with open(extracted_md_path, "w", encoding="utf-8") as mf:
                mf.writelines(md_lines)
            
            results.append({
                "file": {
                    "id": file_record.id,
                    "original_filename": file_record.original_filename,
                    "mime_type": file_record.mime_type,
                    "size": file_record.size
                },
                "processed": processed.dict()
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
            size=f.size
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
    extracted_path = os.path.join(EXTRACTED_DIR, f"{file_id}.{ext}")
    
    if not os.path.exists(extracted_path):
        raise HTTPException(status_code=404, detail="Extraction file not found")
    
    with open(extracted_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if format == "md":
        return PlainTextResponse(content=content, media_type="text/markdown")
    
    return JSONResponse(content=content)
