from typing import List, Optional
from dataclasses import dataclass, field


@dataclass
class FieldResult:
    value: str = ""
    confidence: float = 0.0
    source: str = ""  # "cell", "fallback", "checkbox"
    validation: str = "unknown"  # "ok", "failed", "uncertain"
    raw_text: str = ""
    bbox: List[float] = field(default_factory=list)
