import logging
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

VALID_SHIFTS = {"A", "B", "C"}
VALID_SINGLE_LETTERS = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
                        "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"}


class TractorValidator:
    def validate(self, value: str) -> bool:
        return bool(value) and len(value) >= 2


class DateValidator:
    def validate(self, value: str) -> bool:
        if not value:
            return False
        date_pattern = re.compile(r"\d{2}[-/]\d{2}[-/]\d{2,4}")
        if date_pattern.search(value):
            return True
        if re.match(r"^\d{6,10}$", value):
            return True
        return False


class ShiftValidator:
    def validate(self, value: str) -> bool:
        if not value:
            return False
        return value.upper().strip() in VALID_SHIFTS


class LineValidator:
    def validate(self, value: str) -> bool:
        if not value:
            return False
        cleaned = value.strip()
        if len(cleaned) < 2:
            return False
        if cleaned.upper() in VALID_SINGLE_LETTERS:
            return False
        return True


class DefectValidator:
    def validate(self, defects: List[dict]) -> bool:
        if not defects:
            return False
        seen = set()
        valid = []
        for d in defects:
            text = d.get("text", "").strip()
            if not text or len(text) < 3:
                continue
            if text.lower() in seen:
                continue
            seen.add(text.lower())
            valid.append(d)
        defects[:] = valid
        return len(valid) >= 1


class ShortageValidator:
    def validate(self, shortages: List[dict]) -> bool:
        return True


class ChecklistValidator:
    def validate(self, items: List[dict]) -> bool:
        return True
