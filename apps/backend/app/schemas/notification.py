import datetime as dt

from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: int
    student_id: int | None
    message: str
    type: str
    sent_at: dt.datetime

    model_config = {"from_attributes": True}
