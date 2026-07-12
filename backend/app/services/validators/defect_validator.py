import logging
import re

logger = logging.getLogger(__name__)

FORM_LABEL_PATTERNS = [
    re.compile(r"^\d+\.?\s*$"),
    re.compile(r"^(road testing|hydraulic|underbody|toe in|leakage|electrical|paint|bumper|opcs|other remark|new inspection|rear tyre)", re.IGNORECASE),
    re.compile(r"^(check points|status|defect details|sr\. no\.|defect description|repaireo by|final verified by)", re.IGNORECASE),
    re.compile(r"^(shortages|rev\.|format)", re.IGNORECASE),
    re.compile(r"^[a-fgl-z]\s*$", re.IGNORECASE),
    re.compile(r"^[a-fgl-z]\d+\s*$", re.IGNORECASE),
]


class DefectValidator:
    def validate(self, defects: list) -> list:
        validated = []
        for defect in defects:
            text = defect.get("text", "").strip()
            if not text or len(text) < 3:
                continue
            if self._is_form_label(text):
                continue
            validated.append(defect)
        return validated

    def _is_form_label(self, text: str) -> bool:
        for pattern in FORM_LABEL_PATTERNS:
            if pattern.search(text):
                return True
        return False
