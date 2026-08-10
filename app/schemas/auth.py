from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    login_id: str  # Email or USN
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    requires_password_change: bool
    user_id: int

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    login_id: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserMeResponse(BaseModel):
    id: int
    email: str
    role: str
    department_id: Optional[int] = None
    is_active: bool
    must_change_password: bool
    # Additional profile fields can be added here if needed
