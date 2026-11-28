from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.tokens import create_tokens
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest
from backend.app.security import verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):

    # Find the user by email
    user = db.query(User).filter(
        User.email == body.email.strip()
    ).first()

    # Check whether the user exists and the password is correct
    if user is None or not verify_password(
        body.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Return safe user information (never return password_hash)
    user_data = {
        "user_id": user.user_id,
        "company_id": user.company_id,
        "name": user.name,
        "email": user.email,
        "role": user.role.upper()
    }

    return {**create_tokens(user.user_id), "user": user_data}