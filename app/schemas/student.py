from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class StudentCreate(BaseModel):
    name: str = Field(..., max_length=150)
    usn: str = Field(..., max_length=50)
    initial_password: Optional[str] = Field(None, max_length=128)
    generate_demo_password: bool = False
    current_semester: int = Field(default=1, ge=1, le=10) # Adjust upper bound if needed
    current_section: str = Field(..., max_length=10)

class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    current_semester: Optional[int] = Field(None, ge=1)
    current_section: Optional[str] = Field(None, max_length=10)

class StudentTransferRequest(BaseModel):
    to_department_id: int
    to_semester: int = Field(..., ge=1)
    to_section: str = Field(..., max_length=10)
    reason: Optional[str] = Field(None, max_length=500)

class StudentProfileResponse(BaseModel):
    usn: str
    name: str
    current_semester: int
    current_section: str
    status: str
    
    model_config = ConfigDict(from_attributes=True)

class StudentResponse(BaseModel):
    id: int
    is_active: bool
    department_id: int
    profile: Optional[StudentProfileResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudentCreationResponse(BaseModel):
    student: StudentResponse
    temporary_password: Optional[str] = None
