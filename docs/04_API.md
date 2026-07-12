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
