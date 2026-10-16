from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.repositories.admin_users import AdminUserRepository
from app.repositories.classes import ClassRepository


def ensure_default_admin(db: Session) -> None:
    settings = get_settings()
    repo = AdminUserRepository(db)
    class_repo = ClassRepository(db)
    if not class_repo.get_by_name("10-A"):
        class_repo.create("10-A")

    existing = repo.get_by_username(settings.admin_default_username)
    if not existing:
        repo.create(
            username=settings.admin_default_username,
            password_hash=get_password_hash(settings.admin_default_password),
            role="admin",
        )

    teacher_existing = repo.get_by_username(settings.teacher_default_username)
    if not teacher_existing:
        repo.create(
            username=settings.teacher_default_username,
            password_hash=get_password_hash(settings.teacher_default_password),
            role="teacher",
            class_name="10-A",
        )
