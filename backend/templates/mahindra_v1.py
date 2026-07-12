from typing import Dict, List

from templates.base import BaseTemplate


class MahindraTractorV1(BaseTemplate):
    @property
    def template_id(self) -> str:
        return "mahindra_tractor_v1"

    def get_parent_rois(self) -> Dict[str, dict]:
        return {}

    def get_sub_rois(self) -> Dict[str, dict]:
        return {
            "tractor_no": {"x": 0.03, "y": 0.10, "width": 0.18, "height": 0.06},
            "date": {"x": 0.24, "y": 0.10, "width": 0.18, "height": 0.06},
            "shift": {"x": 0.38, "y": 0.10, "width": 0.18, "height": 0.06},
            "line": {"x": 0.55, "y": 0.09, "width": 0.15, "height": 0.07},
            "checklist": {"x": 0.03, "y": 0.17, "width": 0.70, "height": 0.43},
            "defects": {"x": 0.03, "y": 0.61, "width": 0.92, "height": 0.35},
            "shortages": {"x": 0.03, "y": 0.95, "width": 0.92, "height": 0.05},
        }

    def get_required_texts(self) -> List[str]:
        return ["MAHINDRA", "TRACTOR INSPECTION SHEET"]
