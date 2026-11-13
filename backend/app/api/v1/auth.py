from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from postgrest.exceptions import APIError
from app.models.schemas import UserCreate, UserRead, Token
from app.database import get_db
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


@router.post("/register", response_model=UserRead)
async def register(user: UserCreate):
    db = get_db()
    # Ensure email not already used.
    existing = db.table("users").select("id").eq("email", user.email).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(user.password)
    user_id = str(uuid4())
    row = {
        "id": user_id,
        "email": user.email,
        "password_hash": hashed,
    }
    try:
        response = db.table("users").insert(row).execute()
    except APIError as exc:
        detail = getattr(exc, "message", None) or "Failed to create user"
        raise HTTPException(status_code=500, detail=detail)

    data = response.data[0] if response.data else None
    if not data:
        fetch = db.table("users").select("id,email").eq("id", user_id).single().execute()
        data = fetch.data
    if not data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return UserRead(id=data["id"], email=data["email"], name=data.get("name"))


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    try:
        response = db.table("users").select("id,email,password_hash").eq("email", form_data.username).single().execute()
    except APIError as exc:
        detail = getattr(exc, "message", None) or "Failed to read user credentials"
        raise HTTPException(status_code=500, detail=detail)
    if not response.data:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    user = response.data
    if not verify_password(form_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )
    return Token(access_token=access_token, token_type="bearer")
