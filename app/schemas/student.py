from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class StudentCreate(BaseModel):
    name: str
    usn: str
    initial_password: Optional[str] = None
    generate_demo_password: bool = False
    current_semester: int = Field(default=1, ge=1, le=10) # Adjust upper bound if needed
    current_section: str

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    current_semester: Optional[int] = Field(None, ge=1)
    current_section: Optional[str] = None

class StudentTransferRequest(BaseModel):
    to_department_id: int
    to_semester: int = Field(..., ge=1)
    to_section: str
    reason: Optional[str] = None

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
