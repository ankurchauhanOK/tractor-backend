# Deployment Guide

## Render (Production)

### Architecture

```
[Vercel Frontend]
       ↓
[FastAPI Web Service]   ←  CMD ["api"]
       ↕                        ↕
[PostgreSQL]          [Redis]
                           ↕
[Celery Worker]      ←  CMD ["worker"]
```

### Prerequisites
- GitHub repo with code pushed
- Render account

### Step 1: Create PostgreSQL
- Render Dashboard → **New → PostgreSQL**
- Name: `tractor-postgres`
- Plan: Starter (free)
- Note: Render auto-injects `DATABASE_URL` into linked services

### Step 2: Create Redis
- Render Dashboard → **New → Redis**
- Name: `tractor-redis`
- Plan: Starter (free)
- Note: Render auto-injects `REDIS_URL` into linked services

### Step 3: Create API Web Service
- Render Dashboard → **New → Web Service**
- Connect GitHub: `ankurChauhanOK/tractor-backend`
- Branch: `main`
- **Dockerfile Path**: `backend/Dockerfile`
- **Docker Command**: `api`
- Plan: Starter
- **Add Disk** → mount at `/app/storage`, size 1 GB
- **Environment Variables** (Render auto-injects these from linked services):
  - `DATABASE_URL` ← auto from PostgreSQL
  - `REDIS_URL` ← auto from Redis
  - `UVICORN_WORKERS`: `2`
  - `LOG_LEVEL`: `info`
  - `CORS_ORIGINS`: `https://tractor-inspection-ocr.vercel.app`

### Step 4: Create Celery Worker
- Render Dashboard → **New → Background Worker**
- Connect same GitHub repo: `ankurChauhanOK/tractor-backend`
- Branch: `main`
- **Dockerfile Path**: `backend/Dockerfile`
- **Docker Command**: `worker`
- Plan: Starter
- **Environment Variables**:
  - `DATABASE_URL` ← auto from PostgreSQL
  - `REDIS_URL` ← auto from Redis
  - `WORKER_COUNT`: `4`
  - `CELERY_QUEUES`: `default,ocr`
  - `LOG_LEVEL`: `info`

### Step 5: Verify Pipeline
1. Health check: `https://{api-service}.onrender.com/health` → `200 OK`
2. Upload a PDF via frontend or curl
3. Confirm OCR processes (check batch status → `completed`)
4. Check analytics dashboard populates

### Step 6: Update Frontend
- Vercel env: `NEXT_PUBLIC_API_URL=https://{api-service}.onrender.com/api`
- Redeploy frontend on Vercel

## Environment Variables

| Variable | Required | Services | Default | Description |
|----------|----------|----------|---------|-------------|
| DATABASE_URL | Yes | api, worker | localhost:5432 | PostgreSQL connection string |
| REDIS_URL | Yes | api, worker | localhost:6379 | Redis connection string |
| PORT | Yes (Render) | api | 8000 | Server port (Render sets this) |
| UVICORN_WORKERS | No | api | 4 | Number of uvicorn workers |
| WORKER_COUNT | No | worker | 8 | Celery worker concurrency |
| CELERY_QUEUES | No | worker | default,ocr | Comma-separated queue names |
| CELERY_MAX_TASKS | No | worker | 1000 | Max tasks before worker restart |
| CELERY_MAX_MEMORY | No | worker | 500000 | Max memory per child (KB) |
| LOG_LEVEL | No | both | info | Logging level |
| CORS_ORIGINS | No | api | localhost:3000,... | Comma-separated allowed origins |
| UPLOAD_DIR | No | both | ./uploads | Upload directory |
| STORAGE_DIR | No | both | ./storage | Storage directory (use Disk mount) |
| OCR_VERSION | No | both | paddleocr-3.7.0 | OCR engine version tag |
| AI_VERSION | No | both | mahindra-ai-v1.0 | AI pipeline version tag |
| PDF_DPI | No | both | 300 | PDF rendering DPI |
| MAX_PDF_PAGES | No | both | 500 | Max pages per PDF |
| MAX_RETRY_COUNT | No | both | 3 | OCR retry count |

## Local Development

### Docker Compose (full stack)
```bash
cd backend
docker compose up -d
```
This starts PostgreSQL, Redis, API, Celery worker, and Celery beat.

### Manual
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Start PostgreSQL and Redis separately
uvicorn app.main:app --reload
# In another terminal:
celery -A app.celery_app worker -l info
```
