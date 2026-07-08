import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.config import AI_VERSION, IMAGE_PIPELINE_VERSION, OCR_VERSION
from app.models.database import (
    Batch,
    BatchStatus,
    DuplicateAction,
    DuplicateLog,
    EventType,
    Inspection,
    InspectionStatus,
    SessionLocal,
    SystemEvent,
)
from app.services.enhancement.enhancer import ImageEnhancer
from app.services.extraction.engine import ExtractionEngine
from app.services.ocr.service import OCRService
from app.services.storage import storage

logger = logging.getLogger(__name__)

enhancer = ImageEnhancer()
ocr_service = OCRService()
extraction = ExtractionEngine()


def _update_batch_summaries(batch_id: int, db: Session):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        return

    inspections = (
        db.query(Inspection)
        .filter(Inspection.batch_id == batch_id)
        .all()
    )

    total = len(inspections)
    processed = sum(1 for i in inspections if i.status != InspectionStatus.UPLOADED)
    verified = sum(1 for i in inspections if i.status == InspectionStatus.VERIFIED)
    failed = sum(1 for i in inspections if i.status == InspectionStatus.FAILED)
    needs_review = sum(1 for i in inspections if i.needs_review and i.status not in (
        InspectionStatus.FAILED, InspectionStatus.UPLOADED
    ))
    duplicates = sum(
        1 for i in inspections
        if i.status == InspectionStatus.OCR_COMPLETED and not i.needs_review
    )  # approximate

    confidences = [
        i.confidence_scores.get("tractor_no", 0)
        for i in inspections
        if i.confidence_scores and isinstance(i.confidence_scores, dict)
    ]
    avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else None

    times = [
        i.updated_at.timestamp() - i.created_at.timestamp()
        for i in inspections
        if i.updated_at and i.created_at
    ]
    avg_time = round((sum(times) / len(times)) * 1000, 2) if times else None

    batch.processed_pages = processed
    batch.verified_pages = verified
    batch.failed_pages = failed
    batch.review_pages = needs_review
    batch.duplicate_pages = duplicates
    batch.average_confidence = avg_conf
    batch.average_processing_time_ms = avg_time

    if processed == total:
        if failed > 0:
            batch.status = BatchStatus.COMPLETED_WITH_ERRORS.value
        elif needs_review > 0:
            batch.status = BatchStatus.WAITING_REVIEW.value
        else:
            batch.status = BatchStatus.COMPLETED.value
    elif processed > 0:
        batch.status = BatchStatus.PROCESSING.value

    batch.updated_at = datetime.utcnow()
    db.commit()


