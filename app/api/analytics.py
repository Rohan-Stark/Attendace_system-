from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User
from app.models.student import StudentProfile
from app.schemas.analytics import (
    StudentAnalyticsResponse,
    TeacherAnalyticsResponse,
    HodAnalyticsResponse,
    AdminAnalyticsResponse
)
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/student", response_model=StudentAnalyticsResponse)
def get_student_analytics_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return analytics_service.get_student_analytics(db, student.id)

@router.get("/teacher", response_model=TeacherAnalyticsResponse)
def get_teacher_analytics_api(
    from_date: Optional[date] = Query(None, description="Start date for analytics filter"),
    to_date: Optional[date] = Query(None, description="End date for analytics filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    return analytics_service.get_teacher_analytics(db, current_user.id, from_date, to_date)

@router.get("/hod", response_model=HodAnalyticsResponse)
def get_hod_analytics_api(
    from_date: Optional[date] = Query(None, description="Start date for analytics filter"),
    to_date: Optional[date] = Query(None, description="End date for analytics filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod"))
):
    return analytics_service.get_hod_analytics(db, current_user.department_id, from_date, to_date)

@router.get("/admin", response_model=AdminAnalyticsResponse)
def get_admin_analytics_api(
    from_date: Optional[date] = Query(None, description="Start date for analytics filter"),
    to_date: Optional[date] = Query(None, description="End date for analytics filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("primary_admin"))
):
    return analytics_service.get_admin_analytics(db, from_date, to_date)
