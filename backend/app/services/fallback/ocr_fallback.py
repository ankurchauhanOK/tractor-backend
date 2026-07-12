import logging
from typing import Optional

from app.services.ocr.service import OCRService

logger = logging.getLogger(__name__)


class OCRFallback:
    def __init__(self):
        self._ocr = OCRService()

    def extract_text(self, roi_image_bytes: bytes) -> str:
        try:
            result = self._ocr.process_bytes(roi_image_bytes)
            text = result.raw_text.strip()
            logger.info("OCR fallback: %d words, confidence=%.4f", len(result.words), result.confidence)
            return text
        except Exception as e:
            logger.error("OCR fallback failed: %s", e)
            return ""
