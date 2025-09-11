"""Application settings endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/settings", tags=["settings"])

settings_store = {}


@router.post("/")
def update_settings(payload: dict):
    settings_store.update(payload)
    return settings_store
