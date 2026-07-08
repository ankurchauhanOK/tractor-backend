import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.config import MAX_PAGE_HEIGHT, MAX_PAGE_WIDTH, PDF_DPI

logger = logging.getLogger(__name__)


class PDFValidationError(ValueError):
    pass


class PDFMetadata:
    def __init__(self, doc: fitz.Document):
        meta = doc.metadata or {}
        self.page_count = len(doc)
        fmt = meta.get("format", "")
        self.pdf_version = fmt.replace("PDF ", "") if fmt.startswith("PDF ") else fmt
        self.producer = meta.get("producer", "")
        self.creator = meta.get("creator", "")
        creation = meta.get("creationDate")
        self.creation_date: Optional[datetime] = None
        if creation and creation.startswith("D:"):
            try:
                self.creation_date = datetime.strptime(creation[2:16], "%Y%m%d%H%M%S")
            except (ValueError, IndexError):
                pass


def _compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class PDFSplitter:
    def __init__(self, dpi: int = PDF_DPI):
        self.dpi = dpi

    def validate(self, pdf_bytes: bytes) -> PDFMetadata:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise PDFValidationError(f"Cannot open PDF: {e}") from e
        try:
            if doc.is_encrypted or doc.needs_pass:
                raise PDFValidationError("PDF is encrypted and cannot be processed")

            metadata = PDFMetadata(doc)

            if metadata.page_count == 0:
                raise PDFValidationError("PDF has zero pages")

            for i in range(metadata.page_count):
                page = doc.load_page(i)
                rect = page.rect
                if rect.width > MAX_PAGE_WIDTH or rect.height > MAX_PAGE_HEIGHT:
                    raise PDFValidationError(
                        f"Page {i + 1} exceeds max dimensions "
                        f"({rect.width:.0f}x{rect.height:.0f} > "
                        f"{MAX_PAGE_WIDTH}x{MAX_PAGE_HEIGHT})"
                    )

            return metadata
        finally:
            doc.close()

    def extract_metadata(self, pdf_bytes: bytes) -> Dict:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise PDFValidationError(f"Cannot open PDF: {e}") from e
        try:
            meta = PDFMetadata(doc)
            return {
                "pdf_sha256": _compute_sha256(pdf_bytes),
                "total_pages": meta.page_count,
                "file_size_bytes": len(pdf_bytes),
                "pdf_version": meta.pdf_version,
                "pdf_producer": meta.producer,
                "pdf_creator": meta.creator,
                "pdf_creation_date": meta.creation_date,
            }
        finally:
            doc.close()

    def split(self, pdf_bytes: bytes) -> List[Tuple[int, bytes, str]]:
        metadata = self.validate(pdf_bytes)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages: List[Tuple[int, bytes, str]] = []

        try:
            for page_num in range(metadata.page_count):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=self.dpi)
                img_bytes = pix.tobytes("png")
                pages.append((page_num + 1, img_bytes, "png"))
                logger.debug("Split page %d/%d (%d bytes)", page_num + 1, metadata.page_count, len(img_bytes))
        finally:
            doc.close()

        logger.info("Split PDF into %d pages at %d DPI", len(pages), self.dpi)
        return pages
