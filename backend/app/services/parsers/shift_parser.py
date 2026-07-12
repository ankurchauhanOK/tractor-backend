import re
import logging
from typing import Optional

from app.services.parsers.base import BaseFieldParser
from app.services.layout.models import Cell
from app.services.layout.field_result import FieldResult
from app.services.layout.checkbox_detector import CheckboxDetector

logger = logging.getLogger(__name__)

SHIFT_LABELS = ["A", "B", "C", "MORNING", "AFTERNOON", "EVENING", "NIGHT", "GENERAL", "DAY"]


class ShiftParser(BaseFieldParser):
    def __init__(self):
        self._checkbox = CheckboxDetector()

    def parse(self, cell: Optional[Cell]) -> FieldResult:
        if not cell or not cell.words:
            return FieldResult()

        text = cell.text.strip().upper()
        if not text:
            return FieldResult()

        checked = self._checkbox.detect_checked(cell.words, SHIFT_LABELS)
        if checked and len(cell.words) == 1:
            return FieldResult(
                value=checked,
                confidence=cell.confidence,
                source="checkbox",
                validation="ok",
                raw_text=text,
                bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
            )

        letters = re.findall(r"[ABC]", text)
        unique = sorted(set(letters))

        if not unique:
            return FieldResult(
                value=text,
                confidence=cell.confidence * 0.5,
                source="cell",
                validation="failed",
                raw_text=text,
                bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
            )

        if len(unique) == 1:
            return FieldResult(
                value=unique[0],
                confidence=cell.confidence,
                source="cell",
                validation="ok",
                raw_text=text,
                bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
            )

        letter_conf = cell.confidence * 0.7
        return FieldResult(
            value=unique[0],
            confidence=letter_conf,
            source="cell",
            validation="uncertain",
            raw_text=text,
            bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
        )
