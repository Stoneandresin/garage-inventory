"""Pydantic schemas used by the API."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ItemBase(BaseModel):
    """Shared properties for item create/update."""
    name: str
    category: Optional[str] = None
    quantity: int = 1
    zone: Optional[str] = None
    barcode: Optional[str] = None
    notes: Optional[str] = None
    image_path: Optional[str] = None


class ItemCreate(ItemBase):
    """Payload for creating an item."""
    pass


class ItemUpdate(BaseModel):
    """Payload for updating an item."""
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    zone: Optional[str] = None
    barcode: Optional[str] = None
    notes: Optional[str] = None
    image_path: Optional[str] = None


class ItemRead(ItemBase):
    """Item returned from the API."""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DetectionRead(BaseModel):
    """Minimal representation of a detection for review display."""
    id: int
    label: str
    confidence: float
    bbox_json: str
    crop_path: Optional[str] = None
    barcode: Optional[str] = None
    zone: Optional[str] = None
    frame_ts: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StreamSession(BaseModel):
    id: str
    started_at: datetime
    state: str
    frames_processed: int = 0
    detections_count: int = 0

    model_config = ConfigDict(from_attributes=True)
