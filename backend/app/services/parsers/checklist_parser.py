import logging
from typing import List

from app.services.layout.document import Zone

logger = logging.getLogger(__name__)


class ChecklistParser:
    def parse(self, zone: Zone) -> List[dict]:
        if not zone.words:
            return []

        words_sorted = sorted(zone.words, key=lambda w: _word_y_center(w))
        items = []
        seen = set()

        for w in words_sorted:
            text = w.get("text", "").strip()
            if not text or len(text) < 3:
                continue
            lower = text.lower()
            if lower in seen:
                continue
            if lower in ("check points", "bigm", "btatus", "check pornte", "siom", "status",
                         "a", "b", "c", "un", "mochine", "c5", "rise"):
                continue
            seen.add(lower)
            items.append({"check_point": text, "status": None, "verified": False})

        return items


def _word_y_center(word: dict) -> float:
    bbox = word.get("bbox", [])
    if len(bbox) >= 4:
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return sum(ys) / len(ys)
    return 0
