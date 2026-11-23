import os

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from auth_tokens import create_tokens, decode_token

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://hireloop_user:your_local_password@localhost:5432/hireloop",
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

ROLE_HR = "hr"
ROLE_MANAGER = "manager"
ROLE_INTERVIEWER = "interviewer"


def get_user_by_id(user_id: int):
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, company_id, name, email, role FROM users WHERE user_id = %s",
                (user_id,),
            )
            return cur.fetchone()
    finally:
        conn.close()


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(creds.credentials, "access")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


def require_roles(*allowed_roles: str):
    """Use: Depends(require_roles(ROLE_HR, ROLE_MANAGER))"""
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission")
        return user
    return checker


class RefreshBody(BaseModel):
    refresh_token: str


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": user}


@router.post("/refresh")
def refresh(body: RefreshBody):
    try:
        payload = decode_token(body.refresh_token, "refresh")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = get_user_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return create_tokens(user)


@router.post("/logout")
def logout(body: RefreshBody):
    # MVP: the frontend clears its tokens. Real revocation needs a token table later.
    return {"message": "Logged out"}