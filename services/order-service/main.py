import os
import socket
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./orders.db")
# Locally this points to your running inventory-service.
# In Kubernetes we will set it to http://inventory-service:8000
INVENTORY_URL = os.getenv("INVENTORY_URL", "http://localhost:8001")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
Session = sessionmaker(bind=engine)
Base = declarative_base()


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    item_id = Column(Integer, nullable=False)
    item_name = Column(String)
    quantity = Column(Integer, nullable=False)
    status = Column(String, default="PLACED")


Base.metadata.create_all(engine)


class OrderIn(BaseModel):
    user_id: int
    item_id: int
    quantity: int


app = FastAPI(title="Order Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/whoami")
def whoami():
    # In Kubernetes, the hostname of a container is its POD NAME
    return {"handled_by": socket.gethostname()}


@app.post("/orders")
def create_order(data: OrderIn):
    # 1. Ask inventory-service to reserve the stock
    try:
        r = httpx.post(
            f"{INVENTORY_URL}/reserve",
            json={"item_id": data.item_id, "quantity": data.quantity},
            timeout=5,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Inventory service unavailable")

    if r.status_code != 200:
        detail = r.json().get("detail", "Could not reserve item")
        raise HTTPException(status_code=r.status_code, detail=detail)

    reserved = r.json()

    # 2. Stock was reserved, so save the order
    with Session() as s:
        order = Order(
            user_id=data.user_id,
            item_id=data.item_id,
            item_name=reserved["name"],
            quantity=data.quantity,
        )
        s.add(order)
        s.commit()
        return {
            "order_id": order.id,
            "item": order.item_name,
            "quantity": order.quantity,
            "status": order.status,
            "handled_by": socket.gethostname(),
        }


@app.get("/orders")
def list_orders():
    with Session() as s:
        return [
            {"id": o.id, "user_id": o.user_id, "item": o.item_name,
             "quantity": o.quantity, "status": o.status}
            for o in s.query(Order).all()
        ]