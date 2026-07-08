import logging
from datetime import date
from typing import Dict, List, Optional, Tuple

from app.models.enums import MatchType
from app.services.extraction.patterns import (
    CHASSIS_NO,
    DATE_DDMMYY_DASH,
    DATE_DDMMYY_SLASH,
    DATE_YYYYMMDD,
    ENGINE_NO,
    INSPECTOR,
    LINE_NO,
    SHIFT,
    SKIP_LABELS,
    SKIP_PATTERNS,
    TRACTOR_NO,
)

logger = logging.getLogger(__name__)


class ExtractionResult:
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
        needs_review: bool = True,
        confidence_scores: Dict[str, float] = None,
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
        self.needs_review = needs_review
        self.confidence_scores = confidence_scores or {}

    def to_dict(self) -> dict:
        return {
            "tractor_no": self.tractor_no,
            "tractor_model": self.tractor_model,
            "engine_no": self.engine_no,
            "chassis_no": self.chassis_no,
            "inspector": self.inspector,
            "date": self.date.isoformat() if self.date else None,
            "shift": self.shift,
            "line_no": self.line_no,
            "defects": self.defects,
            "needs_review": self.needs_review,
            "confidence_scores": self.confidence_scores,
        }


class ExtractionEngine:
    CONFIDENCE_THRESHOLD = 0.7

    def extract(self, raw_text: str, ocr_confidence: float) -> ExtractionResult:
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        combined = " ".join(lines)

        tractor_no = self._extract_tractor_no(combined, lines)
        engine_no = self._extract_engine_no(combined, lines)
        chassis_no = self._extract_chassis_no(combined, lines)
        inspector = self._extract_inspector(combined)
        parsed_date = self._extract_date(combined)
        shift = self._extract_shift(combined)
        line_no = self._extract_line_no(combined)
        defects = self._extract_defects(lines, {tractor_no, engine_no, chassis_no})

        confidence_scores = self._compute_field_confidence(
            ocr_confidence=ocr_confidence,
            tractor_no=bool(tractor_no),
            engine_no=bool(engine_no),
            chassis_no=bool(chassis_no),
            inspector=bool(inspector),
            date=parsed_date is not None,
            defects=len(defects) > 0,
        )

        needs_review = any(
            sc < self.CONFIDENCE_THRESHOLD
            for sc in confidence_scores.values()
        )

        return ExtractionResult(
            tractor_no=tractor_no,
            engine_no=engine_no,
            chassis_no=chassis_no,
            inspector=inspector,
            date=parsed_date,
            shift=shift,
            line_no=line_no,
            defects=[{"text": d, "verified": False} for d in defects],
            needs_review=needs_review,
            confidence_scores=confidence_scores,
        )

    def _extract_tractor_no(self, combined: str, lines: List[str]) -> str:
        for line in lines:
            m = TRACTOR_NO.search(line)
            if m:
                return m.group(0)
        m = TRACTOR_NO.search(combined)
        return m.group(0) if m else ""

    def _extract_engine_no(self, combined: str, lines: List[str]) -> str:
        for line in lines:
            m = ENGINE_NO.search(line)
            if m:
                val = m.group(1) if m.lastindex else m.group(0)
                return val
        return ""

    def _extract_chassis_no(self, combined: str, lines: List[str]) -> str:
        for line in lines:
            m = CHASSIS_NO.search(line)
            if m:
                val = m.group(1) if m.lastindex else m.group(0)
                return val
        return ""

    def _extract_inspector(self, text: str) -> str:
        for line in text.split(" "):
            m = INSPECTOR.search(line)
            if m:
                return m.group(1).strip()
        m = INSPECTOR.search(text)
        if m:
            return m.group(1).strip()
        return ""

    def _extract_date(self, text: str) -> Optional[date]:
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

    def _extract_shift(self, text: str) -> str:
        m = SHIFT.search(text)
        if m:
            val = m.group(0).strip()
            if ":" in val:
                val = val.split(":")[-1].strip()
            return val.capitalize()
        return ""

    def _extract_line_no(self, text: str) -> str:
        m = LINE_NO.search(text)
        return m.group(1) if m else ""

    def _extract_defects(self, lines: List[str], identifiers: set) -> List[str]:
        defects = []
        for line in lines:
            lower = line.lower().strip()
            if not lower or len(lower) < 3:
                continue
            if lower in SKIP_LABELS:
                continue
            if any(lower.startswith(skip) for skip in SKIP_LABELS):
                continue
            if any(p.search(lower) for p in SKIP_PATTERNS):
                continue
            if any(line.startswith(prefix) for prefix in (
                "tractor", "form", "page", "inspector", "remark",
                "engine", "chassis", "shift", "line", "model", "date",
                "Tractor", "Engine", "Chassis", "Inspector", "Date",
                "Shift", "Line", "Defects Found", "defects found",
                " tractor", " engine", " chassis", "TR",
            )):
                continue
            if line in identifiers:
                continue
            if TRACTOR_NO.match(line):
                continue
            defects.append(line)
        return defects

    def _compute_field_confidence(
        self,
        ocr_confidence: float,
        tractor_no: bool,
        engine_no: bool,
        chassis_no: bool,
        inspector: bool,
        date: bool,
        defects: bool,
    ) -> Dict[str, float]:
        base = min(ocr_confidence, 0.95)
        return {
            "tractor_no": base if tractor_no else base * 0.5,
            "engine_no": base if engine_no else base * 0.5,
            "chassis_no": base if chassis_no else base * 0.5,
            "inspector": base * 0.8 if inspector else base * 0.3,
            "date": base * 0.9 if date else base * 0.3,
            "dif": base if defects else base * 0.5,
        }

    def check_duplicate(
        self,
        inspection_id: int,
        tractor_no: str,
        engine_no: str,
        chassis_no: str,
        db_session,
    ) -> Optional[Tuple[MatchType, int]]:
        from app.models.database import DuplicateLog, Inspection

        if tractor_no:
            existing = (
                db_session.query(Inspection.id)
                .filter(Inspection.tractor_no == tractor_no)
                .filter(Inspection.id != inspection_id)
                .first()
            )
            if existing:
                return MatchType.TRACTOR_NO, existing[0]

        if engine_no:
            existing = (
                db_session.query(Inspection.id)
                .filter(Inspection.engine_no == engine_no)
                .filter(Inspection.id != inspection_id)
                .first()
            )
            if existing:
                return MatchType.ENGINE_NO, existing[0]

        if chassis_no:
            existing = (
                db_session.query(Inspection.id)
                .filter(Inspection.chassis_no == chassis_no)
                .filter(Inspection.id != inspection_id)
                .first()
            )
            if existing:
                return MatchType.CHASSIS_NO, existing[0]

        return None
