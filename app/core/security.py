import secrets
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], role: str, department_id: Optional[int] = None, expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "role": role}
    if department_id is not None:
        to_encode["dept"] = department_id
        
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def generate_temporary_password(length: int = 12) -> str:
    """
    Generate a cryptographically secure temporary password.
    Should be used for generating passwords for new accounts.
    Never use `random` module for this.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = ''.join(secrets.choice(alphabet) for i in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in "!@#$%^&*" for c in password)):
            break
    return password

def is_valid_password_policy(password: str) -> bool:
    """
    Check if the password meets minimum project policy:
    - Min 8 characters
    - Not empty or just whitespace
    """
    if not password or not password.strip():
        return False
    if len(password) < 8:
        return False
    return True

def generate_reset_token() -> (str, str):
    """
    Generate a secure reset token and its SHA-256 hash.
    Returns: (plaintext_token, token_hash)
    """
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash

def hash_reset_token(token: str) -> str:
    """
    Hash a provided reset token for comparison against DB.
    """
    return hashlib.sha256(token.encode()).hexdigest()
