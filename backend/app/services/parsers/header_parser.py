import logging
from typing import Optional

from app.services.layout.models import FormLayout
from app.services.parsers.base import BaseFieldParser
from app.services.parsers.tractor_parser import TractorParser
from app.services.parsers.date_parser import DateParser
from app.services.parsers.shift_parser import ShiftParser
from app.services.parsers.line_stage_parser import LineStageParser

logger = logging.getLogger(__name__)

FIELD_MAP: list[tuple[str, list[str], BaseFieldParser]] = [
    ("tractor_no",  ["TRACTOR NO", "TRACTOR"], TractorParser()),
    ("tractor_model", ["MODEL", "TRACTOR MODEL"], TractorParser()),
    ("engine_no",   ["ENGINE NO"], TractorParser()),
    ("chassis_no",  ["CHASSIS NO"], TractorParser()),
    ("inspector",   ["INSPECTOR"], TractorParser()),
    ("date",        ["DATE"], DateParser()),
    ("shift",       ["SHIFT", "SHFT"], ShiftParser()),
    ("line_no",     ["LINE", "LINE I STAGE", "LINE / STAGE", "LINE NO"], LineStageParser()),
]


class HeaderParser:
    def parse(self, layout: FormLayout) -> dict:
        result = {
            "tractor_no": "",
            "tractor_model": "",
            "engine_no": "",
            "chassis_no": "",
            "inspector": "",
            "date": None,
            "shift": "",
            "line_no": "",
        }

        if layout.rows < 2 or layout.cols < 1:
            return result

        for field_name, label_patterns, parser in FIELD_MAP:
            data_cell = self._find_data_cell(layout, label_patterns)
            if data_cell is None:
                continue

            field_result = parser.parse(data_cell)
            if field_result.validation == "failed":
                continue

            self._set_field(result, field_name, field_result)

        return result

    def _find_data_cell(self, layout: FormLayout, label_patterns: list[str]):
        for lc in layout.label_cells():
            text = lc.text.upper().strip()
            for pattern in label_patterns:
                if pattern.upper() in text or text.startswith(pattern.upper()):
                    return layout.cell_at(1, lc.col)
        return None

    def _set_field(self, result: dict, field_name: str, field_result):
        if field_name == "date":
            from datetime import date as date_type
            val = field_result.value
            if val and field_result.validation == "ok":
                try:
                    result["date"] = date_type.fromisoformat(val)
                except (ValueError, TypeError):
                    pass
            elif val and field_result.validation == "uncertain":
                result["date"] = val
        else:
            result[field_name] = field_result.value