def _log_event(
    db: Session,
    batch_id: int,
    event: EventType,
    inspection_id: Optional[int] = None,
    details: Optional[dict] = None,
    processing_time_ms: Optional[int] = None,
):
    ev = SystemEvent(
        inspection_id=inspection_id,
        batch_id=batch_id,
        event=event.value if isinstance(event, EventType) else event,
        details=details or {},
        processing_time_ms=processing_time_ms,
        created_at=datetime.utcnow(),
    )
    db.add(ev)
    db.commit()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_page(self, inspection_id: int):
    db = SessionLocal()
    try:
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            logger.error("Inspection %d not found", inspection_id)
            return

        batch = db.query(Batch).filter(Batch.id == inspection.batch_id).first()

        logger.info(
            "Processing page %d/%d for batch %s (attempt %d/%d)",
            inspection.page_number,
            batch.total_pages if batch else 0,
            batch.batch_no if batch else "?",
            self.request.retries + 1,
            self.max_retries + 1,
        )

        inspection.status = InspectionStatus.PROCESSING.value
        inspection.ocr_version = OCR_VERSION
        inspection.ai_version = AI_VERSION
        inspection.image_pipeline_version = IMAGE_PIPELINE_VERSION
        inspection.updated_at = datetime.utcnow()
        db.commit()

        _log_event(
            db, inspection.batch_id, EventType.OCR_STARTED,
            inspection_id=inspection.id,
            details={"page_number": inspection.page_number},
        )

        # 1. Load original page image
        orig_bytes = storage.read_file(
            batch.batch_no, "original",
            f"page_{inspection.page_number:04d}.jpg",
        )
        if not orig_bytes:
            raise FileNotFoundError(
                f"Original page image not found for batch {batch.batch_no}, "
                f"page {inspection.page_number}"
            )

        # 2. Enhance image
        enhanced_bytes, enhance_meta = enhancer.enhance(orig_bytes)
        storage.save_enhanced(batch.batch_no, inspection.page_number, enhanced_bytes)

        # 3. Run OCR on enhanced image
        ocr_result = ocr_service.process_bytes(enhanced_bytes)

        # Save OCR JSON to storage
        storage.save_ocr_json(batch.batch_no, inspection.page_number, ocr_result.to_dict())

        # 4. Extract structured fields
        extracted = extraction.extract(ocr_result.raw_text, ocr_result.confidence)

        # 5. Check for duplicates
        dup_info = extraction.check_duplicate(
            inspection.id,
            extracted.tractor_no,
            extracted.engine_no,
            extracted.chassis_no,
            db,
        )
        if dup_info:
            match_type, dup_id = dup_info
            dup_log = DuplicateLog(
                inspection_id=inspection.id,
                duplicate_of_id=dup_id,
                match_type=match_type,
                action_taken=DuplicateAction.SKIPPED.value,
                created_at=datetime.utcnow(),
            )
            db.add(dup_log)
            _log_event(
                db, inspection.batch_id, EventType.DUPLICATE_FOUND,
                inspection_id=inspection.id,
                details={
                    "match_type": match_type.value,
                    "duplicate_of_id": dup_id,
                },
            )

        # 6. Save results to inspection
        inspection.tractor_no = extracted.tractor_no
        inspection.tractor_model = extracted.tractor_model
        inspection.engine_no = extracted.engine_no
        inspection.chassis_no = extracted.chassis_no
        inspection.inspector = extracted.inspector
        inspection.date = extracted.date
        inspection.shift = extracted.shift
        inspection.line_no = extracted.line_no
        inspection.defects = extracted.defects
        inspection.raw_text = ocr_result.raw_text
        inspection.confidence_scores = extracted.confidence_scores
        inspection.needs_review = extracted.needs_review

        inspection.status = InspectionStatus.OCR_COMPLETED.value
        inspection.updated_at = datetime.utcnow()
        db.commit()

        # 7. Log completion event
        _log_event(
            db, inspection.batch_id, EventType.OCR_COMPLETED,
            inspection_id=inspection.id,
            details={
                "page_number": inspection.page_number,
                "engine": ocr_result.engine,
                "word_count": len(ocr_result.words),
                "needs_review": extracted.needs_review,
                "enhance_steps": enhance_meta.get("steps", []),
            },
            processing_time_ms=ocr_result.processing_time_ms,
        )

        # 8. Update batch summary counters
        _update_batch_summaries(inspection.batch_id, db)

        logger.info(
            "Page %d/%d processed: %d words, conf=%.2f, review=%s",
            inspection.page_number,
            batch.total_pages if batch else 0,
            len(ocr_result.words),
            ocr_result.confidence,
            extracted.needs_review,
        )

    except Exception as exc:
        attempt = self.request.retries + 1
        is_final = attempt > self.max_retries

        logger.error(
            "Page processing failed (inspection %d, attempt %d/%d): %s",
            inspection_id, attempt, self.max_retries + 1, exc,
        )

        try:
            inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
            if inspection:
                inspection.error_detail = str(exc)
                inspection.retry_count = attempt
                inspection.last_retry_at = datetime.utcnow()
                inspection.updated_at = datetime.utcnow()
                if is_final:
                    inspection.status = InspectionStatus.FAILED.value
                db.commit()

                if inspection.batch_id:
                    _update_batch_summaries(inspection.batch_id, db)
        except Exception:
            pass

        if is_final:
            logger.error("Exhausted retries for inspection %d, permanently failed", inspection_id)
            return

        raise self.retry(exc=exc)
    finally:
        db.close()
