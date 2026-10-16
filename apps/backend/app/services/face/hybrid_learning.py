import datetime as dt
from dataclasses import dataclass

from app.core.config import Settings
from app.repositories.face_encodings import FaceEncodingRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.recognition_events import RecognitionEventRepository
from app.repositories.recognition_reviews import RecognitionReviewRepository
from app.schemas.attendance import AttendanceEventIn
from app.schemas.recognition import RecognitionMatch
from app.services.attendance.service import AttendanceService
from app.services.face.recognizer import MatchResult


@dataclass
class HybridLearningProcessor:
    settings: Settings
    attendance_service: AttendanceService
    event_repo: RecognitionEventRepository
    notification_repo: NotificationRepository
    encoding_repo: FaceEncodingRepository
    review_repo: RecognitionReviewRepository

    def _student_snapshot(self, student_id: int) -> tuple[str | None, str | None]:
        try:
            student = self.attendance_service.student_repo.get(student_id)
        except Exception:
            return None, None
        if not student:
            return None, None
        return student.name, student.class_name

    def _safe_get_recent_match(self, student_id: int, event_type: str, since: dt.datetime):
        try:
            return self.event_repo.get_recent_match(student_id, event_type, since)
        except Exception:
            self.event_repo.db.rollback()
            return None

    def _safe_event_create(
        self,
        *,
        timestamp: dt.datetime,
        event_type: str,
        device_id: str,
        outcome: str,
        student_id: int | None = None,
        confidence: float | None = None,
    ) -> None:
        try:
            self.event_repo.create(
                timestamp=timestamp,
                event_type=event_type,
                device_id=device_id,
                outcome=outcome,
                student_id=student_id,
                confidence=confidence,
            )
        except Exception:
            self.event_repo.db.rollback()

    def _process_attendance_event(self, hit: MatchResult, now: dt.datetime, event_type: str):
        payload = AttendanceEventIn(student_id=hit.student_id, timestamp=now, event_type=event_type)
        confidence = round(hit.confidence, 4)
        try:
            return self.attendance_service.process_event(payload, confidence=confidence)
        except TypeError:
            # Backward-compatible fallback for test doubles or older service signatures.
            return self.attendance_service.process_event(payload)

    def process_match(
        self,
        hit: MatchResult,
        now: dt.datetime,
        event_type: str,
        device_id: str,
        frame_blob: bytes,
    ) -> RecognitionMatch | None:
        since = now - dt.timedelta(seconds=self.settings.duplicate_mark_window_seconds)
        recent = self._safe_get_recent_match(hit.student_id, event_type, since)
        if recent:
            self._safe_event_create(
                timestamp=now,
                event_type=event_type,
                device_id=device_id,
                outcome="duplicate_skipped",
                student_id=hit.student_id,
                confidence=round(hit.confidence, 4),
            )
            student_name, class_name = self._student_snapshot(hit.student_id)
            return RecognitionMatch(
                student_id=hit.student_id,
                student_name=student_name,
                class_name=class_name,
                confidence=round(hit.confidence, 4),
                status="already_marked",
            )

        if not self.settings.hybrid_learning_enabled:
            return self._mark_direct_attendance(hit, now, event_type, device_id)

        if hit.confidence >= self.settings.hybrid_high_confidence_threshold:
            return self._handle_high_confidence(hit, now, event_type, device_id)

        if hit.confidence >= self.settings.hybrid_medium_confidence_threshold:
            return self._handle_medium_confidence(hit, now, event_type, device_id, frame_blob)

        self._safe_event_create(
            timestamp=now,
            event_type=event_type,
            device_id=device_id,
            outcome="unknown_low_confidence",
            student_id=None,
            confidence=round(hit.confidence, 4),
        )
        return None

    def _mark_direct_attendance(
        self,
        hit: MatchResult,
        now: dt.datetime,
        event_type: str,
        device_id: str,
    ) -> RecognitionMatch:
        record = self._process_attendance_event(hit, now, event_type)
        student_name, class_name = self._student_snapshot(hit.student_id)
        self._safe_event_create(
            timestamp=now,
            event_type=event_type,
            device_id=device_id,
            outcome="matched",
            student_id=hit.student_id,
            confidence=round(hit.confidence, 4),
        )
        return RecognitionMatch(
            student_id=hit.student_id,
            student_name=student_name,
            class_name=class_name,
            confidence=round(hit.confidence, 4),
            status=record.status,
        )

    def _handle_high_confidence(
        self,
        hit: MatchResult,
        now: dt.datetime,
        event_type: str,
        device_id: str,
    ) -> RecognitionMatch:
        record = self._process_attendance_event(hit, now, event_type)
        student_name, class_name = self._student_snapshot(hit.student_id)
        self._safe_event_create(
            timestamp=now,
            event_type=event_type,
            device_id=device_id,
            outcome="matched",
            student_id=hit.student_id,
            confidence=round(hit.confidence, 4),
        )

        if hit.margin >= self.settings.hybrid_high_min_margin:
            self.encoding_repo.add_adaptive_sample(
                student_id=hit.student_id,
                encoding=hit.detected_encoding,
                max_samples=self.settings.adaptive_max_samples_per_student,
                min_distance=self.settings.adaptive_min_distance,
                min_quality_score=self.settings.adaptive_min_quality_score,
            )

        return RecognitionMatch(
            student_id=hit.student_id,
            student_name=student_name,
            class_name=class_name,
            confidence=round(hit.confidence, 4),
            status=record.status,
        )

    def _handle_medium_confidence(
        self,
        hit: MatchResult,
        now: dt.datetime,
        event_type: str,
        device_id: str,
        frame_blob: bytes,
    ) -> RecognitionMatch:
        record = self._process_attendance_event(hit, now, event_type)
        student_name, class_name = self._student_snapshot(hit.student_id)
        self._safe_event_create(
            timestamp=now,
            event_type=event_type,
            device_id=device_id,
            outcome="matched_review",
            student_id=hit.student_id,
            confidence=round(hit.confidence, 4),
        )

        if hit.margin >= self.settings.hybrid_review_min_margin:
            expires_at = now + dt.timedelta(hours=self.settings.hybrid_review_retention_hours)
            self.review_repo.create_pending(
                student_id=hit.student_id,
                event_type=event_type,
                device_id=device_id,
                confidence=round(hit.confidence, 4),
                margin=round(hit.margin, 4),
                embedding=hit.detected_encoding,
                expires_at=expires_at,
                image_dir=self.settings.hybrid_review_image_dir,
                frame_blob=frame_blob,
            )

        return RecognitionMatch(
            student_id=hit.student_id,
            student_name=student_name,
            class_name=class_name,
            confidence=round(hit.confidence, 4),
            status=f"{record.status} (pending_verification)",
            pending_verification=True,
        )
