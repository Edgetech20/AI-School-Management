from __future__ import annotations
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        actor_username: str,
        actor_role: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: dict | None = None,
    ) -> AuditLog:
        model = AuditLog(
            actor_username=actor_username,
            actor_role=actor_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details or {}),
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def list(self, limit: int = 200) -> list[AuditLog]:
        statement = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        return list(self.db.scalars(statement).all())
