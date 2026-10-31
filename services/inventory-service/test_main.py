import os

os.environ["DATABASE_URL"] = "sqlite:///./test_inventory.db"
if os.path.exists("test_inventory.db"):
    os.remove("test_inventory.db")

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app)


def add_dish(name, stock):
    r = client.post("/items", json={"name": name, "price": 100, "stock": stock})
    assert r.status_code == 200
    return r.json()


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_menu_is_seeded():
    items = client.get("/items").json()
    assert len(items) >= 4
    assert all("price" in i and "stock" in i for i in items)


def test_add_dish():
    dish = add_dish("Test Paneer Wrap", 12)
    names = [i["name"] for i in client.get("/items").json()]
    assert dish["name"] in names


def test_reserve_reduces_stock():
    dish = add_dish("Test Idli", 10)
    r = client.post("/reserve", json={"item_id": dish["id"], "quantity": 3})
    assert r.status_code == 200
    assert r.json()["remaining_stock"] == 7


def test_reserve_more_than_stock_fails():
    dish = add_dish("Test Vada", 2)
    r = client.post("/reserve", json={"item_id": dish["id"], "quantity": 5})
    assert r.status_code == 400
    assert r.json()["detail"] == "Not enough stock"


def test_reserve_unknown_item():
    r = client.post("/reserve", json={"item_id": 999999, "quantity": 1})
    assert r.status_code == 404


def test_reserve_needs_positive_quantity():
    dish = add_dish("Test Lassi", 5)
    r = client.post("/reserve", json={"item_id": dish["id"], "quantity": 0})
    assert r.status_code == 400
