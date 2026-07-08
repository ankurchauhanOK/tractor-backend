"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── TABLE: batches ─────────────────────────────────────────────────
    op.create_table(
        "batches",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("batch_no", sa.String(32), nullable=False),
        sa.Column("operator", sa.String(255), nullable=False, server_default=""),
        sa.Column("scanner_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("total_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            postgresql.ENUM(
                "uploading", "queued", "processing", "waiting_review",
                "completed", "completed_with_errors", "cancelled",
                name="batch_status",
                create_type=True,
            ),
            nullable=False,
            server_default="uploading",
        ),
        sa.Column("progress", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("original_pdf_path", sa.String(1024), nullable=False, server_default=""),
        sa.Column("ocr_version", sa.String(64), nullable=False, server_default=""),
        sa.Column("ai_version", sa.String(64), nullable=False, server_default=""),
        sa.Column(
            "image_pipeline_version", sa.String(64), nullable=False, server_default=""
        ),
        sa.Column("factory_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("plant_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("line_name", sa.String(128), nullable=False, server_default=""),
        sa.Column("processed_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("verified_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("review_pages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_confidence", sa.Float(), nullable=True),
        sa.Column("average_processing_time_ms", sa.Float(), nullable=True),
        sa.Column("locked_by", sa.String(255), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_batches_batch_no", "batches", ["batch_no"], unique=True)
    op.create_index("ix_batches_status", "batches", ["status"])
    op.create_index("ix_batches_created_at", "batches", ["created_at"])

    # ── TABLE: defect_library ───────────────────────────────────────────
    op.create_table(
        "defect_library",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("standard_name", sa.String(255), nullable=False),
        sa.Column("aliases", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("category", sa.String(128), nullable=False, server_default=""),
        sa.Column("component", sa.String(128), nullable=False, server_default=""),
        sa.Column(
            "manufacturer_context", sa.String(512), nullable=False, server_default=""
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("standard_name"),
    )
    op.create_index(
        "idx_defect_library_aliases",
        "defect_library",
        ["aliases"],
        postgresql_using="gin",
    )

    # ── TABLE: learning_entries ─────────────────────────────────────────
    op.create_table(
        "learning_entries",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("raw_text", sa.String(512), nullable=False),
        sa.Column("normalized_text", sa.String(512), nullable=False),
        sa.Column("field", sa.String(64), nullable=False),
        sa.Column("frequency", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("last_used", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("raw_text", "field", name="uq_raw_text_field"),
    )
    op.create_index(
        "ix_learning_entries_raw_field",
        "learning_entries",
        ["raw_text", "field"],
        unique=True,
    )

    # ── TABLE: inspections ──────────────────────────────────────────────
    op.create_table(
        "inspections",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("batch_id", sa.BigInteger(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "batch_page_index", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "uploaded", "queued", "processing", "ocr_completed",
                "needs_review", "verified", "failed", "exported",
                name="inspection_status",
                create_type=True,
            ),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column(
            "needs_review", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tractor_no", sa.String(64), nullable=False, server_default=""),
        sa.Column("tractor_model", sa.String(128), nullable=False, server_default=""),
        sa.Column("engine_no", sa.String(128), nullable=False, server_default=""),
        sa.Column("chassis_no", sa.String(128), nullable=False, server_default=""),
        sa.Column("inspector", sa.String(255), nullable=False, server_default=""),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("shift", sa.String(8), nullable=False, server_default=""),
        sa.Column("line_no", sa.String(32), nullable=False, server_default=""),
        sa.Column("verified_by", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "final_verified_by", sa.String(255), nullable=False, server_default=""
        ),
        sa.Column("defects", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("raw_text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "confidence_scores",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("ocr_version", sa.String(64), nullable=False, server_default=""),
        sa.Column("ai_version", sa.String(64), nullable=False, server_default=""),
        sa.Column(
            "image_pipeline_version",
            sa.String(64),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "image_path_original",
            sa.String(1024),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "image_path_enhanced",
            sa.String(1024),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "ocr_json_path", sa.String(1024), nullable=False, server_default=""
        ),
        sa.Column(
            "verified_json_path",
            sa.String(1024),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["batches.id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspections_batch_id", "inspections", ["batch_id"])
    op.create_index("ix_inspections_tractor_no", "inspections", ["tractor_no"])
    op.create_index("ix_inspections_engine_no", "inspections", ["engine_no"])
    op.create_index("ix_inspections_chassis_no", "inspections", ["chassis_no"])
    op.create_index("ix_inspections_status", "inspections", ["status"])
    op.create_index(
        "ix_inspections_needs_review",
        "inspections",
        ["needs_review"],
        postgresql_where=sa.text("needs_review = TRUE"),
    )

    # ── TABLE: correction_log ───────────────────────────────────────────
    op.create_table(
        "correction_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("inspection_id", sa.BigInteger(), nullable=False),
        sa.Column("field_name", sa.String(64), nullable=False),
        sa.Column("ocr_value", sa.Text(), nullable=False, server_default=""),
        sa.Column("corrected_value", sa.Text(), nullable=False, server_default=""),
        sa.Column("confidence_at_time", sa.Float(), nullable=True),
        sa.Column("operator", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_correction_log_inspection_id", "correction_log", ["inspection_id"]
    )

    # ── TABLE: duplicate_log ────────────────────────────────────────────
    op.create_table(
        "duplicate_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("inspection_id", sa.BigInteger(), nullable=False),
        sa.Column("duplicate_of_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "match_type",
            postgresql.ENUM(
                "tractor_no", "engine_no", "chassis_no", "page_hash",
                name="match_type",
                create_type=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "action_taken",
            postgresql.ENUM(
                "skipped", "replaced", "kept_both",
                name="duplicate_action",
                create_type=True,
            ),
            nullable=False,
        ),
        sa.Column("operator", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["duplicate_of_id"],
            ["inspections.id"],
            ondelete="SET NULL",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_duplicate_log_inspection_id", "duplicate_log", ["inspection_id"]
    )

    # ── TABLE: system_events ────────────────────────────────────────────
    op.create_table(
        "system_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("inspection_id", sa.BigInteger(), nullable=True),
        sa.Column("batch_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "event",
            postgresql.ENUM(
                "page_uploaded", "ocr_started", "ocr_completed",
                "ai_corrected", "duplicate_found", "verified", "exported",
                name="event_type",
                create_type=True,
            ),
            nullable=False,
        ),
        sa.Column("details", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["batches.id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_system_events_inspection_id",
        "system_events",
        ["inspection_id"],
    )
    op.create_index(
        "ix_system_events_batch_id",
        "system_events",
        ["batch_id"],
    )
    op.create_index(
        "ix_system_events_created_at",
        "system_events",
        ["created_at"],
    )

    # ── TABLE: exports ──────────────────────────────────────────────────
    op.create_table(
        "exports",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("batch_id", sa.BigInteger(), nullable=False),
        sa.Column("file_type", sa.String(32), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("created_by", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["batches.id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exports_batch_id", "exports", ["batch_id"])


def downgrade() -> None:
    op.drop_table("exports")
    op.drop_table("system_events")
    op.drop_table("duplicate_log")
    op.drop_table("correction_log")
    op.drop_table("inspections")
    op.drop_table("learning_entries")
    op.drop_table("defect_library")
    op.drop_table("batches")

    op.execute("DROP TYPE IF EXISTS event_type")
    op.execute("DROP TYPE IF EXISTS duplicate_action")
    op.execute("DROP TYPE IF EXISTS match_type")
    op.execute("DROP TYPE IF EXISTS batch_status")
    op.execute("DROP TYPE IF EXISTS inspection_status")
