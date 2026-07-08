import logging

from app.config import STORAGE_BACKEND

logger = logging.getLogger(__name__)


def _create_storage():
    backend = STORAGE_BACKEND.lower()
    if backend == "s3":
        from app.services.storage.s3 import S3Storage
        logger.info("Using S3-compatible storage backend")
        return S3Storage()
    from app.services.storage.local import LocalStorage
    logger.info("Using local filesystem storage backend")
    return LocalStorage()


storage = _create_storage()

__all__ = [
    "storage",
]
