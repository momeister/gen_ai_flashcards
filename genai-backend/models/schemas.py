from pydantic import BaseModel
from typing import List, Optional

# A single section (chunk) from the document
class TextChunk(BaseModel):
    text: str
    page_number: int
    source_file: str
    type: str = "text"

# The complete result that we store or send to the LLM
class ProcessedDocument(BaseModel):
    filename: str
    total_pages: int
    chunks: List[TextChunk]
    metadata: Optional[dict] = None