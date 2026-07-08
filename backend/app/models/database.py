import datetime
import json

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from app.config import DATABASE_URL, DB_MAX_OVERFLOW, DB_POOL_SIZE
from app.models.enums import (
    BatchStatus,
    DuplicateAction,
    EventType,
    InspectionStatus,
    MatchType,
)

engine = create_engine(
    DATABASE_URL,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Batch(Base):
    __tablename__ = "batches"

    __table_args__ = (
        Index("ix_batches_status", "status"),
        Index("ix_batches_created_at", "created_at"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_no = Column(String(32), unique=True, nullable=False, index=True)
    operator = Column(String(255), default="")
    scanner_name = Column(String(255), default="")
    total_pages = Column(Integer, default=0, nullable=False)
    status = Column(
        Enum(BatchStatus, name="batch_status", create_type=False,
             values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=BatchStatus.UPLOADING.value,
    )
    progress = Column(Float, default=0.0, nullable=False)
    original_pdf_path = Column(String(1024), default="")
    ocr_version = Column(String(64), default="")
    ai_version = Column(String(64), default="")
    image_pipeline_version = Column(String(64), default="")
    factory_name = Column(String(255), default="")
    plant_name = Column(String(255), default="")
    line_name = Column(String(128), default="")
    processed_pages = Column(Integer, default=0, nullable=False)
    verified_pages = Column(Integer, default=0, nullable=False)
    failed_pages = Column(Integer, default=0, nullable=False)
    duplicate_pages = Column(Integer, default=0, nullable=False)
    review_pages = Column(Integer, default=0, nullable=False)
    average_confidence = Column(Float, nullable=True)
    average_processing_time_ms = Column(Float, nullable=True)
    pdf_sha256 = Column(String(64), nullable=False, server_default="", index=True)
    file_size_bytes = Column(BigInteger, nullable=False, server_default="0")
    pdf_version = Column(String(16), nullable=False, server_default="")
    pdf_producer = Column(String(255), nullable=False, server_default="")
    pdf_creator = Column(String(255), nullable=False, server_default="")
    pdf_creation_date = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String(255), nullable=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    inspections = relationship("Inspection", back_populates="batch", cascade="all, delete-orphan")
    events = relationship("SystemEvent", back_populates="batch", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="batch", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "batch_no": self.batch_no,
            "operator": self.operator,
            "scanner_name": self.scanner_name,
            "total_pages": self.total_pages,
            "status": self.status.value if self.status else None,
            "progress": self.progress,
            "original_pdf_path": self.original_pdf_path,
            "ocr_version": self.ocr_version,
            "ai_version": self.ai_version,
            "image_pipeline_version": self.image_pipeline_version,
            "factory_name": self.factory_name,
            "plant_name": self.plant_name,
            "line_name": self.line_name,
            "processed_pages": self.processed_pages,
            "verified_pages": self.verified_pages,
            "failed_pages": self.failed_pages,
            "duplicate_pages": self.duplicate_pages,
            "review_pages": self.review_pages,
            "average_confidence": self.average_confidence,
            "average_processing_time_ms": self.average_processing_time_ms,
            "pdf_sha256": self.pdf_sha256,
            "file_size_bytes": self.file_size_bytes,
            "pdf_version": self.pdf_version,
            "pdf_producer": self.pdf_producer,
            "pdf_creator": self.pdf_creator,
            "pdf_creation_date": self.pdf_creation_date.isoformat() if self.pdf_creation_date else None,
            "locked_by": self.locked_by,
            "locked_at": self.locked_at.isoformat() if self.locked_at else None,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "deleted_by": self.deleted_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Batch(id={self.id}, batch_no={self.batch_no!r}, status={self.status})>"


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(
        BigInteger,
        ForeignKey("batches.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    page_number = Column(Integer, default=0)
    batch_page_index = Column(Integer, default=0)
    status = Column(
        Enum(InspectionStatus, name="inspection_status", create_type=False,
             values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=InspectionStatus.UPLOADED.value,
    )
    needs_review = Column(Boolean, default=True, nullable=False)
    error_detail = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    last_retry_at = Column(DateTime(timezone=True), nullable=True)

    tractor_no = Column(String(64), default="", index=True)
    tractor_model = Column(String(128), default="")
    engine_no = Column(String(128), default="", index=True)
    chassis_no = Column(String(128), default="", index=True)
    inspector = Column(String(255), default="")
    date = Column(Date, nullable=True)
    shift = Column(String(32), default="")
    line_no = Column(String(32), default="")
    verified_by = Column(String(255), default="")
    final_verified_by = Column(String(255), default="")

    defects = Column(JSONB, default=list, nullable=False)
    raw_text = Column(Text, default="")
    confidence_scores = Column(JSONB, default=dict, nullable=False)

    ocr_version = Column(String(64), default="")
    ai_version = Column(String(64), default="")
    image_pipeline_version = Column(String(64), default="")

    image_path_original = Column(String(1024), default="")
    image_path_enhanced = Column(String(1024), default="")
    ocr_json_path = Column(String(1024), default="")
    verified_json_path = Column(String(1024), default="")

    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    batch = relationship("Batch", back_populates="inspections")
    events = relationship("SystemEvent", back_populates="inspection", cascade="all, delete-orphan")
    corrections = relationship("CorrectionLog", back_populates="inspection", cascade="all, delete-orphan")
    duplicate_logs = relationship(
        "DuplicateLog",
        foreign_keys="DuplicateLog.inspection_id",
        back_populates="inspection",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_inspections_status", "status"),
        Index(
            "idx_inspections_needs_review",
            "needs_review",
            postgresql_where=text("needs_review = TRUE"),
        ),
    )

    def to_dict(self):
        def fmt(dt):
            return dt.isoformat() if dt else None

        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "page_number": self.page_number,
            "batch_page_index": self.batch_page_index,
            "status": self.status.value if self.status else None,
            "needs_review": self.needs_review,
            "error_detail": self.error_detail,
            "retry_count": self.retry_count,
            "last_retry_at": self.last_retry_at.isoformat() if self.last_retry_at else None,
            "tractor_no": self.tractor_no,
            "tractor_model": self.tractor_model,
            "engine_no": self.engine_no,
            "chassis_no": self.chassis_no,
            "inspector": self.inspector,
            "date": self.date.isoformat() if self.date else None,
            "shift": self.shift,
            "line_no": self.line_no,
            "verified_by": self.verified_by,
            "final_verified_by": self.final_verified_by,
            "defects": self.defects or [],
            "raw_text": self.raw_text,
            "confidence_scores": self.confidence_scores or {},
            "ocr_version": self.ocr_version,
            "ai_version": self.ai_version,
            "image_pipeline_version": self.image_pipeline_version,
            "image_path_original": self.image_path_original,
            "image_path_enhanced": self.image_path_enhanced,
            "ocr_json_path": self.ocr_json_path,
            "verified_json_path": self.verified_json_path,
            "created_at": fmt(self.created_at),
            "updated_at": fmt(self.updated_at),
        }

    def __repr__(self):
        return (
            f"<Inspection(id={self.id}, batch_id={self.batch_id}, "
            f"status={self.status}, needs_review={self.needs_review})>"
        )


class DefectLibrary(Base):
    __tablename__ = "defect_library"

    __table_args__ = (
        Index("idx_defect_library_aliases", "aliases", postgresql_using="gin"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    standard_name = Column(String(255), unique=True, nullable=False)
    aliases = Column(JSONB, default=list, nullable=False)
    category = Column(String(128), default="")
    component = Column(String(128), default="")
    manufacturer_context = Column(String(512), default="")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "standard_name": self.standard_name,
            "aliases": self.aliases or [],
            "category": self.category,
            "component": self.component,
            "manufacturer_context": self.manufacturer_context,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<DefectLibrary(id={self.id}, standard_name={self.standard_name!r})>"


class CorrectionLog(Base):
    __tablename__ = "correction_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inspection_id = Column(
        BigInteger,
        ForeignKey("inspections.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    field_name = Column(String(64), nullable=False)
    ocr_value = Column(Text, default="")
    corrected_value = Column(Text, default="")
    confidence_at_time = Column(Float, nullable=True)
    operator = Column(String(255), default="")
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    inspection = relationship("Inspection", back_populates="corrections")

    def to_dict(self):
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "field_name": self.field_name,
            "ocr_value": self.ocr_value,
            "corrected_value": self.corrected_value,
            "confidence_at_time": self.confidence_at_time,
            "operator": self.operator,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return (
            f"<CorrectionLog(id={self.id}, field={self.field_name!r}, "
            f"inspection_id={self.inspection_id})>"
        )


class LearningEntry(Base):
    __tablename__ = "learning_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    raw_text = Column(String(512), nullable=False)
    normalized_text = Column(String(512), nullable=False)
    field = Column(String(64), nullable=False)
    frequency = Column(Integer, default=1, nullable=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    __table_args__ = (
        Index("idx_learning_entries_raw_field", "raw_text", "field", unique=True),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "raw_text": self.raw_text,
            "normalized_text": self.normalized_text,
            "field": self.field,
            "frequency": self.frequency,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return (
            f"<LearningEntry(id={self.id}, raw={self.raw_text!r} → "
            f"normal={self.normalized_text!r})>"
        )


class DuplicateLog(Base):
    __tablename__ = "duplicate_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inspection_id = Column(
        BigInteger,
        ForeignKey("inspections.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    duplicate_of_id = Column(
        BigInteger,
        ForeignKey("inspections.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    match_type = Column(
        Enum(MatchType, name="match_type", create_type=False,
             values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    action_taken = Column(
        Enum(DuplicateAction, name="duplicate_action", create_type=False,
             values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    operator = Column(String(255), default="")
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    inspection = relationship(
        "Inspection",
        foreign_keys=[inspection_id],
        back_populates="duplicate_logs",
    )
    duplicate_of = relationship("Inspection", foreign_keys=[duplicate_of_id])

    def to_dict(self):
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "duplicate_of_id": self.duplicate_of_id,
            "match_type": self.match_type.value if self.match_type else None,
            "action_taken": self.action_taken.value if self.action_taken else None,
            "operator": self.operator,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return (
            f"<DuplicateLog(id={self.id}, inspection_id={self.inspection_id}, "
            f"match={self.match_type})>"
        )


class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    inspection_id = Column(
        BigInteger,
        ForeignKey("inspections.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=True,
    )
    batch_id = Column(
        BigInteger,
        ForeignKey("batches.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    event = Column(
        Enum(EventType, name="event_type", create_type=False,
             values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    details = Column(JSONB, default=dict, nullable=False)
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    inspection = relationship("Inspection", back_populates="events")
    batch = relationship("Batch", back_populates="events")

    __table_args__ = (
        Index("ix_system_events_inspection_id", "inspection_id"),
        Index("ix_system_events_batch_id", "batch_id"),
        Index("ix_system_events_created_at", "created_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "inspection_id": self.inspection_id,
            "batch_id": self.batch_id,
            "event": self.event.value if self.event else None,
            "details": self.details or {},
            "processing_time_ms": self.processing_time_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return (
            f"<SystemEvent(id={self.id}, event={self.event}, "
            f"inspection_id={self.inspection_id})>"
        )


class Export(Base):
    __tablename__ = "exports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(
        BigInteger,
        ForeignKey("batches.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    file_type = Column(String(32), nullable=False)
    file_path = Column(String(1024), nullable=False)
    created_by = Column(String(255), default="")
    created_at = Column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    batch = relationship("Batch", back_populates="exports")

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "file_type": self.file_type,
            "file_path": self.file_path,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return (
            f"<Export(id={self.id}, batch_id={self.batch_id}, "
            f"type={self.file_type!r})>"
        )


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
