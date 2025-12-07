# Stage 1: Setup Backend Base
FROM python:3.11-slim AS backend-base

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY genai-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY genai-backend/ ./

RUN mkdir -p uploads/lecture_notes uploads/extended_info uploads/extracted/lecture_notes uploads/extracted/extended_info


# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY genai-frontend/package.json genai-frontend/package-lock.json* ./
RUN npm install

COPY genai-frontend/ ./
RUN npm run build


# Stage 3: Final Image
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-base /usr/local/bin /usr/local/bin
COPY --from=backend-base /app ./

COPY --from=frontend-builder /app/frontend/dist ./static

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]