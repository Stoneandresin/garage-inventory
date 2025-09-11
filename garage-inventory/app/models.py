"""Database models for the inventory system."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .db import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    zone = Column(String, nullable=True)
    shelf_label = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    crop_path = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    serial_text = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    detections = relationship("Detection", back_populates="item")


class StreamSession(Base):
    __tablename__ = "stream_sessions"

    id = Column(String, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    stopped_at = Column(DateTime, nullable=True)
    state = Column(String, default="running")
    frames_processed = Column(Integer, default=0)
    detections_count = Column(Integer, default=0)
    summary_json = Column(Text, nullable=True)

    images = relationship("ImageAsset", back_populates="session")
    detections = relationship("Detection", back_populates="session")


class ImageAsset(Base):
    __tablename__ = "image_assets"

    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey("stream_sessions.id"))
    kind = Column(String)  # video or frame
    path = Column(String)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    captured_at = Column(DateTime, default=datetime.utcnow)
    state = Column(String, default="uploaded")

    session = relationship("StreamSession", back_populates="images")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    session_id = Column(String, ForeignKey("stream_sessions.id"))
    asset_path = Column(String)
    label = Column(String)
    confidence = Column(Float)
    bbox_json = Column(Text)
    frame_ts = Column(Float, nullable=True)

    item = relationship("Item", back_populates="detections")
    session = relationship("StreamSession", back_populates="detections")


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    polygon_json = Column(Text, nullable=True)
    marker_type = Column(String, nullable=True)
    marker_id = Column(String, nullable=True)
    notes = Column(Text, nullable=True)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    synonyms_json = Column(Text, nullable=True)

    parent = relationship("Category", remote_side=[id])
