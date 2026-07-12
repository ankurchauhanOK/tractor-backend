import logging
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


class CheckboxDetector:
    def detect_checked(self, cell_words: List[dict], labels: List[str]) -> Optional[str]:
        found_labels = [w.get("text", "").upper().strip() for w in cell_words if w.get("text", "").upper().strip() in labels]
        found_upper = [f for f in found_labels if f in {l.upper() for l in labels}]

        if not found_upper:
            return None

        if len(found_upper) == 1:
            return found_upper[0]

        return found_upper[0]
