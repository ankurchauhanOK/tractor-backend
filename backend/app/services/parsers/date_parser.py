import re
import logging
from datetime import date
from typing import Optional

from app.services.parsers.base import BaseFieldParser
from app.services.layout.models import Cell
from app.services.layout.field_result import FieldResult

logger = logging.getLogger(__name__)

DATE_DDMMYY_SLASH = re.compile(r"\b(\d{2})/(\d{2})/(\d{2,4})\b")
DATE_DDMMYY_DASH = re.compile(r"\b(\d{2})-(\d{2})-(\d{2,4})\b")
DATE_YYYYMMDD = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
REVISION_DATE = re.compile(r"REV\.?\s*OT?\s*\d{2}[-/]\d{2}[-/]\d{4}", re.IGNORECASE)


class DateParser(BaseFieldParser):
    def parse(self, cell: Optional[Cell]) -> FieldResult:
        if not cell or not cell.words:
            return FieldResult()

        text = cell.text.strip()
        if not text:
            return FieldResult()

        if REVISION_DATE.search(text):
            return FieldResult(
                value="",
                confidence=0.0,
                source="cell",
                validation="failed",
                raw_text=text,
                bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
            )

        parsed = self._try_normalize(text)
        if parsed:
            return FieldResult(
                value=parsed.isoformat(),
                confidence=cell.confidence,
                source="cell",
                validation="ok",
                raw_text=text,
                bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
            )

        return FieldResult(
            value=text,
            confidence=cell.confidence * 0.6,
            source="cell",
            validation="uncertain",
            raw_text=text,
            bbox=[cell.x_min, cell.y_min, cell.x_max, cell.y_max],
        )

    def _try_normalize(self, text: str) -> Optional[date]:
        m = DATE_YYYYMMDD.search(text)
        if m:
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                pass

        m = DATE_DDMMYY_SLASH.search(text) or DATE_DDMMYY_DASH.search(text)
        if m:
            try:
                d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                y += 2000 if y < 100 else 0
                return date(y, mo, d)
            except ValueError:
                pass

        return None
