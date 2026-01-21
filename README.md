# GenAI - Flashcard Learning System

Full-stack learning application with automatic PDF/Image text extraction and flashcard management.

## Quick Start

### Option A: Docker (all-in-one)
```bash
docker build -t genai-flashcards .
docker run -p 8000:8000 genai-flashcards
```
- App + API served together at **http://localhost:8000**
- API docs: **http://localhost:8000/docs**
- React build is served from `/` (static assets under `/static`)
- Upload folders are created automatically inside the container under `/app/uploads`

### Option B: Local development (frontend + backend separately)
1) Backend
```bash
cd genai-backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Backend at **http://localhost:8000** — API docs at **/docs**

2) Frontend
```bash
cd genai-frontend
npm install
npm run dev
```
Frontend dev server at **http://localhost:5173**