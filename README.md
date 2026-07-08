# Tractor Inspection OCR System

AI-powered OCR system for digitizing tractor inspection sheets. Built for Mahindra & Mahindra Ltd.

## Architecture

- **Backend:** FastAPI (Python 3.13) with PostgreSQL, Redis, Celery
- **Frontend:** Next.js 16 (React 19, TypeScript, Tailwind CSS v4)
- **OCR:** PaddleOCR 3.7 (with EasyOCR fallback)
- **Image Enhancement:** OpenCV (CLAHE, deskew, denoise, binarization)
- **Export:** Excel (openpyxl) and PDF (fpdf2)

## Quick Start

### Prerequisites

- Python 3.13+
- Node.js 22+
- PostgreSQL 16
- Redis 7

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure database
createdb inspections
cp .env.example .env  # Edit as needed

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Start Celery worker (separate terminal)
celery -A app.celery_app worker -l info --concurrency=2
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env.local  # Edit API URL
npm install
npm run dev
```

### Docker Deployment

```bash
cd backend
docker compose up -d
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload PDF for OCR processing |
| `/api/batches` | GET | List batches (paginated, filterable) |
| `/api/batches/{id}` | GET | Batch details |
| `/api/batches/{id}/summary` | GET | Batch summary statistics |
| `/api/batches/{id}/archive` | POST | Archive batch |
| `/api/batches/{id}/restore` | POST | Restore archived batch |
| `/api/batches/{id}/lock` | POST | Lock batch for editing |
| `/api/batches/{id}/unlock` | POST | Unlock batch |
| `/api/entries` | GET | List all inspections |
| `/api/entries/{id}` | GET | Get inspection details |
| `/api/entries/{id}` | PUT | Update inspection fields |
| `/api/batches/{id}/exports` | POST | Generate Excel/PDF export |
| `/api/batches/{id}/exports` | GET | List exports for batch |
| `/api/exports/{id}/download` | GET | Download export file |
| `/api/analytics/dashboard` | GET | Dashboard summary |
| `/api/analytics/trends` | GET | Daily trends |
| `/api/analytics/factories` | GET | Factory statistics |
| `/api/analytics/performance` | GET | OCR performance metrics |

## OCR Pipeline

1. **PDF Upload** → Validation (size, pages, encryption, SHA256 dedup)
2. **Page Splitting** → PyMuPDF renders each page at 300 DPI
3. **Image Enhancement** → Grayscale → Denoise → Deskew → CLAHE → Otsu binarization
4. **OCR** → PaddleOCR (primary) or EasyOCR (fallback)
5. **Field Extraction** → Regex-based extraction for tractor no, engine no, chassis no, inspector, date, shift, defects
6. **Duplicate Detection** → Cross-check against existing inspections
7. **Confidence Scoring** → Per-field confidence based on OCR quality

## Environment Variables

See `.env.example` for all configuration options.
