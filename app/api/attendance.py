"""
Phase 7: Attendance Session & Attendance Processing API.

Architecture:
- Teacher creates a session for today's class context.
- Teacher processes camera frames -> FaceService identifies students -> upsert attendance candidates.
- Teacher manually marks/overrides attendance.
- Teacher submits attendance.
- Student views their own attendance history.
- All modifications are restricted to the current calendar date (APP_TIMEZONE).

Design decision: Option A — when a session is created, attendance records for all
relevant students are pre-populated as ABSENT. Face recognition and manual marking
flip records to PRESENT. This ensures every relevant student is always represented.
"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentStatus
from app.models.session import ClassSession, SessionStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, MarkingMethod
from app.models.face import FaceEmbedding
from app.models.audit import AuditLog
from app.schemas.attendance import (
    AttendanceSessionCreate,
    AttendanceSessionResponse,
    AttendanceSessionDetail,
    AttendanceRecordResponse,
    AttendanceRecordUpdate,
    StudentAttendanceRecord,
)
from app.utils.timezone import get_current_date, get_current_datetime, is_attendance_date_modifiable

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])

# ── Helpers ──

def _build_record_response(record: AttendanceRecord) -> AttendanceRecordResponse:
    """Converts a DB AttendanceRecord into the API response schema."""
    return AttendanceRecordResponse(
        id=record.id,
        session_id=record.session_id,
        student_id=record.student_id,
        student_usn=record.student.usn if record.student else None,
        student_name=record.student.name if record.student else None,
        subject_id=record.subject_id,
        status=record.status.value,
        marking_method=record.marking_method.value,
        marked_at=record.marked_at,
    )


def _get_session_or_404(session_id: int, db: Session) -> ClassSession:
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found")
    return session


def _verify_session_ownership(session: ClassSession, user: User):
    if session.teacher_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this attendance session")


def _verify_modifiable(session: ClassSession):
    if not is_attendance_date_modifiable(session.date):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attendance for this date can no longer be modified"
        )


def _audit_log(db: Session, actor_id: int, action: str, entity_type: str, entity_id: str,
               old_value: str = None, new_value: str = None, reason: str = None):
    log = AuditLog(
        actor_user_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_value=old_value,
        new_value=new_value,
        reason=reason,
    )
    db.add(log)


# ══════════════════════════════════════════════════
# TEACHER ENDPOINTS
# ══════════════════════════════════════════════════

@router.post("/sessions", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    body: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    """Create an attendance session for today. Pre-populates ABSENT records for all relevant students."""
    today = get_current_date()
    now = get_current_datetime()

    # Prevent duplicate session for same teacher + semester + section + date
    existing = db.query(ClassSession).filter(
        ClassSession.teacher_id == current_user.id,
        ClassSession.semester == body.semester,
        ClassSession.section == body.section,
        ClassSession.date == today,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An attendance session for this class context already exists today"
        )

    session = ClassSession(
        teacher_id=current_user.id,
        department_id=current_user.department_id,
        semester=body.semester,
        section=body.section,
        date=today,
        started_at=now,
        status=SessionStatus.active,
    )
    db.add(session)
    db.flush()  # Get session.id

    # Pre-populate ABSENT records for all active students in this department/semester/section
    students = db.query(StudentProfile).filter(
        StudentProfile.user.has(
            and_(User.department_id == current_user.department_id, User.is_active == True)
        ),
        StudentProfile.current_semester == body.semester,
        StudentProfile.current_section == body.section,
        StudentProfile.status == StudentStatus.active,
    ).all()

    for student in students:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=student.id,
            subject_id=None,  # No subject in Phase 7 (deferred to timetable phase)
            status=AttendanceStatus.absent,
            marking_method=MarkingMethod.manual,
            marked_at=now,
        )
        db.add(record)

    _audit_log(db, current_user.id, "session_created", "ClassSession", session.id,
               new_value=f"date={today}, sem={body.semester}, sec={body.section}")
    db.commit()
    db.refresh(session)

    return AttendanceSessionResponse(
        id=session.id,
        teacher_id=session.teacher_id,
        department_id=session.department_id,
        semester=session.semester,
        section=session.section,
        date=session.date,
        started_at=session.started_at,
        submitted_at=session.submitted_at,
        status=session.status.value,
    )


@router.get("/sessions/today", response_model=List[AttendanceSessionResponse])
def get_today_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    """List this teacher's attendance sessions for today."""
    today = get_current_date()
    sessions = db.query(ClassSession).filter(
        ClassSession.teacher_id == current_user.id,
        ClassSession.date == today,
    ).all()

    return [
        AttendanceSessionResponse(
            id=s.id, teacher_id=s.teacher_id, department_id=s.department_id,
            semester=s.semester, section=s.section, date=s.date,
            started_at=s.started_at, submitted_at=s.submitted_at,
            status=s.status.value,
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=AttendanceSessionDetail)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    """Get session details with full attendance list."""
    session = _get_session_or_404(session_id, db)
    _verify_session_ownership(session, current_user)

    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id
    ).all()

    return AttendanceSessionDetail(
        id=session.id, teacher_id=session.teacher_id, department_id=session.department_id,
        semester=session.semester, section=session.section, date=session.date,
        started_at=session.started_at, submitted_at=session.submitted_at,
        status=session.status.value,
        records=[_build_record_response(r) for r in records],
    )


