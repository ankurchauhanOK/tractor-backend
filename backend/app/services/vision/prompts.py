PROMPTS = {
    "tractor_no": (
        "Read ONLY the Tractor Number from this image. "
        "Return JSON: {\"value\": \"\"}. "
        "If uncertain, return null."
    ),
    "date": (
        "Read ONLY the inspection Date from this image. "
        "Return as raw text in JSON: {\"value\": \"\"}. "
        "Do not guess. Return null if uncertain."
    ),
    "shift": (
        "Read ONLY the Shift from this image (A, B, or C). "
        "Return JSON: {\"value\": \"\"}. "
        "Return null if not readable."
    ),
    "line": (
        "Read ONLY the Line or Stage value from this image. "
        "Return JSON: {\"value\": \"\"}. "
        "Return null if uncertain."
    ),
    "checklist": (
        "Extract all checklist items and their status from this image. "
        "Return JSON array: {\"items\": [{\"check_point\": \"\", \"status\": \"\"}]}. "
        "Return empty array if none found."
    ),
    "defects": (
        "Extract ALL defects exactly as written from this image. "
        "Return JSON: {\"defects\": [{\"text\": \"\"}]}. "
        "Do NOT include serial numbers or table headers. "
        "Return empty array if none found."
    ),
    "shortages": (
        "Extract ALL shortages exactly as written from this image. "
        "Return JSON: {\"shortages\": [{\"text\": \"\"}]}. "
        "Return empty array if none found."
    ),
}
