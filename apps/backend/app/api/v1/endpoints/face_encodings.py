import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.repositories.face_encodings import FaceEncodingRepository
from app.repositories.students import StudentRepository
from app.schemas.face_encoding import FaceEncodingCreate, FaceEncodingRead

router = APIRouter(dependencies=[Depends(require_admin)])


@router.post("", response_model=FaceEncodingRead, status_code=status.HTTP_201_CREATED)
def create_encoding(payload: FaceEncodingCreate, db: Session = Depends(get_db)) -> FaceEncodingRead:
    student = StudentRepository(db).get(payload.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    model = FaceEncodingRepository(db).create(payload)
    return FaceEncodingRead(id=model.id, student_id=model.student_id, encoding=json.loads(model.encoding))


@router.get("/student/{student_id}", response_model=list[FaceEncodingRead])
def list_student_encodings(student_id: int, db: Session = Depends(get_db)) -> list[FaceEncodingRead]:
    data = FaceEncodingRepository(db).list_by_student(student_id)
    return [FaceEncodingRead(id=m.id, student_id=m.student_id, encoding=json.loads(m.encoding)) for m in data]
