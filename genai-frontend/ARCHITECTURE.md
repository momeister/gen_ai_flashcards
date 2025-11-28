# GenAI Frontend

React-Anwendung für Flashcard-Management mit PDF-Viewer und Backend-Integration.

## 🏗️ Architektur

### Modulare API-Struktur
```
src/
├── utils/
│   └── api/
│       ├── index.js        # Entry Point, Re-Exports
│       ├── base.js         # Core request(), APIError
│       ├── projects.js     # projectsAPI (CRUD)
│       ├── flashcards.js   # flashcardsAPI (CRUD + Level)
│       └── files.js        # uploadsAPI (Upload, Download, Extraktion)
├── components/
│   ├── Home.jsx           # Projekt-Übersicht (Backend-driven)
│   ├── UploadZone.jsx     # Multi-File-Upload mit Projektname
│   ├── DocumentViewer.jsx # PDF/Bild-Inline-Viewer
│   └── flashcards/
│       ├── FlashcardDeck.jsx   # Flashcard-Editor (Backend-CRUD)
│       └── FlashcardStudy.jsx  # Lernmodus mit Level-Updates
└── App.jsx                # Routing & Layout
```

## ✨ Features
- **Backend-Integration**: Vollständig auf FastAPI-Backend migriert (kein localStorage)
- **Projekt-Management**: Erstellen, Umbenennen, Löschen von Projekten
- **Multi-File-Upload**: Drag & Drop für PDFs/Bilder mit OCR-Extraktion
- **PDF-Viewer**: Inline-Anzeige ohne Download-Prompt
- **Flashcard-Editor**: Vollständiges CRUD + Important-Toggle
- **Lernmodus**: Spaced Repetition mit Level-System (neu → nicht sicher → kann ich)
- **Responsive Design**: Tailwind CSS mit Framer Motion Animationen

## 🚀 Installation

### 1. Abhängigkeiten installieren
```bash
cd genai-frontend
npm install
```

### 2. Backend starten
```bash
cd ../genau-backend
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend starten
```bash
npm run dev
```

App läuft auf: **http://localhost:5173**

## 📚 API-Konfiguration

In `src/utils/api/base.js`:
```javascript
const BASE_URL = 'http://localhost:8000';
```

Alle API-Calls nutzen die modulare Struktur:
```javascript
import { projectsAPI, flashcardsAPI, uploadsAPI } from './utils/api';

// Projekte
const projects = await projectsAPI.getAll();
await projectsAPI.create({ title: 'Neues Projekt' });
await projectsAPI.update(id, { title: 'Umbenannt' });
await projectsAPI.delete(id);

// Flashcards
const cards = await flashcardsAPI.getAll(projectId);
await flashcardsAPI.create(projectId, { question: '...', answer: '...' });
await flashcardsAPI.update(projectId, cardId, { important: 1 });
await flashcardsAPI.updateLevel(projectId, cardId, { level: 2 });

