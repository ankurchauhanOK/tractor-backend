from typing import Dict, Type

from templates.base import BaseTemplate
from templates.mahindra_v1 import MahindraTractorV1

from app.services.template.detector import TemplateType

_registry: Dict[TemplateType, Type[BaseTemplate]] = {
    TemplateType.MAHINDRA_TRACTOR_V1: MahindraTractorV1,
}


def get_template(template_type: TemplateType) -> BaseTemplate:
    cls = _registry.get(template_type)
    if cls is None:
        raise ValueError(f"No template registered for {template_type}")
    return cls()
