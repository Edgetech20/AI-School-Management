from __future__ import annotations
import datetime as dt

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.attendance_log import AttendanceLog
from app.models.student import Student


class AttendanceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_student_and_date(self, student_id: int, day: dt.date) -> AttendanceLog | None:
        statement = select(AttendanceLog).where(
            and_(AttendanceLog.student_id == student_id, AttendanceLog.date == day)
        )
        return self.db.scalar(statement)

    def get(self, attendance_id: int) -> AttendanceLog | None:
        return self.db.get(AttendanceLog, attendance_id)

    def upsert(self, record: AttendanceLog) -> AttendanceLog:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def list(self, class_name: str | None = None, day: dt.date | None = None) -> list[AttendanceLog]:
        statement = select(AttendanceLog).join(AttendanceLog.student)
        if class_name:
            statement = statement.where(Student.class_name == class_name)
        if day:
            statement = statement.where(AttendanceLog.date == day)
        statement = statement.order_by(AttendanceLog.date.desc(), AttendanceLog.id.desc())
        return list(self.db.scalars(statement).all())
