from typing import List, Optional
from dataclasses import dataclass, field


@dataclass
class Cell:
    row: int = 0
    col: int = 0
    words: List[dict] = field(default_factory=list)
    x_min: float = 0.0
    x_max: float = 0.0
    y_min: float = 0.0
    y_max: float = 0.0

    @property
    def text(self) -> str:
        return " ".join(w.get("text", "") for w in self.words)

    @property
    def confidence(self) -> float:
        if not self.words:
            return 0.0
        return sum(w.get("confidence", 0) for w in self.words) / len(self.words)

    def contains_point(self, x: float, y: float) -> bool:
        return self.x_min <= x <= self.x_max and self.y_min <= y <= self.y_max

    def contains_word(self, word: dict) -> bool:
        bbox = word.get("bbox", [])
        if len(bbox) < 4:
            return False
        xs = [bbox[i] for i in range(0, len(bbox), 2)]
        ys = [bbox[i] for i in range(1, len(bbox), 2)]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        return self.contains_point(cx, cy)


@dataclass
class FormLayout:
    cells: List[Cell] = field(default_factory=list)
    image_width: float = 0.0
    image_height: float = 0.0

    def cell_at(self, row: int, col: int) -> Optional[Cell]:
        for c in self.cells:
            if c.row == row and c.col == col:
                return c
        return None

    def label_cells(self) -> List[Cell]:
        return [c for c in self.cells if c.row == 0]

    def data_cells(self) -> List[Cell]:
        return [c for c in self.cells if c.row > 0]

    def data_for_label(self, label_text: str) -> Optional[Cell]:
        text_upper = label_text.upper()
        for lc in self.label_cells():
            if text_upper in lc.text.upper():
                return self.cell_at(1, lc.col)
        return None

    @property
    def rows(self) -> int:
        return max((c.row for c in self.cells), default=-1) + 1

    @property
    def cols(self) -> int:
        return max((c.col for c in self.cells), default=-1) + 1
