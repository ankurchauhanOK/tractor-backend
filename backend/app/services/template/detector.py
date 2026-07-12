import logging
from enum import Enum
from typing import List, Optional

import cv2
import numpy as np

from app.config import EXPECTED_PAGE_HEIGHT, EXPECTED_PAGE_WIDTH

logger = logging.getLogger(__name__)

EXPECTED_A4_RATIO = EXPECTED_PAGE_WIDTH / EXPECTED_PAGE_HEIGHT
DIM_TOLERANCE = 50
RATIO_TOLERANCE = 0.02


class TemplateType(str, Enum):
    MAHINDRA_TRACTOR_V1 = "mahindra_tractor_v1"
    UNKNOWN = "unknown"


class TemplateDetector:
    def __init__(self):
        self._ocr_words: Optional[List[dict]] = None

    def set_ocr_words(self, words: List[dict]):
        self._ocr_words = words

    def detect(self, image: np.ndarray) -> TemplateType:
        h, w = image.shape[:2]

        ratio = w / h
        logger.debug("Image: %dx%d, ratio=%.4f", w, h, ratio)

        if self._is_mahindra_v1_by_dimensions(w, h, ratio):
            logger.info("Template detected as MAHINDRA_TRACTOR_V1 by dimensions")
            return TemplateType.MAHINDRA_TRACTOR_V1

        if self._is_mahindra_v1_by_structure(image):
            logger.info("Template detected as MAHINDRA_TRACTOR_V1 by structure")
            return TemplateType.MAHINDRA_TRACTOR_V1

        if self._ocr_words and self._is_mahindra_v1_by_text():
            logger.info("Template detected as MAHINDRA_TRACTOR_V1 by OCR text")
            return TemplateType.MAHINDRA_TRACTOR_V1

        logger.info("No template matched")
        return TemplateType.UNKNOWN

    def _is_mahindra_v1_by_dimensions(self, w: int, h: int, ratio: float) -> bool:
        dim_match = abs(w - EXPECTED_PAGE_WIDTH) < DIM_TOLERANCE and abs(h - EXPECTED_PAGE_HEIGHT) < DIM_TOLERANCE
        ratio_match = abs(ratio - EXPECTED_A4_RATIO) < RATIO_TOLERANCE
        return dim_match and ratio_match

    def _is_mahindra_v1_by_structure(self, image: np.ndarray) -> bool:
        h, w = image.shape[:2]
        if h < 100 or w < 100:
            return False

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        header_y_end = int(h * 0.16)
        header_roi = binary[:header_y_end, :]
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 4, 1))
        h_lines = cv2.morphologyEx(header_roi, cv2.MORPH_OPEN, h_kernel)
        line_count = np.sum(h_lines > 0)

        expected_text_region = binary[int(h * 0.04):int(h * 0.12), int(w * 0.20):int(w * 0.60)]
        text_density = np.mean(expected_text_region > 0) if expected_text_region.size > 0 else 0

        logger.debug("Structural check: lines=%d, text_density=%.4f", line_count, text_density)
        return line_count > 50 and text_density > 0.01

    def _is_mahindra_v1_by_text(self) -> bool:
        if not self._ocr_words:
            return False
        combined = " ".join(w.get("text", "") for w in self._ocr_words).upper()
        required = ["MAHINDRA", "TRACTOR INSPECTION SHEET"]
        return all(text.upper() in combined for text in required)
