from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.rules import RuleRepository
from app.schemas.rule import RuleRead, RuleUpdate

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=RuleRead)
def get_rules(db: Session = Depends(get_db)) -> RuleRead:
    return RuleRepository(db).get_or_create_default()


@router.put("", response_model=RuleRead)
def update_rules(payload: RuleUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)) -> RuleRead:
    updated = RuleRepository(db).update(payload)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="rules.update",
        resource_type="rules",
        resource_id="1",
        details=payload.model_dump(),
    )
    return updated
