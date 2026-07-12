from dataclasses import dataclass
from typing import Optional


@dataclass
class ROI:
    name: str
    image_bytes: bytes
    bbox: tuple  # (x, y, width, height) in original image coordinates
    parent: str = ""
