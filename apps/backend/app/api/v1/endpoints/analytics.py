import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import require_teacher_or_admin
from app.db.session import get_db
from app.repositories.attendance import AttendanceRepository

router = APIRouter(dependencies=[Depends(require_teacher_or_admin)])


def _empty_stats() -> dict[str, int]:
    return {"Present": 0, "Late": 0, "Half-day": 0, "Absent": 0}


@router.get("/daily")
def analytics_daily(date: dt.date | None = Query(default=None), db: Session = Depends(get_db)) -> dict:
    target = date or dt.date.today()
    rows = AttendanceRepository(db).list(day=target)
    stats = _empty_stats()
    for row in rows:
        stats[row.status] = stats.get(row.status, 0) + 1
    return {"date": target.isoformat(), "total": len(rows), "stats": stats}


@router.get("/weekly")
def analytics_weekly(end_date: dt.date | None = Query(default=None), db: Session = Depends(get_db)) -> dict:
    end = end_date or dt.date.today()
    start = end - dt.timedelta(days=6)

    trend: list[dict] = []
    summary = _empty_stats()
    for i in range(7):
        day = start + dt.timedelta(days=i)
        rows = AttendanceRepository(db).list(day=day)
        stats = _empty_stats()
        for row in rows:
            stats[row.status] = stats.get(row.status, 0) + 1
            summary[row.status] = summary.get(row.status, 0) + 1
        trend.append({"date": day.isoformat(), "total": len(rows), "stats": stats})

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "summary": summary,
        "trend": trend,
    }


@router.get("/monthly")
def analytics_monthly(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> dict:
    today = dt.date.today()
    y = year or today.year
    m = month or today.month
    first_day = dt.date(y, m, 1)
    if m == 12:
        next_month = dt.date(y + 1, 1, 1)
    else:
        next_month = dt.date(y, m + 1, 1)

    day = first_day
    summary = _empty_stats()
    trend: list[dict] = []
    while day < next_month:
        rows = AttendanceRepository(db).list(day=day)
        stats = _empty_stats()
        for row in rows:
            stats[row.status] = stats.get(row.status, 0) + 1
            summary[row.status] = summary.get(row.status, 0) + 1
        trend.append({"date": day.isoformat(), "total": len(rows), "present": stats["Present"]})
        day += dt.timedelta(days=1)

    return {
        "year": y,
        "month": m,
        "summary": summary,
        "trend": trend,
    }
