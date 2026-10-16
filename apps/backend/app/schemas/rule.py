from pydantic import BaseModel, Field


class RuleUpdate(BaseModel):
    school_start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    late_threshold_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    minimum_hours: float = Field(ge=0)


class RuleRead(BaseModel):
    id: int
    school_start_time: str
    late_threshold_time: str
    minimum_hours: float

    model_config = {"from_attributes": True}
