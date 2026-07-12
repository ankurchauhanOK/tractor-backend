import logging
from typing import List, Optional, Tuple
import numpy as np

from app.services.layout.models import Cell, FormLayout

logger = logging.getLogger(__name__)

ROW_GAP_THRESHOLD = 10


class FormLayoutEngine:
    def build_grid(
        self,
        image_bytes: bytes,
        words: List[dict],
        roi_y_range: Tuple[int, int],
    ) -> FormLayout:
        if not words:
            return FormLayout()

        rows_from_img = self._detect_rows_from_image(image_bytes, roi_y_range)
        rows_from_words = self._group_rows_from_words(words)

        rows = rows_from_img if len(rows_from_img) >= 3 else rows_from_words
        if len(rows) < 2:
            rows = rows_from_words
        if len(rows) < 2:
            return FormLayout()

        cols = self._detect_cols_from_words(rows)
        if len(cols) < 2:
            return FormLayout()

        row_ys = self._row_ys(rows)
        layout = FormLayout()
        self._build_cells(layout, row_ys, cols)
        self._assign_words_to_cells(layout, words)

        return layout

    def _detect_rows_from_image(self, image_bytes: bytes, roi_y_range: Tuple[int, int]) -> List[float]:
        import cv2

        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return []

        y0, y1 = roi_y_range
        y0, y1 = max(0, y0), min(img.shape[0], y1)
        if y1 - y0 < 20:
            return []

        roi = img[y0:y1, :]
        _, binary = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (roi.shape[1] // 2, 1))
        h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
        h_proj = np.sum(h_lines, axis=1)

        line_threshold = np.max(h_proj) * 0.4
        if line_threshold < 100:
            return []

        in_line = False
        y_coords = [y0]
        for y in range(len(h_proj)):
            if h_proj[y] > line_threshold and not in_line:
                in_line = True
                y_coords.append(y0 + y)
            elif h_proj[y] <= line_threshold:
                in_line = False

        if len(y_coords) < 3:
            return []

        y_coords.append(y1)
        return sorted(set(y_coords))

    def _group_rows_from_words(self, words: List[dict]) -> List[List[dict]]:
        sorted_words = sorted(words, key=lambda w: _word_y_center(w))
        rows = []
        current_row = []
        last_y = None

        for w in sorted_words:
            y = _word_y_center(w)
            if last_y is not None and abs(y - last_y) > ROW_GAP_THRESHOLD:
                if current_row:
                    rows.append(current_row)
                    current_row = []
            current_row.append(w)
            last_y = y

        if current_row:
            rows.append(current_row)

        rows = [r for r in rows if len(r) >= 2 or self._is_substantial_row(r)]
        return rows

    def _is_substantial_row(self, row_words: List[dict]) -> bool:
        if len(row_words) >= 3:
            return True
        for w in row_words:
            text = w.get("text", "").upper().strip()
            if any(kw in text for kw in {"TRACTOR", "NO.", "DATE", "SHFT", "LINE", "STAGE"}):
                return True
        return False

    def _row_ys(self, rows: List[List[dict]]) -> List[float]:
        coords = []
        for row in rows:
            y_min = min((_word_y_min(w.get("bbox", [])) for w in row), default=0)
            coords.append(y_min)
        if coords:
            coords.append(max((_word_y_max(w.get("bbox", [])) for w in rows[-1]), default=coords[-1] + 50))
        return coords

    def _detect_cols_from_words(self, rows: List[List[dict]]) -> List[float]:
        best_row = self._find_best_row(rows)
        if best_row is None:
            return [0, 1000]

        row_sorted = sorted(best_row, key=lambda w: _word_x_center(w))
        midpoints = [0]
        for i in range(len(row_sorted) - 1):
            right_i = _bbox_right(row_sorted[i].get("bbox", []))
            left_j = _bbox_left(row_sorted[i + 1].get("bbox", []))
            mid = (right_i + left_j) / 2
            midpoints.append(mid)

        last_right = max((_bbox_right(w.get("bbox", [])) for w in row_sorted), default=0)
        midpoints.append(last_right + 50)
        return midpoints

    def _find_best_row(self, rows: List[List[dict]]) -> Optional[List[dict]]:
        for row in rows:
            if len(row) >= 3 and not self._words_overlap(row):
                return row
        best = max(rows, key=len) if rows else None
        return best if best and len(best) >= 3 else None

    def _words_overlap(self, row_words: List[dict]) -> bool:
        sorted_w = sorted(row_words, key=lambda w: _bbox_left(w.get("bbox", [])))
        for i in range(len(sorted_w) - 1):
            if _bbox_left(sorted_w[i + 1].get("bbox", [])) < _bbox_right(sorted_w[i].get("bbox", [])):
                return True
        return False

    def _build_cells(self, layout: FormLayout, row_ys: List[float], col_xs: List[float]):
        row_ys_sorted = sorted(set(row_ys))
        col_xs_sorted = sorted(set(col_xs))

        for r in range(len(row_ys_sorted) - 1):
            for c in range(len(col_xs_sorted) - 1):
                cell = Cell(
                    row=r, col=c,
                    x_min=col_xs_sorted[c], x_max=col_xs_sorted[c + 1],
                    y_min=row_ys_sorted[r], y_max=row_ys_sorted[r + 1],
                )
                layout.cells.append(cell)

    def _assign_words_to_cells(self, layout: FormLayout, words: List[dict]):
        for w in words:
            bbox = w.get("bbox", [])
            if len(bbox) < 4:
                continue
            xs = [bbox[i] for i in range(0, len(bbox), 2)]
            ys = [bbox[i] for i in range(1, len(bbox), 2)]
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            for cell in layout.cells:
                if cell.contains_point(cx, cy):
                    cell.words.append(w)
                    break


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


def _word_y_min(bbox: list) -> float:
    if len(bbox) >= 2:
        return min(bbox[i] for i in range(1, len(bbox), 2))
    return 0


def _word_y_max(bbox: list) -> float:
    if len(bbox) >= 2:
        return max(bbox[i] for i in range(1, len(bbox), 2))
    return 0


def _bbox_right(bbox: list) -> float:
    if len(bbox) >= 2:
        return max(bbox[i] for i in range(0, len(bbox), 2))
    return 0


def _bbox_left(bbox: list) -> float:
    if len(bbox) >= 2:
        return min(bbox[i] for i in range(0, len(bbox), 2))
    return 0
