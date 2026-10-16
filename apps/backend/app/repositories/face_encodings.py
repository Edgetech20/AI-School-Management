import json
import math
from statistics import pstdev
from types import SimpleNamespace

from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.face_encoding import FaceEncoding
from app.schemas.face_encoding import FaceEncodingCreate
from app.core.face_crypto import decrypt_face_encoding, encrypt_face_encoding


class FaceEncodingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: FaceEncodingCreate) -> FaceEncoding:
        model = FaceEncoding(
            student_id=payload.student_id,
            encoding=encrypt_face_encoding(json.dumps(payload.encoding)),
            source="core",
            quality_score=self.calculate_quality_score(payload.encoding),
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def create_adaptive_from_embedding(
        self,
        student_id: int,
        encoding: list[float],
    ) -> FaceEncoding:
        """Create an adaptive face encoding directly (allows duplicates for review promotion)."""
        quality_score = self.calculate_quality_score(encoding)
        model = FaceEncoding(
            student_id=student_id,
            encoding=encrypt_face_encoding(json.dumps(encoding)),
            source="adaptive",
            quality_score=quality_score,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def parse_encoding(self, item: FaceEncoding) -> list[float]:
        raw = decrypt_face_encoding(item.encoding)
        return [float(x) for x in json.loads(raw)]

    def list_by_student(self, student_id: int) -> list[FaceEncoding]:
        statement = select(FaceEncoding).where(FaceEncoding.student_id == student_id).order_by(FaceEncoding.id)
        try:
            return list(self.db.scalars(statement).all())
        except OperationalError as exc:
            # Backward compatibility when DB schema has not been migrated yet.
            if "Unknown column" not in str(exc):
                raise
            rows = self.db.execute(
                text("SELECT id, student_id, encoding FROM face_encodings WHERE student_id = :student_id ORDER BY id"),
                {"student_id": student_id},
            ).mappings().all()
            return [
                SimpleNamespace(
                    id=int(row["id"]),
                    student_id=int(row["student_id"]),
                    encoding=str(row["encoding"]),
                    source="core",
                    quality_score=None,
                )
                for row in rows
            ]

    def list_all(self) -> list[FaceEncoding]:
        statement = select(FaceEncoding).order_by(FaceEncoding.id)
        try:
            return list(self.db.scalars(statement).all())
        except OperationalError as exc:
            # Backward compatibility when DB schema has not been migrated yet.
            if "Unknown column" not in str(exc):
                raise
            rows = self.db.execute(text("SELECT id, student_id, encoding FROM face_encodings ORDER BY id")).mappings().all()
            return [
                SimpleNamespace(
                    id=int(row["id"]),
                    student_id=int(row["student_id"]),
                    encoding=str(row["encoding"]),
                    source="core",
                    quality_score=None,
                )
                for row in rows
            ]

    def count_by_student(self, student_id: int) -> int:
        return len(self.list_by_student(student_id))

    def add_adaptive_sample(
        self,
        student_id: int,
        encoding: list[float],
        max_samples: int = 20,
        min_distance: float = 0.10,
        min_quality_score: float = 0.55,
    ) -> bool:
        quality_score = self.calculate_quality_score(encoding)
        if quality_score < min_quality_score:
            return False

        existing = self.list_by_student(student_id)

        for item in existing:
            known = self.parse_encoding(item)
            if len(known) != len(encoding):
                continue
            if float(math.dist(known, encoding)) <= min_distance:
                return False

        model = FaceEncoding(
            student_id=student_id,
            encoding=encrypt_face_encoding(json.dumps(encoding)),
            source="adaptive",
            quality_score=quality_score,
        )
        self.db.add(model)
        self.db.flush()

        adaptive_existing = [item for item in existing if item.source == "adaptive"]
        if len(adaptive_existing) + 1 > max_samples:
            overflow = (len(adaptive_existing) + 1) - max_samples
            for item in adaptive_existing[:overflow]:
                self.db.delete(item)

        self.db.commit()
        return True

    @staticmethod
    def calculate_quality_score(encoding: list[float]) -> float:
        if not encoding or len(encoding) < 64:
            return 0.0
        if any(not math.isfinite(x) for x in encoding):
            return 0.0

        norm = float(math.sqrt(sum(x * x for x in encoding)))
        spread = float(pstdev(encoding)) if len(encoding) > 1 else 0.0

        norm_component = max(0.0, min(1.0, norm / 2.0))
        spread_component = max(0.0, min(1.0, spread / 0.20))
        return round((norm_component * 0.6) + (spread_component * 0.4), 4)
