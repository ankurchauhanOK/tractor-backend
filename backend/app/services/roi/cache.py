from typing import Dict, Optional

from app.services.roi.types import ROI


class ROICache:
    def __init__(self):
        self._rois: Dict[str, ROI] = {}

    def set(self, name: str, roi: ROI):
        self._rois[name] = roi

    def get(self, name: str) -> Optional[ROI]:
        return self._rois.get(name)

    def all(self) -> Dict[str, ROI]:
        return dict(self._rois)

    def clear(self):
        self._rois.clear()

    def __len__(self) -> int:
        return len(self._rois)