// Files
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
const results = await uploadsAPI.upload(projectId, formData);
const files = await uploadsAPI.getFiles(projectId);
const pdfUrl = uploadsAPI.rawFileUrl(fileId);
const extracted = await uploadsAPI.getExtracted(fileId, 'md');
```

## 🎨 Komponenten-Übersicht

### Home.jsx
- **Funktion**: Projekt-Übersicht mit Grid-Layout
- **Backend-Calls**: `projectsAPI.getAll()`, `projectsAPI.update()`, `projectsAPI.delete()`
- **Features**: Umbenennen-Modal, Löschen-Bestätigung, Reload-Button

### UploadZone.jsx
- **Funktion**: Projekt-Erstellung + Multi-File-Upload
- **Backend-Calls**: `projectsAPI.create()`, `uploadsAPI.upload()`
- **Features**: Drag & Drop, Fortschrittsanzeige, automatische Navigation
- **Callback**: `onCreated(projectId)` nach erfolgreichem Upload

### FlashcardDeck.jsx
- **Funktion**: Flashcard-Verwaltung mit Editor
- **Backend-Calls**: `flashcardsAPI.getAll()`, `flashcardsAPI.create()`, `flashcardsAPI.update()`, `flashcardsAPI.delete()`
- **Features**: Important-Toggle, Level-Mapping (0→neu, 1→nicht sicher, 2→kann ich), Datei-Liste

### DocumentViewer.jsx
- **Funktion**: Modal für PDF/Bild-Anzeige
- **Backend-Calls**: `uploadsAPI.rawFileUrl(fileId)`
- **Features**: Inline-Viewing mit `<object>`, Download-Button, Highlights für Bilder

### FlashcardStudy.jsx
- **Funktion**: Interaktiver Lernmodus
- **Backend-Calls**: `flashcardsAPI.getAll()`, `flashcardsAPI.updateLevel()`
- **Features**: Karten umdrehen, Level-Buttons (✗ / ? / ✓), Review-Counter, Fortschrittsanzeige

## 🗂️ Datenfluss

1. **Upload**: `UploadZone` → `uploadsAPI.upload()` → Backend verarbeitet PDF/Bild → `onCreated(projectId)` → Navigation zu `/flashcards/${projectId}`
2. **Flashcard-Erstellung**: `FlashcardDeck` → `flashcardsAPI.create()` → Backend speichert in DB → State-Update
3. **Important-Toggle**: `FlashcardDeck` → `flashcardsAPI.update(projectId, cardId, { important: newValue })` → Backend PATCH → State-Update
4. **Lernmodus**: `FlashcardStudy` → `flashcardsAPI.updateLevel(projectId, cardId, { level: newLevel })` → Backend erhöht `review_count` → State-Update
5. **PDF-Anzeige**: `DocumentViewer` → `uploadsAPI.rawFileUrl(fileId)` → Backend sendet File mit `Content-Disposition: inline` → Browser rendert inline

## 🐛 Debugging

### API-Fehler tracken
Console logs in `src/utils/api/base.js`:
```javascript
console.log('[API] Request:', url, options);
console.log('[API] Response:', data);
```

### Flashcard-Update-Logs
In `flashcards.js`:
```javascript
console.log('[API] PATCH flashcard:', { projectId, cardId, updates });
```

### Browser DevTools
1. Network-Tab: Alle HTTP-Requests mit Payload/Response
2. Console: API-Logs und Error-Messages
3. React DevTools: Component State & Props

## 🛠️ Development

### Neue API-Funktion hinzufügen
1. Entsprechendes Modul öffnen (z.B. `api/projects.js`)
2. Neue Funktion hinzufügen:
```javascript
export const projectsAPI = {
  // ... existing methods
  archive: (projectId) => request(`/projects/${projectId}/archive`, { method: 'POST' })
};
```
3. In Komponente importieren: `import { projectsAPI } from '../utils/api';`

### Neue Komponente erstellen
1. Datei in `src/components/` erstellen
2. API-Import: `import { projectsAPI, flashcardsAPI } from '../utils/api';`
3. State mit Backend synchronisieren:
```jsx
useEffect(() => {
  projectsAPI.getAll().then(setProjects);
}, []);
```

## 📝 Notes

- **CORS**: Backend muss `http://localhost:5173` in CORS-Whitelist haben
- **Error-Handling**: `APIError` Klasse wirft strukturierte Fehler mit `status`, `message`, `detail`
- **Empty Responses**: `base.js` behandelt `204 No Content` automatisch
- **File URLs**: `rawFileUrl()` generiert URL ohne API-Call (nur für `<object>`, `<img>` tags)
- **Level-Mapping**: `neu → 0`, `nicht_sicher → 1`, `kann_ich → 2` (in beide Richtungen konvertiert)

## 🚧 Known Issues

- **Important-Toggle**: 422 Error bei PATCH-Request (Backend-Validierung?)
  - Workaround: Debug-Logs aktiviert in `flashcards.js` und Backend `routers/flashcards.py`
  - Next Step: Backend-Logs prüfen nach Click auf Important-Button
