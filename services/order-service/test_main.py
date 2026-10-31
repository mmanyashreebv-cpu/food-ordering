import os
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///./test_orders.db"
os.environ["INVENTORY_URL"] = "http://inventory.test"
if os.path.exists("test_orders.db"):
    os.remove("test_orders.db")

import httpx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app)


def fake_inventory(status, body):
    """Pretend to be the inventory-service so no real network call is made."""
    response = MagicMock()
    response.status_code = status
    response.json.return_value = body
    return response


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_whoami():
    assert client.get("/whoami").json()["handled_by"]


def test_order_is_saved_when_stock_is_reserved():
    reply = fake_inventory(200, {"item_id": 2, "name": "Veg Burger", "remaining_stock": 47})
    with patch("main.httpx.post", return_value=reply):
        r = client.post("/orders", json={"user_id": 1, "item_id": 2, "quantity": 3})
    assert r.status_code == 200
    body = r.json()
    assert body["item"] == "Veg Burger"
    assert body["quantity"] == 3
    assert body["status"] == "PLACED"
    assert "handled_by" in body
    saved = client.get("/orders").json()
    assert any(o["id"] == body["order_id"] for o in saved)


def test_order_is_rejected_when_out_of_stock():
    before = len(client.get("/orders").json())
    reply = fake_inventory(400, {"detail": "Not enough stock"})
    with patch("main.httpx.post", return_value=reply):
        r = client.post("/orders", json={"user_id": 1, "item_id": 2, "quantity": 1000})
    assert r.status_code == 400
    assert r.json()["detail"] == "Not enough stock"
    assert len(client.get("/orders").json()) == before


def test_inventory_down_gives_503():
    with patch("main.httpx.post", side_effect=httpx.ConnectError("down")):
        r = client.post("/orders", json={"user_id": 1, "item_id": 2, "quantity": 1})
    assert r.status_code == 503
