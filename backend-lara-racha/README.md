# HireLoop Backend: Authentication and Roles

FastAPI + PostgreSQL. This part covers JWT access and refresh tokens, `/me`,
and role-based permissions (`hr`, `manager`, `interviewer`).
Note: `HIRING_MANAGER` in the task = `manager` in the database.

## Setup

1. Start the database: `docker compose up -d`
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in your own values. Never commit `.env`.
4. Create test users: `python seed_dev.py`
5. Run from this folder: `python -m uvicorn backend.app.main:app --reload --port 5000`
6. Docs: http://localhost:5000/docs

## JWT secret

Each developer generates their own, at least 32 bytes:

    python -c "import secrets; print(secrets.token_hex(32))"

Put it in `.env` as `JWT_SECRET=...`. Changing it invalidates all existing tokens.

## How it works

1. `POST /api/auth/login` returns `access_token` (15 min), `refresh_token` (7 days) and `user`.
2. The client sends `Authorization: Bearer <access_token>` on each request.
3. On a 401 caused by expiry, the client calls `POST /api/auth/refresh` and gets new tokens.
4. When the refresh token expires, the user logs in again.

Tokens hold `sub` (user id), `type` (access or refresh), `iat`, `exp`, `jti`.
The role is not in the token: it is read from the database on every request, so
role changes and deleted users apply immediately. A token of the wrong type is rejected.

## Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | /api/auth/login | Public | Tokens and user |
| GET | /api/auth/me | Logged-in user | Profile and role |
| POST | /api/auth/refresh | Valid refresh token | New tokens |
| POST | /api/auth/logout | Public | Client discards tokens (no server-side revocation) |
| GET | /api/auth/hr-only | HR | Sample endpoint protected by role. Replace with real endpoints later |

401 = missing, invalid or expired token. 403 = logged in but role not allowed.

## Protecting an endpoint by role

Example only. Apply it to real endpoints as they are built:

    @router.post("/example")
    def example(user = Depends(require_roles(ROLE_HR, ROLE_MANAGER))):
        ...

## Test users and password hashing

Passwords are stored as Argon2 hashes, never plain text. Inserting a plain
password in SQL makes login fail (`UnknownHashError`). `seed_dev.py` hashes them for you:

    python seed_dev.py

| Email | Role | Password |
|---|---|---|
| hr@test.com | hr | Test1234! |
| manager@test.com | manager | Test1234! |
| interviewer@test.com | interviewer | Test1234! |

DEV ONLY (fake data). It is safe to run repeatedly: existing users get their
password and role reset. Add a user by adding a line to `USERS` and running it again.

## Testing

**Swagger:** log in with `POST /api/auth/login`, copy `access_token`, click
Authorize, paste the token (without `Bearer`), then call `/api/auth/me`.
Check: no token (401), modified token (401), refresh token used as access (401),
interviewer on `/api/auth/hr-only` (403), HR on it (200).

**Expiry:** temporarily set `ACCESS_MINUTES = 1` in `tokens.py`, log in, wait over
a minute, then reload the frontend. Expect `me` 401, `refresh` 200, `me` 200. Set it back to 15.

**Frontend:** set `DEMO_BYPASS = false` locally in `recruiterlogin.jsx` (do not commit it).
Check Network and Application → Local Storage (`hireloop_access_token`,
`hireloop_refresh_token`). React StrictMode runs the startup check twice in
development, so the refresh sequence can appear twice.

**Automated:**

    python -m pytest tests -v

Requires the database and seeded users.

## Known limitations

- Logout does not revoke tokens on the server.
- No in-app user management or password reset yet.
- Login looks up users by email only, although the unique rule is (company_id, email).
- "Interviewers see only assigned candidates" and per-company filtering are planned for Sprint 02.