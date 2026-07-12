import logging
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


def _bbox_center(bbox: List[float]) -> Tuple[float, float]:
    if len(bbox) >= 4:
        xs = [bbox[i] for i in range(0, len(bbox), 2)]
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return (sum(xs) / len(xs), sum(ys) / len(ys))
    return (0, 0)


def _bbox_right_edge(bbox: List[float]) -> float:
    if len(bbox) >= 2:
        xs = [bbox[i] for i in range(0, len(bbox), 2)]
        return max(xs)
    return 0


def _bbox_left_edge(bbox: List[float]) -> float:
    if len(bbox) >= 2:
        xs = [bbox[i] for i in range(0, len(bbox), 2)]
        return min(xs)
    return 0


def _bbox_bottom(bbox: List[float]) -> Tuple[float, float]:
    if len(bbox) >= 2:
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return (max(ys), max(ys))
    return (0, 0)


def _bbox_top(bbox: List[float]) -> Tuple[float, float]:
    if len(bbox) >= 2:
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        return (min(ys), min(ys))
    return (0, 0)


def _vertical_overlap(bbox1: List[float], bbox2: List[float]) -> float:
    ys1 = [bbox1[i] for i in range(1, len(bbox1), 2)]
    ys2 = [bbox2[i] for i in range(1, len(bbox2), 2)]
    y1_min, y1_max = min(ys1), max(ys1)
    y2_min, y2_max = min(ys2), max(ys2)
    overlap = max(0, min(y1_max, y2_max) - max(y1_min, y2_min))
    h1 = y1_max - y1_min
    return overlap / h1 if h1 > 0 else 0


class FieldLocator:
    def locate(
        self,
        words: List[dict],
        label_patterns: List[str],
        direction: str = "right",
    ) -> Tuple[str, float, List[float]]:
        label_word = self._find_label(words, label_patterns)
        if not label_word:
            return ("", 0.0, [])

        label_bbox = label_word.get("bbox", [])

        candidates = []
        for w in words:
            if w is label_word:
                continue
            w_bbox = w.get("bbox", [])
            if not w_bbox or not label_bbox:
                continue
            overlap = _vertical_overlap(label_bbox, w_bbox)
            label_right = _bbox_right_edge(label_bbox)
            w_left = _bbox_left_edge(w_bbox)

            if direction == "right":
                if overlap < 0.3:
                    continue
                if w_left >= label_right:
                    dist = w_left - label_right
                    candidates.append((dist, w.get("text", ""), w.get("confidence", 0), w_bbox))

            elif direction == "down":
                if overlap > 0.3:
                    continue
                _, label_bot = _bbox_bottom(label_bbox)
                _, w_top = _bbox_top(w_bbox)
                if w_top >= label_bot - 1:
                    vdist = w_top - label_bot
                    label_cx, _ = _bbox_center(label_bbox)
                    w_cx, _ = _bbox_center(w_bbox)
                    hdist = abs(w_cx - label_cx)
                    combined = vdist + hdist * 0.3
                    candidates.append((combined, vdist, w.get("text", ""), w.get("confidence", 0), w_bbox))

        if not candidates:
            return ("", 0.0, [])

        candidates.sort(key=lambda x: x[0])
        best = candidates[0]
        return (best[-3], best[-2], best[-1])

    def _find_label(self, words: List[dict], label_patterns: List[str]) -> Optional[dict]:
        for w in words:
            text = w.get("text", "").upper().strip()
            for pattern in label_patterns:
                if text == pattern.upper() or text.startswith(pattern.upper()):
                    return w

        for w in words:
            text = w.get("text", "").upper().strip()
            for pattern in label_patterns:
                if pattern.upper() in text:
                    return w
        return None
