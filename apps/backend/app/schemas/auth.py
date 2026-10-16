from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminUserRead(BaseModel):
    id: int
    username: str
    role: str
    class_name: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(pattern="^(admin|teacher)$")
    class_name: str | None = Field(default=None, min_length=1, max_length=60)
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: str | None = Field(default=None, pattern="^(admin|teacher)$")
    class_name: str | None = Field(default=None, min_length=1, max_length=60)
    is_active: bool | None = None
