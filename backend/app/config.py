import os
from pathlib import Path

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/inspections",
)

DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "20"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))

WORKER_COUNT = int(os.getenv("WORKER_COUNT", "8"))
MAX_RETRY_COUNT = int(os.getenv("MAX_RETRY_COUNT", "3"))

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = os.getenv("STORAGE_DIR", str(BASE_DIR / "storage"))

OCR_VERSION = os.getenv("OCR_VERSION", "paddleocr-3.7.0")
AI_VERSION = os.getenv("AI_VERSION", "mahindra-ai-v1.0")
IMAGE_PIPELINE_VERSION = os.getenv("IMAGE_PIPELINE_VERSION", "img-enhance-v1.0")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")

S3_ENDPOINT = os.getenv("S3_ENDPOINT", "")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")
S3_REGION = os.getenv("S3_REGION", "auto")
S3_PUBLIC_URL = os.getenv("S3_PUBLIC_URL", "")

PDF_DPI = int(os.getenv("PDF_DPI", "300"))
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "500"))
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
MAX_PAGE_WIDTH = int(os.getenv("MAX_PAGE_WIDTH", "5000"))
MAX_PAGE_HEIGHT = int(os.getenv("MAX_PAGE_HEIGHT", "10000"))
