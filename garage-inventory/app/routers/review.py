"""Routes for reviewing and accepting detections into inventory items."""
from __future__ import annotations
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db

TEMPLATES = Jinja2Templates(directory=str(Path(__file__).resolve().parents[1] / "templates"))

# Page router for /review HTML view
page_router = APIRouter()

# API router for JSON/HTMX interactions
router = APIRouter(prefix="/api/review", tags=["review"])


def _group_detections(db: Session, session_id: str) -> Dict[str, List[models.Detection]]:
    """Group detections by barcode or label for a session."""
    dets = (
        db.query(models.Detection)
        .filter(
            models.Detection.session_id == session_id,
            models.Detection.item_id.is_(None),
        )
        .all()
    )
    groups: Dict[str, List[models.Detection]] = {}
    for det in dets:
        key = det.barcode or det.label
        groups.setdefault(key, []).append(det)
    return groups


def _proposed_items(groups: Dict[str, List[models.Detection]]):
    """Yield proposed item dicts from grouped detections."""
    for key, dets in groups.items():
        confidence = sum(d.confidence for d in dets) / len(dets)
        first = dets[0]
        yield {
            "temp_id": key,
            "name_guess": first.label,
            "category_guess": first.label,
            "zone_guess": first.zone,
            "confidence": confidence,
            "barcode": first.barcode,
            "crop_paths": [d.crop_path for d in dets if d.crop_path],
        }


@page_router.get("/review", response_class=HTMLResponse)
def review_page(request: Request, session_id: str | None = None, db: Session = Depends(get_db)):
    """Render the review page listing proposed items for a session."""
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    groups = _group_detections(db, session_id)
    items = list(_proposed_items(groups))
    return TEMPLATES.TemplateResponse(
        "review.html", {"request": request, "items": items, "session_id": session_id}
    )


@router.get("/{session_id}")
def proposed_items(session_id: str, db: Session = Depends(get_db)):
    """Return a JSON list of proposed items for a session."""
    groups = _group_detections(db, session_id)
    return list(_proposed_items(groups))


@router.post("/{session_id}/accept", response_class=HTMLResponse)
def accept_proposal(
    request: Request,
    session_id: str,
    temp_id: str = Form(...),
    name: str = Form(...),
    category: str = Form(None),
    zone: str = Form(None),
    quantity: int = Form(1),
    notes: str = Form(None),
    db: Session = Depends(get_db),
):
    groups = _group_detections(db, session_id)
    dets = groups.get(temp_id)
    if not dets:
        raise HTTPException(404, "proposal not found")
    item = models.Item(name=name, category=category, zone=zone, quantity=quantity, notes=notes)
    db.add(item)
    db.commit()
    db.refresh(item)
    for det in dets:
        det.item_id = item.id
    db.commit()
    return HTMLResponse("<div class='card accepted'>Added to inventory</div>")


@router.post("/{session_id}/reject", response_class=HTMLResponse)
def reject_proposal(
    session_id: str,
    temp_id: str = Form(...),
    db: Session = Depends(get_db),
):
    groups = _group_detections(db, session_id)
    dets = groups.get(temp_id)
    if not dets:
        raise HTTPException(404, "proposal not found")
    for det in dets:
        db.delete(det)
    db.commit()
    return HTMLResponse("<div class='card rejected'>Rejected</div>")


@router.post("/{session_id}/merge", response_class=HTMLResponse)
def merge_proposal(
    session_id: str,
    temp_id: str = Form(...),
    target_item_id: int = Form(...),
    db: Session = Depends(get_db),
):
    target = db.get(models.Item, target_item_id)
    if not target:
        raise HTTPException(404, "target item not found")
    groups = _group_detections(db, session_id)
    dets = groups.get(temp_id)
    if not dets:
        raise HTTPException(404, "proposal not found")
    for det in dets:
        det.item_id = target_item_id
    db.commit()
    return HTMLResponse("<div class='card merged'>Merged</div>")
