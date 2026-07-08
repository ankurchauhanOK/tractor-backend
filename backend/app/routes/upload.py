import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from sqlalchemy.exc import IntegrityError
from app.config import MAX_PDF_PAGES, MAX_UPLOAD_SIZE_MB
from app.models.database import (
    Batch,
    BatchStatus,
    EventType,
    Inspection,
    InspectionStatus,
    SystemEvent,
    get_db,
)
from app.services.pdf_splitter import PDFSplitter, PDFValidationError
from app.services.storage import storage
from app.utils import generate_batch_no

logger = logging.getLogger(__name__)

router = APIRouter()
splitter = PDFSplitter()

MAX_PDF_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _enqueue_or_log(inspection_id: int, batch_id: int, page_number: int, db: Session):
    try:
        from app.tasks import process_page

        process_page.delay(inspection_id)
        event = SystemEvent(
            inspection_id=inspection_id,
            batch_id=batch_id,
            event=EventType.PAGE_ENQUEUED.value,
            details={
                "page_number": page_number,
                "inspection_id": inspection_id,
            },
            created_at=datetime.utcnow(),
        )
        db.add(event)
        db.commit()
        return True
    except Exception as e:
        logger.warning(
            "Queue unavailable, inspection %d not enqueued: %s",
            inspection_id,
            e,
        )
        return False


@router.post("/upload", status_code=201)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    contents = await file.read()
    if len(contents) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"PDF exceeds {MAX_UPLOAD_SIZE_MB} MB limit",
        )

    # Validate PDF structure (encrypted, zero pages, dimensions, corruption)
    try:
        pdf_meta = splitter.extract_metadata(contents)
        splitter.validate(contents)
    except PDFValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if pdf_meta["total_pages"] > MAX_PDF_PAGES:
        raise HTTPException(
            status_code=400,
            detail=f"PDF has {pdf_meta['total_pages']} pages, "
                   f"maximum allowed is {MAX_PDF_PAGES}",
        )

    # Check for duplicate upload via SHA256
    existing = (
        db.query(Batch.id)
        .filter(Batch.pdf_sha256 == pdf_meta["pdf_sha256"])
        .filter(Batch.deleted_at.is_(None))
        .first()
    )
    if existing:
        logger.warning("Duplicate PDF detected (sha256=%s)", pdf_meta["pdf_sha256"])

    # Create batch (retry on collision)
    for attempt in range(3):
        try:
            batch_no = generate_batch_no(db)
            batch = Batch(
                batch_no=batch_no,
                status=BatchStatus.UPLOADING.value,
                total_pages=pdf_meta["total_pages"],
                original_pdf_path="",
                pdf_sha256=pdf_meta["pdf_sha256"],
                file_size_bytes=pdf_meta["file_size_bytes"],
                pdf_version=pdf_meta["pdf_version"],
                pdf_producer=pdf_meta["pdf_producer"],
                pdf_creator=pdf_meta["pdf_creator"],
                pdf_creation_date=pdf_meta["pdf_creation_date"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)
            break
        except IntegrityError:
            db.rollback()
            if attempt == 2:
                raise HTTPException(status_code=409, detail="Failed to create batch due to concurrent request")

    # Save original PDF
    pdf_path = storage.save_original_pdf(batch_no, contents, file.filename)
    batch.original_pdf_path = pdf_path
    db.commit()

    # Split PDF into pages
    try:
        pages = splitter.split(contents)
    except Exception as e:
        batch.status = BatchStatus.CANCELLED.value
        batch.updated_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to split PDF: {str(e)}")

    # Save each page and create inspection records
    for page_num, img_bytes, img_fmt in pages:
        path = storage.save_original_page(batch_no, page_num, img_bytes)

        inspection = Inspection(
            batch_id=batch.id,
            page_number=page_num,
            batch_page_index=page_num,
            status=InspectionStatus.UPLOADED.value,
            needs_review=True,
            image_path_original=path,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(inspection)
        db.commit()
        db.refresh(inspection)

        _enqueue_or_log(inspection.id, batch.id, page_num, db)

    # Finalize batch
    batch.status = BatchStatus.QUEUED.value
    batch.updated_at = datetime.utcnow()
    db.commit()

    logger.info("Batch %s created with %d pages", batch_no, len(pages))

    return {
        "batch_id": batch.id,
        "batch_no": batch.batch_no,
        "total_pages": batch.total_pages,
        "file_size_bytes": batch.file_size_bytes,
        "pdf_sha256": batch.pdf_sha256,
        "status": batch.status.value,
        "original_pdf": file.filename,
    }
