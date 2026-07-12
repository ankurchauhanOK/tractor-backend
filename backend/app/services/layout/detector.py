import logging
from typing import List, Optional

from app.services.layout.document import Document, Zone

logger = logging.getLogger(__name__)


def _word_bbox_center(word: dict) -> tuple:
    bbox = word.get("bbox", [])
    if len(bbox) >= 4:
        xs = [bbox[i] for i in range(0, len(bbox), 2)]
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return (sum(xs) / len(xs), sum(ys) / len(ys))
    return (0, 0)


def _word_y_range(word: dict) -> tuple:
    bbox = word.get("bbox", [])
    if len(bbox) >= 4:
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return (min(ys), max(ys))
    return (0, 0)


class LayoutDetector:
    def detect(self, words: List[dict], template: dict) -> Document:
        if not words:
            return Document()

        zone_defs = template.get("zones", {})
        zone_boundaries = self._find_zone_boundaries(words, zone_defs)

        zones = []
        for zone_name, (y_start, y_end) in zone_boundaries.items():
            zone_words = [
                w for w in words
                if self._word_in_y_range(w, y_start, y_end)
            ]
            zone_words.sort(key=lambda w: _word_bbox_center(w)[1])
            zones.append(Zone(
                name=zone_name,
                words=zone_words,
                y_min=y_start,
                y_max=y_end,
            ))

        img_h = max((_word_y_range(w)[1] for w in words), default=1)
        return Document(zones=zones, template=template.get("title", "unknown"), image_height=img_h)

    def _find_zone_boundaries(self, words: List[dict], zone_defs: dict) -> dict:
        word_positions = {}
        for w in words:
            text = w.get("text", "").upper().strip()
            if text:
                _, cy = _word_bbox_center(w)
                word_positions[text] = cy

        boundaries = {}
        zone_names = list(zone_defs.keys())

        for i, zone_name in enumerate(zone_names):
            zd = zone_defs[zone_name]
            start_pos = self._find_best_y(zd.get("start_labels", []), word_positions)
            end_pos = self._find_best_y(zd.get("end_labels", []), word_positions)

            if start_pos is None:
                if i > 0 and boundaries.get(zone_names[i - 1]):
                    _, prev_end = boundaries[zone_names[i - 1]]
                    start_pos = prev_end
                else:
                    start_pos = 0

            if end_pos is None:
                if i < len(zone_names) - 1:
                    next_zd = zone_defs[zone_names[i + 1]]
                    end_pos = self._find_best_y(next_zd.get("start_labels", []), word_positions)
                if end_pos is None:
                    end_pos = float("inf")

            boundaries[zone_name] = (start_pos, end_pos)

        if boundaries and zone_names:
            first_start, _ = boundaries[zone_names[0]]
            if first_start != 0:
                prev_y = 0
                for zn in zone_names:
                    s, e = boundaries[zn]
                    if s == 0 and prev_y > 0:
                        boundaries[zn] = (prev_y, e)
                    prev_y = e

        return boundaries

    def _find_best_y(self, labels: List[str], word_positions: dict) -> Optional[float]:
        for label in labels:
            if label in word_positions:
                return word_positions[label]
        for text, y in word_positions.items():
            for label in labels:
                if label in text:
                    return y
        return None

    def _word_in_y_range(self, word: dict, y_start: float, y_end: float) -> bool:
        y_min, y_max = _word_y_range(word)
        if y_end == float("inf"):
            return y_min >= y_start
        return y_min >= y_start and y_max <= y_end
