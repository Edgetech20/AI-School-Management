from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.repositories.admin_users import AdminUserRepository
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.classes import ClassRepository
from app.repositories.students import StudentRepository
from app.schemas.classroom import ClassCreate, ClassRead

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=list[ClassRead])
def list_classes(db: Session = Depends(get_db)) -> list[ClassRead]:
    return ClassRepository(db).list()


@router.post("", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
) -> ClassRead:
    repo = ClassRepository(db)
    name = payload.name.strip()
    if repo.get_by_name(name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Class already exists")

    created = repo.create(name)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="class.create",
        resource_type="class",
        resource_id=str(created.id),
        details={"name": created.name},
    )
    return created


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(class_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)) -> None:
    repo = ClassRepository(db)
    model = repo.get(class_id)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    class_name = model.name
    if StudentRepository(db).list_by_class(class_name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete class with students assigned")

    users = [x for x in AdminUserRepository(db).list() if x.class_name == class_name]
    if users:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete class assigned to teacher users")

    repo.delete(model)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="class.delete",
        resource_type="class",
        resource_id=str(class_id),
        details={"name": class_name},
    )
