# Deployment Guide

## Render (Production)

### Prerequisites
- GitHub repo with code pushed
- Render account

### Steps

1. **Create PostgreSQL Database**
   - Render Dashboard → New → PostgreSQL
   - Note the `DATABASE_URL` (auto-set as env var)

2. **Create Redis** (optional, for Celery)
   - Render Dashboard → New → Redis
   - Note the `REDIS_URL`

3. **Create Web Service**
   - Render Dashboard → New → Web Service
   - Connect GitHub repo: `ankurChauhanOK/tractor-backend`
   - **Root Directory**: `backend/`
   - **Runtime**: Docker
   - **Branch**: `main`

4. **Add Persistent Disk**
   - In the Web Service → Disks → Add Disk
   - Mount path: `/app/storage`
   - Size: 1 GB+

5. **Add Environment Variables**
   - `UVICORN_WORKERS`: `4`
   - `LOG_LEVEL`: `info`
   - `PYTHONUNBUFFERED`: `1` (set in Dockerfile)
   - `PYTHONDONTWRITEBYTECODE`: `1` (set in Dockerfile)

6. **Deploy**
   - Click "Create Web Service"
   - Render auto-deploys from GitHub on push

7. **Update Frontend**
   - Set Vercel env: `NEXT_PUBLIC_API_URL=https://{render-app-url}/api`
   - Redeploy frontend on Vercel

8. **Update CORS**
   - Add Render URL to `backend/app/main.py` `allow_origins`
   - Commit and push

### Health Check
- Endpoint: `/health`
- Expected: 200 OK with `{"status": "ok", "timestamp": "..."}`

## Local Development

### Docker Compose
```bash
cd backend
docker compose up -d
```
This starts PostgreSQL, Redis, the API, Celery worker, and Celery beat.

### Manual
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Start PostgreSQL and Redis separately
uvicorn app.main:app --reload
```

## Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | postgresql://postgres:postgres@localhost:5432/inspections | PostgreSQL connection string |
| REDIS_URL | No | redis://localhost:6379/0 | Redis connection string |
| PORT | Yes (Render) | 8000 | Server port |
| UVICORN_WORKERS | No | 4 | Number of uvicorn workers |
| LOG_LEVEL | No | info | Logging level |
| UPLOAD_DIR | No | ./uploads | Upload directory |
| STORAGE_DIR | No | ./storage | Storage directory |
| OCR_VERSION | No | paddleocr-3.7.0 | OCR engine version |
| AI_VERSION | No | mahindra-ai-v1.0 | AI pipeline version |
| IMAGE_PIPELINE_VERSION | No | img-enhance-v1.0 | Image pipeline version |
| PDF_DPI | No | 300 | PDF rendering DPI |
| MAX_PDF_PAGES | No | 500 | Max pages per PDF |
| MAX_RETRY_COUNT | No | 3 | OCR retry count |
| WORKER_COUNT | No | 8 | Celery worker count |
