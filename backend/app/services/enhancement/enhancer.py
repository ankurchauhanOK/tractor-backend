import logging
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ImageEnhancer:
    def enhance(self, image_bytes: bytes) -> Tuple[bytes, dict]:
        steps_applied = []
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            logger.warning("Could not decode image, returning original")
            return image_bytes, {"error": "decode_failed"}

        original = img.copy()

        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        steps_applied.append("grayscale")

        # 2. Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        steps_applied.append("denoise")

        # 3. Deskew
        deskewed, skew_angle = self._deskew(denoised)
        if abs(skew_angle) > 0.5:
            steps_applied.append(f"deskew:{skew_angle:.2f}deg")

        # 4. Contrast enhancement (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(deskewed)
        steps_applied.append("clahe")

        # 5. Binarize (Otsu)
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        steps_applied.append("otsu_binarize")

        # Encode back to PNG bytes
        _, buf = cv2.imencode(".png", binary)
        result_bytes = buf.tobytes()

        size_reduction = (1 - len(result_bytes) / max(len(image_bytes), 1)) * 100

        logger.info(
            "Enhanced image: %s (size: %d→%dB, %.0f%% reduction)",
            ", ".join(steps_applied),
            len(image_bytes),
            len(result_bytes),
            size_reduction,
        )

        return result_bytes, {
            "steps": steps_applied,
            "original_size": len(image_bytes),
            "enhanced_size": len(result_bytes),
            "skew_angle": round(skew_angle, 2),
            "size_reduction_pct": round(size_reduction, 1),
        }

    def _deskew(self, img: np.ndarray) -> Tuple[np.ndarray, float]:
        coords = np.column_stack(np.where(img < 255))
        if len(coords) < 10:
            return img, 0.0

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = 90 + angle
        if abs(angle) < 0.5:
            return img, 0.0

        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            img, matrix, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return rotated, angle

    def enhance_file(self, input_path: str, output_path: Optional[str] = None) -> Tuple[bytes, dict]:
        with open(input_path, "rb") as f:
            data = f.read()
        enhanced, meta = self.enhance(data)
        if output_path:
            with open(output_path, "wb") as f:
                f.write(enhanced)
        return enhanced, meta
