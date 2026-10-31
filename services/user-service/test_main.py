import os
import uuid

# Use a throwaway database and a known owner code for the tests
os.environ["DATABASE_URL"] = "sqlite:///./test_users.db"
os.environ["OWNER_CODE"] = "test-owner-code"
if os.path.exists("test_users.db"):
    os.remove("test_users.db")

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app)


def new_email():
    return f"{uuid.uuid4().hex[:8]}@example.com"


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_customer_and_login():
    email = new_email()
    r = client.post("/register", json={"name": "Test Customer", "email": email, "password": "secret123", "role": "customer"})
    assert r.status_code == 200
    assert r.json()["role"] == "customer"
    assert "password" not in r.text
    r = client.post("/login", json={"email": email, "password": "secret123", "role": "customer"})
    assert r.status_code == 200
    assert r.json()["message"] == "Login successful"


def test_duplicate_email_is_rejected():
    email = new_email()
    body = {"name": "Dup", "email": email, "password": "secret123"}
    assert client.post("/register", json=body).status_code == 200
    r = client.post("/register", json=body)
    assert r.status_code == 400


def test_short_password_is_rejected():
    r = client.post("/register", json={"name": "Short", "email": new_email(), "password": "123"})
    assert r.status_code == 400


def test_wrong_password_is_rejected():
    email = new_email()
    client.post("/register", json={"name": "Pw", "email": email, "password": "secret123"})
    r = client.post("/login", json={"email": email, "password": "not-the-password"})
    assert r.status_code == 401


def test_owner_registration_needs_the_right_code():
    r = client.post("/register", json={"name": "Owner", "email": new_email(), "password": "secret123", "role": "owner", "owner_code": "wrong"})
    assert r.status_code == 403


def test_owner_can_register_and_log_in():
    email = new_email()
    r = client.post("/register", json={"name": "Owner", "email": email, "password": "secret123", "role": "owner", "owner_code": "test-owner-code"})
    assert r.status_code == 200
    assert r.json()["role"] == "owner"
    r = client.post("/login", json={"email": email, "password": "secret123", "role": "owner"})
    assert r.status_code == 200


def test_login_checks_the_role():
    cust = {"name": "C", "email": new_email(), "password": "secret123"}
    owner = {"name": "O", "email": new_email(), "password": "secret123"}
    client.post("/register", json={**cust, "role": "customer"})
    client.post("/register", json={**owner, "role": "owner", "owner_code": "test-owner-code"})
    r = client.post("/login", json={"email": cust["email"], "password": cust["password"], "role": "owner"})
    assert r.status_code == 403
    r = client.post("/login", json={"email": owner["email"], "password": owner["password"], "role": "customer"})
    assert r.status_code == 403
