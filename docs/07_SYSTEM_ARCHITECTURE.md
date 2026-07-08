# System Architecture

```text
┌──────────────────────────────────────────────────┐
│                    Vercel                        │
│              React / Next.js                     │
│         https://tractor-inspection-ocr.vercel.app │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│           Render — Web Service (API)             │
│                   FastAPI                        │
│           Dockerfile: backend/Dockerfile         │
│           Start: CMD ["api"]                     │
│           Port: $PORT (Render auto-sets)         │
├─────────────────────┬────────────────────────────┤
│  /api/upload        │  POST — PDF upload + enqueue│
│  /api/batches       │  GET — list batches         │
│  /api/batches/{id}  │  CRUD — batch operations    │
│  /api/entries       │  GET/PUT — inspections      │
│  /api/analytics/*   │  Dashboard, trends, perf    │
│  /api/exports       │  XLSX/PDF exports           │
│  /health            │  Health check               │
└──────────┬──────────┴──────────────┬──────────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐   ┌──────────────────────────┐
│   PostgreSQL     │   │      Redis               │
│  Render Managed  │   │   Render Managed         │
│  DATABASE_URL    │   │   REDIS_URL              │
│  Port: 5432      │   │   Port: 6379             │
└──────────────────┘   └──────────┬───────────────┘
                                  │
                                  ▼
           ┌─────────────────────────────────────────┐
           │     Render — Background Worker          │
           │              Celery                      │
           │     Dockerfile: backend/Dockerfile       │
           │     Start: CMD ["worker"]                │
           │     Queues: default, ocr                 │
           │                                          │
           │     Pipeline per job:                    │
           │     ┌─────────────────────────────┐      │
           │     │ Image Enhancement (OpenCV)  │      │
           │     │       ↓                     │      │
           │     │ PaddleOCR (PaddleX API)     │      │
           │     │       ↓                     │      │
           │     │ Field Extraction (Regex)    │      │
           │     │       ↓                     │      │
           │     │ Confidence Scoring          │      │
           │     │       ↓                     │      │
           │     │ Duplicate Detection         │      │
           │     │       ↓                     │      │
           │     │ Results → PostgreSQL        │      │
           │     └─────────────────────────────┘      │
           └─────────────────────────────────────────┘

## Non-Negotiables
- FastAPI + PostgreSQL + Redis + Celery
- OCR runs asynchronously via Celery worker
- Upload enqueues jobs; worker processes them
- No synchronous OCR in request handlers
- Single Docker image for API and Worker (different CMD)
- Persistent disk at /app/storage for uploads/exports
