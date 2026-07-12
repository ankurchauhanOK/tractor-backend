import logging
from typing import Dict, List

from app.services.result_model import VisionExtractionResult

logger = logging.getLogger(__name__)

FIELD_MAP = {
    "tractor_no": "tractor_no",
    "date": "date",
    "shift": "shift",
    "line": "line_no",
}


class MergeEngine:
    def merge(self, roi_results: Dict[str, dict], provider: str = "") -> VisionExtractionResult:
        result = VisionExtractionResult(provider_used=provider)

        for roi_name, data in roi_results.items():
            if roi_name in FIELD_MAP:
                target = FIELD_MAP[roi_name]
                value = self._extract_value(data)
                setattr(result, target, value)

            elif roi_name == "defects":
                defects = data.get("defects", data.get("items", []))
                result.defects = self._normalize_list(defects)

            elif roi_name == "shortages":
                shortages = data.get("shortages", data.get("items", []))
                result.shortages = self._normalize_list(shortages)

            elif roi_name == "checklist":
                items = data.get("items", data.get("checklist", []))
                result.checklist = self._normalize_list(items)

        logger.info(
            "Merged %d ROIs: tractor=%s date=%s shift=%s line=%s defects=%d",
            len(roi_results),
            result.tractor_no,
            result.date,
            result.shift,
            result.line_no,
            len(result.defects),
        )

        return result

    def _extract_value(self, data: dict) -> str:
        if not data:
            return ""
        val = data.get("value", data.get("text", ""))
        if val is None:
            return ""
        return str(val).strip()

    def _normalize_list(self, items: List) -> List[dict]:
        normalized = []
        for item in items:
            if isinstance(item, dict):
                normalized.append(item)
            elif isinstance(item, str):
                normalized.append({"text": item})
        return normalized
