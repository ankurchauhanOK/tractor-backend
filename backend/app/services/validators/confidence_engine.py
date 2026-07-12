import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

ZONE_WEIGHTS = {
    "header": 1.1,
    "checklist": 1.0,
    "defects": 1.0,
    "shortages": 0.9,
    "footer": 0.5,
}

FIELD_ZONE_MAP = {
    "tractor_no": "header",
    "engine_no": "header",
    "chassis_no": "header",
    "inspector": "header",
    "date": "header",
    "shift": "header",
    "line_no": "header",
    "dif": "defects",
}


class ConfidenceEngine:
    def compute_field(
        self,
        field_name: str,
        ocr_confidence: float,
        field_exists: bool,
        spatial_distance: Optional[float] = None,
        validation_passed: Optional[bool] = None,
    ) -> float:
        base = min(ocr_confidence, 0.95)

        ocr_score = base * (0.4 if field_exists else 0.2)

        spatial_score = 0.0
        if spatial_distance is not None:
            if spatial_distance < 50:
                spatial_score = 0.95 * 0.2
            elif spatial_distance < 150:
                spatial_score = 0.7 * 0.2
            else:
                spatial_score = 0.4 * 0.2
        else:
            spatial_score = 0.5 * 0.2 if field_exists else 0.0

        validation_score = 0.0
        if validation_passed is not None:
            validation_score = (0.2 if validation_passed else 0.05)

        zone = FIELD_ZONE_MAP.get(field_name, "unknown")
        zone_weight = ZONE_WEIGHTS.get(zone, 0.8)
        zone_score = zone_weight * 0.2

        total = ocr_score + spatial_score + validation_score + zone_score
        return round(min(total, 0.99), 4)
