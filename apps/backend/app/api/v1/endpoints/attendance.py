import datetime as dt
import io
import csv
import base64
import urllib.error
import urllib.request
from collections import Counter, defaultdict, deque
from threading import Lock

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin, require_teacher_or_admin
from app.core.config import get_settings
from app.db.session import get_db
from app.repositories.attendance import AttendanceRepository
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.camera_devices import CameraDeviceRepository
from app.repositories.face_encodings import FaceEncodingRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.recognition_events import RecognitionEventRepository
from app.repositories.recognition_reviews import RecognitionReviewRepository
from app.repositories.rules import RuleRepository
from app.repositories.students import StudentRepository
from app.repositories.recognition_jobs import RecognitionJobRepository
from app.repositories.system_settings import SystemSettingsRepository
from app.schemas.attendance import AttendanceEventIn, AttendanceOverrideIn, AttendanceRead
from app.schemas.recognition import (
    RecognitionAccuracyMetrics,
    RecognitionMatch,
    RecognitionReviewDecisionIn,
    RecognitionReviewRead,
    RecognitionResponse,
)
from app.services.attendance.service import AttendanceService
from app.services.face.encoding_index import FaceEncodingIndex
from app.services.attendance.rule_engine import calculate_status
from app.services.face.recognizer import FaceRecognitionService, MatchResult
from app.services.face.hybrid_learning import HybridLearningProcessor
from app.services.face.queue_worker import process_one_recognition_job
from app.core.timezone import now_ist_naive

router = APIRouter(dependencies=[Depends(require_teacher_or_admin)])

_VOTE_WINDOW_SECONDS = 2.5
_VOTE_MAX_FRAMES = 7
_VOTE_MIN_FRAMES = 3
_device_votes: dict[str, deque[tuple[dt.datetime, int]]] = defaultdict(deque)
_device_votes_lock = Lock()


def _apply_multi_frame_voting(device_id: str, now: dt.datetime, matches: list[MatchResult]) -> list[MatchResult]:
    if not matches:
        return matches

    top = max(matches, key=lambda row: row.confidence)

    with _device_votes_lock:
        bucket = _device_votes[device_id]
        bucket.append((now, top.student_id))

        cutoff = now - dt.timedelta(seconds=_VOTE_WINDOW_SECONDS)
        while bucket and bucket[0][0] < cutoff:
            bucket.popleft()
        while len(bucket) > _VOTE_MAX_FRAMES:
            bucket.popleft()

        if len(bucket) < _VOTE_MIN_FRAMES:
            return matches

        vote_counts = Counter(student_id for _, student_id in bucket)
        voted_student_id, voted_count = vote_counts.most_common(1)[0]
        if voted_count < 2:
            return matches

    voted_matches = [row for row in matches if row.student_id == voted_student_id]
    return voted_matches or []


def _get_image_base64(image_path: str | None) -> str | None:
    if not image_path:
        return None
    try:
        with open(image_path, "rb") as f:
            data = f.read()
        return base64.b64encode(data).decode("utf-8")
    except (FileNotFoundError, OSError):
        return None


def _camera_stream_endpoint(camera) -> str:
    if camera.stream_url:
        return camera.stream_url
    if camera.ip_address:
        if camera.port:
            return f"http://{camera.ip_address}:{camera.port}"
        return f"http://{camera.ip_address}"
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Camera stream is not configured")


def _capture_mapped_camera_frame(camera) -> bytes:
    stream_endpoint = _camera_stream_endpoint(camera)

    if not stream_endpoint.startswith("http://") and not stream_endpoint.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to capture mapped stream. Use HTTP snapshot URL or install AI extras for RTSP support.",
        )

    request = urllib.request.Request(stream_endpoint)
    if camera.stream_username and camera.stream_password:
        token = base64.b64encode(f"{camera.stream_username}:{camera.stream_password}".encode("utf-8")).decode("ascii")
        request.add_header("Authorization", f"Basic {token}")

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            data = response.read(2 * 1024 * 1024)
            if not data:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Mapped camera returned empty response")
            return data
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to fetch mapped camera stream: {exc}") from exc


