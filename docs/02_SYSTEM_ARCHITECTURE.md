# System Architecture

## High-Level Diagram

```
[Scanner / User] → [Vercel Frontend] → [FastAPI Backend] → [PostgreSQL]
                                            ↕                 [Redis]
                                       [Celery Workers]
                                            ↕
                                    [PaddleOCR Engine]
```

## Components

### Frontend (React/Next.js)
- Hosted on Vercel
- Dashboard, Upload, Batch Review, Analytics pages
- Communicates with backend via REST API

### Backend (FastAPI)
- REST API with OpenAPI docs at /docs
- 6 route modules: upload, entries, batches, analytics, export, speech
- Background OCR via Celery tasks
- Lifespan startup with database initialization

### Database (PostgreSQL)
- 5 core tables: batches, inspections, exports, system_events, duplicate_logs
- Alembic for schema migrations
- Indexed on status, created_at, batch_no

### OCR Pipeline
1. PDF split → page images (PyMuPDF @ 300 DPI)
2. Image enhancement (OpenCV: grayscale, denoise, deskew, CLAHE, Otsu binarization)
3. OCR via PaddleOCR with EasyOCR fallback
4. Field extraction via regex patterns
5. Confidence scoring per field
6. Duplicate detection (SHA256 + exact field matching)

### Task Queue (Celery + Redis)
- async OCR processing
- Retry logic with configurable max retries
- Task routing: OCR tasks go to dedicated queue
