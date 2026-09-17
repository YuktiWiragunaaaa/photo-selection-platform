import hmac
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import get_settings

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)


def verify_admin_password(password: str) -> bool:
    return hmac.compare_digest(password.encode(), get_settings().admin_password.encode())


def create_access_token() -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": "admin", "exp": expire}, settings.secret_key, algorithm=ALGORITHM)


def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, get_settings().secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise unauthorized
    if payload.get("sub") != "admin":
        raise unauthorized
    return "admin"
