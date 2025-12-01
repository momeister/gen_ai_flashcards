# GenAI - Flashcard Learning System

Full-stack learning application with automatic PDF/Image text extraction and flashcard management.

## 📁 Project Structure

```
GenAI/
├── genai-frontend/          # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # UI-Komponenten
│   │   ├── utils/api/      # Backend-API-Integration (modular)
│   │   └── App.jsx
│   └── ARCHITECTURE.md     # Frontend-Dokumentation
│
├── genai-backend/           # FastAPI Backend
│   ├── routers/            # API-Routen (projects, flashcards, files)
│   ├── models/             # SQLAlchemy ORM
│   ├── services/           # PDF/Bild-Extraktion
│   └── ARCHITECTURE.md     # Backend-Dokumentation
│
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Start Backend
```bash
cd genai-backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Backend running at: **http://localhost:8000**  
API docs: **http://localhost:8000/docs**

### 2. Start Frontend
```bash
cd genai-frontend
npm install
npm run dev
```

Frontend running at: **http://localhost:5173**

## ✨ Features

### Backend (FastAPI + SQLite)
- ✅ **Modular API architecture** (Projects, Flashcards, Files routers)
- ✅ **PDF & Image text extraction** with PyMuPDF + Tesseract OCR
- ✅ **SQLite database** with cascade relationships
- ✅ **Markdown export** for LLM processing
- ✅ **Inline PDF viewing** (no forced download)
- ✅ **Auto-generated API docs** (Swagger UI)

### Frontend (React + Vite)
- ✅ **Backend integration** (fully migrated off localStorage)
- ✅ **Project management** (create, rename, delete)
- ✅ **Multi-file upload** (drag & drop + OCR extraction)
- ✅ **PDF viewer** (inline modal rendering)
- ✅ **Flashcard editor** (CRUD + important toggle)
- ✅ **Study mode** (spaced repetition level system)
- ✅ **Responsive design** (Tailwind CSS + Framer Motion)

## 🏗️ Architecture

### Backend: Modular Router Structure

**Before (280 lines monolithic main.py)**
```python
# main.py contained all routes, schemas, business logic
@app.get("/projects")
@app.post("/projects/{id}/files")
@app.patch("/projects/{id}/flashcards/{card_id}")
# ... 20+ Routen vermischt
```

**After (40 line main.py + separate routers)**
```python
# main.py - configuration only
app = FastAPI()
app.include_router(projects.router)
app.include_router(flashcards.router)
app.include_router(files.router)

# routers/projects.py - project CRUD
# routers/flashcards.py - flashcard operations
# routers/files.py - upload & extraction
```

### Frontend: Modular API Structure

**Before (Single large api.js with mixed mock/real logic)**
```javascript
// api.js - 300+ Zeilen mit Mock/Real-Logic vermischt
export const getProjects = () => { ... }
export const uploadFiles = () => { ... }
export const updateFlashcard = () => { ... }
```

**After (Separated per resource)**
```javascript
// utils/api/index.js - Entry Point
export { projectsAPI } from './projects';
export { flashcardsAPI } from './flashcards';
export { uploadsAPI } from './files';

// utils/api/projects.js
export const projectsAPI = {
  getAll: () => request('/projects'),
  create: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/projects/${id}`, { method: 'PATCH', ... }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' })
};
```

## 🔄 Data Flow

### Upload Flow
1. User selects files in `UploadZone.jsx`
2. Frontend: `uploadsAPI.upload(projectId, files)`
3. Backend: `routers/files.py::upload_files()`
  - Stores file under `uploads/`
  - Extracts text via OCR
  - Writes JSON + Markdown to `uploads/extracted/`
4. Frontend: `onCreated(projectId)` → navigate to flashcards

### Flashcard Update Flow
1. User toggles important in `FlashcardDeck.jsx`
2. Frontend: `flashcardsAPI.update(projectId, cardId, { important: 1 })`
3. Backend: `routers/flashcards.py::update_flashcard()`
  - Validates payload with Pydantic
  - Updates DB via SQLAlchemy ORM
  - Commit + refresh entity
4. Frontend: state update → UI re-renders

## 🗄️ Database Schema

```sql
-- Project (One-to-Many Files & Flashcards)
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- File (Belongs to Project)
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    original_filename TEXT,
    stored_path TEXT,
    mime_type TEXT,
    size INTEGER,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_at DATETIME
);

