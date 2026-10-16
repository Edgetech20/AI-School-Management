from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.core.security import get_password_hash
from app.db.session import get_db
from app.repositories.admin_users import AdminUserRepository
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.classes import ClassRepository
from app.schemas.auth import AdminUserCreate, AdminUserRead, AdminUserUpdate

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=list[AdminUserRead])
def list_users(db: Session = Depends(get_db)) -> list[AdminUserRead]:
    return AdminUserRepository(db).list()


@router.post("", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
) -> AdminUserRead:
    repo = AdminUserRepository(db)
    if repo.get_by_username(payload.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    class_name = payload.class_name.strip() if payload.class_name else None
    if payload.role == "teacher" and not class_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teacher must have class assignment")
    if class_name and not ClassRepository(db).get_by_name(class_name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned class does not exist")
    if payload.role == "admin":
        class_name = None

    user = repo.create(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        class_name=class_name,
        is_active=payload.is_active,
    )
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="user.create",
        resource_type="admin_user",
        resource_id=str(user.id),
        details={"username": user.username, "role": user.role, "class_name": user.class_name},
    )
    return user


@router.put("/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
) -> AdminUserRead:
    repo = AdminUserRepository(db)
    user = repo.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.username == current_user.username and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate yourself")

    updates: dict = {}
    if payload.password is not None:
        updates["password_hash"] = get_password_hash(payload.password)

    next_role = payload.role if payload.role is not None else user.role
    next_class_name = user.class_name

    if payload.class_name is not None:
        next_class_name = payload.class_name.strip()

    if next_role == "teacher" and not next_class_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teacher must have class assignment")
    if next_class_name and not ClassRepository(db).get_by_name(next_class_name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned class does not exist")
    if next_role == "admin":
        next_class_name = None

    if payload.role is not None:
        updates["role"] = payload.role
    updates["class_name"] = next_class_name

    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    updated = repo.update(user, **updates)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="user.update",
        resource_type="admin_user",
        resource_id=str(updated.id),
        details={
            "role": updated.role,
            "class_name": updated.class_name,
            "is_active": updated.is_active,
            "password_changed": payload.password is not None,
        },
    )
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)) -> None:
    repo = AdminUserRepository(db)
    user = repo.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.username == current_user.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete yourself")

    repo.delete(user)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="user.delete",
        resource_type="admin_user",
        resource_id=str(user_id),
        details={"username": user.username},
    )
