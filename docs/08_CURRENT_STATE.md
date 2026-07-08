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

### Known Issues
- CORS origins need Render URL added via `CORS_ORIGINS` env var
- Render Disk mounted at /app/storage for persistence
- First Docker build takes ~5-10 mins (PaddleOCR deps are large)
- No authentication layer yet; SECRET_KEY placeholder only

## Git
- Remote: https://github.com/ankurChauhanOK/tractor-backend
- Branch: main
- Latest commit: cff5c92 (Restore Celery/Redis entrypoint)
