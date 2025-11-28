# GenAI Backend

FastAPI backend for PDF/Image processing and flashcard management with a modular router architecture.

## 🏗️ Architecture

### Modular Structure
```
genau-backend/
├── main.py                 # App configuration, router registration
├── routers/
│   ├── projects.py        # Project CRUD (GET, POST, PATCH, DELETE)
│   ├── flashcards.py      # Flashcard CRUD + level updates
│   └── files.py           # File upload, extraction, download
├── models/
│   ├── db.py              # SQLAlchemy engine & session
│   └── tables.py          # ORM models (Project, File, Flashcard)
├── services/
│   └── extractor.py       # PDF/Image OCR extraction
└── uploads/
    └── extracted/         # JSON + Markdown outputs
```

## ✨ Features
- **PDF & image extraction**: PyMuPDF + Tesseract OCR
- **SQLite database**: Projects, Files, Flashcards with relationships
- **REST API**: Full CRUD across resources
- **Markdown export**: LLM‑friendly text formats
- **Inline PDF viewing**: `Content-Disposition: inline` for browser rendering
- **Automatic documentation**: Swagger UI at `/docs`

## 🚀 Installation

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Tesseract OCR (for image extraction)
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract

# Arch Linux
sudo pacman -S tesseract
```

## 🎯 Start Server

### Using Python virtual environment
```bash
cd genau-backend
python -m uvicorn main:app --reload --port 8000
```

### Or with absolute path (VS Code workspace)
```bash
cd "/home/moritz/Dokumente/TU Wien/GenAI/genau-backend"
"/home/moritz/Dokumente/TU Wien/GenAI/.venv/bin/python" -m uvicorn main:app --reload --port 8000
```

Server runs at: **http://localhost:8000**

## 📚 API Endpoints

### Projects (`/projects`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create new project |
| GET | `/projects/{id}` | Retrieve single project |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project (CASCADE) |

### Flashcards (`/projects/{id}/flashcards`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/{id}/flashcards` | All cards for a project |
| POST | `/projects/{id}/flashcards` | Create card |
| PATCH | `/projects/{id}/flashcards/{card_id}` | Edit card (question, answer, level, important) |
| DELETE | `/projects/{id}/flashcards/{card_id}` | Delete card |
| POST | `/projects/{id}/flashcards/{card_id}/level` | Update level & increment review_count |

### Files (`/projects/{id}/files`, `/files/{id}`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{id}/files` | Upload files (multi-upload) |
| GET | `/projects/{id}/files` | List all project files |
| DELETE | `/projects/{id}/files/{file_id}` | Delete file |
| GET | `/files/{id}` | Download / inline render file |
| GET | `/files/{id}/extracted?format=json\|md` | Get extracted content |

## 🔍 API Documentation

Interactive Swagger UI: **http://localhost:8000/docs**

## 🗄️ Database Schema

### Project
- `id` (UUID)
- `title` (String)
- `description` (String, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### File
- `id` (UUID)
- `original_filename` (String)
- `stored_path` (String)
- `mime_type` (String)
- `size` (Integer)
- `project_id` (FK → Project)
- `uploaded_at` (DateTime)

### Flashcard
- `id` (UUID)
- `question` (String)
- `answer` (String)
- `level` (Integer): 0=new, 1=uncertain, 2=known
- `important` (Integer): 0=normal, 1=important
- `review_count` (Integer): repetition count
- `project_id` (FK → Project)
- `created_at` (DateTime)

## 🐛 Debugging

Show debug logs:
```bash
# Follow terminal output
tail -f <terminal_output>

# Oder direkt beim Start
python -m uvicorn main:app --reload --port 8000 --log-level debug
```

## 🛠️ Development

### Add a new route
1. Create file in `routers/` (e.g. `stats.py`)
2. Define `APIRouter` with tag
3. Implement routes
4. Register in `main.py`: `app.include_router(stats.router)`

### Change database schema
1. Adjust model in `models/tables.py`
2. Remove old `app.db` (development only)
3. Restart server → auto-create tables

## 📝 Notes

- **CORS**: Enabled for `localhost:5173` (Vite) and `localhost:3000`
- **Upload limit**: No explicit custom limit (FastAPI default)
- **Extraction**: JSON for structured data, Markdown for LLM processing
- **PDF viewing**: `Content-Disposition: inline` prevents forced download
