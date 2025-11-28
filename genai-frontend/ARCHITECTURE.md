# GenAI Frontend

React application for flashcard management with PDF viewer and backend integration.

## 🏗️ Architecture

### Modular API Structure
```
src/
├── utils/
│   └── api/
│       ├── index.js        # Entry point, re-exports
│       ├── base.js         # Core request(), APIError
│       ├── projects.js     # projectsAPI (CRUD)
│       ├── flashcards.js   # flashcardsAPI (CRUD + level)
│       └── files.js        # uploadsAPI (upload, download, extraction)
├── components/
│   ├── Home.jsx           # Project overview (backend-driven)
│   ├── UploadZone.jsx     # Multi-file upload with project naming
│   ├── DocumentViewer.jsx # PDF/Image inline viewer
│   └── flashcards/
│       ├── FlashcardDeck.jsx   # Flashcard editor (backend CRUD)
│       └── FlashcardStudy.jsx  # Study mode with level updates
└── App.jsx                # Routing & layout
```

## ✨ Features
- **Backend integration**: Fully migrated to FastAPI (no localStorage business logic)
- **Project management**: Create, rename, delete projects
- **Multi-file upload**: Drag & drop PDFs/images with OCR extraction
- **PDF viewer**: Inline rendering (no forced download prompt)
- **Flashcard editor**: Full CRUD + important toggle
- **Study mode**: Spaced repetition level system (new → uncertain → known)
- **Responsive design**: Tailwind CSS + Framer Motion animations

## 🚀 Installation

### 1. Install dependencies
```bash
cd genai-frontend
npm install
```

### 2. Start backend
```bash
cd ../genau-backend
python -m uvicorn main:app --reload --port 8000
```

### 3. Start frontend
```bash
npm run dev
```

App runs at: **http://localhost:5173**

## 📚 API Configuration

In `src/utils/api/base.js`:
```javascript
const BASE_URL = 'http://localhost:8000';
```

All API calls use the modular structure:
```javascript
import { projectsAPI, flashcardsAPI, uploadsAPI } from './utils/api';

// Projects
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

## 🎨 Component Overview

### Home.jsx
- **Purpose**: Project overview grid
- **Backend calls**: `projectsAPI.getAll()`, `projectsAPI.update()`, `projectsAPI.delete()`
- **Features**: Rename prompt, delete confirmation, reload button

### UploadZone.jsx
- **Purpose**: Project creation + multi-file upload
- **Backend calls**: `projectsAPI.create()`, `uploadsAPI.upload()`
- **Features**: Drag & drop, progress feedback, automatic navigation
- **Callback**: `onCreated(projectId)` after successful upload

### FlashcardDeck.jsx
- **Purpose**: Flashcard management + editor modal
- **Backend calls**: `flashcardsAPI.getByProject()`, `flashcardsAPI.create()`, `flashcardsAPI.update()`, `flashcardsAPI.delete()`
- **Features**: Important toggle, level mapping (0→new, 1→uncertain, 2→known), file list

### DocumentViewer.jsx
- **Purpose**: Modal for PDF/image viewing
- **Backend calls**: `uploadsAPI.rawFileUrl(fileId)`
- **Features**: Inline `<object>` PDF rendering, download button, image highlight rectangles

### FlashcardStudy.jsx
- **Purpose**: Interactive study session
- **Backend calls**: `flashcardsAPI.getByProject()`, `flashcardsAPI.updateLevel()`
- **Features**: Flip cards, level buttons (✗ / ? / ✓), review counter, progress bar

## 🗂️ Data Flow

1. **Upload**: `UploadZone` → `uploadsAPI.upload()` → backend extracts content → `onCreated(projectId)` → navigate to `/flashcards/${projectId}`
2. **Create flashcard**: `FlashcardDeck` → `flashcardsAPI.create()` → DB persist → state refresh
3. **Important toggle**: `FlashcardDeck` → `flashcardsAPI.update(projectId, cardId, { important })` → backend PATCH → state refresh
4. **Study level update**: `FlashcardStudy` → `flashcardsAPI.updateLevel()` → backend increments `review_count` → state refresh
5. **PDF view**: `DocumentViewer` → `uploadsAPI.rawFileUrl(fileId)` → backend serves with `Content-Disposition: inline` → browser renders

## 🐛 Debugging

### Track API errors
Console logs in `src/utils/api/base.js`:
```javascript
console.log('[API] Request:', url, options);
console.log('[API] Response:', data);
```

### Flashcard update logs
In `flashcards.js`:
```javascript
console.log('[API] PATCH flashcard:', { projectId, cardId, updates });
```

### Browser DevTools
1. Network-Tab: Alle HTTP-Requests mit Payload/Response
2. Console: API-Logs und Error-Messages
3. React DevTools: Component State & Props

## 🛠️ Development

### Add a new API function
1. Open the module (e.g. `api/projects.js`)
2. Add new function:
```javascript
export const projectsAPI = {
  // ... existing methods
  archive: (projectId) => request(`/projects/${projectId}/archive`, { method: 'POST' })
};
```
3. Import in component: `import { projectsAPI } from '../utils/api';`

### Create a new component
1. Create file in `src/components/`
2. Import API: `import { projectsAPI, flashcardsAPI } from '../utils/api';`
3. Sync state with backend:
```jsx
useEffect(() => {
  projectsAPI.getAll().then(setProjects);
}, []);
```

## 📝 Notes

- **CORS**: Backend must allow `http://localhost:5173`
- **Error handling**: `APIError` carries `status`, `message`, `data`
- **Empty responses**: `base.js` gracefully handles 204 / missing body
- **File URLs**: `rawFileUrl()` builds direct URL (for `<object>`, `<img>`)
- **Level mapping**: `new → 0`, `uncertain → 1`, `known → 2` (convert both ways)

## 🚧 Known Issues

- **Important toggle**: 422 error on PATCH (backend validation?)
  - Workaround: Debug logs enabled in `flashcards.js` & backend `routers/flashcards.py`
  - Next step: Inspect backend logs after clicking important button
