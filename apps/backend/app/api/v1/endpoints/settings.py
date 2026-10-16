from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin, get_current_admin
from app.db.session import get_db
from app.repositories.system_settings import SystemSettingsRepository
from app.schemas.system_settings import NotificationSettingsRead, NotificationSettingsUpdate

router = APIRouter()


class SystemSettingsPublic(BaseModel):
    """Minimal public settings (no sensitive data)."""
    hybrid_learning_enabled: bool


@router.get("/public", response_model=SystemSettingsPublic, dependencies=[Depends(get_current_admin)])
def get_public_settings(db: Session = Depends(get_db)) -> SystemSettingsPublic:
    """Fetch non-sensitive system settings for UI rendering."""
    data = SystemSettingsRepository(db).get_settings_dict()
    return SystemSettingsPublic(hybrid_learning_enabled=bool(data.get("hybrid_learning_enabled", False)))


@router.get("/notifications", response_model=NotificationSettingsRead, dependencies=[Depends(require_admin)])
def get_notification_settings(db: Session = Depends(get_db)) -> NotificationSettingsRead:
    data = SystemSettingsRepository(db).get_settings_dict()
    return NotificationSettingsRead(**data)


@router.put("/notifications", response_model=NotificationSettingsRead)
def update_notification_settings(payload: NotificationSettingsUpdate, db: Session = Depends(get_db)) -> NotificationSettingsRead:
    updates = payload.model_dump(exclude_unset=True)
    data = SystemSettingsRepository(db).update(updates)
    return NotificationSettingsRead(**data)
