"""Item CRUD and inventory page routes."""
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

TEMPLATES = Jinja2Templates(directory=str(Path(__file__).resolve().parents[1] / "templates"))

# API router providing JSON endpoints
api_router = APIRouter(prefix="/api/items", tags=["items"])

# Page router for HTML views
page_router = APIRouter()


@page_router.get("/inventory", response_class=HTMLResponse)
def inventory_page(request: Request, q: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Render inventory search page."""
    query = db.query(models.Item)
    if q:
        query = query.filter(models.Item.name.contains(q))
    items = query.all()
    return TEMPLATES.TemplateResponse("inventory.html", {"request": request, "items": items, "q": q or ""})


@page_router.get("/items/{item_id}", response_class=HTMLResponse)
def item_detail(item_id: int, request: Request, db: Session = Depends(get_db)):
    """Render a simple item detail page with detection thumbnails."""
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(404)
    detections = db.query(models.Detection).filter(models.Detection.item_id == item_id).all()
    return TEMPLATES.TemplateResponse("item_detail.html", {"request": request, "item": item, "detections": detections})


@api_router.get("/", response_model=List[schemas.ItemRead])
def list_items(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    barcode: Optional[str] = Query(None),
):
    """List items with optional search filters."""
    query = db.query(models.Item)
    if q:
        query = query.filter(models.Item.name.contains(q))
    if category:
        query = query.filter(models.Item.category == category)
    if zone:
        query = query.filter(models.Item.zone == zone)
    if barcode:
        query = query.filter(models.Item.barcode == barcode)
    return query.all()


@api_router.post("/", response_model=schemas.ItemRead, status_code=201)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    db_item = models.Item(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@api_router.get("/{item_id}", response_model=schemas.ItemRead)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(404)
    return item


@api_router.put("/{item_id}", response_model=schemas.ItemRead)
def update_item(item_id: int, item: schemas.ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.get(models.Item, item_id)
    if not db_item:
        raise HTTPException(404)
    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@api_router.post("/{item_id}/merge")
def merge_item(item_id: int, payload: schemas.ItemMerge, db: Session = Depends(get_db)):
    """Merge another item into ``item_id``."""
    if item_id == payload.source_id:
        return {"ok": True}
    target = db.get(models.Item, item_id)
    source = db.get(models.Item, payload.source_id)
    if not target or not source:
        raise HTTPException(404, "item not found")
    for det in source.detections:
        det.item_id = item_id
    db.delete(source)
    db.commit()
    return {"ok": True}


@api_router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(404)
    db.delete(item)
    db.commit()
    return {"ok": True}


# Backwards compatibility for tests expecting `router`
router = api_router
