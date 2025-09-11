"""Endpoints for streaming image/video data from the frontend."""
from typing import Dict
import asyncio
import uuid

import cv2
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import schemas, models
from ..db import get_db
from ..config import DATA_DIR
from ..services import pipeline

router = APIRouter(prefix="/api/stream", tags=["stream"])

# in-memory event queues per session
EVENT_QUEUES: Dict[str, list] = {}


def _push_event(session_id: str, event: Dict):
    EVENT_QUEUES.setdefault(session_id, []).append(event)


@router.post("/start", response_model=schemas.StreamSession)
def start_stream(db: Session = Depends(get_db)):
    session_id = uuid.uuid4().hex
    session = models.StreamSession(id=session_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    EVENT_QUEUES[session_id] = []
    return session


@router.post("/ingest")
async def ingest(
    session_id: str = Query(...),
    type: str = Query("frame"),
    seq: int = Query(0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    session = db.get(models.StreamSession, session_id)
    if not session:
        raise HTTPException(404, "session not found")

    session_dir = DATA_DIR / "streams" / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    dest = session_dir / f"{seq}_{file.filename}"
    with dest.open("wb") as f:
        f.write(await file.read())

    asset = models.ImageAsset(session_id=session_id, kind=type, path=str(dest))
    db.add(asset)

    detections = pipeline.process_image(dest)

    # load image size for normalization; fall back to 1x1 if image can't be parsed
    img = cv2.imread(str(dest))
    if img is None:
        width = height = 1
    else:
        height, width = img.shape[:2]

    payload = []
    for i, det in enumerate(detections):
        db_det = models.Detection(
            session_id=session_id,
            asset_path=str(dest),
            label=det["label"],
            confidence=det["confidence"],
            bbox_json=str(det["bbox"]),
        )
        db.add(db_det)
        x, y, w, h = det["bbox"]
        norm = [x / width, y / height, w / width, h / height]
        payload.append(
            {
                "label": det["label"],
                "conf": det["confidence"],
                "bbox": det["bbox"],
                "norm": norm,
                "track_id": f"srv-{i}",
            }
        )

    session.frames_processed += 1
    session.detections_count += len(detections)
    db.commit()

    _push_event(
        session_id,
        {
            "type": "detections",
            "frame_id": seq,
            "width": width,
            "height": height,
            "detections": payload,
        },
    )
    queued = len(EVENT_QUEUES.get(session_id, []))
    return {"accepted": True, "queued": queued}


@router.get("/{session_id}/events")
async def stream_events(session_id: str):
    """Yield Server-Sent Events for a session.

    This lightweight implementation avoids the external ``sse-starlette``
    dependency by streaming pre-formatted SSE lines.
    """

    async def event_generator():
        while True:
            queue = EVENT_QUEUES.get(session_id)
            if queue:
                event = queue.pop(0)
                yield f"event: {event['type']}\ndata: {event}\n\n"
            else:
                yield "event: keepalive\ndata: {}\n\n"
            await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/stop")
def stop_stream(session_id: str, db: Session = Depends(get_db)):
    session = db.get(models.StreamSession, session_id)
    if not session:
        raise HTTPException(404, "session not found")
    session.state = "stopped"
    db.commit()
    return {"ok": True}
