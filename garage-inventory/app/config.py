"""Application configuration values.

This module centralises runtime configuration using ``pydantic-settings``.
Values are loaded from environment variables with an optional ``.env`` file in
the project root.  Defaults match the project specification and favour running
the lightweight preview detector in the browser.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from the environment."""

    data_dir: Path = Path("./data")
    yolo_model: str = "yolov8n.pt"
    detection_min_conf: float = 0.35
    ocr_min_conf: float = 0.5
    use_clip: bool = False
    max_queue: int = 32
    chunk_sec: int = 2

    # --- frontend preview/overlay tuning ---
    preview_detector: str = "tfjs"  # "none" | "tfjs"
    preview_fps: int = 3
    ema_alpha: float = 0.5
    server_match_iou: float = 0.5
    preview_prune_frames: int = 15

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Instantiate settings; expose module-level constants for convenience
settings = Settings()

DATA_DIR = settings.data_dir
YOLO_MODEL = settings.yolo_model
DETECTION_MIN_CONF = settings.detection_min_conf
OCR_MIN_CONF = settings.ocr_min_conf
USE_CLIP = settings.use_clip
MAX_QUEUE = settings.max_queue
CHUNK_SEC = settings.chunk_sec

PREVIEW_DETECTOR = settings.preview_detector
PREVIEW_FPS = settings.preview_fps
EMA_ALPHA = settings.ema_alpha
SERVER_MATCH_IOU = settings.server_match_iou
PREVIEW_PRUNE_FRAMES = settings.preview_prune_frames

# Ensure data directory exists for local-first storage
DATA_DIR.mkdir(parents=True, exist_ok=True)

