import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
from models.schemas import ProcessedDocument, TextChunk

class ContentExtractor:
    def process_file(self, file_path: str, filename: str) -> ProcessedDocument:
        """Depends on file type, process the file and extract text chunks."""
        ext = filename.split('.')[-1].lower()

        if ext == 'pdf':
            return self._extract_pdf(file_path, filename)
        elif ext in ['jpg', 'jpeg', 'png', 'webp']:
            return self._extract_image(file_path, filename)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
        
    def _extract_pdf(self, file_path: str, filename: str) -> ProcessedDocument:
        doc = fitz.open(file_path)
        chunks = []

        for page_num, page in enumerate(doc):
            # trying to extract text directly
            text = page.get_text()

            # If no text found, use OCR
            if not text.strip():
                # Render page to an image
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text = pytesseract.image_to_string(img) #lang='deu+eng'

            if text.strip():
                chunks.append(TextChunk(
                    text=text.strip(),
                    page_number=page_num + 1,
                    source_file=filename,
                    type="pdf_content"
                ))

        return ProcessedDocument(
            filename=filename,
            total_pages=len(doc),
            chunks=chunks
        )
    
    def _extract_image(self, file_path: str, filename: str) -> ProcessedDocument:
        # Open image and perform OCR
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image) #lang='deu+eng'

            chunks = [TextChunk(
                text=text.strip(),
                page_number=1,
                source_file=filename,
                type="image_ocr"
            )] 

            return ProcessedDocument(
                filename=filename,
                total_pages=1,
                chunks=chunks
            )
        except Exception as e:
            print(f"Error processing image {filename}: {e}")
            return ProcessedDocument(
                filename=filename,
                total_pages=1,
                chunks=[]
            )