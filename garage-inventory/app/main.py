"""FastAPI application entry point."""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .db import init_db
from .routers import categories, items, settings, stream, zones

init_db()

app = FastAPI(title="Garage Inventory")

app.include_router(stream.router)
app.include_router(items.router)
app.include_router(zones.router)
app.include_router(categories.router)
app.include_router(settings.router)

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def scan_page(request: Request):
    return templates.TemplateResponse("scan.html", {"request": request})
