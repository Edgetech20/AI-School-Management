import datetime as dt

from sqlalchemy.orm import Session

from app.repositories.attendance import AttendanceRepository
from app.repositories.face_encodings import FaceEncodingRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.recognition_events import RecognitionEventRepository
from app.repositories.recognition_jobs import RecognitionJobRepository
from app.repositories.recognition_reviews import RecognitionReviewRepository
from app.repositories.rules import RuleRepository
from app.repositories.students import StudentRepository
from app.repositories.system_settings import SystemSettingsRepository
from app.schemas.attendance import AttendanceEventIn
from app.services.attendance.service import AttendanceService
from app.services.face.hybrid_learning import HybridLearningProcessor
from app.services.face.encoding_index import FaceEncodingIndex
from app.services.face.recognizer import FaceRecognitionService
from app.core.config import get_settings
from app.core.timezone import now_ist_naive


def process_one_recognition_job(db: Session) -> dict:
    settings = get_settings()
    runtime_settings = SystemSettingsRepository(db).get_settings_dict()
    settings.hybrid_learning_enabled = bool(runtime_settings.get("hybrid_learning_enabled", settings.hybrid_learning_enabled))
    job_repo = RecognitionJobRepository(db)
    event_repo = RecognitionEventRepository(db)
    notification_repo = NotificationRepository(db)
    encoding_repo = FaceEncodingRepository(db)
    review_repo = RecognitionReviewRepository(db)

    job = job_repo.fetch_next_pending()
    if not job:
        return {"processed": False, "reason": "no_pending_job"}

    job_repo.mark_processing(job)
    now = now_ist_naive()

    try:
        recognizer = FaceRecognitionService(
            tolerance=settings.face_match_tolerance,
            min_margin=settings.face_match_min_margin,
        )

        detected = recognizer.detect_face_encodings(job.frame_blob)
        known = encoding_repo.list_all()
        known_vectors = [(item.student_id, encoding_repo.parse_encoding(item)) for item in known]
        index = FaceEncodingIndex(known_vectors)
        candidate_ids: set[int] = set()
        for vector in detected:
            candidate_ids |= index.top_student_candidates(vector, top_k_students=8)
        vectors_to_match = [item for item in known_vectors if item[0] in candidate_ids] if candidate_ids else known_vectors
        matched = recognizer.match_students(detected, vectors_to_match)

        attendance_service = AttendanceService(
            attendance_repo=AttendanceRepository(db),
            student_repo=StudentRepository(db),
            rule_repo=RuleRepository(db),
            notification_repo=notification_repo,
        )
        processor = HybridLearningProcessor(
            settings=settings,
            attendance_service=attendance_service,
            event_repo=event_repo,
            notification_repo=notification_repo,
            encoding_repo=encoding_repo,
            review_repo=review_repo,
        )

        if settings.hybrid_learning_enabled:
            review_repo.cleanup_expired(now)

        if not detected:
            event_repo.create(now, job.event_type, job.device_id, "no_face")
        elif not matched:
            event_repo.create(now, job.event_type, job.device_id, "unknown")
            notification_repo.create(None, f"Unknown face detected on device {job.device_id} at {now.isoformat()}", "AdminAlert")

        handled = 0
        for hit in matched:
            result = processor.process_match(
                hit=hit,
                now=now,
                event_type=job.event_type,
                device_id=job.device_id,
                frame_blob=job.frame_blob,
            )
            if result:
                handled += 1

        job_repo.mark_done(job)
        return {"processed": True, "job_id": job.id, "matched": handled}
    except Exception as exc:
        job_repo.mark_failed(job, str(exc))
        return {"processed": False, "job_id": job.id, "reason": str(exc)}
