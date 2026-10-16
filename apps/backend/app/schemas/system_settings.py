from pydantic import BaseModel, Field


class NotificationSettingsRead(BaseModel):
    smtp_enabled: bool
    sms_enabled: bool
    hybrid_learning_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_encryption: str
    smtp_from_email: str
    smtp_from_name: str
    sms_provider: str
    sms_webhook_url: str
    parent_notifications_enabled: bool


class NotificationSettingsUpdate(BaseModel):
    smtp_enabled: bool | None = Field(default=None)
    sms_enabled: bool | None = Field(default=None)
    hybrid_learning_enabled: bool | None = Field(default=None)
    smtp_host: str | None = Field(default=None)
    smtp_port: int | None = Field(default=None, ge=1, le=65535)
    smtp_username: str | None = Field(default=None)
    smtp_password: str | None = Field(default=None)
    smtp_encryption: str | None = Field(default=None, pattern="^(none|tls|ssl)$")
    smtp_from_email: str | None = Field(default=None)
    smtp_from_name: str | None = Field(default=None)
    sms_provider: str | None = Field(default=None, pattern="^(console|webhook)$")
    sms_webhook_url: str | None = Field(default=None)
    parent_notifications_enabled: bool | None = Field(default=None)
