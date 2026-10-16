import datetime as dt

from pydantic import BaseModel


class AttendanceEventIn(BaseModel):
    student_id: int
    timestamp: dt.datetime
    event_type: str


class AttendanceRead(BaseModel):
    id: int
    student_id: int
    date: dt.date
    check_in_time: dt.datetime | None
    check_out_time: dt.datetime | None
    status: str
    last_match_confidence: float | None = None

    model_config = {"from_attributes": True}


class AttendanceOverrideIn(BaseModel):
    check_in_time: dt.datetime | None = None
    check_out_time: dt.datetime | None = None
    status: str | None = None
