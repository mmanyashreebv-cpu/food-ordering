import hmac
import os
import bcrypt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./users.db")
# Secret code a restaurant owner must enter to register (set from a Kubernetes Secret)
# Use the psycopg2 driver explicitly (newer SQLAlchemy defaults to a different one)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
OWNER_CODE = os.getenv("OWNER_CODE", "KUBEOWNER")
ROLES = ("customer", "owner")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
Session = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="customer")


Base.metadata.create_all(engine)


def ensure_role_column():
    """Databases created before roles existed don't have the column, so add it."""
    columns = [c["name"] for c in inspect(engine).get_columns("users")]
    if "role" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'customer'"))


ensure_role_column()


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: str = "customer"
    owner_code: str = ""


class LoginIn(BaseModel):
    email: str
    password: str
    role: str = "customer"


def user_json(user):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role or "customer"}


app = FastAPI(title="User Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/register")
def register(data: RegisterIn):
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Role must be customer or owner")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if data.role == "owner" and not hmac.compare_digest(data.owner_code.encode(), OWNER_CODE.encode()):
        raise HTTPException(status_code=403, detail="Invalid owner access code")
    with Session() as s:
        if s.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
        user = User(name=data.name, email=data.email, password_hash=hashed, role=data.role)
        s.add(user)
        s.commit()
        return user_json(user)


@app.post("/login")
def login(data: LoginIn):
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Role must be customer or owner")
    with Session() as s:
        user = s.query(User).filter(User.email == data.email).first()
        if user is None or not bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        actual = user.role or "customer"
        if actual != data.role:
            if actual == "owner":
                raise HTTPException(status_code=403, detail="This is a restaurant owner account. Please use the Restaurant owner login.")
            raise HTTPException(status_code=403, detail="This is a customer account. Please use the Customer login.")
        return {**user_json(user), "message": "Login successful"}


@app.get("/users/{user_id}")
def get_user(user_id: int):
    with Session() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user_json(user)