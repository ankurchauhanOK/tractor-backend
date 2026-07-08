import os
import logging
from app.services.ocr.base import OCREngine

logger = logging.getLogger(__name__)

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")


def create_ocr_engine() -> OCREngine:
    try:
        from app.services.ocr.paddle_ocr import PaddleOCREngine

        engine = PaddleOCREngine()
        logger.info("Using PaddleOCR engine")
        return engine
    except (ImportError, OSError, Exception) as e:
        logger.warning(f"PaddleOCR failed to initialize: {e}. Falling back to EasyOCR.")
        try:
            from app.services.ocr.easy_ocr import EasyOCREngine

            engine = EasyOCREngine()
            logger.info("Using EasyOCR engine (fallback)")
            return engine
        except (ImportError, OSError, Exception) as e2:
            logger.error(f"EasyOCR also failed to initialize: {e2}")
            raise RuntimeError("No OCR engine available") from e2
