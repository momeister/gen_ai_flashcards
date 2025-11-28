# GenAI - Flashcard Learning System

Full-Stack-Anwendung für intelligentes Lernen mit automatischer PDF/Bild-Extraktion und Flashcard-Management.

## 📁 Projekt-Struktur

```
GenAI/
├── genai-frontend/          # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # UI-Komponenten
│   │   ├── utils/api/      # Backend-API-Integration (modular)
│   │   └── App.jsx
│   └── ARCHITECTURE.md     # Frontend-Dokumentation
│
├── genau-backend/           # FastAPI Backend
│   ├── routers/            # API-Routen (projects, flashcards, files)
│   ├── models/             # SQLAlchemy ORM
│   ├── services/           # PDF/Bild-Extraktion
│   └── ARCHITECTURE.md     # Backend-Dokumentation
│
└── README.md               # Diese Datei
```

## 🚀 Quick Start

### 1. Backend starten
```bash
cd genau-backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Backend läuft auf: **http://localhost:8000**  
API-Dokumentation: **http://localhost:8000/docs**

### 2. Frontend starten
```bash
cd genai-frontend
npm install
npm run dev
```

Frontend läuft auf: **http://localhost:5173**

## ✨ Features

### Backend (FastAPI + SQLite)
- ✅ **Modulare API-Architektur** (Projects, Flashcards, Files in separaten Routers)
- ✅ **PDF & Bild-Extraktion** mit PyMuPDF + Tesseract OCR
- ✅ **SQLite Datenbank** mit Cascade-Delete-Relationships
- ✅ **Markdown-Export** für LLM-Verarbeitung
- ✅ **Inline PDF-Viewing** ohne Auto-Download
- ✅ **Auto-Generated API Docs** (Swagger UI)

### Frontend (React + Vite)
- ✅ **Backend-Integration** (vollständig auf FastAPI migriert)
- ✅ **Projekt-Management** (Erstellen, Umbenennen, Löschen)
- ✅ **Multi-File-Upload** (Drag & Drop mit OCR-Extraktion)
- ✅ **PDF-Viewer** (Inline-Anzeige im Modal)
- ✅ **Flashcard-Editor** (CRUD + Important-Toggle)
- ✅ **Lernmodus** (Spaced Repetition mit Level-System)
- ✅ **Responsive Design** (Tailwind CSS + Framer Motion)

## 🏗️ Architektur

### Backend: Modulare Router-Struktur

**Vorher (280 Zeilen monolithische main.py)**
```python
# main.py hatte alle Routes, Schemas, Business Logic
@app.get("/projects")
@app.post("/projects/{id}/files")
@app.patch("/projects/{id}/flashcards/{card_id}")
# ... 20+ Routen vermischt
```

**Nachher (40 Zeilen main.py + separate Router)**
```python
# main.py - Nur Konfiguration
app = FastAPI()
app.include_router(projects.router)
app.include_router(flashcards.router)
app.include_router(files.router)

# routers/projects.py - Projekt-CRUD
# routers/flashcards.py - Flashcard-Operationen
# routers/files.py - Upload & Extraktion
```

### Frontend: Modulare API-Struktur

**Vorher (Eine große api.js mit Mock-Mode)**
```javascript
// api.js - 300+ Zeilen mit Mock/Real-Logic vermischt
export const getProjects = () => { ... }
export const uploadFiles = () => { ... }
export const updateFlashcard = () => { ... }
```

**Nachher (Separate Module nach Ressourcen)**
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

## 🔄 Datenfluss

### Upload-Flow
1. User wählt Dateien in `UploadZone.jsx`
2. Frontend: `uploadsAPI.upload(projectId, formData)`
3. Backend: `routers/files.py::upload_files()`
   - Speichert Datei in `uploads/`
   - Extrahiert Text mit OCR
   - Speichert JSON + Markdown in `uploads/extracted/`
4. Frontend: `onCreated(projectId)` → Navigation zu Flashcards

### Flashcard-Update-Flow
1. User klickt Important-Toggle in `FlashcardDeck.jsx`
2. Frontend: `flashcardsAPI.update(projectId, cardId, { important: 1 })`
3. Backend: `routers/flashcards.py::update_flashcard()`
   - Validiert Request-Body mit Pydantic
   - Updated DB via SQLAlchemy ORM
   - Commit + Refresh
4. Frontend: State-Update → UI re-renders

## 🗄️ Datenbank-Schema

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
    level INTEGER DEFAULT 0,        -- 0=neu, 1=nicht_sicher, 2=kann_ich
    important INTEGER DEFAULT 0,    -- 0=normal, 1=wichtig
    review_count INTEGER DEFAULT 0, -- Anzahl Wiederholungen
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    created_at DATETIME
);
```

