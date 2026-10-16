from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.system_setting import SystemSetting


class SystemSettingsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create(self) -> SystemSetting:
        model = self.db.get(SystemSetting, 1)
        if model:
            return model

        env = get_settings()
        model = SystemSetting(
            id=1,
            smtp_enabled=bool(env.smtp_host),
            sms_enabled=True,
            hybrid_learning_enabled=bool(env.hybrid_learning_enabled),
            smtp_host=env.smtp_host,
            smtp_port=env.smtp_port,
            smtp_username=env.smtp_username,
            smtp_password=env.smtp_password,
            smtp_encryption=getattr(env, "smtp_encryption", "tls") or "tls",
            smtp_from_email=env.email_from,
            smtp_from_name=getattr(env, "smtp_from_name", "") or "",
            sms_provider=env.sms_provider,
            sms_webhook_url=env.sms_webhook_url,
            parent_notifications_enabled=env.parent_notifications_enabled,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def to_dict(self, model: SystemSetting) -> dict:
        return {
            "smtp_enabled": bool(model.smtp_enabled),
            "sms_enabled": bool(model.sms_enabled),
            "hybrid_learning_enabled": bool(model.hybrid_learning_enabled),
            "smtp_host": model.smtp_host or "",
            "smtp_port": int(model.smtp_port),
            "smtp_username": model.smtp_username or "",
            "smtp_password": model.smtp_password or "",
            "smtp_encryption": (model.smtp_encryption or "tls").lower(),
            "smtp_from_email": model.smtp_from_email or "",
            "smtp_from_name": model.smtp_from_name or "",
            "sms_provider": (model.sms_provider or "console").lower(),
            "sms_webhook_url": model.sms_webhook_url or "",
            "parent_notifications_enabled": bool(model.parent_notifications_enabled),
        }

    def get_settings_dict(self) -> dict:
        return self.to_dict(self.get_or_create())

    def update(self, updates: dict) -> dict:
        model = self.get_or_create()
        for key, value in updates.items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self.to_dict(model)
