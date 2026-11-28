# DEV ONLY: creates a demo company and fake test users.
# Never run this against a real or production database.
# Safe to run repeatedly: existing users get their password and role reset.

from sqlalchemy import text

from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.security import hash_password

COMPANY_NAME = "Demo Company"
COMPANY_INDUSTRY = "Technology"

# (email, name, role, password). Fake data only.
USERS = [
    ("hr@test.com", "Test HR", "hr", "Test1234!"),
    ("manager@test.com", "Test Manager", "manager", "Test1234!"),
    ("interviewer@test.com", "Test Interviewer", "interviewer", "Test1234!"),
]


def main():
    db = SessionLocal()
    try:
        # Get or create the demo company
        row = db.execute(
            text("SELECT company_id FROM companies WHERE name = :name"),
            {"name": COMPANY_NAME},
        ).first()
        if row is None:
            row = db.execute(
                text(
                    "INSERT INTO companies (name, industry) "
                    "VALUES (:name, :industry) RETURNING company_id"
                ),
                {"name": COMPANY_NAME, "industry": COMPANY_INDUSTRY},
            ).first()
            print("created company:", COMPANY_NAME)
        company_id = row[0]

        # Create or update each user (the password is hashed here)
        for email, name, role, password in USERS:
            user = (
                db.query(User)
                .filter(User.company_id == company_id, User.email == email)
                .first()
            )
            if user is None:
                db.add(
                    User(
                        company_id=company_id,
                        name=name,
                        email=email,
                        role=role,
                        password_hash=hash_password(password),
                    )
                )
                print("created user:", email, f"({role})")
            else:
                user.name = name
                user.role = role
                user.password_hash = hash_password(password)
                print("updated user:", email, f"({role})")

        db.commit()
        print("done")
    finally:
        db.close()


if __name__ == "__main__":
    main()