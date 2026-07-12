import enum


class InspectionStatus(enum.Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    PROCESSING = "processing"
    OCR_COMPLETED = "ocr_completed"
    NEEDS_REVIEW = "needs_review"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPORTED = "exported"


class BatchStatus(enum.Enum):
    UPLOADING = "uploading"
    QUEUED = "queued"
    PROCESSING = "processing"
    WAITING_REVIEW = "waiting_review"
    COMPLETED = "completed"
    COMPLETED_WITH_ERRORS = "completed_with_errors"
    CANCELLED = "cancelled"


class MatchType(enum.Enum):
    TRACTOR_NO = "tractor_no"
    ENGINE_NO = "engine_no"
    CHASSIS_NO = "chassis_no"
    PAGE_HASH = "page_hash"


class DuplicateAction(enum.Enum):
    SKIPPED = "skipped"
    REPLACED = "replaced"
    KEPT_BOTH = "kept_both"


class EventType(enum.Enum):
    PAGE_UPLOADED = "page_uploaded"
    PAGE_ENQUEUED = "page_enqueued"
    OCR_STARTED = "ocr_started"
    OCR_COMPLETED = "ocr_completed"
    AI_CORRECTED = "ai_corrected"
    DUPLICATE_FOUND = "duplicate_found"
    VERIFIED = "verified"
    EXPORTED = "exported"


class AIProvider(enum.Enum):
    QWEN = "qwen"
    GEMINI = "gemini"
    OCR = "ocr"


class VisionStatus(enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    NEEDS_REVIEW = "needs_review"
