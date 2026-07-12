from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class VisionExtractionResult:
    tractor_no: str = ""
    date: str = ""
    shift: str = ""
    line_no: str = ""
    defects: List[dict] = field(default_factory=list)
    shortages: List[dict] = field(default_factory=list)
    checklist: List[dict] = field(default_factory=list)
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    provider_used: str = ""
    needs_review: bool = True

    def to_dict(self) -> dict:
        return {
            "tractor_no": self.tractor_no,
            "date": self.date,
            "shift": self.shift,
            "line_no": self.line_no,
            "defects": self.defects,
            "shortages": self.shortages,
            "checklist": self.checklist,
            "confidence_scores": self.confidence_scores,
            "provider_used": self.provider_used,
            "needs_review": self.needs_review,
        }
