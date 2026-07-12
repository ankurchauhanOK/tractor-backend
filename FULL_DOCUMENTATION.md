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
# Product Requirements Document

## Problem Statement
Factory inspection sheets are paper-based. Data entry is manual, error-prone, and slow. Batches of 500+ sheets take hours to digitize, delaying quality analytics.

## Business Goals
1. Reduce sheet digitization time from hours to minutes
2. Eliminate manual data entry errors
3. Provide real-time quality analytics across factories
4. Enable paperless inspection workflow
5. Support multiple factories, plants, and production lines

## Functional Requirements

### Upload & Processing
- Upload multi-page PDF inspection sheets
- Automatic PDF splitting into individual pages
- Image enhancement (deskew, denoise, contrast)
- OCR extraction using PaddleOCR
- Field extraction (tractor no, engine no, chassis no, defects, etc.)
- Confidence scoring per extracted field
- Duplicate detection via SHA256

### Review & Verification
- Side-by-side view: original image vs extracted text
- Mark fields as verified or needs review
- Manual correction of AI-extracted fields
- Defect management (add/remove/verify defects)
- Batch-level lock/unlock for concurrent access

### Analytics & Dashboard
- Dashboard: total batches, pages processed, verification rate
- Trends: daily/weekly batch counts, OCR processing times
- Factory-level breakdowns with page/batch counts
- Performance metrics: avg processing time, failure rates
- Status distribution across batches and inspections

### Export & Reporting
- Export inspections to XLSX with formatted headers/sheets
- Export to PDF with original images and extracted text
- Legacy full-export endpoint for backward compatibility

### Administration
- Batch archive/restore (soft delete)
- Batch-level locking for multi-user safety
- System event logging (upload, enqueue, OCR complete, etc.)

## Non-Functional Requirements
- OCR accuracy: 96%+ on clean sheets
- Processing: 500 pages in under 8 minutes
- Concurrent upload support with Celery task queue
- RESTful API with OpenAPI documentation
- Docker-based deployment for reproducibility
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
# Database Schema

## Tables

### batches
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| batch_no | VARCHAR(32) | MH-{YEAR}-{SEQUENCE} |
| status | VARCHAR(32) | uploading → queued → processing → completed |
| operator | VARCHAR(255) | |
| scanner_name | VARCHAR(255) | |
| total_pages | INTEGER | |
| processed_pages | INTEGER | default 0 |
| verified_pages | INTEGER | default 0 |
| failed_pages | INTEGER | default 0 |
| duplicate_pages | INTEGER | default 0 |
| review_pages | INTEGER | default 0 |
| average_confidence | FLOAT | nullable |
| average_processing_time_ms | FLOAT | nullable |
| factory_name | VARCHAR(255) | |
| plant_name | VARCHAR(255) | |
| line_name | VARCHAR(255) | |
| pdf_sha256 | VARCHAR(64) | For duplicate detection |
| file_size_bytes | BIGINT | |
| original_pdf_path | TEXT | |
| locked_by | VARCHAR(255) | nullable |
| locked_at | TIMESTAMP | nullable |
| deleted_at | TIMESTAMP | nullable (soft delete) |
| deleted_by | VARCHAR(255) | nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| ocr_version | VARCHAR(64) | |
| ai_version | VARCHAR(64) | |
| image_pipeline_version | VARCHAR(64) | |
| pdf_version | VARCHAR(64) | |
| pdf_producer | VARCHAR(255) | |
| pdf_creator | VARCHAR(255) | |
| pdf_creation_date | VARCHAR(64) | |
| progress | FLOAT | default 0 |

