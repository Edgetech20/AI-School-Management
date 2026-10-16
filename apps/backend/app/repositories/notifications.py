from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification_log import NotificationLog


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, student_id: int | None, message: str, channel: str) -> NotificationLog:
        log = NotificationLog(student_id=student_id, message=message, type=channel)
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list(self, student_id: int | None = None) -> list[NotificationLog]:
        statement = select(NotificationLog).order_by(NotificationLog.sent_at.desc())
        if student_id:
            statement = statement.where(NotificationLog.student_id == student_id)
        return list(self.db.scalars(statement).all())
