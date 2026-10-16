import datetime as dt

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    actor_username: str
    actor_role: str
    action: str
    resource_type: str
    resource_id: str
    details: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}
