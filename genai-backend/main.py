from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from models.db import Base, engine
from routers import projects, flashcards, files

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GenAI Backend API",
    description="Backend for flashcard management with PDF/Image extraction",
    version="1.0.0"
)

# CORS configuration
# Note: When serving frontend from the same origin, CORS is less critical 
# but good to keep for local development.
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

# --- STATIC FILE SERVING ---

# 1. Mount the assets folder (JS, CSS, Images)
# This allows the HTML to load files from /assets/index-xyz.js
if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# 2. Move the API Health Check to a specific API route
# We cannot use "/" for this anymore because "/" needs to serve the HTML.
@app.get("/api/health")
def api_health():
    """API Health Check"""
    return {
        "status": "online",
        "message": "GenAI Backend API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# 3. Serve React/Vue Frontend (SPA Catch-All)
# This ensures that both "/" and paths like "/projects" return index.html
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # If the file exists in static (e.g., favicon.ico), serve it directly
    if os.path.exists(f"static/{full_path}") and os.path.isfile(f"static/{full_path}"):
        return FileResponse(f"static/{full_path}")
    
    # Otherwise, return index.html to let React handle the routing
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    
    return {"error": "Frontend not built or static files missing"}