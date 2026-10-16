import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.attendance_log import AttendanceLog
from app.models.student import Student


def seed_attendance():
    settings = get_settings()
    db = SessionLocal()

    try:
        # Get the sample student
        student = db.scalar(select(Student).where(Student.roll_number == "A-001"))
        if not student:
            print("No student found. Run seed_data.py first.")
            return

        # Create attendance records for the past 7 days
        today = datetime.now(UTC).replace(tzinfo=None)
        for i in range(7):
            attendance_date = today - timedelta(days=i)

            # Skip weekends for more realistic data
            if attendance_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                continue

            # Create attendance record
            attendance = AttendanceLog(
                student_id=student.id,
                date=attendance_date.date(),
                check_in_time=attendance_date.replace(hour=8, minute=45 + i, second=0),  # Vary arrival time
                status="Present" if i != 2 else "Late",  # Make one day late
                last_match_confidence=0.95,
            )
            db.add(attendance)

        db.commit()
        print("Sample attendance data added successfully")
    finally:
        db.close()


if __name__ == "__main__":
    seed_attendance()