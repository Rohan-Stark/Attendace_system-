from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User
from app.models.student import StudentProfile
from app.services.analytics_service import analytics_service
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["reports"])

def get_period_str(from_date: Optional[date], to_date: Optional[date]) -> str:
    if from_date and to_date:
        return f"{from_date} to {to_date}"
    elif from_date:
        return f"Since {from_date}"
    elif to_date:
        return f"Until {to_date}"
    return "All Time"

def check_dates(from_date: Optional[date], to_date: Optional[date]):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=400, detail="from_date cannot be after to_date")

@router.get("/student/csv")
def get_student_report_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    
    data = analytics_service.get_student_analytics(db, student.id)
    csv_str = report_service.generate_student_csv(data)
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=student_report_{student.usn}.csv"}
    )

@router.get("/student/pdf")
def get_student_report_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    
    data = analytics_service.get_student_analytics(db, student.id)
    pdf_bytes = report_service.generate_student_pdf(data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=student_report_{student.usn}.pdf"}
    )

@router.get("/teacher/csv")
def get_teacher_report_csv(
    from_date: Optional[date] = Query(None, description="Start date for report filter"),
    to_date: Optional[date] = Query(None, description="End date for report filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    check_dates(from_date, to_date)
    data = analytics_service.get_teacher_analytics(db, current_user.id, from_date, to_date)
    csv_str = report_service.generate_teacher_csv(data, get_period_str(from_date, to_date))
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=class_attendance_report.csv"}
    )

@router.get("/teacher/pdf")
def get_teacher_report_pdf(
    from_date: Optional[date] = Query(None, description="Start date for report filter"),
    to_date: Optional[date] = Query(None, description="End date for report filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    check_dates(from_date, to_date)
    data = analytics_service.get_teacher_analytics(db, current_user.id, from_date, to_date)
    pdf_bytes = report_service.generate_teacher_pdf(data, get_period_str(from_date, to_date))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=class_attendance_report.pdf"}
    )

@router.get("/hod/csv")
def get_hod_report_csv(
    from_date: Optional[date] = Query(None, description="Start date for report filter"),
    to_date: Optional[date] = Query(None, description="End date for report filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod"))
):
    check_dates(from_date, to_date)
    data = analytics_service.get_hod_analytics(db, current_user.department_id, from_date, to_date)
    csv_str = report_service.generate_hod_csv(data, get_period_str(from_date, to_date))
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=department_report.csv"}
    )

@router.get("/hod/pdf")
def get_hod_report_pdf(
    from_date: Optional[date] = Query(None, description="Start date for report filter"),
    to_date: Optional[date] = Query(None, description="End date for report filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("hod"))
):
    check_dates(from_date, to_date)
    data = analytics_service.get_hod_analytics(db, current_user.department_id, from_date, to_date)
    pdf_bytes = report_service.generate_hod_pdf(data, get_period_str(from_date, to_date))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=department_report.pdf"}
    )

@router.get("/admin/csv")
def get_admin_report_csv(
    from_date: Optional[date] = Query(None, description="Start date for report filter"),
    to_date: Optional[date] = Query(None, description="End date for report filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("primary_admin"))
):
    check_dates(from_date, to_date)
    data = analytics_service.get_admin_analytics(db, from_date, to_date)
    csv_str = report_service.generate_admin_csv(data, get_period_str(from_date, to_date))
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=system_report.csv"}
    )

@router.get("/admin/pdf")
def get_admin_report_pdf(
    from_date: Optional[date] = Query(None, description="Start date for report filter"),
    to_date: Optional[date] = Query(None, description="End date for report filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("primary_admin"))
):
    check_dates(from_date, to_date)
    data = analytics_service.get_admin_analytics(db, from_date, to_date)
    pdf_bytes = report_service.generate_admin_pdf(data, get_period_str(from_date, to_date))
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=system_report.pdf"}
    )
