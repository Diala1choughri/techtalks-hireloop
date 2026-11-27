
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database import get_db
from backend.app.models.candidate import Candidate
from backend.app.schemas.candidate import CandidateLookupRequest


router = APIRouter(
    prefix="/api/candidates",
    tags=["Candidates"]
)


@router.post("/lookup")
def lookup_candidate(
    body: CandidateLookupRequest,
    db: Session = Depends(get_db)
):
    # 1. Find which company owns this job
    job = db.execute(
        text("SELECT company_id FROM jobs WHERE job_id = :job_id"),
        {"job_id": body.job_id}
    ).mappings().first()

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    # 2. Check whether this email already exists
    existing_candidate = db.query(Candidate.candidate_id).filter(
        Candidate.company_id == job["company_id"],
        Candidate.email == body.email.strip()
    ).first()

    # 3. Return the result
    return {
        "exists": existing_candidate is not None
    }
