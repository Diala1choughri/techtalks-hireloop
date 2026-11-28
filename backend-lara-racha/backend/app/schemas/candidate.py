
from pydantic import BaseModel, EmailStr


class CandidateLookupRequest(BaseModel):
    job_id: int
    email: EmailStr
