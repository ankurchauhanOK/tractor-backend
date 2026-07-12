# Environment Variables

## Core

| Variable | Required | Services | Default | Description |
|----------|----------|----------|---------|-------------|
| DATABASE_URL | Yes | api, worker | localhost:5432 | PostgreSQL connection string |
| REDIS_URL | Yes | api, worker | localhost:6379 | Redis connection string |
| SECRET_KEY | No | api | — | Reserved for future auth (currently unused by code) |
| CORS_ORIGINS | No | api | localhost:3000,localhost:3001 | Comma-separated allowed origins |
| PORT | No | api | 8000 | Server port (Render sets this) |

## Storage Backend

| Variable | Required | Services | Default | Description |
|----------|----------|----------|---------|-------------|
| STORAGE_BACKEND | No | both | local | Storage backend: `local` or `s3` |
| STORAGE_DIR | No | both | ./storage | Local filesystem storage directory (used when `STORAGE_BACKEND=local`) |
| S3_ENDPOINT | When s3 | both | — | S3-compatible endpoint URL (e.g. Cloudflare R2 endpoint) |
| S3_ACCESS_KEY_ID | When s3 | both | — | S3 access key |
| S3_SECRET_ACCESS_KEY | When s3 | both | — | S3 secret key |
| S3_BUCKET_NAME | When s3 | both | — | S3 bucket name |
| S3_REGION | No | both | auto | S3 region (R2 uses `auto`) |
| S3_PUBLIC_URL | No | both | — | Public base URL for serving images (e.g. R2 public bucket domain) |

## Processing

| Variable | Required | Services | Default | Description |
|----------|----------|----------|---------|-------------|
| UVICORN_WORKERS | No | api | 4 | Number of uvicorn workers |
| WORKER_COUNT | No | worker | 8 | Celery worker concurrency |
| CELERY_QUEUES | No | worker | default,ocr | Comma-separated queue names |
| CELERY_MAX_TASKS | No | worker | 1000 | Max tasks before worker restart |
| CELERY_MAX_MEMORY | No | worker | 500000 | Max memory per child (KB) |
| LOG_LEVEL | No | both | info | Logging level |
| MAX_UPLOAD_SIZE_MB | No | api | 500 | Max PDF upload size in MB |
| MAX_PDF_PAGES | No | both | 500 | Max pages per PDF |
| PDF_DPI | No | both | 300 | PDF rendering DPI |
| MAX_RETRY_COUNT | No | both | 3 | OCR retry count |
| MAX_PAGE_WIDTH | No | both | 5000 | Max rendered page width in pixels |
| MAX_PAGE_HEIGHT | No | both | 10000 | Max rendered page height in pixels |
| DB_POOL_SIZE | No | api | 20 | SQLAlchemy connection pool size |
| DB_MAX_OVERFLOW | No | api | 10 | SQLAlchemy max pool overflow |

## Version Tags

| Variable | Required | Services | Default | Description |
|----------|----------|----------|---------|-------------|
| OCR_VERSION | No | both | paddleocr-3.7.0 | OCR engine version tag |
| AI_VERSION | No | both | mahindra-ai-v1.0 | AI pipeline version tag |
| IMAGE_PIPELINE_VERSION | No | both | img-enhance-v1.0 | Image pipeline version tag |
