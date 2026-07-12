import logging
from dataclasses import dataclass, field
from typing import Dict, List

from app.config import CONFIDENCE_THRESHOLD
from app.services.result_model import VisionExtractionResult
from app.services.validation.rules import (
    ChecklistValidator,
    DateValidator,
    DefectValidator,
    LineValidator,
    ShiftValidator,
    ShortageValidator,
    TractorValidator,
)
from app.services.validation.confidence import ConfidenceEngine

logger = logging.getLogger(__name__)


@dataclass
class FieldValidation:
    name: str
    passed: bool
    value: str
    reason: str = ""


@dataclass
class ValidationResult:
    passed: bool
    fields: List[FieldValidation] = field(default_factory=list)
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    needs_review: bool = False


class ValidationEngine:
    def __init__(self):
        self._tractor = TractorValidator()
        self._date = DateValidator()
        self._shift = ShiftValidator()
        self._line = LineValidator()
        self._defect = DefectValidator()
        self._shortage = ShortageValidator()
        self._checklist = ChecklistValidator()
        self._confidence = ConfidenceEngine()

    def validate(self, result: VisionExtractionResult) -> ValidationResult:
        field_results = [
            FieldValidation("tractor_no", self._tractor.validate(result.tractor_no), result.tractor_no),
            FieldValidation("date", self._date.validate(result.date), result.date),
            FieldValidation("shift", self._shift.validate(result.shift), result.shift),
            FieldValidation("line_no", self._line.validate(result.line_no), result.line_no),
        ]

        defect_valid = self._defect.validate(result.defects)
        field_results.append(FieldValidation("defects", defect_valid, str(len(result.defects))))

        short_valid = self._shortage.validate(result.shortages)
        field_results.append(FieldValidation("shortages", short_valid, str(len(result.shortages))))

        checklist_valid = self._checklist.validate(result.checklist)
        field_results.append(FieldValidation("checklist", checklist_valid, str(len(result.checklist))))

        confidence_scores = self._confidence.compute(result)
        all_pass = all(f.passed for f in field_results)
        low_confidence = any(v < CONFIDENCE_THRESHOLD for v in confidence_scores.values())

        logger.info(
            "Validation: all_pass=%s low_confidence=%s scores=%s",
            all_pass, low_confidence, confidence_scores,
        )

        return ValidationResult(
            passed=all_pass and not low_confidence,
            fields=field_results,
            confidence_scores=confidence_scores,
            needs_review=not all_pass or low_confidence,
        )
