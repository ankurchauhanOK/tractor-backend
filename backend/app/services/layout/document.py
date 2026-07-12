from typing import List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class TextField:
    label: str
    value: str
    confidence: float = 0.0
    bbox: List[float] = field(default_factory=list)


@dataclass
class Zone:
    name: str
    words: List[dict] = field(default_factory=list)
    y_min: float = 0.0
    y_max: float = 0.0
    fields: List[TextField] = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join(w.get("text", "") for w in self.words)


@dataclass
class Document:
    zones: List[Zone] = field(default_factory=list)
    template: str = "unknown"
    image_width: float = 0.0
    image_height: float = 0.0

    def zone(self, name: str) -> Optional[Zone]:
        for z in self.zones:
            if z.name == name:
                return z
        return None
