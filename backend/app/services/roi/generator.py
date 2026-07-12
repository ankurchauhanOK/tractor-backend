import logging
from typing import Optional

import cv2
import numpy as np

from templates.base import BaseTemplate
from app.services.roi.cache import ROICache
from app.services.roi.types import ROI

logger = logging.getLogger(__name__)


class ROIGenerator:
    def generate(self, image_bytes: bytes, template: BaseTemplate) -> ROICache:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError("Could not decode image for ROI generation")

        h, w = img.shape[:2]
        cache = ROICache()
        sub_rois = template.get_sub_rois()

        parent_map = {
            "tractor_no": "header",
            "date": "header",
            "shift": "header",
            "line": "header",
            "checklist": "checklist",
            "defects": "defects",
            "shortages": "shortages",
        }

        for name, coords in sub_rois.items():
            x = int(coords["x"] * w)
            y = int(coords["y"] * h)
            rw = int(coords["width"] * w)
            rh = int(coords["height"] * h)

            x = max(0, x)
            y = max(0, y)
            rw = min(rw, w - x)
            rh = min(rh, h - y)

            crop = img[y:y + rh, x:x + rw]
            if crop.size == 0:
                logger.warning("Empty crop for ROI '%s' at (%d,%d,%d,%d)", name, x, y, rw, rh)
                continue

            _, buf = cv2.imencode(".png", crop)
            roi = ROI(
                name=name,
                image_bytes=buf.tobytes(),
                bbox=(x, y, rw, rh),
                parent=parent_map.get(name, ""),
            )
            cache.set(name, roi)
            logger.debug("Generated ROI '%s': (%d,%d,%d,%d) %d bytes", name, x, y, rw, rh, len(roi.image_bytes))

        return cache
