import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from sqlalchemy.exc import IntegrityError
from app.models.database import Batch, BatchStatus, get_db
from app.services.storage import LocalStorage
from app.utils import generate_batch_no

logger = logging.getLogger(__name__)

router = APIRouter()
storage = LocalStorage()


# ── Request / Response models ─────────────────────────────────────

class BatchCreate(BaseModel):
    operator: str = ""
    scanner_name: str = ""
    total_pages: int = 0
    plant_name: str = ""
    line_name: str = ""
    factory_name: str = ""


class BatchUpdate(BaseModel):
    operator: Optional[str] = None
    scanner_name: Optional[str] = None
    total_pages: Optional[int] = None
    status: Optional[BatchStatus] = None
    progress: Optional[float] = None
    plant_name: Optional[str] = None
    line_name: Optional[str] = None
    factory_name: Optional[str] = None
    processed_pages: Optional[int] = None
    verified_pages: Optional[int] = None
    failed_pages: Optional[int] = None
    duplicate_pages: Optional[int] = None
    review_pages: Optional[int] = None
    average_confidence: Optional[float] = None
    average_processing_time_ms: Optional[float] = None


class LockRequest(BaseModel):
    locked_by: str


# ── Helpers ───────────────────────────────────────────────────────

def _batch_detail(batch: Batch) -> dict:
    data = batch.to_dict()
    try:
        data["storage"] = storage.get_batch_size(batch.batch_no)
    except Exception:
        data["storage"] = {}
    return data


def _get_batch_or_404(batch_id: int, db: Session) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


# ── CRUD endpoints ────────────────────────────────────────────────

@router.post("/batches", status_code=201)
def create_batch(body: BatchCreate, db: Session = Depends(get_db)):
    for attempt in range(3):
        try:
            batch_no = generate_batch_no(db)
            batch = Batch(
                batch_no=batch_no,
                operator=body.operator,
                scanner_name=body.scanner_name,
                total_pages=body.total_pages,
                plant_name=body.plant_name,
                line_name=body.line_name,
                factory_name=body.factory_name,
                status=BatchStatus.UPLOADING.value,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)
            return _batch_detail(batch)
        except IntegrityError:
            db.rollback()
            if attempt == 2:
                raise HTTPException(status_code=409, detail="Failed to create batch due to concurrent request")


@router.get("/batches")
def list_batches(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=200, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    factory: Optional[str] = Query(None, description="Filter by factory name"),
    year: Optional[int] = Query(None, description="Filter by year (in batch_no)"),
    search: Optional[str] = Query(None, description="Search batch_no or operator"),
    db: Session = Depends(get_db),
):
    query = db.query(Batch).filter(Batch.deleted_at.is_(None))

    if status:
        query = query.filter(Batch.status == status)
    if factory:
        query = query.filter(Batch.factory_name == factory)
    if year:
        prefix = f"MH-{year}-"
        query = query.filter(Batch.batch_no.like(f"{prefix}%"))
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Batch.batch_no.ilike(pattern), Batch.operator.ilike(pattern))
        )

    total = query.count()
    offset = (page - 1) * page_size
    batches = (
        query.order_by(Batch.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "batches": [b.to_dict() for b in batches],
    }


@router.get("/batches/{batch_id}")
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    return _batch_detail(_get_batch_or_404(batch_id, db))


@router.get("/batches/{batch_id}/summary")
def batch_summary(batch_id: int, db: Session = Depends(get_db)):
    batch = _get_batch_or_404(batch_id, db)
    return {
        "batch_no": batch.batch_no,
        "status": batch.status.value if batch.status else None,
        "total_pages": batch.total_pages,
        "processed": batch.processed_pages,
        "verified": batch.verified_pages,
        "failed": batch.failed_pages,
        "duplicates": batch.duplicate_pages,
        "review": batch.review_pages,
        "average_confidence": batch.average_confidence,
        "average_processing_time_ms": batch.average_processing_time_ms,
    }


@router.put("/batches/{batch_id}")
def update_batch(batch_id: int, body: BatchUpdate, db: Session = Depends(get_db)):
    batch = _get_batch_or_404(batch_id, db)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(batch, field, value)
    batch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(batch)
    return _batch_detail(batch)


# ── Archive / Restore ─────────────────────────────────────────────

@router.post("/batches/{batch_id}/archive")
def archive_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = _get_batch_or_404(batch_id, db)
    if batch.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Batch already archived")
    if batch.locked_by is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Batch is locked by {batch.locked_by}. Unlock before archiving.",
        )

    batch.deleted_at = datetime.utcnow()
    batch.updated_at = datetime.utcnow()
    db.commit()

    try:
        storage.archive_batch(batch.batch_no)
    except Exception as e:
        logger.warning("Storage archive failed for batch %s: %s", batch.batch_no, e)

    return {"message": f"Batch {batch.batch_no} archived", "batch_no": batch.batch_no}


@router.post("/batches/{batch_id}/restore")
def restore_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = _get_batch_or_404(batch_id, db)
    if batch.deleted_at is None:
        raise HTTPException(status_code=400, detail="Batch is not archived")

    batch.deleted_at = None
    batch.updated_at = datetime.utcnow()
    db.commit()

    try:
        storage.restore_batch(batch.batch_no)
    except Exception as e:
        logger.warning("Storage restore failed for batch %s: %s", batch.batch_no, e)

    return {"message": f"Batch {batch.batch_no} restored", "batch_no": batch.batch_no}


# ── Lock / Unlock ─────────────────────────────────────────────────

@router.post("/batches/{batch_id}/lock")
def lock_batch(batch_id: int, body: LockRequest, db: Session = Depends(get_db)):
    batch = _get_batch_or_404(batch_id, db)
    if batch.locked_by is not None and batch.locked_by != body.locked_by:
        raise HTTPException(
            status_code=409,
            detail=f"Batch already locked by {batch.locked_by} since "
                   f"{batch.locked_at.isoformat() if batch.locked_at else 'unknown'}",
        )
    batch.locked_by = body.locked_by
    batch.locked_at = datetime.utcnow()
    batch.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Batch locked by {body.locked_by}", "batch_no": batch.batch_no}


@router.post("/batches/{batch_id}/unlock")
def unlock_batch(
    batch_id: int,
    body: Optional[LockRequest] = None,
    db: Session = Depends(get_db),
):
    batch = _get_batch_or_404(batch_id, db)
    if batch.locked_by is None:
        raise HTTPException(status_code=400, detail="Batch is not locked")
    if body and body.locked_by and batch.locked_by != body.locked_by:
        raise HTTPException(
            status_code=403,
            detail=f"Batch is locked by {batch.locked_by}, not by {body.locked_by}",
        )
    batch.locked_by = None
    batch.locked_at = None
    batch.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Batch unlocked", "batch_no": batch.batch_no}


# ── Storage stats ─────────────────────────────────────────────────

@router.get("/batches/{batch_id}/size")
def batch_storage_size(batch_id: int, db: Session = Depends(get_db)):
    batch = _get_batch_or_404(batch_id, db)
    size = storage.get_batch_size(batch.batch_no)
    if not size:
        raise HTTPException(status_code=404, detail="No storage data for batch")
    return {"batch_no": batch.batch_no, **size}