### inspections
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| batch_id | INTEGER FK | References batches.id |
| page_number | INTEGER | |
| batch_page_index | INTEGER | |
| status | VARCHAR(32) | uploaded → processing → ocr_completed → verified |
| needs_review | BOOLEAN | default true |
| tractor_no | VARCHAR(128) | |
| tractor_model | VARCHAR(128) | |
| engine_no | VARCHAR(128) | |
| chassis_no | VARCHAR(128) | |
| inspector | VARCHAR(255) | |
| date | VARCHAR(32) | |
| shift | VARCHAR(32) | |
| line_no | VARCHAR(64) | |
| defects | JSONB | Array of {text, verified} |
| raw_text | TEXT | Full OCR output |
| confidence_scores | JSONB | Per-field scores |
| verified_by | VARCHAR(255) | |
| final_verified_by | VARCHAR(255) | |
| ocr_version | VARCHAR(64) | |
| ai_version | VARCHAR(64) | |
| image_pipeline_version | VARCHAR(64) | |
| error_detail | TEXT | nullable |
| retry_count | INTEGER | default 0 |
| last_retry_at | TIMESTAMP | nullable |
| image_path_original | TEXT | |
| image_path_enhanced | TEXT | |
| ocr_json_path | TEXT | |
| verified_json_path | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### exports
| Column | Type |
|--------|------|
| id | INTEGER PK |
| batch_id | INTEGER FK |
| file_type | VARCHAR(16) |
| file_path | TEXT |
| created_by | VARCHAR(255) |
| created_at | TIMESTAMP |

### system_events
| Column | Type |
|--------|------|
| id | INTEGER PK |
| batch_id | INTEGER FK |
| inspection_id | INTEGER FK |
| event | VARCHAR(32) |
| details | JSONB |
| processing_time_ms | FLOAT |
| created_at | TIMESTAMP |

### duplicate_logs
| Column | Type |
|--------|------|
| id | INTEGER PK |
| inspection_id | INTEGER FK |
| matched_inspection_id | INTEGER FK |
| similarity_score | FLOAT |
| match_type | VARCHAR(32) |
| action_taken | VARCHAR(32) |
| created_at | TIMESTAMP |

### defect_library
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | VARCHAR(255) | Defect name |
| category | VARCHAR(128) | Defect category |
| description | TEXT | Optional description |
| created_at | TIMESTAMP | |

### correction_log
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| inspection_id | INTEGER FK | References inspections.id |
| field_name | VARCHAR(64) | Which field was corrected |
| old_value | TEXT | Value before correction |
| new_value | TEXT | Value after correction |
| corrected_by | VARCHAR(255) | |
| created_at | TIMESTAMP | |

### learning_entries
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| inspection_id | INTEGER FK | References inspections.id |
| field_name | VARCHAR(64) | Field used for learning |
| raw_value | TEXT | Raw OCR output |
| corrected_value | TEXT | Human-corrected value |
| confidence | FLOAT | OCR confidence at time of correction |
| created_at | TIMESTAMP | |

## Indexes
- batches: (status), (created_at)
- inspections: (batch_id), (status)
- system_events: (event), (created_at)
- duplicate_logs: (inspection_id), (duplicate_of_id)
# API Specification

Base URL: `https://{backend-url}/api`

## Upload

### POST /upload
Upload PDF, split into pages, create inspections, enqueue OCR.
- Body: multipart/form-data with `file` (PDF)
- Returns: `{batch_id, batch_no, total_pages, status}`

## Batches

### GET /batches
List batches with pagination and filters.
- Query: `page`, `page_size`, `status`, `factory`, `year`, `search`
- Returns: `{total, page, page_size, total_pages, batches[]}`

### POST /batches
Create batch manually. Body: `{operator, scanner_name, factory_name, plant_name, line_name, ...}`

### GET /batches/{id}
Get batch detail with storage info and metadata.

### PUT /batches/{id}
Update batch fields. Body: partial Batch fields (operator, scanner_name, factory_name, etc.).

### GET /batches/{id}/summary
Compact batch summary (processed, verified, failed, review counts, confidence).

### POST /batches/{id}/archive
Soft-delete batch. Requires not locked. Body: `{deleted_by}` (optional)

### POST /batches/{id}/restore
Restore archived batch. Body: `{restored_by}` (optional)

### POST /batches/{id}/lock
Lock batch for exclusive access. Body: `{locked_by}`

### POST /batches/{id}/unlock
Unlock batch. Body: `{locked_by}` (optional)

### GET /batches/{id}/size
Storage size for batch images/files. Returns `{total_size_bytes, original_pdf_size, page_images_size, ...}`

## Entries (Inspections)

### GET /entries
List all inspections. Returns array.

### GET /entries/{id}
Get single inspection detail.

### PUT /entries/{id}
Update inspection fields. Body: partial Inspection fields.

