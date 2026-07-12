from typing import Dict

from app.services.result_model import VisionExtractionResult
from app.services.validation.rules import (
    ChecklistValidator,
    DateValidator,
    DefectValidator,
    LineValidator,
    ShiftValidator,
    TractorValidator,
    ShortageValidator,
)


class ConfidenceEngine:
    def __init__(self):
        self._tractor = TractorValidator()
        self._date = DateValidator()
        self._shift = ShiftValidator()
        self._line = LineValidator()
        self._defect = DefectValidator()
        self._shortage = ShortageValidator()
        self._checklist = ChecklistValidator()

    def compute(self, result: VisionExtractionResult) -> Dict[str, float]:
        return {
            "tractor_no": self._field_score(result.tractor_no, required=True, validator=self._tractor),
            "date": self._field_score(result.date, required=False, validator=self._date),
            "shift": self._field_score(result.shift, required=False, validator=self._shift),
            "line_no": self._field_score(result.line_no, required=True, validator=self._line),
            "defects": self._list_score(result.defects, validator=self._defect),
            "shortages": self._list_score(result.shortages, validator=self._shortage),
        }

    def _field_score(self, value: str, required: bool, validator) -> float:
        if not value:
            return 0.3 if required else 0.5
        exists = 0.3
        valid = 0.3 if validator.validate(value) else 0.0
        required_score = 0.2 if required else 0.1
        return min(exists + valid + required_score + 0.2, 1.0)

    def _list_score(self, items: list, validator) -> float:
        if not items:
            return 0.3
        valid = validator.validate(items)
        exists = 0.3
        valid_score = 0.4 if valid else 0.0
        return min(exists + valid_score + 0.3, 1.0)
