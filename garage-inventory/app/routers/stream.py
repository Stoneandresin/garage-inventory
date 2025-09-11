import asyncio
import json
from typing import AsyncIterator, Dict, Any

# Simple queue to hold outgoing events
event_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()

async def event_generator() -> AsyncIterator[str]:
    """Yield server‑sent events from the internal event queue.

    Each yielded string follows the SSE format and contains a JSON payload
    so that the client can reliably parse ``ev.data`` using ``JSON.parse``.
    """
    while True:
        event = await event_queue.get()
        payload = json.dumps(event)
        yield f"event: {event['type']}\ndata: {payload}\n\n"
