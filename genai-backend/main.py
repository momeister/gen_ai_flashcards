from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.db import Base, engine
from routers import projects, flashcards, files

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GenAI Backend API",
    description="Backend für Flashcard Management mit PDF/Bild-Extraktion",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router)
app.include_router(flashcards.router)
app.include_router(files.router)


@app.get("/")
def root():
    """API Health Check"""
    return {
        "status": "online",
        "message": "GenAI Backend API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/")
def read_root():
    return {"message": "Backend is running."}
