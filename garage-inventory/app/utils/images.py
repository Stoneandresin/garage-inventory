"""Image helper utilities (stub)."""
from pathlib import Path

import cv2


def save_image(data: bytes, path: Path) -> None:
    """Persist raw bytes to ``path``."""
    with path.open("wb") as f:
        f.write(data)


def get_size(path: Path) -> tuple[int, int]:
    """Return image width and height using OpenCV."""
    img = cv2.imread(str(path))
    if img is None:
        return (0, 0)
    h, w = img.shape[:2]
    return (w, h)
