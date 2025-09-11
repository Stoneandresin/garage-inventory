"""Simplified computer vision pipeline stub.

The real project would perform object detection, OCR and more.  For the
purpose of tests we merely return a single dummy detection per image.
"""
from pathlib import Path
from typing import List, Dict


def process_image(path: Path) -> List[Dict[str, float]]:
    """Pretend to process an image and return fake detections."""
    return [
        {
            "label": "object",
            "confidence": 0.9,
            # dummy bounding box in pixel coordinates (x, y, w, h)
            "bbox": [0, 0, 10, 10],
        }
    ]