### DELETE /entries/{id}
Delete inspection permanently.

## Exports

### POST /batches/{id}/exports
Generate export. Body: `{format: "xlsx"|"pdf"}`

### GET /batches/{id}/exports
List exports for a batch.

### GET /exports/{id}/download
Download export file.

### GET /export (legacy)
Export all inspections as XLSX. No batch_id required — returns full dataset.

## Entries (Inspections) — Additional

### POST /entries
Create a new inspection manually. Body: partial Inspection fields minus batch-scoped IDs.

## Analytics

### GET /analytics/dashboard
Dashboard summary: batch/page counts, confidence, trends.

### GET /analytics/trends
Daily trends. Query: `days` (1-365).

### GET /analytics/factories
Factory-level breakdown with batch/page counts.

### GET /analytics/performance
OCR speed, confidence, failure rate metrics.

### GET /analytics/status
Status distributions, top defects, shift breakdown.

## Speech

### POST /speech-to-text
Transcribe audio to text (faster-whisper).
- Body: multipart/form-data with `file` (audio)

## Health

### GET /health
Returns `{status: "ok", timestamp}`

### GET /ready
Returns `{status: "ok"|"unavailable", database: bool, redis: bool}`

### GET /
Returns `{message: "Tractor Inspection OCR System API"}`
# Design System

## UI Framework
- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS v4** for styling
- **shadcn/ui** components (built on `@base-ui/react`)
- **next-themes** for dark/light mode
- **sonner** for toast notifications

## Layout
- **Desktop**: Sidebar navigation (7 items) + main content area
- **Mobile**: Bottom navigation bar (5 items) + collapsible header
- **PWA**: Offline support via `@serwist/next`, install prompt component

## Core Pages & Components
| Component | Description |
|-----------|-------------|
| `app-shell.tsx` | Main layout wrapper with sidebar + mobile nav |
| `sidebar.tsx` | Desktop sidebar nav |
| `mobile-nav.tsx` | Mobile bottom nav |
| `camera-capture.tsx` | Mobile camera capture for upload |
| `VoiceInput.tsx` | Speech-to-text input for hands-free data entry |
| `InstallPrompt.tsx` | PWA install banner |
| `PwaStatus.tsx` | Online/offline status indicator |

## Key UI Components (shadcn)
button, card, input, select, badge, table, dialog, label, separator, sonner
# Deployment Guide

## Render (Production)

### Architecture

```
[Vercel Frontend]
       ↓
[FastAPI Web Service]   ←  CMD ["api"]
       ↕                        ↕
[PostgreSQL]          [Redis]   [Cloudflare R2]
                           ↕
[Celery Worker]      ←  CMD ["worker"]
```

### Prerequisites
- GitHub repo with code pushed
- Render account
- Cloudflare R2 bucket (or any S3-compatible storage)