@router.post("/sessions/{session_id}/recognize-frame")
def recognize_frame(
    session_id: int,
    frame: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    """
    Process a single camera frame for face recognition.
    Recognized students are upserted as PRESENT (source: FACE_RECOGNITION).
    Unknown faces are ignored. Repeated recognitions do NOT create duplicate records.
    """
    session = _get_session_or_404(session_id, db)
    _verify_session_ownership(session, current_user)
    _verify_modifiable(session)

    from app.services.face_service import face_service
    from app.core.config import settings

    image_bytes = frame.file.read()
    try:
        detected_faces = face_service.detect_and_embed_faces(image_bytes)
    except Exception as e:
        logger.warning(f"Face detection error during attendance: {e}")
        return {"recognized": [], "unknown_count": 0, "error": str(e)}

    now = get_current_datetime()
    recognized = []
    unknown_count = 0

    # Get all registered face embeddings for students in this session's context
    session_student_ids = [r.student_id for r in 
                          db.query(AttendanceRecord.student_id).filter(
                              AttendanceRecord.session_id == session.id
                          ).all()]

    registered_embeddings = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id.in_(session_student_ids)
    ).all()

    for face_data in detected_faces:
        if face_data["det_score"] < 0.5:
            continue  # Skip low-confidence detections

        best_match_student_id = None
        best_score = -1.0

        for reg in registered_embeddings:
            # Handle both list and numpy array from pgvector
            reg_emb_list = reg.embedding.tolist() if hasattr(reg.embedding, 'tolist') else reg.embedding
            score = face_service.compute_similarity(face_data["embedding"], reg_emb_list)
            
            logger.info(f"Similarity Score Debug - Target Face vs Student {reg.student_id}: {score}")
            
            if score > best_score:
                best_score = score
                best_match_student_id = reg.student_id

        logger.info(f"Best match for face: Student {best_match_student_id} with score {best_score}")

        if best_score >= settings.FACE_RECOGNITION_THRESHOLD and best_match_student_id is not None:
            # Upsert: mark as PRESENT if currently ABSENT
            record = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == session.id,
                AttendanceRecord.student_id == best_match_student_id,
            ).first()

            if record and record.status == AttendanceStatus.absent:
                record.status = AttendanceStatus.present
                record.marking_method = MarkingMethod.face_recognition
                record.marked_at = now
                record.marked_by = None  # System/face recognition

            student = db.query(StudentProfile).filter(StudentProfile.id == best_match_student_id).first()
            recognized.append({
                "student_id": best_match_student_id,
                "usn": student.usn if student else None,
                "name": student.name if student else None,
                "score": round(best_score, 4),
            })
        else:
            unknown_count += 1

    db.commit()
    return {"recognized": recognized, "unknown_count": unknown_count}


@router.patch("/sessions/{session_id}/records/{student_id}", response_model=AttendanceRecordResponse)
def update_record(
    session_id: int,
    student_id: int,
    body: AttendanceRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    """Manually mark a student present or absent. Source becomes MANUAL."""
    session = _get_session_or_404(session_id, db)
    _verify_session_ownership(session, current_user)
    _verify_modifiable(session)

    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == student_id,
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    new_status = body.status.lower()
    if new_status not in ("present", "absent"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Status must be 'present' or 'absent'")

    old_status = record.status.value
    now = get_current_datetime()

    record.status = AttendanceStatus(new_status)
    record.marking_method = MarkingMethod.manual
    record.marked_at = now
    record.marked_by = current_user.id

    _audit_log(db, current_user.id, "manual_attendance_change", "AttendanceRecord", record.id,
               old_value=old_status, new_value=new_status)
    db.commit()
    db.refresh(record)

    return _build_record_response(record)


@router.post("/sessions/{session_id}/submit", response_model=AttendanceSessionResponse)
def submit_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    """Submit attendance. Teacher can still modify on the same day."""
    session = _get_session_or_404(session_id, db)
    _verify_session_ownership(session, current_user)
    _verify_modifiable(session)

    now = get_current_datetime()
    session.status = SessionStatus.submitted
    session.submitted_at = now

    _audit_log(db, current_user.id, "attendance_submitted", "ClassSession", session.id)
    db.commit()
    db.refresh(session)

    return AttendanceSessionResponse(
        id=session.id, teacher_id=session.teacher_id, department_id=session.department_id,
        semester=session.semester, section=session.section, date=session.date,
        started_at=session.started_at, submitted_at=session.submitted_at,
        status=session.status.value,
    )


# ══════════════════════════════════════════════════
# STUDENT ENDPOINTS
# ══════════════════════════════════════════════════

student_router = APIRouter(prefix="/student", tags=["student-attendance"])

@student_router.get("/attendance", response_model=List[StudentAttendanceRecord])
def get_student_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    """
    Student views their own attendance history.
    Only shows records from submitted sessions.
    Identity comes from JWT — no arbitrary student_id parameter.
    """
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    records = db.query(AttendanceRecord).join(ClassSession).filter(
        AttendanceRecord.student_id == student.id,
        ClassSession.status == SessionStatus.submitted,
    ).order_by(ClassSession.date.desc()).all()

    return [
        StudentAttendanceRecord(
            date=r.session.date,
            status=r.status.value,
            marking_method=r.marking_method.value,
            session_id=r.session_id,
        )
        for r in records
    ]
