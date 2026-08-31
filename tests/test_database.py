import pytest
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
import random
import uuid

from app.models import (
    Department, User, UserRole, StudentProfile, StudentStatus, TeacherProfile,
    Subject, Timetable, ClassSession, SessionStatus, AttendanceRecord, AttendanceStatus, MarkingMethod,
    FaceEmbedding, StudentTransfer, AttendanceDispute, DisputeStatus, Notification, AuditLog
)

# 1, 2, 3: DB tests for Department, User, StudentProfile, TeacherProfile
def test_create_department_and_users(db_session):
    # 2. Department can be created
    dept = Department(name="Computer Science", code="CS101")
    db_session.add(dept)
    db_session.commit()
    assert dept.id is not None

    # 3. User can reference a department
    user_student = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.student, department_id=dept.id)
    user_teacher = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.teacher, department_id=dept.id)
    db_session.add_all([user_student, user_teacher])
    db_session.commit()

    # 4. StudentProfile references User
    student = StudentProfile(user_id=user_student.id, usn=f"1DS20CS{random.randint(100, 999)}", name="Test Student", current_semester=5, current_section="A", status=StudentStatus.active)
    # 5. TeacherProfile references User
    teacher = TeacherProfile(user_id=user_teacher.id, employee_id=f"EMP{random.randint(100, 999)}", name="John Doe")
    
    db_session.add_all([student, teacher])
    db_session.commit()
    
    assert student.id is not None
    assert teacher.id is not None

def test_academics_and_attendance(db_session):
    dept = Department(name="Electronics", code="EC101")
    db_session.add(dept)
    db_session.commit()

    user_s = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.student, department_id=dept.id)
    user_t = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.teacher, department_id=dept.id)
    db_session.add_all([user_s, user_t])
    db_session.commit()
    
    student = StudentProfile(user_id=user_s.id, usn=f"USN{random.randint(1000, 9999)}", name="Jane Student", current_semester=5, current_section="A", status=StudentStatus.active)
    teacher = TeacherProfile(user_id=user_t.id, employee_id=f"E{random.randint(1000, 9999)}", name="Jane Doe")
    db_session.add_all([student, teacher])
    db_session.commit()

    # 6. Subject references Department
    subject = Subject(name="Microcontrollers", code="EC51", semester=5, department_id=dept.id, is_active=True)
    db_session.add(subject)
    db_session.commit()

    # 7. Timetable references Subject and Teacher
    from datetime import time
    timetable = Timetable(subject_id=subject.id, teacher_id=teacher.id, semester=5, section="A", day_of_week="Monday", start_time=time(10, 0), end_time=time(11, 0))
    db_session.add(timetable)
    db_session.commit()

    # 8. ClassSession references Timetable
    session = ClassSession(teacher_id=user_t.id, department_id=dept.id, semester=5, section="A", timetable_id=timetable.id, date=datetime.now(timezone.utc).date(), status=SessionStatus.submitted)
    db_session.add(session)
    db_session.commit()

    # 9. AttendanceRecord references Student and ClassSession
    attendance = AttendanceRecord(
        session_id=session.id, student_id=student.id, subject_id=subject.id,
        status=AttendanceStatus.present, marking_method=MarkingMethod.face_recognition,
        marked_at=datetime.now(timezone.utc)
    )
    db_session.add(attendance)
    db_session.commit()
    assert attendance.id is not None

    # 10. Duplicate attendance for same student/session is rejected
    attendance_dup = AttendanceRecord(
        session_id=session.id, student_id=student.id, subject_id=subject.id,
        status=AttendanceStatus.absent, marking_method=MarkingMethod.manual,
        marked_at=datetime.now(timezone.utc)
    )
    db_session.add(attendance_dup)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_pgvector_face_embedding(db_session):
    user_s = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.student)
    db_session.add(user_s)
    db_session.commit()
    
    student = StudentProfile(user_id=user_s.id, usn=f"USN{random.randint(1000, 9999)}", name="Test Student", current_semester=1, current_section="A", status=StudentStatus.active)
    db_session.add(student)
    db_session.commit()

    # 11. FaceEmbedding can store a pgvector embedding
    # Dimension is 512
    fake_embedding = [random.random() for _ in range(512)]
    face = FaceEmbedding(student_id=student.id, embedding=fake_embedding, model_name="arcface_r100_v1")
    db_session.add(face)
    db_session.commit()
    
    # Retrieve it
    retrieved = db_session.query(FaceEmbedding).filter_by(id=face.id).first()
    assert retrieved is not None
    assert len(retrieved.embedding) == 512

def test_student_transfer_and_others(db_session):
    # Setup base entities
    dept1 = Department(name="D1", code=f"C{random.randint(1, 1000)}")
    dept2 = Department(name="D2", code=f"C{random.randint(1001, 2000)}")
    user_admin = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.primary_admin)
    db_session.add_all([dept1, dept2, user_admin])
    db_session.commit()

    user_s = User(email=f"{uuid.uuid4()}@test.com", password_hash="hash", role=UserRole.student, department_id=dept1.id)
    db_session.add(user_s)
    db_session.commit()
    
    student = StudentProfile(user_id=user_s.id, usn=f"USN{random.randint(1000, 9999)}", name="Test Student", current_semester=1, current_section="A", status=StudentStatus.active)
    db_session.add(student)
    db_session.commit()

    # 12. StudentTransfer relationships work
    transfer = StudentTransfer(
        student_id=student.id, from_department_id=dept1.id, to_department_id=dept2.id,
        from_semester=1, to_semester=2, from_section="A", to_section="B",
        transferred_by=user_admin.id
    )
    db_session.add(transfer)
    db_session.commit()
    assert transfer.id is not None

    # 13, 14, 15: Dispute, Notification, AuditLog
    subject = Subject(name="S", code=f"S{random.randint(1,100)}", semester=1, department_id=dept1.id)
    db_session.add(subject)
    db_session.commit()
    
    teacher = TeacherProfile(user_id=user_admin.id, employee_id=f"E{random.randint(1,1000)}", name="Admin")
    db_session.add(teacher)
    db_session.commit()

    from datetime import time
    timetable = Timetable(subject_id=subject.id, teacher_id=teacher.id, semester=1, section="A", day_of_week="Monday", start_time=time(10, 0), end_time=time(11, 0))
    db_session.add(timetable)
    db_session.commit()

    session = ClassSession(teacher_id=user_admin.id, department_id=dept1.id, semester=1, section="A", timetable_id=timetable.id, date=datetime.now(timezone.utc).date(), status=SessionStatus.submitted)
    db_session.add(session)
    db_session.commit()

    att = AttendanceRecord(
        session_id=session.id, student_id=student.id, subject_id=subject.id,
        status=AttendanceStatus.absent, marking_method=MarkingMethod.face_recognition,
        marked_at=datetime.now(timezone.utc)
    )
    db_session.add(att)
    db_session.commit()

    dispute = AttendanceDispute(attendance_record_id=att.id, student_id=student.id, reason="I was there")
    notif = Notification(recipient_user_id=user_s.id, notification_type="alert", title="Test", message="Msg")
    audit = AuditLog(actor_user_id=user_admin.id, action="create", entity_type="Subject", entity_id=str(subject.id))

    db_session.add_all([dispute, notif, audit])
    db_session.commit()

    assert dispute.id is not None
    assert notif.id is not None
    assert audit.id is not None
