import re
import logging
from typing import Optional

from app.services.parsers.base import BaseFieldParser
from app.services.layout.models import Cell
from app.services.layout.field_result import FieldResult

logger = logging.getLogger(__name__)


class TractorParser(BaseFieldParser):
    MIN_LENGTH = 2

    def parse(self, cell: Optional[Cell]) -> FieldResult:
        if not cell or not cell.words:
            return FieldResult()

        text = cell.text.strip()
        if not text:
            return FieldResult()

        cleaned = re.sub(r"[^A-Z0-9\-\./]", "", text.upper()).strip()

        if len(cleaned) < self.MIN_LENGTH:
            return FieldResult(
                value=cleaned,
                confidence=cell.confidence * 0.5,
                source="cell",
                validation="failed",
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
