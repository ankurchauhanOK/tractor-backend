import logging
from datetime import date
from typing import List, Optional

from app.services.layout.document import Document
from app.services.layout.detector import LayoutDetector
from app.services.layout.form_layout import FormLayoutEngine
from app.services.layout.templates import MAHINDRA_TRACTOR_V1
from app.services.parsers.header_parser import HeaderParser
from app.services.parsers.defect_parser import DefectParser
from app.services.parsers.shortage_parser import ShortageParser
from app.services.parsers.checklist_parser import ChecklistParser

logger = logging.getLogger(__name__)


class MahindraParserResult:
    def __init__(
        self,
        tractor_no: str = "",
        tractor_model: str = "",
        engine_no: str = "",
        chassis_no: str = "",
        inspector: str = "",
        date: Optional[date] = None,
        shift: str = "",
        line_no: str = "",
        defects: List[dict] = None,
        shortages: List[dict] = None,
        checklist: List[dict] = None,
        needs_review: bool = True,
        confidence_scores: dict = None,
    ):
        self.tractor_no = tractor_no
        self.tractor_model = tractor_model
        self.engine_no = engine_no
        self.chassis_no = chassis_no
        self.inspector = inspector
        self.date = date
        self.shift = shift
        self.line_no = line_no
        self.defects = defects or []
        self.shortages = shortages or []
        self.checklist = checklist or []
        self.needs_review = needs_review
        self.confidence_scores = confidence_scores or {}

    def to_extraction_dict(self) -> dict:
        return {
            "tractor_no": self.tractor_no,
            "tractor_model": self.tractor_model,
            "engine_no": self.engine_no,
            "chassis_no": self.chassis_no,
            "inspector": self.inspector,
            "date": self.date,
            "shift": self.shift,
            "line_no": self.line_no,
            "defects": self.defects,
            "needs_review": self.needs_review,
            "confidence_scores": self.confidence_scores,
        }


class MahindraParser:
    def __init__(self):
        self._zone_detector = LayoutDetector()
        self._grid_engine = FormLayoutEngine()
        self._header_parser = HeaderParser()
        self._defect_parser = DefectParser()
        self._shortage_parser = ShortageParser()
        self._checklist_parser = ChecklistParser()

    def parse(
        self,
        words: List[dict],
        ocr_confidence: float,
        enhanced_bytes: Optional[bytes] = None,
    ) -> MahindraParserResult:
        doc = self._zone_detector.detect(words, MAHINDRA_TRACTOR_V1)
        header_zone = doc.zone("header")
        checklist_zone = doc.zone("checklist")
        defects_zone = doc.zone("defects")
        shortages_zone = doc.zone("shortages")

        header_fields = {}
        if header_zone and enhanced_bytes:
            roi = (int(header_zone.y_min), int(header_zone.y_max))
            layout = self._grid_engine.build_grid(enhanced_bytes, header_zone.words, roi)
            if layout.rows >= 2 and layout.cols >= 1:
                header_fields = self._header_parser.parse(layout)
                logger.info(
                    "Grid header: %d rows x %d cols, cells=%d, fields: tractor=%s date=%s shift=%s line=%s",
                    layout.rows, layout.cols, len(layout.cells),
                    header_fields.get("tractor_no", "?"),
                    header_fields.get("date", "?"),
                    header_fields.get("shift", "?"),
                    header_fields.get("line_no", "?"),
                )
            else:
                logger.warning("Grid detection failed: %d rows x %d cols", layout.rows, layout.cols)

        if not header_fields and header_zone:
            from app.services.layout.models import FormLayout
            from app.services.parsers.header_parser import HeaderParser
            alt_parser = HeaderParser()
            alt_layout = self._build_fallback_layout(header_zone.words)
            header_fields = alt_parser.parse(alt_layout)

        checklist_items = self._checklist_parser.parse(checklist_zone) if checklist_zone else []
        defect_items = self._defect_parser.parse(defects_zone) if defects_zone else []
        shortage_items = self._shortage_parser.parse(shortages_zone) if shortages_zone else []

        confidence_scores = self._compute_confidence_scores(
            ocr_confidence, header_fields, defect_items, doc,
        )

        needs_review = any(
            sc < 0.7 for sc in confidence_scores.values()
        )

        return MahindraParserResult(
            tractor_no=header_fields.get("tractor_no", ""),
            tractor_model=header_fields.get("tractor_model", ""),
            engine_no=header_fields.get("engine_no", ""),
            chassis_no=header_fields.get("chassis_no", ""),
            inspector=header_fields.get("inspector", ""),
            date=header_fields.get("date"),
            shift=header_fields.get("shift", ""),
            line_no=header_fields.get("line_no", ""),
            defects=defect_items,
            shortages=shortage_items,
            checklist=checklist_items,
            needs_review=needs_review,
            confidence_scores=confidence_scores,
        )

    def _build_fallback_layout(self, words: List[dict]):
        from app.services.layout.models import FormLayout, Cell
        layout = FormLayout()
        if not words:
            return layout
        xs = [coord for w in words for coord in w.get("bbox", [])[0::2]]
        ys = [coord for w in words for coord in w.get("bbox", [])[1::2]]
        if not xs or not ys:
            return layout
        layout.image_width = max(xs)
        layout.image_height = max(ys)
        cell = Cell(row=0, col=0, words=words, x_min=min(xs), x_max=max(xs), y_min=min(ys), y_max=max(ys))
        layout.cells.append(cell)
        return layout

    def _compute_confidence_scores(self, ocr_confidence, header_fields, defects, doc):
        from app.services.layout.document import Document
        base = min(ocr_confidence, 0.95)

        return {
            "tractor_no": base if header_fields.get("tractor_no") else base * 0.5,
            "engine_no": base if header_fields.get("engine_no") else base * 0.5,
            "chassis_no": base if header_fields.get("chassis_no") else base * 0.5,
            "inspector": base * 0.8 if header_fields.get("inspector") else base * 0.3,
            "date": base * 0.9 if header_fields.get("date") else base * 0.3,
            "dif": base if defects else base * 0.5,
        }
