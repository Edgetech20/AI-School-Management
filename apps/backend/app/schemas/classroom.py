from pydantic import BaseModel, Field


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class ClassRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
