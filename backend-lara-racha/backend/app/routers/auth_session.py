from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.tokens import create_tokens, decode_token

from backend.app.dependencies import get_current_user, require_roles, ROLE_HR

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RefreshBody(BaseModel):
    refresh_token: str


def user_to_dict(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "company_id": user.company_id,
        "name": user.name,
        "email": user.email,
        "role": user.role.upper()
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"user": user_to_dict(user)}


@router.post("/refresh")
def refresh(body: RefreshBody, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token, "refresh")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return create_tokens(user.user_id)


@router.post("/logout")
def logout():
    return {"message": "Logged out"}

@router.get("/hr-only")
def hr_only(user: User = Depends(require_roles(ROLE_HR))):
    """Sample endpoint protected by role. Replace with real endpoints later."""
    return {"ok": True, "role": user.role.upper()}