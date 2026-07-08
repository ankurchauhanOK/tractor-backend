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
