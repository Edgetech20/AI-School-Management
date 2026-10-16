from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin_user import AdminUser


class AdminUserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_username(self, username: str) -> AdminUser | None:
        statement = select(AdminUser).where(AdminUser.username == username)
        return self.db.scalar(statement)

    def get(self, user_id: int) -> AdminUser | None:
        return self.db.get(AdminUser, user_id)

    def list(self) -> list[AdminUser]:
        statement = select(AdminUser).order_by(AdminUser.created_at.desc(), AdminUser.id.desc())
        return list(self.db.scalars(statement).all())

    def create(
        self,
        username: str,
        password_hash: str,
        role: str = "admin",
        class_name: str | None = None,
        is_active: bool = True,
    ) -> AdminUser:
        user = AdminUser(
            username=username,
            password_hash=password_hash,
            role=role,
            class_name=class_name,
            is_active=is_active,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: AdminUser, **kwargs) -> AdminUser:
        for key, value in kwargs.items():
            setattr(user, key, value)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: AdminUser) -> None:
        self.db.delete(user)
        self.db.commit()
