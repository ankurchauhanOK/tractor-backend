import re

# ── Tractor / Vehicle identifiers ─────────────────────────────

TRACTOR_NO = re.compile(r"TR\d{5,8}")

ENGINE_NO = re.compile(
    r"Engine\s*(?:No)?\s*:?\s*([A-Z0-9\-]{6,17})",
    re.IGNORECASE,
)

CHASSIS_NO = re.compile(
    r"(?:Chassis\s*(?:No|#|:)?\s*)?"
    r"([A-HJ-NPR-Z0-9]{11,17})",
)

# ── Inspector ─────────────────────────────────────────────────

INSPECTOR = re.compile(
    r"(?:Inspector|Inspected\s*by|Inspector\s*(?:Name|Sign|Signature)?)\s*:?\s*"
    r"([A-Za-z\.\s]+?)(?:\s*(?:Date|Shift|Line|Engine|Chassis|Tractor|Defects|Remarks|Signature)|$)",
    re.IGNORECASE,
)

# ── Date ──────────────────────────────────────────────────────

DATE_DDMMYY_SLASH = re.compile(r"\b(\d{2})/(\d{2})/(\d{2,4})\b")
DATE_DDMMYY_DASH = re.compile(r"\b(\d{2})-(\d{2})-(\d{2,4})\b")
DATE_YYYYMMDD = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")

# ── Shift ─────────────────────────────────────────────────────

SHIFT = re.compile(
    r"\b(Morning|Afternoon|Evening|Night|General|Day|Shift\s*[:\-]?\s*\w+)\b",
    re.IGNORECASE,
)

# ── Line number ───────────────────────────────────────────────

LINE_NO = re.compile(
    r"(?:Line|Ln|Assembly\s*Line)\s*[:\-#]?\s*(\d+)",
    re.IGNORECASE,
)

# ── Fields to skip during defect extraction ───────────────────

SKIP_LABELS = {
    "tractor inspection sheet", "tractor no:", "date:", "defects found:",
    "inspector signature:", "remarks:", "form no:", "page", "rev:",
    "tractor no", "inspection sheet", "signature", "engine no", "chassis no",
    "inspector:", "shift:", "line no:", "tractor model:", "model:",
    "defects found", "defects:", "remarks:", "inspector:", "date :",
    "engine no:", "chassis no:", "shift :", "line no :",
    "section a:", "section b:", "section c:",
    "tractor details", "defects found:", "remarks / signature",
    # Mahindra form specific
    "mahindra", "rise", "mochine", "c5", "un",
    "bigm", "btatus", "check pornte", "siom", "status",
    "check points", "defect details", "shortages (any)",
    "sr. no.", "defect description", "repaireo by", "final verified by",
    "road testing", "hydraulic tebjing", "underbody", "toe in betth",
    "leakagecheck", "electrical check", "paint check", "bumperfitment",
    "opcs", "other remarkà", "new rnspection",
    "reartyre tracinglh", "rear tyre tracing rh",
    "rev. no", "rev. ot", "format",
}

SKIP_PATTERNS = [
    re.compile(r"^\d+\.\s*$"),
    re.compile(r"^form no:", re.IGNORECASE),
    re.compile(r"^rev:", re.IGNORECASE),
    re.compile(r"^page\s+\d+", re.IGNORECASE),
    re.compile(r"^\d{2}/\d{2}/\d{4}$"),
    re.compile(r"^\d{2}/\d{2}/\d{2}$"),
    re.compile(r"^section\s+\w:", re.IGNORECASE),
    re.compile(r"^tractor inspection sheet", re.IGNORECASE),
    re.compile(r"^inspector\s*signature", re.IGNORECASE),
    re.compile(r"^nspector\s*signature", re.IGNORECASE),
    re.compile(r"^remarks\s*:?\s*_*$", re.IGNORECASE),
]
