import datetime as dt

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CameraDevice(Base):
    __tablename__ = "camera_devices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(64), nullable=True)
    port: Mapped[int] = mapped_column(nullable=True)
    stream_url: Mapped[str] = mapped_column(String(255), nullable=True)
    stream_username: Mapped[str] = mapped_column(String(120), nullable=True)
    stream_password: Mapped[str] = mapped_column(String(255), nullable=True)
    usage_tag: Mapped[str] = mapped_column(String(20), nullable=False, default="both", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=False), default=dt.datetime.utcnow, nullable=False)
