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
