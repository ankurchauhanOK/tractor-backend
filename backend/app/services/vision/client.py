from abc import ABC, abstractmethod
from typing import Dict

from app.services.roi.types import ROI


class BaseVisionClient(ABC):
    @abstractmethod
    def extract(self, roi: ROI, prompt: str) -> Dict:
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
