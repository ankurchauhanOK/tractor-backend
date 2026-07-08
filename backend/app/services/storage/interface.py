from abc import ABC, abstractmethod


class StorageBackend(ABC):

    @abstractmethod
    def save_original_pdf(self, batch_no: str, data: bytes, filename: str) -> str:
        ...

    @abstractmethod
    def save_original_page(self, batch_no: str, page_num: int, data: bytes) -> str:
        ...

    @abstractmethod
    def save_enhanced(self, batch_no: str, page_num: int, data: bytes) -> str:
        ...

    @abstractmethod
    def save_ocr_json(self, batch_no: str, page_num: int, data: dict) -> str:
        ...

    @abstractmethod
    def save_verified_json(self, batch_no: str, page_num: int, data: dict) -> str:
        ...

    @abstractmethod
    def save_thumbnail(self, batch_no: str, page_num: int, data: bytes) -> str:
        ...

    @abstractmethod
    def save_failed(self, batch_no: str, page_num: int, data: bytes) -> str:
        ...

    @abstractmethod
    def save_report(self, batch_no: str, filename: str, data: bytes) -> str:
        ...

    @abstractmethod
    def save_export(self, filename: str, data: bytes) -> str:
        ...

    @abstractmethod
    def read_file(self, batch_no: str, subdir: str, filename: str) -> bytes | None:
        ...

    def read_file_by_key(self, object_key: str) -> bytes | None:
        return None

    @abstractmethod
    def file_path(self, batch_no: str, subdir: str, filename: str) -> str:
        ...

    def get_url(self, object_key: str) -> str:
        return object_key

    @abstractmethod
    def get_batch_size(self, batch_no: str) -> dict:
        ...

    @abstractmethod
    def archive_batch(self, batch_no: str) -> bool:
        ...

    @abstractmethod
    def restore_batch(self, batch_no: str) -> bool:
        ...

    @abstractmethod
    def batch_exists(self, batch_no: str) -> bool:
        ...
