# Tractor Inspection OCR System

## Purpose
Enterprise OCR platform that processes tractor inspection sheets, extracts data using PaddleOCR, validates results via AI pipeline, stores everything in PostgreSQL, and provides analytics and Excel exports through a dashboard.

## Architecture
- **Frontend**: Next.js (hosted on Vercel)
- **Backend**: FastAPI
- **Database**: PostgreSQL
- **Queue**: Redis
- **Workers**: Celery Worker
- **OCR**: PaddleOCR with EasyOCR fallback
- **Image Enhancement**: OpenCV (CLAHE, deskew, denoise, binarization)

## Deployment
- **Frontend**: Vercel
- **Backend API**: Render Web Service
- **Worker**: Render Background Worker
- **Database**: Render PostgreSQL
- **Queue**: Render Redis

## Pipeline
1. PDF Upload → Validation → Batch creation
2. Page splitting (PyMuPDF @ 300 DPI)
3. Image enhancement (OpenCV)
4. OCR (PaddleOCR)
5. Field extraction (Regex + Zonal)
6. Duplicate detection
7. Confidence scoring
8. Dashboard population & export generation
