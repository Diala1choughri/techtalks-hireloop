from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.tokens import ALGORITHM, JWT_SECRET

client = TestClient(app)

# Users created by seed_dev.py. Run the seed before the tests.
HR = {"email": "hr@test.com", "password": "Test1234!"}
INTERVIEWER = {"email": "interviewer@test.com", "password": "Test1234!"}


def login(creds):
    r = client.post("/api/auth/login", json=creds)
    assert r.status_code == 200
    return r.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_login_returns_both_tokens():
    data = login(HR)
    assert data["access_token"] and data["refresh_token"]
    assert data["user"]["role"] == "HR"


def test_wrong_password_is_401():
    assert client.post("/api/auth/login", json={**HR, "password": "wrong"}).status_code == 401


def test_me_with_valid_token():
    r = client.get("/api/auth/me", headers=auth(login(HR)["access_token"]))
    assert r.status_code == 200
    assert r.json()["user"]["email"] == HR["email"]


def test_me_without_token_is_401():
    assert client.get("/api/auth/me").status_code == 401


def test_tampered_token_is_401():
    token = login(HR)["access_token"]
    assert client.get("/api/auth/me", headers=auth(token[:-2] + "xx")).status_code == 401


def test_expired_token_is_401():
    payload = {"sub": "1", "type": "access",
               "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}
    expired = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    assert client.get("/api/auth/me", headers=auth(expired)).status_code == 401


def test_refresh_token_cannot_be_used_as_access():
    refresh = login(HR)["refresh_token"]
    assert client.get("/api/auth/me", headers=auth(refresh)).status_code == 401


def test_access_token_cannot_be_used_to_refresh():
    access = login(HR)["access_token"]
    assert client.post("/api/auth/refresh", json={"refresh_token": access}).status_code == 401


def test_refresh_returns_working_tokens():
    refresh = login(HR)["refresh_token"]
    r = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=auth(r.json()["access_token"])).status_code == 200


def test_interviewer_gets_403_on_hr_only():
    token = login(INTERVIEWER)["access_token"]
    assert client.get("/api/auth/hr-only", headers=auth(token)).status_code == 403


def test_hr_can_use_hr_only():
    token = login(HR)["access_token"]
    assert client.get("/api/auth/hr-only", headers=auth(token)).status_code == 200