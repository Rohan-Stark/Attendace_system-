from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from datetime import date
from typing import Optional, List, Dict

from app.models.session import ClassSession, SessionStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.student import StudentProfile
from app.models.department import Department

class AnalyticsService:

    def _calc_percentage(self, present: int, total: int) -> float:
        if total == 0:
            return 0.0
        return round((present / total) * 100, 2)

    def get_student_analytics(self, db: Session, student_id: int):
        records = db.query(
            AttendanceRecord, ClassSession.date
        ).join(
            ClassSession, ClassSession.id == AttendanceRecord.session_id
        ).filter(
            AttendanceRecord.student_id == student_id,
            ClassSession.status == SessionStatus.submitted
        ).order_by(ClassSession.date.desc()).all()

        total = len(records)
        present = sum(1 for r, _ in records if r.status == AttendanceStatus.present)
        absent = total - present

        history = [
            {
                "date": d,
                "status": r.status.value,
                "session_id": r.session_id
            }
            for r, d in records
        ]

        return {
            "total_classes": total,
            "present_count": present,
            "absent_count": absent,
            "attendance_percentage": self._calc_percentage(present, total),
            "history": history
        }

    def _build_base_query(self, db: Session, from_date: Optional[date], to_date: Optional[date]):
        # We query the joined AttendanceRecord -> ClassSession
        q = db.query(AttendanceRecord).join(
            ClassSession, ClassSession.id == AttendanceRecord.session_id
        ).filter(
            ClassSession.status == SessionStatus.submitted
        )
        if from_date:
            q = q.filter(ClassSession.date >= from_date)
        if to_date:
            q = q.filter(ClassSession.date <= to_date)
        return q

    def _get_trend(self, db: Session, base_filter):
        # Calculate trend (date-wise counts)
        # Using Session.date directly
        trend_query = db.query(
            ClassSession.date,
            func.count(AttendanceRecord.id).label('total'),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.present, 1), else_=0)).label('present')
        ).join(
            AttendanceRecord, AttendanceRecord.session_id == ClassSession.id
        ).filter(
            base_filter
        ).group_by(ClassSession.date).order_by(ClassSession.date).all()
        
        trend = []
        for d, total, present in trend_query:
            absent = total - (present or 0)
            trend.append({
                "date": d,
                "present_count": int(present or 0),
                "absent_count": absent
            })
        return trend

    def _get_student_stats(self, db: Session, base_filter):
        # Calculate student-wise table
        stats_query = db.query(
            StudentProfile.id,
            StudentProfile.usn,
            StudentProfile.name,
            func.count(AttendanceRecord.id).label('total'),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.present, 1), else_=0)).label('present')
        ).join(
            AttendanceRecord, AttendanceRecord.student_id == StudentProfile.id
        ).join(
            ClassSession, ClassSession.id == AttendanceRecord.session_id
        ).filter(
            base_filter
        ).group_by(
            StudentProfile.id, StudentProfile.usn, StudentProfile.name
        ).order_by(StudentProfile.name).all()

        student_stats = []
        for sid, usn, name, total, present in stats_query:
            p = int(present or 0)
            t = int(total or 0)
            student_stats.append({
                "student_id": sid,
                "usn": usn or "N/A",
                "name": name or "N/A",
                "total_classes": t,
                "present_count": p,
                "absent_count": t - p,
                "attendance_percentage": self._calc_percentage(p, t)
            })
        return student_stats

    def _get_overall_stats(self, db: Session, base_filter):
        res = db.query(
            func.count(ClassSession.id.distinct()).label('total_sessions'),
            func.count(AttendanceRecord.id).label('total_records'),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.present, 1), else_=0)).label('present')
        ).select_from(
            ClassSession
        ).join(
            AttendanceRecord, AttendanceRecord.session_id == ClassSession.id
        ).filter(
            base_filter
        ).first()

        total_sessions = res.total_sessions or 0
        total_records = res.total_records or 0
        present = int(res.present or 0)
        absent = total_records - present

        return total_sessions, total_records, present, absent

    def get_teacher_analytics(self, db: Session, teacher_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None):
        base_filter = and_(
            ClassSession.teacher_id == teacher_id,
            ClassSession.status == SessionStatus.submitted
        )
        if from_date:
            base_filter = and_(base_filter, ClassSession.date >= from_date)
        if to_date:
            base_filter = and_(base_filter, ClassSession.date <= to_date)
            
        total_sessions, total_records, present, absent = self._get_overall_stats(db, base_filter)
        student_stats = self._get_student_stats(db, base_filter)
        trend = self._get_trend(db, base_filter)
        
        return {
            "total_sessions": total_sessions,
            "total_records": total_records,
            "present_count": present,
            "absent_count": absent,
            "attendance_percentage": self._calc_percentage(present, total_records),
            "student_stats": student_stats,
            "trend": trend
        }

    def get_hod_analytics(self, db: Session, department_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None):
        base_filter = and_(
            ClassSession.department_id == department_id,
            ClassSession.status == SessionStatus.submitted
        )
        if from_date:
            base_filter = and_(base_filter, ClassSession.date >= from_date)
        if to_date:
            base_filter = and_(base_filter, ClassSession.date <= to_date)

        total_sessions, total_records, present, absent = self._get_overall_stats(db, base_filter)
        student_stats = self._get_student_stats(db, base_filter)
        trend = self._get_trend(db, base_filter)

        # Section-wise breakdown
        sec_query = db.query(
            ClassSession.semester,
            ClassSession.section,
            func.count(AttendanceRecord.id).label('total'),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.present, 1), else_=0)).label('present')
        ).join(
            AttendanceRecord, AttendanceRecord.session_id == ClassSession.id
        ).filter(
            base_filter
        ).group_by(ClassSession.semester, ClassSession.section).all()

        section_stats = []
        for sem, sec, total, p_count in sec_query:
            p = int(p_count or 0)
            t = int(total or 0)
            section_stats.append({
                "semester": sem,
                "section": sec,
                "total_classes": t,
                "present_count": p,
                "absent_count": t - p,
                "attendance_percentage": self._calc_percentage(p, t)
            })

        return {
            "total_sessions": total_sessions,
            "total_records": total_records,
            "present_count": present,
            "absent_count": absent,
            "attendance_percentage": self._calc_percentage(present, total_records),
            "section_stats": section_stats,
            "student_stats": student_stats,
            "trend": trend
        }

    def get_admin_analytics(self, db: Session, from_date: Optional[date] = None, to_date: Optional[date] = None):
        base_filter = ClassSession.status == SessionStatus.submitted
        if from_date:
            base_filter = and_(base_filter, ClassSession.date >= from_date)
        if to_date:
            base_filter = and_(base_filter, ClassSession.date <= to_date)

        total_sessions, total_records, present, absent = self._get_overall_stats(db, base_filter)
        trend = self._get_trend(db, base_filter)

        # Department breakdown
        dep_query = db.query(
            Department.id,
            Department.name,
            func.count(ClassSession.id.distinct()).label('sessions'),
            func.count(AttendanceRecord.id).label('total'),
            func.sum(case((AttendanceRecord.status == AttendanceStatus.present, 1), else_=0)).label('present')
        ).select_from(Department).outerjoin(
            ClassSession, and_(ClassSession.department_id == Department.id, base_filter)
        ).outerjoin(
            AttendanceRecord, AttendanceRecord.session_id == ClassSession.id
        ).group_by(Department.id, Department.name).all()

        department_stats = []
        for did, name, s_count, total, p_count in dep_query:
            p = int(p_count or 0)
            t = int(total or 0)
            department_stats.append({
                "department_id": did,
                "department_name": name,
                "total_sessions": int(s_count or 0),
                "present_count": p,
                "absent_count": t - p,
                "attendance_percentage": self._calc_percentage(p, t)
            })
            
        total_departments_active = len(department_stats)

        return {
            "total_departments_active": total_departments_active,
            "total_sessions": total_sessions,
            "total_records": total_records,
            "present_count": present,
            "absent_count": absent,
            "attendance_percentage": self._calc_percentage(present, total_records),
            "department_stats": department_stats,
            "trend": trend
        }

analytics_service = AnalyticsService()
