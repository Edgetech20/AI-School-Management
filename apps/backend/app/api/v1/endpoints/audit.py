from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.repositories.audit_logs import AuditLogRepository
from app.schemas.audit import AuditLogRead

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(limit: int = Query(default=200, ge=1, le=1000), db: Session = Depends(get_db)) -> list[AuditLogRead]:
    return AuditLogRepository(db).list(limit=limit)
