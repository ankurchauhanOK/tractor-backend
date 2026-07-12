#!/usr/bin/env python3
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from templates.mahindra_v1 import MahindraTractorV1

COLORS = [
    (0, 255, 0),
    (255, 0, 0),
    (0, 0, 255),
    (255, 255, 0),
    (255, 0, 255),
    (0, 255, 255),
    (128, 0, 128),
]


def draw_rois(image_path: str, output_path: str = None):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image: {image_path}")
        sys.exit(1)

    h, w = img.shape[:2]
    print(f"Image: {w}x{h}")

    template = MahindraTractorV1()
    sub_rois = template.get_sub_rois()

    if output_path is None:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_annotated{ext}"

    for i, (name, coords) in enumerate(sub_rois.items()):
        x = int(coords["x"] * w)
        y = int(coords["y"] * h)
        rw = int(coords["width"] * w)
        rh = int(coords["height"] * h)

        color = COLORS[i % len(COLORS)]
        cv2.rectangle(img, (x, y), (x + rw, y + rh), color, 3)
        cv2.putText(img, name, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        print(f"  {name:15s} ({x:4d},{y:4d},{rw:4d},{rh:4d})")

    cv2.imwrite(output_path, img)
    print(f"\nAnnotated image saved to: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python roi_preview.py <image_path> [output_path]")
        sys.exit(1)
    draw_rois(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
