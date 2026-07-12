import re
import logging
from typing import Optional

from app.services.parsers.base import BaseFieldParser
from app.services.layout.models import Cell
from app.services.layout.field_result import FieldResult

logger = logging.getLogger(__name__)

SINGLE_LETTERS = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
                  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"}


class LineStageParser(BaseFieldParser):
    MIN_LENGTH = 2

    def parse(self, cell: Optional[Cell]) -> FieldResult:
        if not cell or not cell.words:
            return FieldResult()

        text = cell.text.strip()
        if not text:
            return FieldResult()

        words = re.findall(r"[A-Za-z0-9\.\-/]+", text)
        filtered = [w for w in words if w.upper() not in SINGLE_LETTERS]
        cleaned = " ".join(filtered) if filtered else text
        cleaned = re.sub(r"[^A-Za-z0-9\-\./ ]", "", cleaned).strip()

        if len(cleaned) < self.MIN_LENGTH:
            return FieldResult(
                value=cleaned,
                confidence=cell.confidence * 0.5,
                source="cell",
                validation="uncertain",
                raw_text=text,
                bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
            )

        return FieldResult(
            value=cleaned,
            confidence=cell.confidence,
            source="cell",
            validation="ok",
            raw_text=text,
            bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
        )
