import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_admin
from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.repositories.admin_users import AdminUserRepository
from app.schemas.auth import AdminUserRead, LoginRequest, TokenResponse

router = APIRouter()
_LOGIN_ATTEMPTS: dict[str, list[float]] = {}


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    one_minute_ago = now - 60
    _LOGIN_ATTEMPTS[client_ip] = [x for x in _LOGIN_ATTEMPTS.get(client_ip, []) if x >= one_minute_ago]
    if len(_LOGIN_ATTEMPTS[client_ip]) >= settings.login_rate_limit_per_minute:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")

    username = ""
    password = ""
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            payload = LoginRequest.model_validate(await request.json())
        except Exception:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid login payload")
        username = payload.username
        password = payload.password
    else:
        form = await request.form()
        username = str(form.get("username") or "")
        password = str(form.get("password") or "")
        if not username or not password:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid login payload")

    user = AdminUserRepository(db).get_by_username(username)
    if not user or not verify_password(password, user.password_hash):
        _LOGIN_ATTEMPTS[client_ip].append(now)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(subject=user.username, role=user.role)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=AdminUserRead)
def me(current_user=Depends(get_current_admin)) -> AdminUserRead:
    return current_user
