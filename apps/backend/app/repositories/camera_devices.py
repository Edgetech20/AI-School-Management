from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.camera_device import CameraDevice
from app.schemas.camera import CameraDeviceCreate, CameraDeviceUpdate


class CameraDeviceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self) -> list[CameraDevice]:
        return list(self.db.scalars(select(CameraDevice).order_by(CameraDevice.id)).all())

    def get(self, camera_id: int) -> CameraDevice | None:
        return self.db.get(CameraDevice, camera_id)

    def get_by_device_id(self, device_id: str) -> CameraDevice | None:
        statement = select(CameraDevice).where(CameraDevice.device_id == device_id)
        return self.db.scalar(statement)

    def get_active_by_device_id(self, device_id: str) -> CameraDevice | None:
        statement = select(CameraDevice).where(CameraDevice.device_id == device_id).where(CameraDevice.is_active.is_(True))
        return self.db.scalar(statement)

    def create(self, payload: CameraDeviceCreate) -> CameraDevice:
        model = CameraDevice(**payload.model_dump())
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def update(self, model: CameraDevice, payload: CameraDeviceUpdate) -> CameraDevice:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
