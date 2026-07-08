from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.database import get_db, Inspection
from app.services.storage import storage

router = APIRouter()


_IMAGE_PATH_FIELDS = ("image_path_original", "image_path_enhanced", "ocr_json_path", "verified_json_path")


def _enrich_image_urls(inspection: dict) -> dict:
    for field in _IMAGE_PATH_FIELDS:
        val = inspection.get(field)
        if val:
            inspection[field] = storage.get_url(val)
    return inspection


class DefectItem(BaseModel):
    text: str
    verified: bool = False


class UpdateInspection(BaseModel):
    tractor_no: str | None = None
    engine_no: str | None = None
    chassis_no: str | None = None
    inspector: str | None = None
    defects: list[DefectItem] | None = None
    status: str | None = None
    date: str | None = None
    shift: str | None = None
    line_no: str | None = None
    verified_by: str | None = None
    final_verified_by: str | None = None


@router.get("/entries")
def list_entries(db: Session = Depends(get_db)):
    inspections = db.query(Inspection).order_by(Inspection.created_at.desc()).all()
    return [_enrich_image_urls(i.to_dict()) for i in inspections]


@router.get("/entries/{entry_id}")
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).filter(Inspection.id == entry_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Entry not found")
    return _enrich_image_urls(inspection.to_dict())


@router.put("/entries/{entry_id}")
def update_entry(entry_id: int, data: UpdateInspection, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).filter(Inspection.id == entry_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Entry not found")

    if data.tractor_no is not None:
        inspection.tractor_no = data.tractor_no
    if data.engine_no is not None:
        inspection.engine_no = data.engine_no
    if data.chassis_no is not None:
        inspection.chassis_no = data.chassis_no
    if data.inspector is not None:
        inspection.inspector = data.inspector
    if data.defects is not None:
        inspection.defects = [d.model_dump() for d in data.defects]
    if data.status is not None:
        inspection.status = data.status
    if data.date is not None:
        inspection.date = data.date
    if data.shift is not None:
        inspection.shift = data.shift
    if data.line_no is not None:
        inspection.line_no = data.line_no
    if data.verified_by is not None:
        inspection.verified_by = data.verified_by
    if data.final_verified_by is not None:
        inspection.final_verified_by = data.final_verified_by
    inspection.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(inspection)
    return _enrich_image_urls(inspection.to_dict())


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).filter(Inspection.id == entry_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(inspection)
    db.commit()
    return {"message": "Entry deleted"}
