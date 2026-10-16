import datetime as dt

from app.core.config import Settings
from app.services.face.hybrid_learning import HybridLearningProcessor
from app.services.face.recognizer import MatchResult


class _Record:
    def __init__(self, status: str) -> None:
        self.status = status


class _AttendanceService:
    def __init__(self) -> None:
        self.calls = 0

    def process_event(self, payload):
        self.calls += 1
        return _Record(status="Present")


class _EventRepo:
    def __init__(self) -> None:
        self.created: list[str] = []

    def get_recent_match(self, student_id: int, event_type: str, since: dt.datetime):
        return None

    def create(self, timestamp, event_type, device_id, outcome, student_id=None, confidence=None):
        self.created.append(outcome)
        return None


class _NotificationRepo:
    pass


class _EncodingRepo:
    def __init__(self) -> None:
        self.calls = 0

    def add_adaptive_sample(self, **kwargs):
        self.calls += 1
        return True


class _ReviewRepo:
    def __init__(self) -> None:
        self.calls = 0

    def create_pending(self, **kwargs):
        self.calls += 1
        return None


def _settings(enabled: bool) -> Settings:
    settings = Settings()
    settings.hybrid_learning_enabled = enabled
    settings.hybrid_high_confidence_threshold = 0.97
    settings.hybrid_medium_confidence_threshold = 0.90
    settings.hybrid_high_min_margin = 0.08
    settings.hybrid_review_min_margin = 0.04
    settings.hybrid_review_retention_hours = 48
    settings.hybrid_review_image_dir = "tmp/review_faces"
    settings.adaptive_max_samples_per_student = 20
    settings.adaptive_min_distance = 0.12
    settings.adaptive_min_quality_score = 0.55
    settings.duplicate_mark_window_seconds = 120
    return settings


def test_hybrid_disabled_keeps_original_matching_behavior() -> None:
    attendance_service = _AttendanceService()
    event_repo = _EventRepo()
    encoding_repo = _EncodingRepo()
    review_repo = _ReviewRepo()

    processor = HybridLearningProcessor(
        settings=_settings(enabled=False),
        attendance_service=attendance_service,
        event_repo=event_repo,
        notification_repo=_NotificationRepo(),
        encoding_repo=encoding_repo,
        review_repo=review_repo,
    )

    result = processor.process_match(
        hit=MatchResult(student_id=11, confidence=0.91, detected_encoding=[0.1] * 128, distance=0.31, margin=0.05),
        now=dt.datetime(2026, 3, 21, 9, 0, 0),
        event_type="check_in",
        device_id="gate-main",
        frame_blob=b"fake",
    )

    assert result is not None
    assert result.pending_verification is False
    assert attendance_service.calls == 1
    assert event_repo.created == ["matched"]
    assert encoding_repo.calls == 0
    assert review_repo.calls == 0


def test_hybrid_high_confidence_marks_and_adapts() -> None:
    attendance_service = _AttendanceService()
    event_repo = _EventRepo()
    encoding_repo = _EncodingRepo()
    review_repo = _ReviewRepo()

    processor = HybridLearningProcessor(
        settings=_settings(enabled=True),
        attendance_service=attendance_service,
        event_repo=event_repo,
        notification_repo=_NotificationRepo(),
        encoding_repo=encoding_repo,
        review_repo=review_repo,
    )

    result = processor.process_match(
        hit=MatchResult(student_id=12, confidence=0.98, detected_encoding=[0.1] * 128, distance=0.28, margin=0.10),
        now=dt.datetime(2026, 3, 21, 9, 0, 0),
        event_type="check_in",
        device_id="gate-main",
        frame_blob=b"fake",
    )

    assert result is not None
    assert result.pending_verification is False
    assert attendance_service.calls == 1
    assert event_repo.created == ["matched"]
    assert encoding_repo.calls == 1
    assert review_repo.calls == 0


def test_hybrid_medium_confidence_marks_and_queues_review() -> None:
    attendance_service = _AttendanceService()
    event_repo = _EventRepo()
    encoding_repo = _EncodingRepo()
    review_repo = _ReviewRepo()

    processor = HybridLearningProcessor(
        settings=_settings(enabled=True),
        attendance_service=attendance_service,
        event_repo=event_repo,
        notification_repo=_NotificationRepo(),
        encoding_repo=encoding_repo,
        review_repo=review_repo,
    )

    result = processor.process_match(
        hit=MatchResult(student_id=13, confidence=0.93, detected_encoding=[0.1] * 128, distance=0.32, margin=0.05),
        now=dt.datetime(2026, 3, 21, 9, 0, 0),
        event_type="check_in",
        device_id="gate-main",
        frame_blob=b"fake",
    )

    assert result is not None
    assert result.pending_verification is True
    assert "pending_verification" in result.status
    assert attendance_service.calls == 1
    assert event_repo.created == ["matched_review"]
    assert encoding_repo.calls == 0
    assert review_repo.calls == 1


def test_hybrid_low_confidence_is_unknown_and_not_marked() -> None:
    attendance_service = _AttendanceService()
    event_repo = _EventRepo()
    encoding_repo = _EncodingRepo()
    review_repo = _ReviewRepo()

    processor = HybridLearningProcessor(
        settings=_settings(enabled=True),
        attendance_service=attendance_service,
        event_repo=event_repo,
        notification_repo=_NotificationRepo(),
        encoding_repo=encoding_repo,
        review_repo=review_repo,
    )

    result = processor.process_match(
        hit=MatchResult(student_id=14, confidence=0.85, detected_encoding=[0.1] * 128, distance=0.36, margin=0.05),
        now=dt.datetime(2026, 3, 21, 9, 0, 0),
        event_type="check_in",
        device_id="gate-main",
        frame_blob=b"fake",
    )

    assert result is None
    assert attendance_service.calls == 0
    assert event_repo.created == ["unknown_low_confidence"]
    assert encoding_repo.calls == 0
    assert review_repo.calls == 0
