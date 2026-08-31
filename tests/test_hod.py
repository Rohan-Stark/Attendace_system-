import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.teacher import TeacherProfile
from app.models.student import StudentProfile, StudentStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, MarkingMethod
from app.models.transfer import StudentTransfer
from app.core.security import get_password_hash, create_access_token
from app.models.audit import AuditLog

@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def setup_departments(db_session: Session):
    dept_a = Department(name="Dept A", code="A")
    dept_b = Department(name="Dept B", code="B")
    db_session.add_all([dept_a, dept_b])
    db_session.commit()
    
    hod_a = User(email="hod.a@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept_a.id, is_active=True, must_change_password=False)
    hod_b = User(email="hod.b@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept_b.id, is_active=True, must_change_password=False)
    db_session.add_all([hod_a, hod_b])
    db_session.commit()
    
    token_a = create_access_token(subject=hod_a.id, role="hod", department_id=dept_a.id)
    token_b = create_access_token(subject=hod_b.id, role="hod", department_id=dept_b.id)
    
    return {
        "dept_a": dept_a,
        "dept_b": dept_b,
        "hod_a": hod_a,
        "hod_b": hod_b,
        "token_a": token_a,
        "token_b": token_b
    }

def test_hod_create_teacher(client, setup_departments, db_session):
    headers = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    response = client.post("/hod/teachers", json={"employee_id": "EMP001", "name": "Teacher A"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "temporary_password" in data
    assert data["teacher"]["department_id"] == setup_departments["dept_a"].id
    
    teacher_user = db_session.query(User).filter(User.id == data["teacher"]["id"]).first()
    assert teacher_user.role == UserRole.teacher
    assert teacher_user.department_id == setup_departments["dept_a"].id

def test_hod_create_student_production(client, setup_departments, db_session):
    headers = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    response = client.post("/hod/students", json={
        "name": "Student Prod", 
        "usn": "USNPROD", 
        "initial_password": "StrongPassword1!",
        "generate_demo_password": False,
        "current_semester": 1, 
        "current_section": "A"
    }, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["student"]["department_id"] == setup_departments["dept_a"].id
    assert data["student"]["profile"]["name"] == "Student Prod"
    assert data.get("temporary_password") is None
    
    student_user = db_session.query(User).filter(User.id == data["student"]["id"]).first()
    assert student_user.role == UserRole.student
    assert student_user.must_change_password is True

def test_hod_create_student_demo_disabled(client, setup_departments, db_session):
    headers = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    
    # By default, settings.DEMO_MODE is False
    from app.core.config import settings
    settings.DEMO_MODE = False
    
    response = client.post("/hod/students", json={
        "name": "Student Demo Disabled", 
        "usn": "USNDEMO1", 
        "generate_demo_password": True,
        "current_semester": 1, 
        "current_section": "A"
    }, headers=headers)
    
    assert response.status_code == 403

def test_hod_create_student_demo_enabled(client, setup_departments, db_session):
    headers = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    
    from app.core.config import settings
    settings.DEMO_MODE = True
    
    try:
        response = client.post("/hod/students", json={
            "name": "Student Demo Enabled", 
            "usn": "USNDEMO2", 
            "generate_demo_password": True,
            "current_semester": 1, 
            "current_section": "A"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["student"]["department_id"] == setup_departments["dept_a"].id
        assert data.get("temporary_password") is not None
        
        student_user = db_session.query(User).filter(User.id == data["student"]["id"]).first()
        assert student_user.role == UserRole.student
        assert student_user.must_change_password is True
    finally:
        settings.DEMO_MODE = False # Reset for other tests

def test_hod_department_isolation(client, setup_departments, db_session):
    # HOD A creates a teacher
    headers_a = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    res_a = client.post("/hod/teachers", json={"employee_id": "EMP002", "name": "Teacher A2"}, headers=headers_a)
    teacher_id = res_a.json()["teacher"]["id"]
    
    # HOD B tries to access HOD A's teacher
    headers_b = {"Authorization": f"Bearer {setup_departments['token_b']}"}
    res_b = client.get(f"/hod/teachers/{teacher_id}", headers=headers_b)
    assert res_b.status_code == 404

def test_student_transfer(client, setup_departments, db_session):
    headers_a = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    
    # HOD A creates student
    res = client.post("/hod/students", json={
        "name": "Transfer Student", 
        "usn": "USNTX", 
        "initial_password": "P!", 
        "current_semester": 1, 
        "current_section": "A"
    }, headers=headers_a)
    student_id = res.json()["student"]["id"]
    
    # HOD A transfers student to Dept B
    res_transfer = client.post(f"/hod/students/{student_id}/transfer", json={
        "to_department_id": setup_departments["dept_b"].id,
        "to_semester": 2,
        "to_section": "B",
        "reason": "Branch change"
    }, headers=headers_a)
    assert res_transfer.status_code == 200
    
    # Verify student is in Dept B
    student_user = db_session.query(User).filter(User.id == student_id).first()
    assert student_user.department_id == setup_departments["dept_b"].id
    assert student_user.student_profile.current_semester == 2
    
    # Verify transfer record exists
    transfer = db_session.query(StudentTransfer).filter(StudentTransfer.student_id == student_user.student_profile.id).first()
    assert transfer is not None
    assert transfer.from_department_id == setup_departments["dept_a"].id
    assert transfer.to_department_id == setup_departments["dept_b"].id
    
    # HOD A can no longer access student
    res_get_a = client.get(f"/hod/students/{student_id}", headers=headers_a)
    assert res_get_a.status_code == 404
    
    # HOD B CAN access student
    headers_b = {"Authorization": f"Bearer {setup_departments['token_b']}"}
    res_get_b = client.get(f"/hod/students/{student_id}", headers=headers_b)
    assert res_get_b.status_code == 200

def test_student_removal_no_attendance(client, setup_departments, db_session):
    headers_a = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    res = client.post("/hod/students", json={
        "name": "Remove Me", "usn": "USNR1", "initial_password": "P!", "current_semester": 1, "current_section": "A"
    }, headers=headers_a)
    student_id = res.json()["student"]["id"]
    
    res_del = client.post(f"/hod/students/{student_id}/remove", headers=headers_a)
    assert res_del.status_code == 200
    
    # Hard deleted
    student_user = db_session.query(User).filter(User.id == student_id).first()
    assert student_user is None

def test_student_removal_with_attendance(client, setup_departments, db_session):
    headers_a = {"Authorization": f"Bearer {setup_departments['token_a']}"}
    res = client.post("/hod/students", json={
        "name": "Keep Me", "usn": "USNK1", "initial_password": "P!", "current_semester": 1, "current_section": "A"
    }, headers=headers_a)
    student_id = res.json()["student"]["id"]
    
    student_user = db_session.query(User).filter(User.id == student_id).first()
    
    # Create mock dependencies for attendance
    from app.models.subject import Subject
    from app.models.timetable import Timetable
    from app.models.session import ClassSession, SessionStatus
    import datetime
    
    sub = Subject(name="Math", code="M1", department_id=setup_departments["dept_a"].id, semester=1)
    db_session.add(sub)
    db_session.commit()
    
    # Needs a TeacherProfile for Timetable
    from app.models.teacher import TeacherProfile
    teacher_prof = TeacherProfile(user_id=setup_departments["hod_a"].id, employee_id="E999", name="T")
    db_session.add(teacher_prof)
    db_session.commit()
    
    tt = Timetable(
        subject_id=sub.id, teacher_id=teacher_prof.id, semester=1, section="A",
        day_of_week="Monday", start_time=datetime.time(9, 0), end_time=datetime.time(10, 0)
    )
    db_session.add(tt)
    db_session.commit()
    
    sess = ClassSession(
        teacher_id=teacher_prof.user_id, department_id=setup_departments["dept_a"].id, semester=1, section="A",
        timetable_id=tt.id, date=datetime.date.today(),
        status=SessionStatus.submitted
    )
    db_session.add(sess)
    db_session.commit()
    
    att = AttendanceRecord(
        session_id=sess.id, student_id=student_user.student_profile.id, subject_id=sub.id,
        status=AttendanceStatus.present, marking_method=MarkingMethod.manual, marked_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db_session.add(att)
    db_session.commit()
    
    # Remove student
    res_del = client.post(f"/hod/students/{student_id}/remove", headers=headers_a)
    assert res_del.status_code == 200
    
    db_session.refresh(student_user)
    assert student_user.is_active is False
    assert student_user.student_profile.status == StudentStatus.removed
    
    # Attendance intact
    att_count = db_session.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_user.student_profile.id).count()
    assert att_count == 1
