"""Pydantic schemas for API responses and requests."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: int = 1
    zone: Optional[str] = None
    shelf_label: Optional[str] = None
    notes: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int
    confidence: float = 0.0
    barcode: Optional[str] = None
    serial_text: Optional[str] = None
    image_path: Optional[str] = None
    crop_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StreamSession(BaseModel):
    id: str
    started_at: datetime
    state: str
    frames_processed: int = 0
    detections_count: int = 0

    model_config = ConfigDict(from_attributes=True)