def _recognize_from_image_bytes(
    image_bytes: bytes,
    event_type: str,
    device_id: str,
    db: Session,
    current_user,
) -> RecognitionResponse:
    settings = get_settings()
    runtime_settings = SystemSettingsRepository(db).get_settings_dict()
    settings.hybrid_learning_enabled = bool(runtime_settings.get("hybrid_learning_enabled", settings.hybrid_learning_enabled))
    recognizer = FaceRecognitionService(
        tolerance=settings.face_match_tolerance,
        min_margin=settings.face_match_min_margin,
    )
    if not recognizer.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Face recognition dependencies are not installed. Install with: pip install -e .[ai]",
        )

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty frame")

    encoding_repo = FaceEncodingRepository(db)

    known = encoding_repo.list_all()

    if current_user.role == "teacher":
        if not current_user.class_name:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher is not assigned to any class")
        student_repo = StudentRepository(db)
        class_ids = {item.id for item in student_repo.list_by_class(current_user.class_name)}
        known = [item for item in known if item.student_id in class_ids]

    try:
        detected = recognizer.detect_face_encodings(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    known_vectors = [(item.student_id, encoding_repo.parse_encoding(item)) for item in known]

    index = FaceEncodingIndex(known_vectors)
    candidate_ids: set[int] = set()
    for vector in detected:
        candidate_ids |= index.top_student_candidates(vector, top_k_students=16)

    vectors_to_match = [item for item in known_vectors if item[0] in candidate_ids] if candidate_ids else known_vectors
    matched = recognizer.match_students(detected, vectors_to_match)
    matched = _apply_multi_frame_voting(device_id=device_id, now=now_ist_naive(), matches=matched)

    attendance_service = AttendanceService(
        attendance_repo=AttendanceRepository(db),
        student_repo=StudentRepository(db),
        rule_repo=RuleRepository(db),
        notification_repo=NotificationRepository(db),
    )
    event_repo = RecognitionEventRepository(db)
    review_repo = RecognitionReviewRepository(db)
    processor = HybridLearningProcessor(
        settings=settings,
        attendance_service=attendance_service,
        event_repo=event_repo,
        notification_repo=NotificationRepository(db),
        encoding_repo=encoding_repo,
        review_repo=review_repo,
    )

    now = now_ist_naive()
    if settings.hybrid_learning_enabled:
        review_repo.cleanup_expired(now)

    result_rows: list[RecognitionMatch] = []

    def _safe_record_event(outcome: str, *, student_id: int | None = None, confidence: float | None = None) -> None:
        try:
            event_repo.create(
                timestamp=now,
                event_type=event_type,
                device_id=device_id,
                outcome=outcome,
                student_id=student_id,
                confidence=confidence,
            )
        except Exception:
            db.rollback()

    nearest_candidate_name: str | None = None
    nearest_distance: float | None = None

    if not detected:
        _safe_record_event("no_face")

    if detected and not matched:
        nearest_note = ""
        if known_vectors:
            first_face_candidates = recognizer.rank_student_candidates(detected[0], known_vectors, top_k=1)
            if first_face_candidates:
                nearest = first_face_candidates[0]
                nearest_student = StudentRepository(db).get(nearest.student_id)
                nearest_name = nearest_student.name if nearest_student else f"student_id={nearest.student_id}"
                nearest_candidate_name = nearest_name
                nearest_distance = nearest.distance
                similarity_percent = max(0.0, min(100.0, (1.0 - nearest.distance) * 100.0))
                pass_threshold = nearest.distance <= recognizer.tolerance
                nearest_note = (
                    f" | nearest_candidate={nearest_name}, distance={nearest.distance:.4f}, "
                    f"threshold={recognizer.tolerance:.2f}, threshold_passed={str(pass_threshold).lower()}, "
                    f"candidate_match_percent={similarity_percent:.2f}, confidence={nearest.confidence:.2f}"
                )

        _safe_record_event("unknown")
        try:
            NotificationRepository(db).create(
                student_id=None,
                channel="AdminAlert",
                message=f"Unknown face detected on device {device_id} at {now.isoformat()}{nearest_note}",
            )
        except Exception:
            # Keep recognition flow resilient if alert logging fails due DB drift or transient DB errors.
            db.rollback()

    for hit in matched:
        result = processor.process_match(
            hit=hit,
            now=now,
            event_type=event_type,
            device_id=device_id,
            frame_blob=image_bytes,
        )
        if result:
            result_rows.append(result)

    outcome = "matched"
    if not detected:
        outcome = "no_face"
    elif detected and not matched:
        outcome = "unknown"

    return RecognitionResponse(
        matched_count=len(result_rows),
        matches=result_rows,
        detected_faces=len(detected),
        outcome=outcome,
        nearest_candidate=nearest_candidate_name,
        nearest_distance=nearest_distance,
        threshold=recognizer.tolerance,
    )


def _resolve_event_type_for_device(db: Session, device_id: str, event_type: str | None) -> str:
    if event_type in {"check_in", "check_out"}:
        return event_type

    camera = CameraDeviceRepository(db).get_active_by_device_id(device_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="event_type is required when device_id is not mapped to an active camera",
        )

    if camera.usage_tag in {"check_in", "check_out"}:
        return camera.usage_tag

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="event_type is required for cameras tagged as 'both'",
    )


