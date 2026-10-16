import datetime as dt

from pydantic import BaseModel, Field


class CameraDeviceCreate(BaseModel):
    device_id: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=120)
    ip_address: str | None = Field(default=None, max_length=64)
    port: int | None = Field(default=None, ge=1, le=65535)
    stream_url: str | None = Field(default=None, max_length=255)
    stream_username: str | None = Field(default=None, max_length=120)
    stream_password: str | None = Field(default=None, max_length=255)
    usage_tag: str = Field(default="both", pattern="^(check_in|check_out|both)$")
    is_active: bool = True


class CameraDeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, min_length=2, max_length=120)
    ip_address: str | None = Field(default=None, max_length=64)
    port: int | None = Field(default=None, ge=1, le=65535)
    stream_url: str | None = Field(default=None, max_length=255)
    stream_username: str | None = Field(default=None, max_length=120)
    stream_password: str | None = Field(default=None, max_length=255)
    usage_tag: str | None = Field(default=None, pattern="^(check_in|check_out|both)$")
    is_active: bool | None = None


class CameraDeviceRead(BaseModel):
    id: int
    device_id: str
    name: str
    location: str
    ip_address: str | None
    port: int | None
    stream_url: str | None
    stream_username: str | None
    stream_password: str | None
    usage_tag: str
    is_active: bool
    created_at: dt.datetime

    model_config = {"from_attributes": True}
