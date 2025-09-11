from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_item_crud():
    # create
    payload = {"name": "Hammer", "category": "tools"}
    r = client.post("/api/items/", json=payload)
    assert r.status_code == 201
    item = r.json()
    item_id = item["id"]

    # list
    r = client.get("/api/items/")
    assert any(i["id"] == item_id for i in r.json())

    # update
    r = client.put(f"/api/items/{item_id}", json={"name": "Hammer", "category": "hardware"})
    assert r.status_code == 200
    assert r.json()["category"] == "hardware"

    # delete
    r = client.delete(f"/api/items/{item_id}")
    assert r.status_code == 200
    assert r.json()["ok"]
