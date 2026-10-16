from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.repositories.audit_logs import AuditLogRepository
from app.repositories.camera_devices import CameraDeviceRepository
from app.schemas.camera import CameraDeviceCreate, CameraDeviceRead, CameraDeviceUpdate

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=list[CameraDeviceRead])
def list_cameras(db: Session = Depends(get_db)) -> list[CameraDeviceRead]:
    return CameraDeviceRepository(db).list()


@router.post("", response_model=CameraDeviceRead, status_code=status.HTTP_201_CREATED)
def create_camera(payload: CameraDeviceCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)) -> CameraDeviceRead:
    repo = CameraDeviceRepository(db)
    if repo.get_by_device_id(payload.device_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="device_id already exists")
    created = repo.create(payload)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="camera.create",
        resource_type="camera",
        resource_id=str(created.id),
        details={"device_id": created.device_id, "location": created.location},
    )
    return created


@router.put("/{camera_id}", response_model=CameraDeviceRead)
def update_camera(
    camera_id: int,
    payload: CameraDeviceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
) -> CameraDeviceRead:
    repo = CameraDeviceRepository(db)
    camera = repo.get(camera_id)
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    updated = repo.update(camera, payload)
    AuditLogRepository(db).create(
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="camera.update",
        resource_type="camera",
        resource_id=str(updated.id),
        details=payload.model_dump(exclude_unset=True),
    )
    return updated
