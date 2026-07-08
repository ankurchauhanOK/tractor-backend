# Deployment Architecture

## Render Resources

```
[Vercel — Frontend]
       │
       ▼
[Render — Web Service: FastAPI]     CMD ["api"]
       │                                    │
       ▼                                    ▼
[Render — PostgreSQL]              [Render — Redis]
                                             │
                                             ▼
                               [Render — Background Worker: Celery]  CMD ["worker"]
                                                    │
                                                    ▼
                              [Cloudflare R2 — Object Storage]
```

## Services

### 1. Web Service (FastAPI)
- **Dockerfile**: `backend/Dockerfile`
- **Command**: `api`
- **Port**: `$PORT` (Render auto-sets)
- **Health**: `/health` endpoint
- No persistent disk required (S3 replaces local storage)

### 2. PostgreSQL
- Render-managed
- Auto-injects `DATABASE_URL` into linked services

### 3. Redis
- Render-managed
- Auto-injects `REDIS_URL` into linked services

### 4. Background Worker (Celery)
- **Dockerfile**: `backend/Dockerfile`
- **Command**: `worker`
- **Queues**: `default, ocr`
- No persistent disk required (S3 replaces local storage)

## Object Storage (Cloudflare R2)
- S3-compatible bucket for all file storage
- Used for: original PDFs, page images, enhanced images, OCR JSON, export files
- Object keys stored in PostgreSQL (not full URLs)
- Public URLs generated dynamically via `S3_PUBLIC_URL` env var
- API and Worker access the same bucket independently (no shared filesystem needed)

## Storage Architecture
```
┌──────────┐     ┌──────────┐
│  API     │     │  Worker  │
│  writes  │     │  reads/  │
│  files   │     │  writes  │
└────┬─────┘     └────┬─────┘
     │                │
     └──────┬─────────┘
            ▼
   ┌────────────────┐
   │  Cloudflare R2 │
   └────────────────┘
            │
            ▼
   ┌────────────────┐
   │  Frontend      │
   │  (img src =    │
   │  public R2 URL)│
   └────────────────┘
```

## Environment Variable Strategy
- `DATABASE_URL` and `REDIS_URL` are auto-injected by Render when services are linked
- `S3_*` vars configured in Render dashboard for both API and Worker services
- All other env vars set manually in Render dashboard
