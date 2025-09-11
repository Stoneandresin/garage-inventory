"""Endpoints for category management."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("/")
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


@router.post("/")
def create_category(category: dict, db: Session = Depends(get_db)):
    db_cat = models.Category(**category)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat
