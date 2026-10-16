import datetime as dt

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timezone import now_ist_naive
from app.db.base import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    smtp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hybrid_learning_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    smtp_host: Mapped[str] = mapped_column(String(191), nullable=True)
    smtp_port: Mapped[int] = mapped_column(Integer, nullable=False, default=587)
    smtp_username: Mapped[str] = mapped_column(String(191), nullable=True)
    smtp_password: Mapped[str] = mapped_column(String(255), nullable=True)
    smtp_encryption: Mapped[str] = mapped_column(String(20), nullable=False, default="tls")
    smtp_from_email: Mapped[str] = mapped_column(String(191), nullable=True)
    smtp_from_name: Mapped[str] = mapped_column(String(191), nullable=True)

    sms_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="console")
    sms_webhook_url: Mapped[str] = mapped_column(String(255), nullable=True)
    parent_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=False), default=now_ist_naive, onupdate=now_ist_naive, nullable=False)
