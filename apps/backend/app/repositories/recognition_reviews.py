import datetime as dt
import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.face_crypto import decrypt_face_encoding, encrypt_face_encoding
from app.models.recognition_review import RecognitionReview


class RecognitionReviewRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_pending(
        self,
        student_id: int,
        event_type: str,
        device_id: str,
        confidence: float,
        margin: float,
        embedding: list[float],
        expires_at: dt.datetime,
        image_dir: str,
        frame_blob: bytes | None = None,
    ) -> RecognitionReview:
        image_path: str | None = None
        if frame_blob:
            image_path = self._save_temp_image(frame_blob, image_dir)

        model = RecognitionReview(
            student_id=student_id,
            event_type=event_type,
            device_id=device_id,
            confidence=confidence,
            margin=margin,
            embedding=encrypt_face_encoding(json.dumps(embedding)),
            face_image_path=image_path,
            status="pending",
            expires_at=expires_at,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def list_pending(self, limit: int = 100) -> list[RecognitionReview]:
        statement = (
            select(RecognitionReview)
            .where(RecognitionReview.status == "pending")
            .order_by(RecognitionReview.created_at.asc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def list_approved(self) -> list[RecognitionReview]:
        statement = (
            select(RecognitionReview)
            .where(RecognitionReview.status == "approved")
            .order_by(RecognitionReview.reviewed_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_pending(self, review_id: int) -> RecognitionReview | None:
        statement = (
            select(RecognitionReview)
            .where(RecognitionReview.id == review_id)
            .where(RecognitionReview.status == "pending")
            .limit(1)
        )
        return self.db.scalar(statement)

    def mark_approved(self, model: RecognitionReview, reviewed_by: str, note: str = "") -> RecognitionReview:
        self._purge_temp_image(model.face_image_path)
        model.status = "approved"
        model.reviewed_by = reviewed_by
        model.reviewed_at = dt.datetime.utcnow()
        model.review_note = note
        model.face_image_path = None
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def mark_rejected(self, model: RecognitionReview, reviewed_by: str, note: str = "") -> RecognitionReview:
        self._purge_temp_image(model.face_image_path)
        model.status = "rejected"
        model.reviewed_by = reviewed_by
        model.reviewed_at = dt.datetime.utcnow()
        model.review_note = note
        model.face_image_path = None
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def cleanup_expired(self, now: dt.datetime) -> int:
        statement = select(RecognitionReview).where(RecognitionReview.status == "pending").where(RecognitionReview.expires_at <= now)
        rows = list(self.db.scalars(statement).all())
        if not rows:
            return 0

        for row in rows:
            self._purge_temp_image(row.face_image_path)
            row.status = "expired"
            row.face_image_path = None
            row.embedding = ""
            row.review_note = "Expired before review"
            row.reviewed_at = now
            self.db.add(row)

        self.db.commit()
        return len(rows)

    @staticmethod
    def parse_embedding(model: RecognitionReview) -> list[float]:
        if not model.embedding:
            return []
        try:
            raw = decrypt_face_encoding(model.embedding)
            if not raw or raw == "[]":
                return []
            return [float(x) for x in json.loads(raw)]
        except (json.JSONDecodeError, ValueError) as e:
            # Decryption or parsing failed
            return []

    @staticmethod
    def _save_temp_image(frame_blob: bytes, image_dir: str) -> str:
        folder = Path(image_dir)
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"review_{uuid4().hex}.jpg"
        output = folder / filename
        output.write_bytes(frame_blob)
        return str(output)

    @staticmethod
    def _purge_temp_image(path: str | None) -> None:
        if not path:
            return
        try:
            file_path = Path(path)
            if file_path.exists():
                file_path.unlink()
        except OSError:
            return
