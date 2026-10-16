from pydantic import BaseModel, Field


class FaceEncodingCreate(BaseModel):
    student_id: int
    encoding: list[float] = Field(min_length=64)


class FaceEncodingRead(BaseModel):
    id: int
    student_id: int
    encoding: list[float]

    model_config = {"from_attributes": True}
