# Stage 1: Setup Backend Base
FROM python:3.11-slim AS backend-base

# Install system dependencies (Tesseract for OCR, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install
COPY genai-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY genai-backend/ ./

# Create upload directories
RUN mkdir -p uploads/lecture_notes uploads/extended_info uploads/extracted/lecture_notes uploads/extracted/extended_info


# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY genai-frontend/package.json genai-frontend/package-lock.json* ./
RUN npm install

# Copy source and build
COPY genai-frontend/ ./
RUN npm run build


# Stage 3: Final Image
FROM python:3.11-slim

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copy Python environment and app from Stage 1
COPY --from=backend-base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-base /usr/local/bin /usr/local/bin
COPY --from=backend-base /app ./

# 2. Copy Frontend Build into 'static' folder (Crucial for your new main.py)
# Note: Ensure your frontend build output dir is 'dist'. If it's 'build', change it below.
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose port 8000
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]