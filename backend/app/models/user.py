
from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint, CheckConstraint, func
from sqlalchemy.dialects.postgresql import CITEXT

from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint("company_id", "email", name="users_company_id_email_key"),
        CheckConstraint(
            "role IN ('manager', 'interviewer', 'hr')",
            name="users_role_check"
        ),
    )

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, nullable=False)
    name = Column(String(120), nullable=False)
    email = Column(CITEXT, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
