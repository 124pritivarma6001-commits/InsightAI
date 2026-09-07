from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User
from app.utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Returns the authenticated user, or None for anonymous/demo usage.
    Dataset upload & dashboard generation work without login (per spec's
    'Try Sample Dataset' / frictionless demo flow); auth is required only
    for persisting data to a personal account.
    """
    if not token:
        return None
    user_id = decode_access_token(token)
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def require_user(user: User | None = Depends(get_current_user)) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user
