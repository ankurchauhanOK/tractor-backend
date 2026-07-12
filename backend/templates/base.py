from abc import ABC, abstractmethod
from typing import Dict, List


class BaseTemplate(ABC):
    @property
    @abstractmethod
    def template_id(self) -> str:
        pass

    @abstractmethod
    def get_parent_rois(self) -> Dict[str, dict]:
        pass

    @abstractmethod
    def get_sub_rois(self) -> Dict[str, dict]:
        pass

    @abstractmethod
    def get_required_texts(self) -> List[str]:
        pass
