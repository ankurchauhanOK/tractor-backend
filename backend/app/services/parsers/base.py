from abc import ABC, abstractmethod
from typing import Optional

from app.services.layout.models import Cell
from app.services.layout.field_result import FieldResult


class BaseFieldParser(ABC):
    @abstractmethod
    def parse(self, cell: Optional[Cell]) -> FieldResult:
        pass
