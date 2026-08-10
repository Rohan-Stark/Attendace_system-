from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TeacherCreate(BaseModel):
    employee_id: str
    name: str

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    employee_id: Optional[str] = None
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
