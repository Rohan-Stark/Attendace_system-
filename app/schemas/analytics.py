from pydantic import BaseModel
from typing import Optional, List
from datetime import date

# ── Base / Shared Schemas ──

class StudentAttendanceStats(BaseModel):
    student_id: int
    usn: str
    name: str
    total_classes: int
    present_count: int
    absent_count: int
    attendance_percentage: float

class TrendData(BaseModel):
    date: date
    present_count: int
    absent_count: int

# ── Student Analytics ──

class StudentTrendData(BaseModel):
    date: date
    status: str
    session_id: int

class StudentAnalyticsResponse(BaseModel):
    total_classes: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    history: List[StudentTrendData]

# ── Teacher Analytics ──

class TeacherAnalyticsResponse(BaseModel):
    total_sessions: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    student_stats: List[StudentAttendanceStats]
    trend: List[TrendData]

# ── HOD Analytics ──

class SectionStats(BaseModel):
    semester: int
    section: str
    total_classes: int
    present_count: int
    absent_count: int
    attendance_percentage: float

class HodAnalyticsResponse(BaseModel):
    total_sessions: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    section_stats: List[SectionStats]
    student_stats: List[StudentAttendanceStats]
    trend: List[TrendData]

# ── Admin Analytics ──

class DepartmentStats(BaseModel):
    department_id: int
    department_name: str
    total_sessions: int
    present_count: int
    absent_count: int
    attendance_percentage: float

class AdminAnalyticsResponse(BaseModel):
    total_departments_active: int
    total_sessions: int
    total_records: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    department_stats: List[DepartmentStats]
    trend: List[TrendData]
