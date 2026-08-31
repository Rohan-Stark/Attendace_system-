from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class LoginRequest(BaseModel):
    login_id: str = Field(..., max_length=100)
    password: str = Field(..., max_length=128)

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    requires_password_change: bool
    user_id: int

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

class ForgotPasswordRequest(BaseModel):
    login_id: str = Field(..., max_length=100)

class FirstTimeSignupRequest(BaseModel):
    login_id: str = Field(..., max_length=100)
    initial_password: str = Field(..., max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., max_length=256)
    new_password: str = Field(..., min_length=8, max_length=128)

class UserMeResponse(BaseModel):
    id: int
    email: str
    role: str
    department_id: Optional[int] = None
    is_active: bool
    must_change_password: bool
    # Additional profile fields can be added here if needed
