import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.database import Batch, EventType, Inspection, SystemEvent, get_db
from app.models.enums import InspectionStatus

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/analytics/dashboard")
def dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())

    # Batch counts
    total_batches = db.query(func.count(Batch.id)).filter(Batch.deleted_at.is_(None)).scalar() or 0
    archived_batches = db.query(func.count(Batch.id)).filter(Batch.deleted_at.isnot(None)).scalar() or 0
    batches_today = db.query(func.count(Batch.id)).filter(
        Batch.deleted_at.is_(None), Batch.created_at >= today_start
    ).scalar() or 0
    batches_week = db.query(func.count(Batch.id)).filter(
        Batch.deleted_at.is_(None), Batch.created_at >= week_start
    ).scalar() or 0

    # Page metrics
    total_pages = db.query(func.sum(Batch.total_pages)).filter(Batch.deleted_at.is_(None)).scalar() or 0
    processed_pages = db.query(func.sum(Batch.processed_pages)).filter(Batch.deleted_at.is_(None)).scalar() or 0
    verified_pages = db.query(func.sum(Batch.verified_pages)).filter(Batch.deleted_at.is_(None)).scalar() or 0
    failed_pages = db.query(func.sum(Batch.failed_pages)).filter(Batch.deleted_at.is_(None)).scalar() or 0
    review_pages = db.query(func.sum(Batch.review_pages)).filter(Batch.deleted_at.is_(None)).scalar() or 0

    # Pages processed today
    pages_today = db.query(func.count(Inspection.id)).filter(
        Inspection.created_at >= today_start
    ).scalar() or 0

    # Confidence
    avg_confidence = db.query(func.avg(Batch.average_confidence)).filter(
        Batch.deleted_at.is_(None), Batch.average_confidence.isnot(None)
    ).scalar()

    # Batches needing review (have unreviewed inspections)
    needing_review = db.query(func.count(Batch.id)).filter(
        Batch.deleted_at.is_(None), Batch.review_pages > 0
    ).scalar() or 0

    # Recent batches (last 10)
    recent = (
        db.query(Batch)
        .filter(Batch.deleted_at.is_(None))
        .order_by(Batch.created_at.desc())
        .limit(10)
        .all()
    )

    # Status distribution
    status_counts = (
        db.query(Batch.status, func.count(Batch.id))
        .filter(Batch.deleted_at.is_(None))
        .group_by(Batch.status)
        .all()
    )

    # Factory distribution
    factory_counts = (
        db.query(Batch.factory_name, func.count(Batch.id), func.sum(Batch.total_pages))
        .filter(Batch.deleted_at.is_(None), Batch.factory_name != "")
        .group_by(Batch.factory_name)
        .all()
    )

    processing_rate = round(pages_today / max(now.hour, 1), 1)

    return {
        "summary": {
            "total_batches": total_batches,
            "archived_batches": archived_batches,
            "batches_today": batches_today,
            "batches_this_week": batches_week,
            "total_pages": total_pages,
            "processed_pages": processed_pages,
            "verified_pages": verified_pages,
            "failed_pages": failed_pages,
            "review_pages": review_pages,
            "pages_processed_today": pages_today,
            "processing_rate_per_hour": processing_rate,
            "average_confidence": round(avg_confidence, 2) if avg_confidence else None,
            "batches_needing_review": needing_review,
        },
        "recent_batches": [
            {
                "id": b.id,
                "batch_no": b.batch_no,
                "status": b.status.value if b.status else None,
                "total_pages": b.total_pages,
                "processed_pages": b.processed_pages,
                "factory_name": b.factory_name,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in recent
        ],
        "status_distribution": [
            {"status": s.value if hasattr(s, "value") else s, "count": c}
            for s, c in status_counts
        ],
        "factory_distribution": [
            {"factory": f or "Unknown", "batch_count": bc, "total_pages": tp or 0}
            for f, bc, tp in factory_counts
        ],
    }


@router.get("/analytics/trends")
def trends(
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    # Daily batch creation
    batch_trends = (
        db.query(
            func.date(Batch.created_at).label("date"),
            func.count(Batch.id).label("count"),
        )
        .filter(Batch.created_at >= since)
        .group_by(func.date(Batch.created_at))
        .order_by(func.date(Batch.created_at))
        .all()
    )

    # Daily inspection creation (pages uploaded)
    page_trends = (
        db.query(
            func.date(Inspection.created_at).label("date"),
            func.count(Inspection.id).label("count"),
        )
        .filter(Inspection.created_at >= since)
        .group_by(func.date(Inspection.created_at))
        .order_by(func.date(Inspection.created_at))
        .all()
    )

    # Daily OCR completions from system events
    ocr_trends = (
        db.query(
            func.date(SystemEvent.created_at).label("date"),
            func.count(SystemEvent.id).label("count"),
            func.avg(SystemEvent.processing_time_ms).label("avg_time_ms"),
        )
        .filter(
            SystemEvent.created_at >= since,
            SystemEvent.event == EventType.OCR_COMPLETED,
        )
        .group_by(func.date(SystemEvent.created_at))
        .order_by(func.date(SystemEvent.created_at))
        .all()
    )

    return {
        "period_days": days,
        "since": since.isoformat(),
        "batches_per_day": [
            {"date": str(d), "count": c} for d, c in batch_trends
        ],
        "pages_per_day": [
            {"date": str(d), "count": c} for d, c in page_trends
        ],
        "ocr_completions_per_day": [
            {
                "date": str(d),
                "count": c,
                "avg_processing_time_ms": round(t, 2) if t else None,
            }
            for d, c, t in ocr_trends
        ],
    }


@router.get("/analytics/factories")
def factory_stats(db: Session = Depends(get_db)):
    factories = (
        db.query(
            Batch.factory_name,
            Batch.plant_name,
            func.count(Batch.id).label("batch_count"),
            func.sum(Batch.total_pages).label("total_pages"),
            func.sum(Batch.processed_pages).label("processed_pages"),
            func.sum(Batch.verified_pages).label("verified_pages"),
            func.sum(Batch.failed_pages).label("failed_pages"),
            func.avg(Batch.average_confidence).label("avg_confidence"),
        )
        .filter(Batch.deleted_at.is_(None), Batch.factory_name != "")
        .group_by(Batch.factory_name, Batch.plant_name)
        .order_by(func.count(Batch.id).desc())
        .all()
    )

    total_batches = sum(f.batch_count for f in factories)
    total_pages = sum(f.total_pages or 0 for f in factories)

    return {
        "factories": [
            {
                "factory": f.factory_name,
                "plant": f.plant_name or "N/A",
                "batch_count": f.batch_count,
                "batch_pct": round(f.batch_count / total_batches * 100, 1) if total_batches else 0,
                "total_pages": f.total_pages or 0,
                "page_pct": round((f.total_pages or 0) / total_pages * 100, 1) if total_pages else 0,
                "processed_pages": f.processed_pages or 0,
                "verified_pages": f.verified_pages or 0,
                "failed_pages": f.failed_pages or 0,
                "avg_confidence": round(f.avg_confidence, 2) if f.avg_confidence else None,
            }
            for f in factories
        ],
        "total_batches": total_batches,
        "total_pages": total_pages,
    }


@router.get("/analytics/performance")
def performance(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # Overall OCR stats from system events
    ocr_stats = (
        db.query(
            func.count(SystemEvent.id).label("total"),
            func.avg(SystemEvent.processing_time_ms).label("avg_time_ms"),
            func.min(SystemEvent.processing_time_ms).label("min_time_ms"),
            func.max(SystemEvent.processing_time_ms).label("max_time_ms"),
        )
        .filter(SystemEvent.event == EventType.OCR_COMPLETED)
        .first()
    )

    # Recent OCR processing times (last 100)
    recent_ocr = (
        db.query(SystemEvent.created_at, SystemEvent.processing_time_ms)
        .filter(SystemEvent.event == EventType.OCR_COMPLETED)
        .order_by(SystemEvent.created_at.desc())
        .limit(100)
        .all()
    )

    # Confidence distribution from batches
    confidence_dist = (
        db.query(
            func.count(Batch.id).label("count"),
        )
        .filter(
            Batch.deleted_at.is_(None),
            Batch.average_confidence.isnot(None),
        )
        .first()
    )
    total_with_conf = confidence_dist.count if confidence_dist else 0

    # Failure rate
    total_inspections = db.query(func.count(Inspection.id)).scalar() or 0
    failed_inspections = (
        db.query(func.count(Inspection.id))
        .filter(Inspection.status == InspectionStatus.FAILED.value)
        .scalar() or 0
    )
    retried_inspections = (
        db.query(func.count(Inspection.id))
        .filter(Inspection.retry_count > 0)
        .scalar() or 0
    )

    # Duplicate count
    duplicate_count = (
        db.query(func.count(SystemEvent.id))
        .filter(SystemEvent.event == EventType.DUPLICATE_FOUND)
        .scalar() or 0
    )

    return {
        "ocr_processing": {
            "total_completed": ocr_stats.total if ocr_stats else 0,
            "avg_time_ms": round(ocr_stats.avg_time_ms, 1) if ocr_stats and ocr_stats.avg_time_ms else None,
            "min_time_ms": ocr_stats.min_time_ms if ocr_stats else None,
            "max_time_ms": ocr_stats.max_time_ms if ocr_stats else None,
        },
        "recent_processing_times": [
            {
                "timestamp": t.isoformat() if t else None,
                "processing_time_ms": p,
            }
            for t, p in recent_ocr
        ],
        "confidence": {
            "batches_with_confidence": total_with_conf,
            "overall_average": (
                db.query(func.avg(Batch.average_confidence))
                .filter(Batch.deleted_at.is_(None), Batch.average_confidence.isnot(None))
                .scalar()
            ),
        },
        "reliability": {
            "total_inspections": total_inspections,
            "failed_inspections": failed_inspections,
            "failure_rate_pct": round(failed_inspections / total_inspections * 100, 2) if total_inspections else 0,
            "retried_inspections": retried_inspections,
            "retry_rate_pct": round(retried_inspections / total_inspections * 100, 2) if total_inspections else 0,
            "duplicates_found": duplicate_count,
        },
    }


@router.get("/analytics/status")
def status_distribution(db: Session = Depends(get_db)):
    # Batch status distribution
    batch_statuses = (
        db.query(Batch.status, func.count(Batch.id))
        .filter(Batch.deleted_at.is_(None))
        .group_by(Batch.status)
        .all()
    )

    # Inspection status distribution (last 10000 for performance)
    insp_statuses = (
        db.query(Inspection.status, func.count(Inspection.id))
        .group_by(Inspection.status)
        .all()
    )

    # Top defects across all inspections
    top_defects = (
        db.query(
            func.jsonb_extract_path_text(Inspection.defects, "text").label("defect_text"),
            func.count(Inspection.id).label("count"),
        )
        .filter(Inspection.defects.isnot(None))
        .group_by(func.jsonb_extract_path_text(Inspection.defects, "text"))
        .order_by(func.count(Inspection.id).desc())
        .limit(20)
        .all()
    )

    # Inspections per shift
    shift_counts = (
        db.query(Inspection.shift, func.count(Inspection.id))
        .filter(Inspection.shift != "")
        .group_by(Inspection.shift)
        .all()
    )

    return {
        "batch_statuses": [
            {"status": s.value if hasattr(s, "value") else s, "count": c}
            for s, c in batch_statuses
        ],
        "inspection_statuses": [
            {"status": s.value if hasattr(s, "value") else s, "count": c}
            for s, c in insp_statuses
        ],
        "top_defects": [
            {"defect": d, "count": c} for d, c in top_defects if d
        ],
        "shift_distribution": [
            {"shift": s or "Unknown", "count": c}
            for s, c in shift_counts
        ],
    }
