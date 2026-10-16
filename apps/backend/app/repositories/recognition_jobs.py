import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.recognition_job import RecognitionJob


class RecognitionJobRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, event_type: str, device_id: str, frame_blob: bytes) -> RecognitionJob:
        model = RecognitionJob(event_type=event_type, device_id=device_id, frame_blob=frame_blob, status="pending")
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def fetch_next_pending(self) -> RecognitionJob | None:
        statement = (
            select(RecognitionJob)
            .where(RecognitionJob.status.in_(["pending", "retry"]))
            .order_by(RecognitionJob.created_at.asc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def mark_processing(self, job: RecognitionJob) -> RecognitionJob:
        job.status = "processing"
        job.updated_at = dt.datetime.utcnow()
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def mark_done(self, job: RecognitionJob) -> RecognitionJob:
        job.status = "done"
        job.updated_at = dt.datetime.utcnow()
        job.last_error = ""
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def mark_failed(self, job: RecognitionJob, error: str) -> RecognitionJob:
        job.retry_count += 1
        job.updated_at = dt.datetime.utcnow()
        job.last_error = error[:1000]
        if job.retry_count >= job.max_retries:
            job.status = "failed"
        else:
            job.status = "retry"
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job
