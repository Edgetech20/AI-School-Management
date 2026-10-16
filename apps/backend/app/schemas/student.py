from pydantic import BaseModel, EmailStr, Field


class StudentBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    class_name: str = Field(min_length=1, max_length=60)
    roll_number: str = Field(min_length=1, max_length=40)
    parent_phone: str = Field(min_length=7, max_length=30)
    parent_email: EmailStr


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    class_name: str | None = Field(default=None, min_length=1, max_length=60)
    roll_number: str | None = Field(default=None, min_length=1, max_length=40)
    parent_phone: str | None = Field(default=None, min_length=7, max_length=30)
    parent_email: EmailStr | None = None


class StudentRead(StudentBase):
    id: int
    face_samples: int = 0
    has_face: bool = False

    model_config = {"from_attributes": True}
