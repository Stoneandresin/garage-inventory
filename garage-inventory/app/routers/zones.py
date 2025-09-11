"""Endpoints for zone management."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db

router = APIRouter(prefix="/api/zones", tags=["zones"])


@router.get("/")
def list_zones(db: Session = Depends(get_db)):
    return db.query(models.Zone).all()


@router.post("/")
def create_zone(zone: dict, db: Session = Depends(get_db)):
    db_zone = models.Zone(**zone)
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone
