# Changelog

## 2026-07-08 — v1.0.0 Release
- **Added** Celery Worker for async OCR pipeline
- **Added** Redis queue integration
- **Added** Render deployment config (Dockerfile, entrypoint)
- **Added** PostgreSQL ORM models with Alembic migrations
- **Added** PaddleOCR integration via PaddleX API
- **Added** Image enhancement pipeline (OpenCV)
- **Added** Field extraction engine (Regex + Zonal OCR)
- **Added** Confidence scoring for extracted fields
- **Added** Dashboard analytics endpoints
- **Added** Excel/PDF export functionality
- **Added** Speech-to-text endpoint
- **Added** Documentation: PRD, architecture, DB schema, API spec, deploy guide
- **Added** CURRENT_STATE.md (live service inventory)
- **Added** CHANGELOG.md
- **Added** System architecture diagram (07_SYSTEM_ARCHITECTURE.md)
- **Removed** Celery Beat (no scheduled jobs needed)
- **Removed** Railway config (migrated to Render)
- **Removed** 00_Project_Vision.md, 03_AI_Pipeline.md (merged into DESIGN.md)
- **Fixed** PaddleOCR word extraction accuracy
- **Fixed** shift column width in exports
- **Fixed** word_count calculation
- **Fixed** Unused imports, missing BytesIO/Optional imports
