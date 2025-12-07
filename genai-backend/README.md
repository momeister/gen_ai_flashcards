# Genai Backend

FastAPI backend with SQLite persistence for projects, files, and flashcards.

## Features
- Projects: create, read, update (rename/description), delete
- Files: upload multiple files per project, list and delete
- Processing: PDFs and images are processed into text chunks (PyMuPDF + Tesseract OCR)
- Flashcards: CRUD, level/review_count/important updates per project
- CORS enabled for Vite dev (`http://localhost:5173`)
- Extraction files: Each uploaded file generates both JSON and **Markdown** (optimized for LLMs) under `uploads/extracted/<file_id>.json` and `.md`.

## Requirements
- Python 3.10+
- System packages for OCR if using Tesseract:
  - Ubuntu/Debian: `sudo apt install tesseract-ocr`
  - macOS (Homebrew): `brew install tesseract`

## Install
```bash
cd genai-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run
```bash
uvicorn main:app --reload --port 8000
```
- API root: `http://localhost:8000/`
- Example endpoints:
  - `GET /projects`
  - `POST /projects` body: `{ "title": "My Project", "description": "..." }`
  - `POST /projects/{id}/files` form-data: `files` (repeat for multiple)
  - `GET /projects/{id}/files`
  - `GET /files/{file_id}` raw file download/stream
  - `GET /files/{file_id}/extracted?format=json` extracted JSON chunks (default)
  - `GET /files/{file_id}/extracted?format=md` extracted Markdown (optimized for LLM input)
  - `DELETE /projects/{id}/files/{fileId}`
  - `GET /projects/{id}/flashcards`
  - `POST /projects/{id}/flashcards`
  - `PATCH /projects/{id}/flashcards/{cardId}`
  - `POST /projects/{id}/flashcards/{cardId}/level` body: `{ "level": 2 }`

## Notes
- Database: SQLite file `app.db` in backend folder
- Uploaded files stored under `uploads/`
- Processing returns chunked text with page numbers
- Extraction JSON and **Markdown** can be used to feed downstream LLM pipelines.
- **Markdown format is preferred for LLMs** because it provides natural hierarchical structure and is more token-efficient than JSON.
- If OCR dependencies are missing, image/PDF OCR may be limited; the code handles missing text by attempting OCR.

## Development
- Adjust CORS origins in `main.py` if needed.
- Schema is in `models/tables.py`; DB session in `models/db.py`.
- Update `requirements.txt` if adding new libraries.
