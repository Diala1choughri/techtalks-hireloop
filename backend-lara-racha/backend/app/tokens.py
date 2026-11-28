import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv

load_dotenv()
JWT_SECRET = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
ACCESS_MINUTES = 1
REFRESH_DAYS = 7


def _make_token(user_id: int, token_type: str, lifetime: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "type": token_type, "iat": now,
               "exp": now + lifetime, "jti": uuid.uuid4().hex}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def create_tokens(user_id: int) -> dict:
    return {
        "access_token": _make_token(user_id, "access", timedelta(minutes=ACCESS_MINUTES)),
        "refresh_token": _make_token(user_id, "refresh", timedelta(days=REFRESH_DAYS)),
    }


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise ValueError("invalid or expired token")
    if payload.get("type") != expected_type:
        raise ValueError("wrong token type")
    return payload