import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser
from app.models.face_encoding import FaceEncoding
from app.models.rule import Rule
from app.models.student import Student


def seed() -> None:
    settings = get_settings()
    db = SessionLocal()

    try:
        admin = db.scalar(select(AdminUser).where(AdminUser.username == settings.admin_default_username))
        if not admin:
            db.add(
                AdminUser(
                    username=settings.admin_default_username,
                    password_hash=get_password_hash(settings.admin_default_password),
                    role="admin",
                    is_active=True,
                    created_at=datetime.now(UTC).replace(tzinfo=None),
                )
            )

        rule = db.get(Rule, 1)
        if not rule:
            db.add(Rule(id=1, school_start_time="09:00", late_threshold_time="09:15", minimum_hours=6.0))

        sample = db.scalar(select(Student).where(Student.roll_number == "A-001"))
        if not sample:
            sample = Student(
                name="Aarav Sharma",
                class_name="10-A",
                roll_number="A-001",
                parent_phone="+911234567890",
                parent_email="parent.aarav@example.com",
            )
            db.add(sample)
            db.flush()

            seed_encoding = [0.01] * 128
            db.add(FaceEncoding(student_id=sample.id, encoding=json.dumps(seed_encoding)))

        db.commit()
        print("Seed data applied successfully")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
