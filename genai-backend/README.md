# Genai Backend

FastAPI backend with SQLite persistence for projects, files, and flashcards.

## Features
- Projects: create, read, update (rename/description), delete
- Files: upload multiple files per project, list and delete
- Processing: PDFs and images are processed into text chunks (PyMuPDF + Tesseract OCR)
- **Automatic Flashcard Generation**: Uses LLM to generate flashcards from extracted text
  - Supports **LMStudio** (local, free)
  - Supports **OpenAI** (API key required)
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
    - Query params: `?provider=lmstudio` (default) or `?provider=openai&openai_api_key=sk-...`
  - `GET /projects/{id}/files`
  - `GET /files/{file_id}` raw file download/stream
  - `GET /files/{file_id}/extracted?format=json` extracted JSON chunks (default)
  - `GET /files/{file_id}/extracted?format=md` extracted Markdown (optimized for LLM input)
  - `DELETE /projects/{id}/files/{fileId}`
  - `GET /projects/{id}/flashcards`
  - `POST /projects/{id}/flashcards`
  - `PATCH /projects/{id}/flashcards/{cardId}`
  - `POST /projects/{id}/flashcards/{cardId}/level` body: `{ "level": 2 }`

## Flashcard Generation with Different LLM Providers

### Using LMStudio (Default)
No additional setup needed beyond LMStudio running locally on `http://172.28.112.1:1234/v1`.

**Upload files:**
```bash
curl -X POST "http://localhost:8000/projects/{project_id}/files?provider=lmstudio" \
  -F "files=@document.pdf"
```

### Using OpenAI
1. Get your API key from https://platform.openai.com/api-keys
2. Upload files with OpenAI provider:

```bash
curl -X POST "http://localhost:8000/projects/{project_id}/files?provider=openai&openai_api_key=sk-YOUR_API_KEY" \
  -F "files=@document.pdf"
```

You can also specify the model (default: `gpt-3.5-turbo`). To change it, you'd need to modify the `CardGenerator` instantiation in `routers/files.py`.

## Notes
- Database: SQLite file `app.db` in backend folder
- Uploaded files stored under `uploads/`
- Processing returns chunked text with page numbers
- Extraction JSON and **Markdown** can be used to feed downstream LLM pipelines.
- Generated flashcards are automatically saved to the project

- **Markdown format is preferred for LLMs** because it provides natural hierarchical structure and is more token-efficient than JSON.
- If OCR dependencies are missing, image/PDF OCR may be limited; the code handles missing text by attempting OCR.

## Development
- Adjust CORS origins in `main.py` if needed.
- Schema is in `models/tables.py`; DB session in `models/db.py`.
- Update `requirements.txt` if adding new libraries.
