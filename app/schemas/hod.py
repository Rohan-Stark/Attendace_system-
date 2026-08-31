from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from datetime import datetime

class HODCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., max_length=150)
    department_id: int

class HODUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None

class HODResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    department_id: int
    name: str | None = None # HODs might not have a profile, but if they do we'd join it. Currently User model has no HODProfile, so we return what we have.
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HODCreationResponse(BaseModel):
    hod: HODResponse
    temporary_password: str
