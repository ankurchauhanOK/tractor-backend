import logging
from typing import List, Optional

from app.services.layout.templates import TEMPLATES

logger = logging.getLogger(__name__)


class TemplateDetector:
    def identify(self, words: List[dict]) -> str:
        if not words:
            return "unknown"

        combined = " ".join(w.get("text", "") for w in words).upper()

        for template_id, template in TEMPLATES.items():
            required = template.get("required_texts", [])
            if all(text.upper() in combined for text in required):
                logger.info("Detected template: %s", template_id)
                return template_id

        logger.info("No template matched, using generic fallback")
        return "unknown"

    def get_template(self, template_id: str) -> Optional[dict]:
        return TEMPLATES.get(template_id)