def _resolve_attendance_class(current_user, requested_class: str | None = None) -> str | None:
    if current_user.role == "admin":
        return requested_class
    if not current_user.class_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher is not assigned to any class")
    if requested_class and requested_class != current_user.class_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your assigned class")
    return current_user.class_name


def _ensure_teacher_can_access_student(current_user, student_id: int, db: Session) -> None:
    if current_user.role == "admin":
        return
    student = StudentRepository(db).get(student_id)
    if not student or student.class_name != current_user.class_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only verify attendance for your class")


@router.post("/event", response_model=AttendanceRead, dependencies=[Depends(require_teacher_or_admin)])
def push_attendance_event(
    payload: AttendanceEventIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> AttendanceRead:
    _ensure_teacher_can_access_student(current_user, payload.student_id, db)
    service = AttendanceService(
        attendance_repo=AttendanceRepository(db),
        student_repo=StudentRepository(db),
        rule_repo=RuleRepository(db),
        notification_repo=NotificationRepository(db),
    )
    result = service.process_event(payload)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="attendance.event",
        resource_type="attendance_log",
        resource_id=str(result.id),
        details={"student_id": payload.student_id, "event_type": payload.event_type},
    )
    return result


@router.put("/{attendance_id}/override", response_model=AttendanceRead, dependencies=[Depends(require_teacher_or_admin)])
def override_attendance(
    attendance_id: int,
    payload: AttendanceOverrideIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> AttendanceRead:
    attendance_repo = AttendanceRepository(db)
    rule_repo = RuleRepository(db)

    record = attendance_repo.get(attendance_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    _ensure_teacher_can_access_student(current_user, record.student_id, db)

    if payload.check_in_time is not None:
        record.check_in_time = payload.check_in_time
    if payload.check_out_time is not None:
        record.check_out_time = payload.check_out_time

    if payload.status:
        record.status = payload.status
    else:
        rules = rule_repo.get_or_create_default()
        record.status = calculate_status(
            record.check_in_time,
            record.check_out_time,
            rules.school_start_time,
            rules.late_threshold_time,
            rules.minimum_hours,
        )

    saved = attendance_repo.upsert(record)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="attendance.override",
        resource_type="attendance_log",
        resource_id=str(saved.id),
        details=payload.model_dump(),
    )
    return saved


@router.get("", response_model=list[AttendanceRead])
def list_attendance(
    class_name: str | None = Query(default=None),
    date: dt.date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> list[AttendanceRead]:
    effective_class = _resolve_attendance_class(current_user, class_name)
    return AttendanceRepository(db).list(class_name=effective_class, day=date)


@router.get("/export")
def export_attendance(
    format: str = Query(default="csv", pattern="^(csv|xlsx)$"),
    class_name: str | None = Query(default=None),
    date: dt.date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
):
    effective_class = _resolve_attendance_class(current_user, class_name)
    rows = AttendanceRepository(db).list(class_name=effective_class, day=date)

    header = ["id", "student_id", "date", "check_in_time", "check_out_time", "status"]
    values = [
        [
            str(item.id),
            str(item.student_id),
            str(item.date),
            item.check_in_time.isoformat() if item.check_in_time else "",
            item.check_out_time.isoformat() if item.check_out_time else "",
            item.status,
        ]
        for item in rows
    ]

    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="attendance.export",
        resource_type="attendance",
        resource_id=f"{format}:{date or 'all'}",
        details={"format": format, "class_name": effective_class, "date": str(date) if date else None, "rows": len(values)},
    )

    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(header)
        writer.writerows(values)
        return Response(
            content=buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=attendance_export.csv"},
        )

    try:
        from openpyxl import Workbook
    except Exception as exc:
        raise HTTPException(status_code=500, detail="openpyxl is not installed for xlsx export") from exc

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"
    ws.append(header)
    for row in values:
        ws.append(row)

    out = io.BytesIO()
    wb.save(out)
    return Response(
        content=out.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=attendance_export.xlsx"},
    )


@router.post("/recognize", response_model=RecognitionResponse)
async def recognize_from_frame(
    event_type: str | None = Query(default=None, pattern="^(check_in|check_out)$"),
    device_id: str = Query(default="gate-main"),
    frame: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> RecognitionResponse:
    event_type = _resolve_event_type_for_device(db, device_id, event_type)
    image_bytes = await frame.read()
    return _recognize_from_image_bytes(
        image_bytes=image_bytes,
        event_type=event_type,
        device_id=device_id,
        db=db,
        current_user=current_user,
    )


@router.post("/recognize/mapped", response_model=RecognitionResponse)
def recognize_from_mapped_camera(
    event_type: str | None = Query(default=None, pattern="^(check_in|check_out)$"),
    device_id: str = Query(default="gate-main"),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> RecognitionResponse:
    event_type = _resolve_event_type_for_device(db, device_id, event_type)
    camera = CameraDeviceRepository(db).get_active_by_device_id(device_id)
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active camera mapping not found")
    image_bytes = _capture_mapped_camera_frame(camera)
    return _recognize_from_image_bytes(
        image_bytes=image_bytes,
        event_type=event_type,
        device_id=device_id,
        db=db,
        current_user=current_user,
    )


@router.get("/recognition/review-queue", response_model=list[RecognitionReviewRead], dependencies=[Depends(require_teacher_or_admin)])
def list_recognition_review_queue(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> list[RecognitionReviewRead]:
    repo = RecognitionReviewRepository(db)
    repo.cleanup_expired(now_ist_naive())

    rows = repo.list_pending(limit=limit)
    if current_user.role == "teacher":
        student_repo = StudentRepository(db)
        class_students = {item.id for item in student_repo.list_by_class(current_user.class_name)}
        rows = [row for row in rows if row.student_id in class_students]
    return [
        RecognitionReviewRead(
            id=row.id,
            student_id=row.student_id,
            event_type=row.event_type,
            device_id=row.device_id,
            confidence=row.confidence,
            margin=row.margin,
            status=row.status,
            face_image_path=row.face_image_path,
            image_data=_get_image_base64(row.face_image_path),
            expires_at=row.expires_at.isoformat(),
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]


@router.post("/recognition/review-queue/{review_id}/approve", dependencies=[Depends(require_teacher_or_admin)])
def approve_recognition_review(
    review_id: int,
    payload: RecognitionReviewDecisionIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> dict:
    review_repo = RecognitionReviewRepository(db)
    row = review_repo.get_pending(review_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review entry not found")

    _ensure_teacher_can_access_student(current_user, row.student_id, db)

    embedding = review_repo.parse_embedding(row)
    if not embedding:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Review embedding is missing or cannot be decrypted. Verify FACE_ENCODING_ENCRYPTION_KEY and retry.",
        )

    encoding_repo = FaceEncodingRepository(db)
    try:
        encoding_repo.create_adaptive_from_embedding(
            student_id=row.student_id,
            encoding=embedding,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist approved embedding to face_encodings: {exc}",
        ) from exc

    review_repo.mark_approved(row, reviewed_by=current_user.username, note=payload.note)
    return {
        "review_id": review_id,
        "approved": True,
        "adaptive_learned": True,
        "learning_status": "encoding_inserted_to_face_encodings"
    }


@router.post("/recognition/review-queue/{review_id}/reject", dependencies=[Depends(require_teacher_or_admin)])
def reject_recognition_review(
    review_id: int,
    payload: RecognitionReviewDecisionIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> dict:
    review_repo = RecognitionReviewRepository(db)
    row = review_repo.get_pending(review_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review entry not found")

    _ensure_teacher_can_access_student(current_user, row.student_id, db)

    review_repo.mark_rejected(row, reviewed_by=current_user.username, note=payload.note)
    return {"review_id": review_id, "rejected": True}


@router.post("/recognize/enqueue")
async def enqueue_recognition_frame(
    event_type: str | None = Query(default=None, pattern="^(check_in|check_out)$"),
    device_id: str = Query(default="gate-main"),
    frame: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    event_type = _resolve_event_type_for_device(db, device_id, event_type)
    image_bytes = await frame.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty frame")
    job = RecognitionJobRepository(db).create(event_type=event_type, device_id=device_id, frame_blob=image_bytes)
    return {"queued": True, "job_id": job.id, "status": job.status}


@router.post("/recognize/worker/process", dependencies=[Depends(require_admin)])
def process_recognition_queue(db: Session = Depends(get_db)) -> dict:
    return process_one_recognition_job(db)


@router.get("/recognition-metrics", response_model=RecognitionAccuracyMetrics)
def get_recognition_metrics(db: Session = Depends(get_db), _=Depends(require_admin)) -> RecognitionAccuracyMetrics:
    settings = get_settings()
    recognizer = FaceRecognitionService(
        tolerance=settings.face_match_tolerance,
        min_margin=settings.face_match_min_margin,
    )
    encoding_repo = FaceEncodingRepository(db)

    known = encoding_repo.list_all()
    student_ids = {item.student_id for item in known}
    known_vectors = [(item.student_id, encoding_repo.parse_encoding(item)) for item in known]
    accuracy = recognizer.estimate_accuracy(known_vectors)
    adaptive_count = sum(1 for item in known if item.source == "adaptive")

    return RecognitionAccuracyMetrics(
        accuracy_percent=round(accuracy * 100.0, 2),
        total_samples=len(known),
        total_students=len(student_ids),
        adaptive_samples_count=adaptive_count,
    )


@router.get("/recognition/unknown-insights")
def get_unknown_insights(
    hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
) -> dict:
    now = now_ist_naive()
    since = now - dt.timedelta(hours=hours)

    event_repo = RecognitionEventRepository(db)
    events = event_repo.list_since(since=since, limit=8000)

    total = len(events)
    unknown_events = [row for row in events if row.outcome == "unknown"]
    matched_events = [row for row in events if row.outcome == "matched"]
    no_face_events = [row for row in events if row.outcome == "no_face"]

    unknown_percentage = round((len(unknown_events) / total) * 100.0, 2) if total > 0 else 0.0

    per_device: dict[str, dict[str, int | float]] = {}
    for row in events:
        current = per_device.setdefault(row.device_id, {"total": 0, "unknown": 0, "matched": 0, "no_face": 0, "unknown_percentage": 0.0})
        current["total"] = int(current["total"]) + 1
        if row.outcome == "unknown":
            current["unknown"] = int(current["unknown"]) + 1
        elif row.outcome == "matched":
            current["matched"] = int(current["matched"]) + 1
        elif row.outcome == "no_face":
            current["no_face"] = int(current["no_face"]) + 1

    for device_id, stats in per_device.items():
        total_count = int(stats["total"])
        unknown_count = int(stats["unknown"])
        stats["unknown_percentage"] = round((unknown_count / total_count) * 100.0, 2) if total_count > 0 else 0.0

    notification_rows = NotificationRepository(db).list()
    unknown_alerts = [
        {
            "sent_at": item.sent_at.isoformat(),
            "message": item.message,
        }
        for item in notification_rows
        if item.type == "AdminAlert" and item.message.startswith("Unknown face detected")
    ][:30]

    return {
        "window_hours": hours,
        "from": since.isoformat(),
        "to": now.isoformat(),
        "total_events": total,
        "unknown_events": len(unknown_events),
        "matched_events": len(matched_events),
        "no_face_events": len(no_face_events),
        "unknown_percentage": unknown_percentage,
        "device_breakdown": per_device,
        "recent_unknown_alerts": unknown_alerts,
        "note": "Nearest-candidate details are included in new unknown alerts; older alerts may not contain candidate fields.",
    }
