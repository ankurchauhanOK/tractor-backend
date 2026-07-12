import logging
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

from app.config import (
    BLANK_PAGE_THRESHOLD,
    EXPECTED_PAGE_HEIGHT,
    EXPECTED_PAGE_WIDTH,
)

logger = logging.getLogger(__name__)

EXPECTED_A4_RATIO = EXPECTED_PAGE_WIDTH / EXPECTED_PAGE_HEIGHT
DIM_TOLERANCE = 50
RATIO_TOLERANCE = 0.02


@dataclass
class ScanValidationResult:
    valid: bool = True
    error: str = ""
    corrected_bytes: Optional[bytes] = None
    rotation_angle: int = 0


class ScanValidationService:
    def validate(self, image_bytes: bytes) -> ScanValidationResult:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)
        if img is None:
            return ScanValidationResult(valid=False, error="Corrupted image: could not decode")

        h, w = img.shape[:2]

        result = self._check_rotation(w, h, img, image_bytes)
        if result.rotation_angle != 0:
            logger.info("Auto-rotated image by %d degrees", result.rotation_angle)
            return self.validate(result.corrected_bytes)

        blank_check = self._check_blank(img)
        if not blank_check:
            return ScanValidationResult(valid=False, error="Blank page: >98% white pixels")

        return ScanValidationResult(valid=True, corrected_bytes=image_bytes, rotation_angle=0)

    def _check_rotation(
        self,
        w: int,
        h: int,
        img: np.ndarray,
        original_bytes: bytes,
    ) -> ScanValidationResult:
        is_portrait = h > w
        is_landscape = w > h

        if is_portrait and abs(w / h - EXPECTED_A4_RATIO) < RATIO_TOLERANCE:
            return ScanValidationResult(valid=True, corrected_bytes=original_bytes, rotation_angle=0)

        if is_landscape and abs(h / w - EXPECTED_A4_RATIO) < RATIO_TOLERANCE:
            rotated = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            _, buf = cv2.imencode(".png", rotated)
            return ScanValidationResult(
                valid=True,
                corrected_bytes=buf.tobytes(),
                rotation_angle=90,
            )

        if is_landscape and abs(w / h - EXPECTED_A4_RATIO) < RATIO_TOLERANCE:
            rotated = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
            _, buf = cv2.imencode(".png", rotated)
            return ScanValidationResult(
                valid=True,
                corrected_bytes=buf.tobytes(),
                rotation_angle=270,
            )

        if is_portrait and abs(w / h - EXPECTED_A4_RATIO) >= RATIO_TOLERANCE:
            rotated = cv2.rotate(img, cv2.ROTATE_180)
            _, buf = cv2.imencode(".png", rotated)
            return ScanValidationResult(
                valid=True,
                corrected_bytes=buf.tobytes(),
                rotation_angle=180,
            )

        return ScanValidationResult(
            valid=True,
            corrected_bytes=original_bytes,
            rotation_angle=0,
        )

    def _check_resolution(self, w: int, h: int) -> bool:
        if abs(w - EXPECTED_PAGE_WIDTH) > DIM_TOLERANCE:
            logger.warning("Unexpected width: %d (expected %d)", w, EXPECTED_PAGE_WIDTH)
        if abs(h - EXPECTED_PAGE_HEIGHT) > DIM_TOLERANCE:
            logger.warning("Unexpected height: %d (expected %d)", h, EXPECTED_PAGE_HEIGHT)
        return True

    def _check_blank(self, img: np.ndarray) -> bool:
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        white_pixels = np.sum(binary == 255)
        total_pixels = binary.size
        ratio = white_pixels / total_pixels
        logger.debug("White pixel ratio: %.4f (threshold: %.4f)", ratio, BLANK_PAGE_THRESHOLD)
        return ratio < BLANK_PAGE_THRESHOLD
