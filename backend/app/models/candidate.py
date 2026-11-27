
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import CITEXT

from backend.app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, nullable=False)
    name = Column(String(120), nullable=False)
    email = Column(CITEXT, nullable=False)
    phone = Column(String(30), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
