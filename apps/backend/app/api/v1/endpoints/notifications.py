import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.repositories.attendance import AttendanceRepository
from app.repositories.notifications import NotificationRepository
from app.schemas.notification import NotificationRead

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    student_id: int | None = Query(default=None), db: Session = Depends(get_db)
) -> list[NotificationRead]:
    return NotificationRepository(db).list(student_id=student_id)


@router.post("/daily-summary", response_model=NotificationRead)
def send_daily_summary(
    date: dt.date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> NotificationRead:
    target_date = date or dt.date.today()
    rows = AttendanceRepository(db).list(day=target_date)

    present = sum(1 for row in rows if row.status == "Present")
    late = sum(1 for row in rows if row.status == "Late")
    absent = sum(1 for row in rows if row.status == "Absent")
    half_day = sum(1 for row in rows if row.status == "Half-day")

    message = (
        f"Daily summary for {target_date.isoformat()}: "
        f"Present={present}, Late={late}, Half-day={half_day}, Absent={absent}, Total={len(rows)}"
    )
    return NotificationRepository(db).create(student_id=None, message=message, channel="DailySummary")
