from datetime import datetime

from sqlalchemy.orm import Session

from app.models.database import Batch


def generate_batch_no(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"MH-{year}-"
    last = (
        db.query(Batch.batch_no)
        .filter(Batch.batch_no.like(f"{prefix}%"))
        .order_by(Batch.batch_no.desc())
        .first()
    )
    if last:
        last_num = int(last[0].split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f"{prefix}{next_num:05d}"
