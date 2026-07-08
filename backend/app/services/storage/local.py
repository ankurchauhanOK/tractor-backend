import json
import logging
import os
import shutil
from datetime import datetime

from app.config import STORAGE_DIR
from app.services.storage.interface import StorageBackend

logger = logging.getLogger(__name__)

BATCHES_DIR = os.path.join(STORAGE_DIR, "batches")
ARCHIVE_DIR = os.path.join(STORAGE_DIR, "archive")
EXPORTS_DIR = os.path.join(STORAGE_DIR, "exports")
TEMP_DIR = os.path.join(STORAGE_DIR, "temp")

_SUBDIRS = ("original", "enhanced", "ocr", "verified", "failed", "thumbnails", "reports", "logs")


class LocalStorage(StorageBackend):
    def __init__(self, base_dir: str | None = None):
        self.base_dir = base_dir or STORAGE_DIR
        self._ensure_root_dirs()

    def _ensure_root_dirs(self):
        for d in (BATCHES_DIR, ARCHIVE_DIR, EXPORTS_DIR, TEMP_DIR):
            os.makedirs(d, exist_ok=True)

    def _batch_dir(self, batch_no: str) -> str:
        return os.path.join(BATCHES_DIR, batch_no)

    def _ensure_batch_dirs(self, batch_no: str):
        batch_dir = self._batch_dir(batch_no)
        for sub in _SUBDIRS:
            os.makedirs(os.path.join(batch_dir, sub), exist_ok=True)

    def _page_filename(self, page_num: int, ext: str = ".jpg") -> str:
        return f"page_{page_num:04d}{ext}"

    def _page_json_filename(self, page_num: int) -> str:
        return f"page_{page_num:04d}.json"

    # ── Original PDF ────────────────────────────────────────────────

    def save_original_pdf(self, batch_no: str, data: bytes, filename: str) -> str:
        self._ensure_batch_dirs(batch_no)
        dest = os.path.join(self._batch_dir(batch_no), "original", os.path.basename(filename))
        with open(dest, "wb") as f:
            f.write(data)
        logger.info("Saved original PDF %s for batch %s", filename, batch_no)
        return dest

    # ── Original page image ─────────────────────────────────────────

    def save_original_page(self, batch_no: str, page_num: int, data: bytes) -> str:
        self._ensure_batch_dirs(batch_no)
        filename = self._page_filename(page_num)
        dest = os.path.join(self._batch_dir(batch_no), "original", filename)
        with open(dest, "wb") as f:
            f.write(data)
        return dest

    # ── Enhanced image ──────────────────────────────────────────────

    def save_enhanced(self, batch_no: str, page_num: int, data: bytes) -> str:
        self._ensure_batch_dirs(batch_no)
        filename = self._page_filename(page_num)
        dest = os.path.join(self._batch_dir(batch_no), "enhanced", filename)
        with open(dest, "wb") as f:
            f.write(data)
        return dest

    # ── OCR JSON metadata ───────────────────────────────────────────

    def save_ocr_json(self, batch_no: str, page_num: int, data: dict) -> str:
        self._ensure_batch_dirs(batch_no)
        filename = self._page_json_filename(page_num)
        dest = os.path.join(self._batch_dir(batch_no), "ocr", filename)
        with open(dest, "w") as f:
            json.dump(data, f, indent=2, default=str)
        return dest

    # ── Verified JSON ───────────────────────────────────────────────

    def save_verified_json(self, batch_no: str, page_num: int, data: dict) -> str:
        self._ensure_batch_dirs(batch_no)
        filename = self._page_json_filename(page_num)
        dest = os.path.join(self._batch_dir(batch_no), "verified", filename)
        with open(dest, "w") as f:
            json.dump(data, f, indent=2, default=str)
        return dest

    # ── Failed page image ──────────────────────────────────────────

    def save_failed(self, batch_no: str, page_num: int, data: bytes) -> str:
        self._ensure_batch_dirs(batch_no)
        filename = self._page_filename(page_num)
        dest = os.path.join(self._batch_dir(batch_no), "failed", filename)
        with open(dest, "wb") as f:
            f.write(data)
        return dest

    # ── Thumbnail ───────────────────────────────────────────────────

    def save_thumbnail(self, batch_no: str, page_num: int, data: bytes) -> str:
        self._ensure_batch_dirs(batch_no)
        filename = self._page_filename(page_num)
        dest = os.path.join(self._batch_dir(batch_no), "thumbnails", filename)
        with open(dest, "wb") as f:
            f.write(data)
        return dest

    # ── Report ──────────────────────────────────────────────────────

    def save_report(self, batch_no: str, filename: str, data: bytes) -> str:
        self._ensure_batch_dirs(batch_no)
        dest = os.path.join(self._batch_dir(batch_no), "reports", os.path.basename(filename))
        with open(dest, "wb") as f:
            f.write(data)
        return dest

    # ── Export ──────────────────────────────────────────────────────

    def save_export(self, filename: str, data: bytes) -> str:
        os.makedirs(EXPORTS_DIR, exist_ok=True)
        dest = os.path.join(EXPORTS_DIR, filename)
        with open(dest, "wb") as f:
            f.write(data)
        return dest

    # ── Read ────────────────────────────────────────────────────────

    def read_file(self, batch_no: str, subdir: str, filename: str) -> bytes | None:
        path = self.file_path(batch_no, subdir, filename)
        if not os.path.isfile(path):
            return None
        with open(path, "rb") as f:
            return f.read()

    def read_file_by_key(self, object_key: str) -> bytes | None:
        # For LocalStorage, the key is a local filesystem path
        if not os.path.isfile(object_key):
            return None
        with open(object_key, "rb") as f:
            return f.read()

    # ── Path resolution ─────────────────────────────────────────────

    def file_path(self, batch_no: str, subdir: str, filename: str) -> str:
        return os.path.join(self._batch_dir(batch_no), os.path.basename(subdir), os.path.basename(filename))

    # ── Batch size statistics ───────────────────────────────────────

    def get_batch_size(self, batch_no: str) -> dict:
        batch_dir = self._batch_dir(batch_no)
        if not os.path.isdir(batch_dir):
            return {}

        total_files = 0
        total_size = 0
        counts = {}

        for sub in _SUBDIRS:
            sub_path = os.path.join(batch_dir, sub)
            if not os.path.isdir(sub_path):
                counts[sub] = 0
                continue
            files = os.listdir(sub_path)
            counts[sub] = len(files)
            for f in files:
                fp = os.path.join(sub_path, f)
                if os.path.isfile(fp):
                    total_files += 1
                    total_size += os.path.getsize(fp)

        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            **{f"{sub}_count": counts[sub] for sub in _SUBDIRS},
        }

    # ── Batch lifecycle ─────────────────────────────────────────────

    def archive_batch(self, batch_no: str) -> bool:
        src = self._batch_dir(batch_no)
        if not os.path.isdir(src):
            return False
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        dest = os.path.join(ARCHIVE_DIR, f"{batch_no}_{timestamp}")
        shutil.move(src, dest)
        logger.info("Archived batch %s → %s", batch_no, dest)
        return True

    def restore_batch(self, batch_no: str) -> bool:
        prefix = f"{batch_no}_"
        for entry in os.listdir(ARCHIVE_DIR):
            if entry.startswith(prefix):
                src = os.path.join(ARCHIVE_DIR, entry)
                dest = self._batch_dir(batch_no)
                shutil.move(src, dest)
                logger.info("Restored batch %s from archive", batch_no)
                return True
        logger.warning("No archived batch found for %s", batch_no)
        return False

    def batch_exists(self, batch_no: str) -> bool:
        return os.path.isdir(self._batch_dir(batch_no))
