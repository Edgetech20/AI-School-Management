from functools import lru_cache
from typing import Any
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Face Recognition Attendance API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")

    database_url: str = Field(
        default="mysql+pymysql://root:@localhost:3306/attendance_db",
        alias="DATABASE_URL",
    )

    allowed_origins: str = Field(default="http://localhost:5173", alias="ALLOWED_ORIGINS")

    school_start_time: str = Field(default="09:00", alias="SCHOOL_START_TIME")
    late_threshold_time: str = Field(default="09:15", alias="LATE_THRESHOLD_TIME")
    minimum_working_hours: float = Field(default=6.0, alias="MINIMUM_WORKING_HOURS")

    email_from: str = Field(default="no-reply@school.local", alias="EMAIL_FROM")
    smtp_host: str = Field(default="localhost", alias="SMTP_HOST")
    smtp_port: int = Field(default=1025, alias="SMTP_PORT")
    smtp_username: str = Field(default="", alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_encryption: str = Field(default="tls", alias="SMTP_ENCRYPTION")
    smtp_from_name: str = Field(default="", alias="SMTP_FROM_NAME")

    sms_provider: str = Field(default="console", alias="SMS_PROVIDER")
    parent_notifications_enabled: bool = Field(default=True, alias="PARENT_NOTIFICATIONS_ENABLED")
    sms_webhook_url: str = Field(default="", alias="SMS_WEBHOOK_URL")

    jwt_secret_key: str = Field(default="change-this-secret", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    admin_default_username: str = Field(default="admin", alias="ADMIN_DEFAULT_USERNAME")
    admin_default_password: str = Field(default="Admin@123", alias="ADMIN_DEFAULT_PASSWORD")
    teacher_default_username: str = Field(default="teacher", alias="TEACHER_DEFAULT_USERNAME")
    teacher_default_password: str = Field(default="Teacher@123", alias="TEACHER_DEFAULT_PASSWORD")

    face_match_tolerance: float = Field(default=0.65, alias="FACE_MATCH_TOLERANCE")
    face_match_min_margin: float = Field(default=0.06, alias="FACE_MATCH_MIN_MARGIN")
    hybrid_learning_enabled: bool = Field(default=False, alias="HYBRID_LEARNING_ENABLED")
    hybrid_high_confidence_threshold: float = Field(default=0.95, alias="HYBRID_HIGH_CONFIDENCE_THRESHOLD")
    hybrid_medium_confidence_threshold: float = Field(default=0.85, alias="HYBRID_MEDIUM_CONFIDENCE_THRESHOLD")
    hybrid_high_min_margin: float = Field(default=0.08, alias="HYBRID_HIGH_MIN_MARGIN")
    hybrid_review_min_margin: float = Field(default=0.04, alias="HYBRID_REVIEW_MIN_MARGIN")
    hybrid_review_image_dir: str = Field(default="tmp/review_faces", alias="HYBRID_REVIEW_IMAGE_DIR")
    hybrid_review_retention_hours: int = Field(default=48, alias="HYBRID_REVIEW_RETENTION_HOURS")
    adaptive_max_samples_per_student: int = Field(default=20, alias="ADAPTIVE_MAX_SAMPLES_PER_STUDENT")
    adaptive_min_distance: float = Field(default=0.12, alias="ADAPTIVE_MIN_DISTANCE")
    adaptive_min_quality_score: float = Field(default=0.55, alias="ADAPTIVE_MIN_QUALITY_SCORE")
    enable_adaptive_face_learning: bool = Field(default=False, alias="ENABLE_ADAPTIVE_FACE_LEARNING")
    duplicate_mark_window_seconds: int = Field(default=120, alias="DUPLICATE_MARK_WINDOW_SECONDS")
    login_rate_limit_per_minute: int = Field(default=10, alias="LOGIN_RATE_LIMIT_PER_MINUTE")
    face_encoding_encryption_key: str = Field(default="", alias="FACE_ENCODING_ENCRYPTION_KEY")
    queue_poll_interval_seconds: int = Field(default=3, alias="QUEUE_POLL_INTERVAL_SECONDS")
    scheduler_daily_summary_hour_ist: int = Field(default=18, alias="SCHEDULER_DAILY_SUMMARY_HOUR_IST")
    scheduler_enabled: bool = Field(default=True, alias="SCHEDULER_ENABLED")

    auto_create_tables: bool = Field(default=True, alias="AUTO_CREATE_TABLES")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


_notification_runtime_overrides: dict[str, Any] = {}


def get_notification_channel_settings() -> dict[str, Any]:
    settings = get_settings()
    return {
        "email_from": str(_notification_runtime_overrides.get("email_from", settings.email_from)),
        "smtp_host": str(_notification_runtime_overrides.get("smtp_host", settings.smtp_host)),
        "smtp_port": int(_notification_runtime_overrides.get("smtp_port", settings.smtp_port)),
        "smtp_username": str(_notification_runtime_overrides.get("smtp_username", settings.smtp_username)),
        "smtp_password": str(_notification_runtime_overrides.get("smtp_password", settings.smtp_password)),
        "smtp_encryption": str(_notification_runtime_overrides.get("smtp_encryption", settings.smtp_encryption)),
        "smtp_from_name": str(_notification_runtime_overrides.get("smtp_from_name", settings.smtp_from_name)),
        "sms_provider": str(_notification_runtime_overrides.get("sms_provider", settings.sms_provider)),
        "sms_webhook_url": str(_notification_runtime_overrides.get("sms_webhook_url", settings.sms_webhook_url)),
        "parent_notifications_enabled": bool(
            _notification_runtime_overrides.get("parent_notifications_enabled", settings.parent_notifications_enabled)
        ),
    }


def set_notification_channel_settings(overrides: dict[str, Any]) -> dict[str, Any]:
    global _notification_runtime_overrides
    for key, value in overrides.items():
        _notification_runtime_overrides[key] = value
    return get_notification_channel_settings()
