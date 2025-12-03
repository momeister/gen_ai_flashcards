import fitz  # PyMuPDF
import easyocr
import numpy as np
from PIL import Image
from models.schemas import ProcessedDocument, TextChunk

class ContentExtractor:
    def __init__(self, languages=['de', 'en'], use_gpu=True):
        """
        Initialize the EasyOCR Reader once when the class is instantiated.
        Loading the model into memory takes time, so we don't want to do it per page.
        """
        # 'de' for German, 'en' for English. Set gpu=False if you don't have CUDA.
        self.reader = easyocr.Reader(languages, gpu=use_gpu)

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
            # 1. Try to extract embedded text directly (fastest, best for standard PDFs)
            text = page.get_text()

            # 2. If no text found (scanned doc) or very little text, use EasyOCR
            if not text.strip():
                # Render page to an image
                # matrix=fitz.Matrix(2, 2) doubles resolution (300 DPI approx) for better OCR accuracy
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                
                # Convert PyMuPDF pixmap to a NumPy array (OpenCV format) required by EasyOCR
                # This is more efficient than converting to PIL first
                img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
                
                # Perform OCR
                # detail=0 returns a list of strings
                # paragraph=True combines lines into logical blocks (great for notes)
                result_list = self.reader.readtext(img_np, detail=0, paragraph=True)
                text = " ".join(result_list)

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
            # EasyOCR can read directly from a file path
            # paragraph=True helps group the handwritten text naturally
            result_list = self.reader.readtext(file_path, detail=0, paragraph=True)
            text = " ".join(result_list)

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