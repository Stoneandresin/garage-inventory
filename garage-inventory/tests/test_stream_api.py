import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_stream_lifecycle(tmp_path):
    # start session
    r = client.post("/api/stream/start")
    assert r.status_code == 200
    session_id = r.json()["id"]

    # ingest a dummy frame
    data = io.BytesIO(b"fake")
    files = {"file": ("frame.jpg", data, "image/jpeg")}
    r = client.post(f"/api/stream/ingest?session_id={session_id}&seq=1", files=files)
    assert r.status_code == 200
    assert r.json()["accepted"]

    # connect to SSE and grab first detections event
    from app.routers import stream as stream_router
    event = stream_router.EVENT_QUEUES[session_id][0]
    assert event["type"] == "detections"
    det = event["detections"][0]
    assert "norm" in det and len(det["norm"]) == 4
    assert "track_id" in det

    # stop session
    r = client.post(f"/api/stream/stop", params={"session_id": session_id})
    assert r.status_code == 200
    assert r.json()["ok"] is True
