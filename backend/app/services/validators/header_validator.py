import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

REVISION_DATE = re.compile(r"REV\.?\s*OT?\s*\d{2}[-/]\d{2}[-/]\d{4}", re.IGNORECASE)
CHASSIS_BLACKLIST = {"LEAKAGECHECK", "LEAKAGE", "CHECK", "ELECTRICAL", "PAINT", "BUMPER"}


class HeaderValidator:
    def validate_tractor_no(self, value: str) -> bool:
        if not value:
            return False
        if len(value) < 4:
            return False
        return True

    def validate_date(self, value_str: str, zone_context: Optional[str] = None) -> bool:
        if not value_str:
            return False
        if REVISION_DATE.search(value_str):
            logger.info("Rejected revision date: %s", value_str)
            return False
        return True

    def validate_chassis_no(self, value: str) -> bool:
        if not value:
            return False
        upper = value.upper()
        if upper in CHASSIS_BLACKLIST:
            logger.info("Rejected chassis blacklist: %s", value)
            return False
        if not re.match(r"^[A-HJ-NPR-Z0-9]{6,}$", upper):
            return False
        return True

    def validate_shift(self, value: str) -> bool:
        if not value:
            return False
        upper = value.upper().strip()
        return upper in {"A", "B", "C", "MORNING", "AFTERNOON", "EVENING", "NIGHT", "GENERAL", "DAY"}

    def validate_line_no(self, value: str) -> bool:
        if not value:
            return False
        return bool(re.match(r"^\d+$", value.strip()))
