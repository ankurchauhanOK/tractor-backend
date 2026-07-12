import logging
from typing import List

from app.services.layout.document import Zone

logger = logging.getLogger(__name__)

SKIP_WORDS = {
    "shortages (any)", "s. no.", "part hame / description",
    "5tage/location", "change description", "checked by",
    "1.", "2.",
}


class ShortageParser:
    def parse(self, zone: Zone) -> List[dict]:
        if not zone.words:
            return []

        words_sorted = sorted(zone.words, key=lambda w: _word_y_center(w))

        entries = []
        current_entry = []
        last_y = None

        for w in words_sorted:
            text = w.get("text", "").strip()
            if not text or text.lower() in SKIP_WORDS:
                continue

            y = _word_y_center(w)
            if last_y is not None and (y - last_y) > 15:
                if current_entry:
                    entries.append(" ".join(current_entry))
                    current_entry = []
            current_entry.append(text)
            last_y = y

        if current_entry:
            entries.append(" ".join(current_entry))

        return [{"text": e, "verified": False} for e in entries if e]


def _word_y_center(word: dict) -> float:
    bbox = word.get("bbox", [])
    if len(bbox) >= 4:
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return sum(ys) / len(ys)
    return 0
