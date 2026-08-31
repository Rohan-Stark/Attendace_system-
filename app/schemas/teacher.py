from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class TeacherCreate(BaseModel):
    employee_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=150)

class TeacherUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    employee_id: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class TeacherProfileResponse(BaseModel):
    employee_id: str
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class TeacherResponse(BaseModel):
    id: int
    is_active: bool
    department_id: int
    profile: Optional[TeacherProfileResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TeacherCreationResponse(BaseModel):
    teacher: TeacherResponse
    temporary_password: str
