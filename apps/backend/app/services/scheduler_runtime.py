import asyncio
import datetime as dt
import os
import subprocess
from pathlib import Path

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.repositories.attendance import AttendanceRepository
from app.repositories.notifications import NotificationRepository
from app.services.face.queue_worker import process_one_recognition_job

_TASK: asyncio.Task | None = None
_LAST_DAILY_SUMMARY_DATE: dt.date | None = None
_SHUTDOWN_FLAG = False


async def _scheduler_loop() -> None:
    global _LAST_DAILY_SUMMARY_DATE, _SHUTDOWN_FLAG
    settings = get_settings()

    while not _SHUTDOWN_FLAG:
        try:
            db = SessionLocal()
            try:
                process_one_recognition_job(db)
                now = dt.datetime.now()
                if now.hour == settings.scheduler_daily_summary_hour_ist and _LAST_DAILY_SUMMARY_DATE != now.date():
                    rows = AttendanceRepository(db).list(day=now.date())
                    present = sum(1 for row in rows if row.status == "Present")
                    late = sum(1 for row in rows if row.status == "Late")
                    absent = sum(1 for row in rows if row.status == "Absent")
                    half_day = sum(1 for row in rows if row.status == "Half-day")
                    NotificationRepository(db).create(
                        student_id=None,
                        message=(
                            f"Daily summary for {now.date().isoformat()}: "
                            f"Present={present}, Late={late}, Half-day={half_day}, Absent={absent}, Total={len(rows)}"
                        ),
                        channel="DailySummary",
                    )
                    _LAST_DAILY_SUMMARY_DATE = now.date()

                # Optional daily backup call if script exists and triggered around midnight.
                if now.hour == 0 and now.minute < 5:
                    backup_script = Path(__file__).resolve().parents[4] / "infra" / "scripts" / "backup-db.ps1"
                    if os.name == "nt" and backup_script.exists():
                        subprocess.run(["powershell", "-File", str(backup_script)], check=False)
            finally:
                db.close()
        except Exception:
            pass

        if not _SHUTDOWN_FLAG:
            await asyncio.sleep(max(1, settings.queue_poll_interval_seconds))


def start_scheduler() -> None:
    global _TASK
    settings = get_settings()
    if not settings.scheduler_enabled:
        return
    if _TASK and not _TASK.done():
        return
    _TASK = asyncio.create_task(_scheduler_loop())


async def stop_scheduler() -> None:
    global _TASK, _SHUTDOWN_FLAG
    _SHUTDOWN_FLAG = True
    if _TASK and not _TASK.done():
        _TASK.cancel()
        try:
            await _TASK
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
    _TASK = None
