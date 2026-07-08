"""add pdf metadata columns to batches, add page_enqueued to event_type

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to batches table
    op.add_column(
        "batches",
        sa.Column("pdf_sha256", sa.String(64), nullable=False, server_default=""),
    )
    op.add_column(
        "batches",
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.add_column(
        "batches",
        sa.Column("pdf_version", sa.String(16), nullable=False, server_default=""),
    )
    op.add_column(
        "batches",
        sa.Column("pdf_producer", sa.String(255), nullable=False, server_default=""),
    )
    op.add_column(
        "batches",
        sa.Column("pdf_creator", sa.String(255), nullable=False, server_default=""),
    )
    op.add_column(
        "batches",
        sa.Column("pdf_creation_date", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_batches_pdf_sha256", "batches", ["pdf_sha256"])

    # Add PAGE_ENQUEUED to event_type enum
    op.execute("ALTER TYPE event_type ADD VALUE 'page_enqueued'")


def downgrade() -> None:
    op.drop_index("ix_batches_pdf_sha256", table_name="batches")
    op.drop_column("batches", "pdf_creation_date")
    op.drop_column("batches", "pdf_creator")
    op.drop_column("batches", "pdf_producer")
    op.drop_column("batches", "pdf_version")
    op.drop_column("batches", "file_size_bytes")
    op.drop_column("batches", "pdf_sha256")

    # Cannot remove a value from a PostgreSQL ENUM in standard downgrade.
    # The enum value will remain but will be unused after downgrade.
    # Full ENUM recreation would require creating a new type and migrating columns.
    pass