### Step 0: Create R2 Bucket
- Cloudflare Dashboard → **R2** → Create Bucket
- Name: `tractor-ocr`
- Make bucket publicly accessible (for image serving)
- Note: `S3_PUBLIC_URL` is the public bucket URL (e.g. `https://pub-xxxx.r2.dev`)
- Generate R2 API tokens for `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`

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
- No persistent disk needed (files stored in R2)
- **Environment Variables** (Render auto-injects these from linked services):
  - `DATABASE_URL` ← auto from PostgreSQL
  - `REDIS_URL` ← auto from Redis
  - `STORAGE_BACKEND`: `s3`
  - `S3_ENDPOINT`: `https://<accountid>.r2.cloudflarestorage.com`
  - `S3_ACCESS_KEY_ID`: `<your-r2-access-key>`
  - `S3_SECRET_ACCESS_KEY`: `<your-r2-secret-key>`
  - `S3_BUCKET_NAME`: `tractor-ocr`
  - `S3_PUBLIC_URL`: `https://pub-<hash>.r2.dev`
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
- No persistent disk needed (files stored in R2)
- **Environment Variables**:
  - `DATABASE_URL` ← auto from PostgreSQL
  - `REDIS_URL` ← auto from Redis
  - `STORAGE_BACKEND`: `s3`
  - `S3_ENDPOINT`: `https://<accountid>.r2.cloudflarestorage.com`
  - `S3_ACCESS_KEY_ID`: `<your-r2-access-key>`
  - `S3_SECRET_ACCESS_KEY`: `<your-r2-secret-key>`
  - `S3_BUCKET_NAME`: `tractor-ocr`
  - `S3_PUBLIC_URL`: `https://pub-<hash>.r2.dev`
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
| STORAGE_BACKEND | No | both | local | Storage backend: local or s3 |
| S3_ENDPOINT | When s3 | both | — | S3-compatible endpoint URL |
| S3_ACCESS_KEY_ID | When s3 | both | — | S3 access key |
| S3_SECRET_ACCESS_KEY | When s3 | both | — | S3 secret key |
| S3_BUCKET_NAME | When s3 | both | — | S3 bucket name |
| S3_REGION | No | both | auto | S3 region |
| S3_PUBLIC_URL | No | both | — | Public URL for image serving |
| UVICORN_WORKERS | No | api | 4 | Number of uvicorn workers |
| WORKER_COUNT | No | worker | 8 | Celery worker concurrency |
| CELERY_QUEUES | No | worker | default,ocr | Comma-separated queue names |
| CELERY_MAX_TASKS | No | worker | 1000 | Max tasks before worker restart |
| CELERY_MAX_MEMORY | No | worker | 500000 | Max memory per child (KB) |
| LOG_LEVEL | No | both | info | Logging level |
| CORS_ORIGINS | No | api | localhost:3000,... | Comma-separated allowed origins |
| STORAGE_DIR | No | both | ./storage | Local directory (used when STORAGE_BACKEND=local) |
| OCR_VERSION | No | both | paddleocr-3.7.0 | OCR engine version tag |
| AI_VERSION | No | both | mahindra-ai-v1.0 | AI pipeline version tag |
| PDF_DPI | No | both | 300 | PDF rendering DPI |
| MAX_PDF_PAGES | No | both | 500 | Max pages per PDF |
| MAX_UPLOAD_SIZE_MB | No | api | 500 | Max PDF upload size in MB |
| MAX_RETRY_COUNT | No | both | 3 | OCR retry count |

## Local Development

### Docker Compose (full stack)
```bash
cd backend
docker compose up -d
```
This starts PostgreSQL, Redis, API, and Celery worker.

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
# AI Pipeline

## Flow

```
PDF Upload
    ↓
PDF Splitter (PyMuPDF) → Individual page images
    ↓
Image Enhancer (OpenCV)
    ├── Grayscale conversion
    ├── Denoise (Non-local means)
    ├── Deskew (minAreaRect)
    ├── Contrast enhancement (CLAHE)
    └── Binarization (OTSU threshold)
    ↓
OCR Engine
    ├── PaddleOCR (primary)
    └── EasyOCR (fallback if PaddleOCR fails to initialize)
    ↓
Extraction Engine
    ├── Regex pattern matching
    │   ├── Tractor No: MH-\d{2}[A-Z]{2}\d{4}
    │   ├── Engine No: [A-Z0-9]{6,20}
    │   ├── Chassis No: [A-Z0-9]{6,20}
    │   ├── Date patterns (DD/MM/YYYY, etc.)
    │   ├── Shift patterns (1st, 2nd, 3rd, General)
    │   └── Line No patterns
    │   └── Exact field matching for defect names
    ↓
Confidence Engine
    ├── Per-field confidence from OCR scores
    ├── Overall page confidence (average)
    └── Auto-approve if confidence > threshold (0.85)
    ↓
Duplicate Detection
    ├── SHA256 of raw OCR text
    └── Exact field matching (tractor_no, engine_no, chassis_no)
    ↓
Storage
    ├── Original PDF
    ├── Enhanced page images
    ├── OCR JSON (raw PaddleOCR output)
    └── Verified JSON (human-corrected fields)
```

## Notes
- **Sharpening** is not currently applied (documented but unimplemented)
- **Zonal OCR** (pre-defined coordinate regions) is not implemented — extraction relies solely on regex pattern matching against full OCR text
- **RapidFuzz / fuzzy matching** is listed in dependencies but not yet integrated
- **Cosine similarity** for duplicate detection is not implemented — the system uses exact field matching instead

