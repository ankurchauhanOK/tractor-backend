import json
import logging
import os
from datetime import datetime
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig

from app.config import (
    S3_ACCESS_KEY_ID,
    S3_BUCKET_NAME,
    S3_ENDPOINT,
    S3_PUBLIC_URL,
    S3_REGION,
    S3_SECRET_ACCESS_KEY,
)
from app.services.storage.interface import StorageBackend

logger = logging.getLogger(__name__)

_SUBDIRS = ("original", "enhanced", "ocr", "verified", "failed", "thumbnails", "reports", "logs")


def _page_filename(page_num: int, ext: str = ".jpg") -> str:
    return f"page_{page_num:04d}{ext}"


def _page_json_filename(page_num: int) -> str:
    return f"page_{page_num:04d}.json"


def _object_key(batch_no: str, subdir: str, filename: str) -> str:
    return f"batches/{batch_no}/{subdir}/{filename}"


class S3Storage(StorageBackend):
    def __init__(self):
        self.bucket = S3_BUCKET_NAME
        self.public_url = S3_PUBLIC_URL.rstrip("/") if S3_PUBLIC_URL else ""
        self._client: Optional[boto3.client] = None

    @property
    def client(self):
        if self._client is not None:
            return self._client
        session = boto3.Session(
            aws_access_key_id=S3_ACCESS_KEY_ID,
            aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        )
        self._client = session.client(
            "s3",
            endpoint_url=S3_ENDPOINT or None,
            region_name=S3_REGION,
            config=BotoConfig(
                retries={"max_attempts": 3, "mode": "adaptive"},
                connect_timeout=10,
                read_timeout=30,
            ),
        )
        return self._client

    # ── URL helpers ─────────────────────────────────────────────────

    def get_url(self, object_key: str) -> str:
        if not object_key:
            return ""
        if self.public_url:
            return f"{self.public_url}/{object_key.lstrip('/')}"
        return object_key

    def file_path(self, batch_no: str, subdir: str, filename: str) -> str:
        key = _object_key(batch_no, subdir, filename)
        return self.get_url(key)

    # ── Original PDF ────────────────────────────────────────────────

    def save_original_pdf(self, batch_no: str, data: bytes, filename: str) -> str:
        key = _object_key(batch_no, "original", os.path.basename(filename))
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        logger.info("Uploaded original PDF %s for batch %s → s3://%s/%s", filename, batch_no, self.bucket, key)
        return key

    # ── Original page image ─────────────────────────────────────────

    def save_original_page(self, batch_no: str, page_num: int, data: bytes) -> str:
        filename = _page_filename(page_num)
        key = _object_key(batch_no, "original", filename)
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    # ── Enhanced image ──────────────────────────────────────────────

    def save_enhanced(self, batch_no: str, page_num: int, data: bytes) -> str:
        filename = _page_filename(page_num)
        key = _object_key(batch_no, "enhanced", filename)
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    # ── OCR JSON metadata ───────────────────────────────────────────

    def save_ocr_json(self, batch_no: str, page_num: int, data: dict) -> str:
        filename = _page_json_filename(page_num)
        key = _object_key(batch_no, "ocr", filename)
        body = json.dumps(data, indent=2, default=str).encode("utf-8")
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body)
        return key

    # ── Verified JSON ───────────────────────────────────────────────

    def save_verified_json(self, batch_no: str, page_num: int, data: dict) -> str:
        filename = _page_json_filename(page_num)
        key = _object_key(batch_no, "verified", filename)
        body = json.dumps(data, indent=2, default=str).encode("utf-8")
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body)
        return key

    # ── Failed page image ───────────────────────────────────────────

    def save_failed(self, batch_no: str, page_num: int, data: bytes) -> str:
        filename = _page_filename(page_num)
        key = _object_key(batch_no, "failed", filename)
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    # ── Thumbnail ───────────────────────────────────────────────────

    def save_thumbnail(self, batch_no: str, page_num: int, data: bytes) -> str:
        filename = _page_filename(page_num)
        key = _object_key(batch_no, "thumbnails", filename)
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    # ── Report ──────────────────────────────────────────────────────

    def save_report(self, batch_no: str, filename: str, data: bytes) -> str:
        key = _object_key(batch_no, "reports", os.path.basename(filename))
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    # ── Export ──────────────────────────────────────────────────────

    def save_export(self, filename: str, data: bytes) -> str:
        key = f"exports/{os.path.basename(filename)}"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    # ── Read ────────────────────────────────────────────────────────

    def read_file(self, batch_no: str, subdir: str, filename: str) -> Optional[bytes]:
        key = _object_key(batch_no, subdir, filename)
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=key)
            return obj["Body"].read()
        except self.client.exceptions.NoSuchKey:
            logger.warning("S3 object not found: s3://%s/%s", self.bucket, key)
            return None

    def read_file_by_key(self, object_key: str) -> Optional[bytes]:
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=object_key)
            return obj["Body"].read()
        except self.client.exceptions.NoSuchKey:
            logger.warning("S3 object not found: s3://%s/%s", self.bucket, object_key)
            return None

    # ── Batch size statistics ───────────────────────────────────────

    def get_batch_size(self, batch_no: str) -> dict:
        prefix = f"batches/{batch_no}/"
        total_files = 0
        total_size = 0
        counts = {}

        try:
            paginator = self.client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    total_files += 1
                    total_size += obj["Size"]
                    parts = obj["Key"].split("/")
                    if len(parts) >= 4:
                        subdir = parts[3]
                        counts[subdir] = counts.get(subdir, 0) + 1
        except Exception as e:
            logger.warning("Failed to list S3 objects for batch %s: %s", batch_no, e)
            return {}

        for sub in _SUBDIRS:
            counts.setdefault(sub, 0)

        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            **{f"{sub}_count": counts[sub] for sub in _SUBDIRS},
        }

    # ── Batch lifecycle ─────────────────────────────────────────────

    def _copy_prefix(self, src_prefix: str, dst_prefix: str):
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=src_prefix):
            for obj in page.get("Contents", []):
                copy_key = obj["Key"].replace(src_prefix, dst_prefix, 1)
                self.client.copy_object(
                    Bucket=self.bucket,
                    CopySource={"Bucket": self.bucket, "Key": obj["Key"]},
                    Key=copy_key,
                )

    def _delete_prefix(self, prefix: str):
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if keys:
                self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": keys})

    def archive_batch(self, batch_no: str) -> bool:
        src_prefix = f"batches/{batch_no}/"
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        dst_prefix = f"archive/{batch_no}_{timestamp}/"

        try:
            # Check if batch exists
            resp = self.client.list_objects_v2(Bucket=self.bucket, Prefix=src_prefix, MaxKeys=1)
            if resp.get("KeyCount", 0) == 0:
                return False

            self._copy_prefix(src_prefix, dst_prefix)
            self._delete_prefix(src_prefix)
            logger.info("Archived batch %s → s3://%s/%s", batch_no, self.bucket, dst_prefix)
            return True
        except Exception as e:
            logger.error("Failed to archive batch %s: %s", batch_no, e)
            return False

    def restore_batch(self, batch_no: str) -> bool:
        # Find the archive prefix
        archive_prefix = f"archive/{batch_no}_"
        resp = self.client.list_objects_v2(Bucket=self.bucket, Prefix=archive_prefix, MaxKeys=1)
        if resp.get("KeyCount", 0) == 0:
            logger.warning("No archived batch found for %s", batch_no)
            return False

        # Get the full archive prefix from first key
        first_key = resp["Contents"][0]["Key"]
        parts = first_key.split("/")
        archive_prefix_full = "/".join(parts[:3]) + "/"
        dst_prefix = f"batches/{batch_no}/"

        try:
            self._copy_prefix(archive_prefix_full, dst_prefix)
            self._delete_prefix(archive_prefix_full)
            logger.info("Restored batch %s from archive", batch_no)
            return True
        except Exception as e:
            logger.error("Failed to restore batch %s: %s", batch_no, e)
            return False

    def batch_exists(self, batch_no: str) -> bool:
        prefix = f"batches/{batch_no}/"
        resp = self.client.list_objects_v2(Bucket=self.bucket, Prefix=prefix, MaxKeys=1)
        return resp.get("KeyCount", 0) > 0