-- Flashcard (Belongs to Project)
CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    level INTEGER DEFAULT 0,        -- 0=new, 1=uncertain, 2=known
    important INTEGER DEFAULT 0,    -- 0=normal, 1=important
    review_count INTEGER DEFAULT 0, -- repetition count
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    created_at DATETIME
);
```

## 📚 API Endpoints

### Projects
```bash
GET    /projects              # list all projects
POST   /projects              # create project
GET    /projects/{id}         # get project
PATCH  /projects/{id}         # update project
DELETE /projects/{id}         # delete project (CASCADE)
```

### Flashcards
```bash
GET    /projects/{id}/flashcards                   # list cards
POST   /projects/{id}/flashcards                   # create card
PATCH  /projects/{id}/flashcards/{card_id}         # update card
DELETE /projects/{id}/flashcards/{card_id}         # delete card
POST   /projects/{id}/flashcards/{card_id}/level   # level update
```

### Files
```bash
POST   /projects/{id}/files              # upload (multi-file)
GET    /projects/{id}/files              # list files
DELETE /projects/{id}/files/{file_id}    # delete file
GET    /files/{id}                       # view/download file
GET    /files/{id}/extracted?format=md   # extracted text
```

## 🐛 Debugging

### Backend logs
```bash
cd genau-backend
python -m uvicorn main:app --reload --port 8000 --log-level debug
```

### Frontend DevTools
1. **Network-Tab**: HTTP-Requests mit Payload/Response
2. **Console**: API-Logs (`[API] Request:`, `[API] PATCH flashcard:`)
3. **React DevTools**: Component State & Props

### Test API directly
```bash
# Health Check
curl http://localhost:8000/

# List projects
curl http://localhost:8000/projects

# Test flashcard update
curl -X PATCH http://localhost:8000/projects/{id}/flashcards/{card_id} \
  -H "Content-Type: application/json" \
  -d '{"important": 1}'
```

## 📝 Development History

### Phase 1: Backend Integration (✅ Completed)
- ✅ API connectivity frontend/backend
- ✅ SQLite database (SQLAlchemy)
- ✅ Migration from localStorage to backend persistence
- ✅ PDF upload + extraction

### Phase 2: UI Improvements (✅ Completed)
- ✅ Upload modal with project name
- ✅ Inline PDF viewing (no auto-download)
- ✅ Auto navigation post-upload
- ✅ Important & review_count fields

### Phase 3: Code Organization (✅ Completed)
- ✅ Backend router modularization (3 routers)
- ✅ Frontend API modularization (4 modules)
- ✅ Documentation (ARCHITECTURE.md both sides)

### Phase 4: Bug Fixes (🔄 In Progress)
- 🔄 Fix 422 error on important toggle
- ⏳ Perform end-to-end tests
- ⏳ Performance optimizations

## 🛠️ Tech Stack

### Backend
- **FastAPI** - web framework
- **SQLAlchemy** - ORM for SQLite
- **PyMuPDF** - PDF text extraction
- **Tesseract** - OCR for images
- **Pydantic** - validation

### Frontend
- **React 18** - UI framework
- **Vite** - build tool
- **Tailwind CSS** - utility-first styling
- **Framer Motion** - animations
- **React Router** - routing

## 📖 Further Documentation

- [Backend architecture](./genai-backend/ARCHITECTURE.md)
- [Frontend architecture](./genai-frontend/ARCHITECTURE.md)
- [API documentation](http://localhost:8000/docs) (server must be running)

## 🤝 Contributions

Project developed with GitHub Copilot & Claude Sonnet 4.5.

## 📄 License

Private academic project (TU Wien).
