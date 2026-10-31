import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker

# Configuration comes from an environment variable, with a local default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")
# Use the psycopg2 driver explicitly (newer SQLAlchemy defaults to a different one)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
Session = sessionmaker(bind=engine)
Base = declarative_base()


class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, nullable=False, default=0)


Base.metadata.create_all(engine)


class ItemIn(BaseModel):
    name: str
    price: float
    stock: int


class ReserveIn(BaseModel):
    item_id: int
    quantity: int


def seed():
    """Add a few menu items the first time the service starts."""
    with Session() as s:
        if s.query(Item).count() == 0:
            s.add_all([
                Item(name="Margherita Pizza", price=250, stock=50),
                Item(name="Veg Burger", price=120, stock=50),
                Item(name="Masala Dosa", price=80, stock=50),
                Item(name="Filter Coffee", price=40, stock=50),
            ])
            s.commit()


seed()
app = FastAPI(title="Inventory Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/items")
def list_items():
    with Session() as s:
        return [{"id": i.id, "name": i.name, "price": i.price, "stock": i.stock}
                for i in s.query(Item).all()]


@app.post("/items")
def add_item(item: ItemIn):
    with Session() as s:
        new = Item(name=item.name, price=item.price, stock=item.stock)
        s.add(new)
        s.commit()
        return {"id": new.id, "name": new.name, "price": new.price, "stock": new.stock}


@app.post("/reserve")
def reserve(req: ReserveIn):
    """Called by order-service: reduce stock if enough is available."""
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    with Session() as s:
        item = s.get(Item, req.item_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Item not found")
        if item.stock < req.quantity:
            raise HTTPException(status_code=400, detail="Out ofstock")
        item.stock -= req.quantity
        s.commit()
        return {"item_id": item.id, "name": item.name, "remaining_stock": item.stock}