## Performance Targets
- 500 pages: under 8 minutes total
- OCR accuracy: 96%+
- Auto-approval rate: 95%+
- Manual review rate: <5%
# Current State

> Last updated: 2026-07-08

## Deployed Services

| Service | Platform | Status | Notes |
|---------|----------|--------|-------|
| Frontend | Vercel | ✅ Live | https://tractor-inspection-ocr.vercel.app |
| Backend API | Render | ⏳ Deploying | FastAPI, Dockerfile: backend/Dockerfile, CMD api |
| Celery Worker | Render | ⏳ Deploying | Same image, CMD worker |
| PostgreSQL | Render | ⏳ Creating | Render-managed |
| Redis | Render | ⏳ Creating | Render-managed |

## Backend API (v1.0.0)

### Routes
| Group | Endpoints |
|-------|-----------|
| Upload | POST /api/upload |
| Batches | GET/POST /api/batches, GET/PUT /api/batches/{id}, GET /api/batches/{id}/summary, POST /api/batches/{id}/archive, POST /api/batches/{id}/restore, POST /api/batches/{id}/lock, POST /api/batches/{id}/unlock, GET /api/batches/{id}/size |
| Entries | GET /api/entries, GET/PUT /api/entries/{id}, DELETE /api/entries/{id} |
| Exports | POST /api/batches/{id}/exports, GET /api/batches/{id}/exports, GET /api/exports/{id}/download, GET /api/export (legacy) |
| Analytics | GET /api/analytics/dashboard, /trends, /factories, /performance, /status |
| Speech | POST /api/speech-to-text |
| Health | GET /, /health, /ready |

### Environment Variables
See `docs/06_DEPLOYMENT.md` for full table.

### Frontend Pages
| Page | Route | Status |
|------|-------|--------|
| Login | `/login` | ✅ Simulated auth (no real API call) |
| Dashboard | `/` | ✅ KPI cards, recent inspections, actions |
| Upload | `/upload` | ✅ Drag-and-drop + camera capture |
| Review Queue | `/review` | ✅ Status filters, search, entry list |
| Batches | `/batches` | ✅ Paginated list with filters/sorting |
| Batch Detail | `/batches/[id]` | ✅ Stats, entries table, export/archive |
| Verify Inspection | `/verify/[id]` | ✅ Image viewer, defect editing, voice input |
| Analytics | `/analytics` | ✅ Charts, trends, factory comparison |
| Reports | `/reports` | ✅ Export management with download links |
| Settings | `/settings` | ✅ 10 sections (Profile, Factories, Users, etc.) |

### Database Tables
| Table | Status |
|-------|--------|
| batches, inspections, exports, system_events, duplicate_log | ✅ Documented |
| defect_library, correction_log, learning_entries | ✅ Exist in code but undocumented |

### Known Issues
- CORS origins need Render URL added via `CORS_ORIGINS` env var
- Render Disk mounted at /app/storage for persistence
- First Docker build takes ~5-10 mins (PaddleOCR deps are large)
- No authentication layer yet; SECRET_KEY is defined but never read by any code
- Frontend review page links to `/review/{id}` but route file does not exist (404)
- Sharpening, zonal OCR, RapidFuzz, and cosine similarity documented but not implemented

## Git
- Remote: https://github.com/ankurChauhanOK/tractor-backend
- Branch: main
- Latest commit: cff5c92 (Restore Celery/Redis entrypoint)
# Build Plan

## Phase 1 — Foundation (COMPLETE)
- FastAPI backend with all route modules
- PostgreSQL models + Alembic migrations
- Celery worker with Redis broker
- PaddleOCR integration
- Image enhancement pipeline
- Field extraction engine
- Duplicate detection
- Confidence scoring
- Excel/PDF export

## Phase 2 — Deployment (IN PROGRESS)
- Dockerfile with multi-stage build
- API + Worker modes in entrypoint
- Render deployment configuration
- CORS configuration via env var

## Phase 3 — Verification (PENDING)
- Health endpoint verification
- Upload → Batch → Queue → Process → OCR → AI → DB pipeline test
- Dashboard data population
- Excel export verification

## Phase 4 — Production Hardening (PENDING)
- Authentication / authorization
- Rate limiting
- Monitoring & alerting
- Backup strategy
- Auto-scaling configuration
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
