import logging
import re
from typing import List

from app.services.layout.document import Zone

logger = logging.getLogger(__name__)

SKIP_LABELS = {
    "tractor inspection sheet", "check points", "status", "defect details",
    "sr. no.", "defect description", "repaireo by", "final verified by",
    "shortages (any)", "rev. no", "rev. ot", "format",
    "road testing", "hydraulic tebjing", "underbody", "toe in betth",
    "leakagecheck", "electrical check", "paint check", "bumperfitment",
    "opcs", "other remarkà", "new rnspection", "reartyre tracinglh",
    "rear tyre tracing rh", "bigm", "btatus", "check pornte", "siom",
    "moine", "c5", "un", "tractor no", "date", "shft", "line i stage",
    "a", "b", "c", "rise", "mochine",
}

SKIP_PREFIXES = (
    "tractor", "form", "page", "inspector", "remark",
    "engine", "chassis", "shift", "line", "model", "date",
    "defects found", "shortages", "rev.", "sr.", "check",
    "road testing", "hydraulic", "underbody", "toe in",
    "leakage", "electrical", "paint", "bumper", "other",
    "new inspection", "rear tyre",
)

RE_NUMBERED_LINE = re.compile(r"^\d+[\.\)]?\s*")


class DefectParser:
    def parse(self, zone: Zone) -> List[dict]:
        if not zone.words:
            return []

        filtered = self._filter_form_labels(zone.words)
        if not filtered:
            return []

        groups = self._group_lines(filtered)
        defects = []
        for group in groups:
            text = self._clean_text(group)
            if text and len(text) >= 3:
                defects.append({"text": text, "verified": False})

        return defects

    def _filter_form_labels(self, words: List[dict]) -> List[dict]:
        return [
            w for w in words
            if not self._is_skip_word(w.get("text", ""))
        ]

    def _is_skip_word(self, text: str) -> bool:
        lower = text.lower().strip()
        if not lower or len(lower) < 2:
            return True
        if lower in SKIP_LABELS:
            return True
        for prefix in SKIP_PREFIXES:
            if lower.startswith(prefix):
                return True
        if re.match(r"^\d+\.?\s*$", lower):
            return True
        return False

    def _group_lines(self, words: List[dict]) -> List[List[str]]:
        if not words:
            return []

        rows = self._group_by_row(words)

        merged = []
        for row in rows:
            row_text = " ".join(row).strip()
            if not row_text:
                continue
            if re.match(r"^\d+\.?\s*$", row_text.strip()):
                continue
            merged.append(row)

        return merged

    def _group_by_row(self, words: List[dict]) -> List[List[str]]:
        words_sorted = sorted(words, key=lambda w: (_word_y_center(w), _word_x_center(w)))
        rows = []
        current_row = []
        current_y = None

        for w in words_sorted:
            y = _word_y_center(w)
            if current_y is None:
                current_y = y
                current_row.append(w)
            else:
                y_overlap = _y_overlap(w.get("bbox", []), words_sorted[0].get("bbox", []))
                if abs(y - current_y) <= 15:
                    current_row.append(w)
                else:
                    current_row.sort(key=lambda x: _word_x_center(x))
                    rows.append([ww.get("text", "") for ww in current_row])
                    current_row = [w]
                    current_y = y

        if current_row:
            current_row.sort(key=lambda x: _word_x_center(x))
            rows.append([ww.get("text", "") for ww in current_row])

        return rows

    def _clean_text(self, words: List[str]) -> str:
        text = " ".join(w.strip() for w in words if w.strip())
        text = RE_NUMBERED_LINE.sub("", text).strip()
        text = re.sub(r"\s+", " ", text).strip()
        return text


def _word_y_center(word: dict) -> float:
    bbox = word.get("bbox", [])
    if len(bbox) >= 4:
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return sum(ys) / len(ys)
    return 0


def _word_x_center(word: dict) -> float:
    bbox = word.get("bbox", [])
    if len(bbox) >= 4:
        xs = [bbox[i] for i in range(0, len(bbox), 2)]
        return sum(xs) / len(xs)
    return 0


def _y_overlap(bbox1: list, bbox2: list) -> float:
    if len(bbox1) < 4 or len(bbox2) < 4:
        return 0.0
    ys1 = [bbox1[i] for i in range(1, len(bbox1), 2)]
    ys2 = [bbox2[i] for i in range(1, len(bbox2), 2)]
    y1_min, y1_max = min(ys1), max(ys1)
    y2_min, y2_max = min(ys2), max(ys2)
    overlap = max(0, min(y1_max, y2_max) - max(y1_min, y2_min))
    h1 = y1_max - y1_min
    return overlap / h1 if h1 > 0 else 0
