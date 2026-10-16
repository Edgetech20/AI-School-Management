import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.recognition_event import RecognitionEvent


class RecognitionEventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        timestamp: dt.datetime,
        event_type: str,
        device_id: str,
        outcome: str,
        student_id: int | None = None,
        confidence: float | None = None,
    ) -> RecognitionEvent:
        model = RecognitionEvent(
            timestamp=timestamp,
            event_type=event_type,
            device_id=device_id,
            outcome=outcome,
            student_id=student_id,
            confidence=confidence,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def list_recent(self, limit: int = 100) -> list[RecognitionEvent]:
        statement = select(RecognitionEvent).order_by(RecognitionEvent.timestamp.desc()).limit(limit)
        return list(self.db.scalars(statement).all())

    def list_since(self, since: dt.datetime, limit: int = 5000) -> list[RecognitionEvent]:
        statement = (
            select(RecognitionEvent)
            .where(RecognitionEvent.timestamp >= since)
            .order_by(RecognitionEvent.timestamp.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def get_recent_match(
        self,
        student_id: int,
        event_type: str,
        since: dt.datetime,
    ) -> RecognitionEvent | None:
        statement = (
            select(RecognitionEvent)
            .where(RecognitionEvent.student_id == student_id)
            .where(RecognitionEvent.event_type == event_type)
            .where(RecognitionEvent.outcome == "matched")
            .where(RecognitionEvent.timestamp >= since)
            .order_by(RecognitionEvent.timestamp.desc())
            .limit(1)
        )
        return self.db.scalar(statement)
