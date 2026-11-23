import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt

JWT_SECRET = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
ACCESS_MINUTES = 0.2
REFRESH_DAYS = 7


def _make_token(user_id: int, token_type: str, lifetime: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),        # only the user id; role is loaded from the DB
        "type": token_type,         # "access" or "refresh"
        "iat": now,
        "exp": now + lifetime,
        "jti": uuid.uuid4().hex,    # unique id per token
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def create_tokens(user: dict) -> dict:
    """Call this after the password check succeeds. `user` needs a 'user_id'."""
    return {
        "access_token": _make_token(user["user_id"], "access", timedelta(minutes=ACCESS_MINUTES)),
        "refresh_token": _make_token(user["user_id"], "refresh", timedelta(days=REFRESH_DAYS)),
    }


def decode_token(token: str, expected_type: str) -> dict:
    """Returns the payload, or raises ValueError if invalid, expired, or the wrong type."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise ValueError("invalid or expired token")
    if payload.get("type") != expected_type:
        raise ValueError("wrong token type")
    return payload


def build_login_response(user: dict) -> dict:
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {**create_tokens(user), "user": safe_user}