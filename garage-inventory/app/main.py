"""FastAPI application entry point."""
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from .db import init_db
from .routers import stream, items, zones, categories, settings

init_db()

app = FastAPI(title="Garage Inventory")

app.include_router(stream.router)
app.include_router(items.router)
app.include_router(zones.router)
app.include_router(categories.router)
app.include_router(settings.router)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")


@app.get("/", response_class=HTMLResponse)
async def scan_page(request: Request):
    return templates.TemplateResponse("scan.html", {"request": request})
