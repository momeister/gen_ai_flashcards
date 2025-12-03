import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import cv2
import numpy as np
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
        # Convert PDF pages to images
        pages = convert_from_path(file_path, 300)
        chunks = []

        for page_num, page in enumerate(pages):
            # Convert PIL Image to numpy array for cv2 processing
            image = cv2.cvtColor(np.array(page), cv2.COLOR_RGB2GRAY)
            
            # Apply thresholding for better OCR results
            _, image = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
            
            # Perform OCR with PSM 6 (assume a single uniform block of text)
            text = pytesseract.image_to_string(image, config='--oem 3 --psm 6')
            
            if text.strip():
                chunks.append(TextChunk(
                    text=text.strip(),
                    page_number=page_num + 1,
                    source_file=filename,
                    type="pdf_content"
                ))

        return ProcessedDocument(
            filename=filename,
            total_pages=len(pages),
            chunks=chunks
        )
    
    def _extract_image(self, file_path: str, filename: str) -> ProcessedDocument:
        # Open image and perform OCR
        try:
            # Load image with PIL
            pil_image = Image.open(file_path)
            
            # Convert to numpy array and grayscale for cv2 processing
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2GRAY)
            
            # Apply thresholding for better OCR results
            _, image = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
            
            # Perform OCR with PSM 6 (assume a single uniform block of text)
            text = pytesseract.image_to_string(image, config='--oem 3 --psm 6')

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