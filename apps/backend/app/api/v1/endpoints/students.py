import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_teacher_or_admin
from app.core.config import get_settings
from app.db.session import get_db
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.classes import ClassRepository
from app.repositories.face_encodings import FaceEncodingRepository
from app.repositories.students import StudentRepository
from app.schemas.face_encoding import FaceEncodingCreate
from app.schemas.student import StudentCreate, StudentRead, StudentUpdate
from app.services.face.recognizer import FaceRecognitionService

router = APIRouter(dependencies=[Depends(require_teacher_or_admin)])


def _to_student_read(student, sample_count: int) -> StudentRead:
    return StudentRead(
        id=student.id,
        name=student.name,
        class_name=student.class_name,
        roll_number=student.roll_number,
        parent_phone=student.parent_phone,
        parent_email=student.parent_email,
        face_samples=sample_count,
        has_face=sample_count > 0,
    )


def _resolve_effective_class(current_user, requested_class: str | None = None) -> str | None:
    if current_user.role == "admin":
        return requested_class
    if not current_user.class_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher is not assigned to any class")
    if requested_class and requested_class != current_user.class_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your assigned class")
    return current_user.class_name


def _ensure_teacher_can_access_student(current_user, student) -> None:
    if current_user.role == "admin":
        return
    if not current_user.class_name or student.class_name != current_user.class_name:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage students in your class")


@router.get("", response_model=list[StudentRead])
def list_students(db: Session = Depends(get_db), current_user=Depends(require_teacher_or_admin)) -> list[StudentRead]:
    repo = StudentRepository(db)
    encoding_repo = FaceEncodingRepository(db)
    if current_user.role == "admin":
        students = repo.list()
        return [_to_student_read(student, encoding_repo.count_by_student(student.id)) for student in students]
    if not current_user.class_name:
        return []
    students = repo.list_by_class(current_user.class_name)
    return [_to_student_read(student, encoding_repo.count_by_student(student.id)) for student in students]


@router.get("/import-template")
def download_student_import_template() -> Response:
    content = (
        "name,class_name,roll_number,parent_phone,parent_email\n"
        "Aarav Sharma,10-A,A-001,+911234567890,parent.aarav@example.com\n"
        "Diya Verma,10-A,A-002,+919876543210,parent.diya@example.com\n"
    )
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_import_template.csv"},
    )


@router.post("/import-csv")
async def import_students_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a CSV file")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty CSV file")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must be UTF-8 encoded") from exc

    reader = csv.DictReader(io.StringIO(text))
    required_columns = {"name", "class_name", "roll_number", "parent_phone", "parent_email"}
    if not reader.fieldnames or not required_columns.issubset({x.strip() for x in reader.fieldnames}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV columns must include: name,class_name,roll_number,parent_phone,parent_email",
        )

    repo = StudentRepository(db)
    class_repo = ClassRepository(db)
    imported = 0
    skipped = 0
    errors: list[str] = []

    for index, row in enumerate(reader, start=2):
        payload = {k: (row.get(k, "") or "").strip() for k in required_columns}
        if not all(payload.values()):
            skipped += 1
            errors.append(f"Row {index}: Missing required values")
            continue

        effective_class = _resolve_effective_class(current_user, payload["class_name"])
        payload["class_name"] = effective_class or payload["class_name"]

        if not class_repo.get_by_name(payload["class_name"]):
            skipped += 1
            errors.append(f"Row {index}: Class does not exist")
            continue

        if repo.get_by_roll_number(payload["roll_number"]):
            skipped += 1
            continue

        try:
            repo.create(StudentCreate(**payload))
            imported += 1
        except Exception:
            skipped += 1
            errors.append(f"Row {index}: Invalid data")

    summary = {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],
    }
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="student.import_csv",
        resource_type="student",
        resource_id="bulk",
        details={"imported": imported, "skipped": skipped},
    )
    return summary


@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db), current_user=Depends(require_teacher_or_admin)) -> StudentRead:
    repo = StudentRepository(db)
    effective_class = _resolve_effective_class(current_user, payload.class_name)
    payload = payload.model_copy(update={"class_name": effective_class or payload.class_name})
    if not ClassRepository(db).get_by_name(payload.class_name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class does not exist")
    if repo.get_by_roll_number(payload.roll_number):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Roll number already exists")
    created = repo.create(payload)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="student.create",
        resource_type="student",
        resource_id=str(created.id),
        details={"roll_number": created.roll_number},
    )
    return _to_student_read(created, 0)


@router.post("/{student_id}/face", status_code=status.HTTP_200_OK)
async def upload_student_face(
    student_id: int,
    face_images: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> dict:
    student_repo = StudentRepository(db)
    student = student_repo.get(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    _ensure_teacher_can_access_student(current_user, student)

    settings = get_settings()
    recognizer = FaceRecognitionService(
        tolerance=settings.face_match_tolerance,
        min_margin=settings.face_match_min_margin,
    )
    if not recognizer.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Face recognition dependencies are not installed. Install with: pip install -e .[ai]",
        )

    encoding_repo = FaceEncodingRepository(db)
    added_samples = 0
    skipped_files: list[str] = []

    if not face_images:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload at least one image")

    for face_image in face_images:
        image_bytes = await face_image.read()
        if not image_bytes:
            skipped_files.append(face_image.filename or "unnamed")
            continue

        try:
            encodings = recognizer.detect_face_encodings(image_bytes)
        except Exception:
            skipped_files.append(face_image.filename or "unnamed")
            continue

        if not encodings:
            skipped_files.append(face_image.filename or "unnamed")
            continue

        encoding_repo.create(FaceEncodingCreate(student_id=student_id, encoding=encodings[0]))
        added_samples += 1

    if added_samples == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No usable faces found. Upload 3 to 5 clear front-face photos with different angles and lighting.",
        )

    total_samples = encoding_repo.count_by_student(student_id)

    result = {
        "success": True,
        "message": f"Added {added_samples} training sample(s) for {student.name}",
        "student_id": student_id,
        "added_samples": added_samples,
        "total_samples": total_samples,
        "skipped_files": skipped_files,
    }
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="student.face_upload",
        resource_type="student",
        resource_id=str(student_id),
        details={"added_samples": added_samples, "total_samples": total_samples},
    )
    return result


@router.put("/{student_id}", response_model=StudentRead)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_teacher_or_admin),
) -> StudentRead:
    repo = StudentRepository(db)
    student = repo.get(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    _ensure_teacher_can_access_student(current_user, student)

    if current_user.role == "teacher":
        next_class = payload.class_name if payload.class_name is not None else student.class_name
        _resolve_effective_class(current_user, next_class)

    updated = repo.update(student, payload)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="student.update",
        resource_type="student",
        resource_id=str(updated.id),
        details=payload.model_dump(exclude_unset=True),
    )
    return _to_student_read(updated, FaceEncodingRepository(db).count_by_student(updated.id))


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db), current_user=Depends(require_teacher_or_admin)) -> None:
    repo = StudentRepository(db)
    student = repo.get(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    _ensure_teacher_can_access_student(current_user, student)
    repo.delete(student)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="student.delete",
        resource_type="student",
        resource_id=str(student_id),
        details={},
    )
