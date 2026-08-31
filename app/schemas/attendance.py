"""
Pydantic schemas for attendance session and records.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


# ── Session Schemas ──

class AttendanceSessionCreate(BaseModel):
    """Teacher provides the class context to start a session."""
    semester: int = Field(..., ge=1, le=10)
    section: str = Field(..., max_length=10)


class AttendanceSessionResponse(BaseModel):
    id: int
    teacher_id: int
    department_id: int
    semester: int
    section: str
    date: date
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True


class AttendanceSessionDetail(AttendanceSessionResponse):
    """Session response enriched with student attendance list."""
    records: list["AttendanceRecordResponse"] = []


# ── Record Schemas ──

class AttendanceRecordResponse(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_usn: Optional[str] = None
    student_name: Optional[str] = None
    subject_id: Optional[int] = None
    status: str
    marking_method: str
    marked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceRecordUpdate(BaseModel):
    """Teacher manually marks a student present or absent."""
    status: str = Field(..., pattern=r"^(present|absent)$")  # "present" or "absent"


# ── Student View ──

class StudentAttendanceRecord(BaseModel):
    date: date
    status: str
    marking_method: str
    session_id: int

    class Config:
        from_attributes = True


# Rebuild forward refs
AttendanceSessionDetail.model_rebuild()