## 📚 API-Endpunkte

### Projects
```bash
GET    /projects              # Alle Projekte
POST   /projects              # Neues Projekt
GET    /projects/{id}         # Einzelnes Projekt
PATCH  /projects/{id}         # Projekt aktualisieren
DELETE /projects/{id}         # Projekt löschen (CASCADE)
```

### Flashcards
```bash
GET    /projects/{id}/flashcards                   # Alle Karten
POST   /projects/{id}/flashcards                   # Neue Karte
PATCH  /projects/{id}/flashcards/{card_id}         # Karte bearbeiten
DELETE /projects/{id}/flashcards/{card_id}         # Karte löschen
POST   /projects/{id}/flashcards/{card_id}/level   # Level-Update
```

### Files
```bash
POST   /projects/{id}/files              # Upload (Multi-File)
GET    /projects/{id}/files              # Dateien auflisten
DELETE /projects/{id}/files/{file_id}    # Datei löschen
GET    /files/{id}                       # Datei herunterladen/anzeigen
GET    /files/{id}/extracted?format=md   # Extrahierten Text
```

## 🐛 Debugging

### Backend-Logs prüfen
```bash
cd genau-backend
python -m uvicorn main:app --reload --port 8000 --log-level debug
```

### Frontend DevTools
1. **Network-Tab**: HTTP-Requests mit Payload/Response
2. **Console**: API-Logs (`[API] Request:`, `[API] PATCH flashcard:`)
3. **React DevTools**: Component State & Props

### API direkt testen
```bash
# Health Check
curl http://localhost:8000/

# Projekte abrufen
curl http://localhost:8000/projects

# Flashcard-Update testen
curl -X PATCH http://localhost:8000/projects/{id}/flashcards/{card_id} \
  -H "Content-Type: application/json" \
  -d '{"important": 1}'
```

## 📝 Entwicklungshistorie

### Phase 1: Backend-Integration (✅ Abgeschlossen)
- ✅ API-Verbindung zwischen Frontend/Backend
- ✅ SQLite-Datenbank mit SQLAlchemy
- ✅ Migration von localStorage zu Backend
- ✅ PDF-Upload mit Extraktion

### Phase 2: UI-Verbesserungen (✅ Abgeschlossen)
- ✅ Upload-Modal mit Projektname
- ✅ PDF Inline-Viewing (ohne Download)
- ✅ Auto-Navigation nach Upload
- ✅ Important & Review-Count Felder

### Phase 3: Code-Organisation (✅ Abgeschlossen)
- ✅ Backend: Router-Modularisierung (3 separate Router)
- ✅ Frontend: API-Modularisierung (4 separate Module)
- ✅ Dokumentation (ARCHITECTURE.md für beide Seiten)

### Phase 4: Bug-Fixes (🔄 In Arbeit)
- 🔄 422 Error bei Important-Toggle beheben
- ⏳ End-to-End-Tests durchführen
- ⏳ Performance-Optimierungen

## 🛠️ Technologie-Stack

### Backend
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - ORM für SQLite
- **PyMuPDF** - PDF-Text-Extraktion
- **Tesseract** - OCR für Bilder
- **Pydantic** - Schema-Validierung

### Frontend
- **React 18** - UI-Framework
- **Vite** - Build-Tool
- **Tailwind CSS** - Utility-First CSS
- **Framer Motion** - Animationen
- **React Router** - Routing

## 📖 Weitere Dokumentation

- [Backend-Architektur](./genau-backend/ARCHITECTURE.md)
- [Frontend-Architektur](./genai-frontend/ARCHITECTURE.md)
- [API-Dokumentation](http://localhost:8000/docs) (Server muss laufen)

## 🤝 Beiträge

Projekt entwickelt mit GitHub Copilot & Claude Sonnet 4.5.

## 📄 Lizenz

Privates Projekt für Studium (TU Wien).
