from pydantic import BaseModel
from typing import List, Optional

# Ein einzelner Abschnitt (Chunk) aus dem Dokument
class TextChunk(BaseModel):
    text: str
    page_number: int
    source_file: str
    type: str = "text" 

# Das komplette Ergebnis, das wir speichern oder ans LLM senden
class ProcessedDocument(BaseModel):
    filename: str
    total_pages: int
    chunks: List[TextChunk]
    metadata: Optional[dict] = None