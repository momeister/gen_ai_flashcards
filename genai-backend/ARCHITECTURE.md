# GenAI Backend

FastAPI backend für PDF/Bild-Verarbeitung und Flashcard-Management mit modularer Router-Architektur.

## 🏗️ Architektur

### Modulare Struktur
```
genau-backend/
├── main.py                 # App-Konfiguration, Router-Registrierung
├── routers/
│   ├── projects.py        # Projekt-CRUD (GET, POST, PATCH, DELETE)
│   ├── flashcards.py      # Flashcard-CRUD + Level-Updates
│   └── files.py           # Datei-Upload, Extraktion, Download
├── models/
│   ├── db.py              # SQLAlchemy Engine & Session
│   └── tables.py          # ORM Models (Project, File, Flashcard)
├── services/
│   └── extractor.py       # PDF/Bild OCR-Extraktion
└── uploads/
    └── extracted/         # JSON + Markdown Outputs
```

## ✨ Features
- **PDF & Bild-Extraktion**: PyMuPDF + Tesseract OCR
- **SQLite Datenbank**: Projects, Files, Flashcards mit Relationships
- **REST API**: Vollständiges CRUD für alle Ressourcen
- **Markdown-Export**: LLM-optimierte Textformate
- **Inline PDF-Anzeige**: Content-Disposition Header für Browser-Viewing
- **Auto-Dokumentation**: Swagger UI unter `/docs`

## 🚀 Installation

### 1. Abhängigkeiten installieren
```bash
pip install -r requirements.txt
```

### 2. Tesseract OCR (für Bild-Extraktion)
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract

# Arch Linux
sudo pacman -S tesseract
```

## 🎯 Server starten

### Mit Python Virtual Environment
```bash
cd genau-backend
python -m uvicorn main:app --reload --port 8000
```

### Oder mit absolutem Pfad (VS Code Workspace)
```bash
cd "/home/moritz/Dokumente/TU Wien/GenAI/genau-backend"
"/home/moritz/Dokumente/TU Wien/GenAI/.venv/bin/python" -m uvicorn main:app --reload --port 8000
```

Server läuft auf: **http://localhost:8000**

## 📚 API-Endpunkte

### Projects (`/projects`)
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/projects` | Alle Projekte abrufen |
| POST | `/projects` | Neues Projekt erstellen |
| GET | `/projects/{id}` | Einzelnes Projekt |
| PATCH | `/projects/{id}` | Projekt aktualisieren |
| DELETE | `/projects/{id}` | Projekt löschen (CASCADE) |

### Flashcards (`/projects/{id}/flashcards`)
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/projects/{id}/flashcards` | Alle Karten eines Projekts |
| POST | `/projects/{id}/flashcards` | Neue Karte erstellen |
| PATCH | `/projects/{id}/flashcards/{card_id}` | Karte bearbeiten (Frage, Antwort, Level, Important) |
| DELETE | `/projects/{id}/flashcards/{card_id}` | Karte löschen |
| POST | `/projects/{id}/flashcards/{card_id}/level` | Level-Update mit Review-Count-Increment |

### Files (`/projects/{id}/files`, `/files/{id}`)
| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/projects/{id}/files` | Dateien hochladen (Multi-Upload) |
| GET | `/projects/{id}/files` | Alle Dateien eines Projekts |
| DELETE | `/projects/{id}/files/{file_id}` | Datei löschen |
| GET | `/files/{id}` | Datei herunterladen/inline anzeigen |
| GET | `/files/{id}/extracted?format=json\|md` | Extrahierten Text abrufen |

## 🔍 API-Dokumentation

Interaktive Swagger UI: **http://localhost:8000/docs**

## 🗄️ Datenbank-Schema

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
- `level` (Integer): 0=neu, 1=nicht_sicher, 2=kann_ich
- `important` (Integer): 0=normal, 1=wichtig
- `review_count` (Integer): Anzahl der Wiederholungen
- `project_id` (FK → Project)
- `created_at` (DateTime)

## 🐛 Debugging

Debug-Logs anzeigen:
```bash
# Terminal-Output beobachten
tail -f <terminal_output>

# Oder direkt beim Start
python -m uvicorn main:app --reload --port 8000 --log-level debug
```

## 🛠️ Development

### Neue Route hinzufügen
1. Datei in `routers/` erstellen (z.B. `stats.py`)
2. APIRouter mit Tag definieren
3. Routes implementieren
4. In `main.py` registrieren: `app.include_router(stats.router)`

### Datenbank-Schema ändern
1. Model in `models/tables.py` anpassen
2. Alte `app.db` löschen (Development)
3. Server neu starten → Auto-Migration

## 📝 Notes

- **CORS**: Aktiviert für `localhost:5173` (Vite) und `localhost:3000`
- **Upload-Limit**: Kein explizites Limit gesetzt (FastAPI Standard: ~10MB)
- **Extraktion**: JSON für strukturierte Daten, Markdown für LLM-Verarbeitung
- **PDF-Viewing**: `Content-Disposition: inline` verhindert Auto-Download
