import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.student import StudentProfile, StudentStatus
from app.models.session import ClassSession, SessionStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, MarkingMethod
from app.core.security import get_password_hash, create_access_token

@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def analytics_data(db_session: Session):
    # Department
    dept = Department(name="Analytics Dept", code="ANL")
    db_session.add(dept)
    db_session.commit()

    # Users
    admin = User(email="admin_anl@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.primary_admin, is_active=True, must_change_password=False)
    hod = User(email="hod_anl@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept.id, is_active=True, must_change_password=False)
    teacher = User(email="teacher_anl@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.teacher, department_id=dept.id, is_active=True, must_change_password=False)
    student_user = User(email="student_anl@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept.id, is_active=True, must_change_password=False)
    db_session.add_all([admin, hod, teacher, student_user])
    db_session.commit()

    # Student Profile
    student = StudentProfile(user_id=student_user.id, usn="ANL001", name="Analytics Student", current_semester=1, current_section="A", status=StudentStatus.active)
    db_session.add(student)
    db_session.commit()

    # Session 1 - Submitted (Present)
    session1 = ClassSession(teacher_id=teacher.id, department_id=dept.id, semester=1, section="A", date=datetime.now(timezone.utc).date(), status=SessionStatus.submitted)
    db_session.add(session1)
    db_session.commit()
    att1 = AttendanceRecord(session_id=session1.id, student_id=student.id, status=AttendanceStatus.present, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    db_session.add(att1)

    # Session 2 - Submitted (Absent)
    session2 = ClassSession(teacher_id=teacher.id, department_id=dept.id, semester=1, section="A", date=datetime.now(timezone.utc).date(), status=SessionStatus.submitted)
    db_session.add(session2)
    db_session.commit()
    att2 = AttendanceRecord(session_id=session2.id, student_id=student.id, status=AttendanceStatus.absent, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    db_session.add(att2)

    # Session 3 - Active (Should NOT be counted)
    session3 = ClassSession(teacher_id=teacher.id, department_id=dept.id, semester=1, section="A", date=datetime.now(timezone.utc).date(), status=SessionStatus.active)
    db_session.add(session3)
    db_session.commit()
    att3 = AttendanceRecord(session_id=session3.id, student_id=student.id, status=AttendanceStatus.present, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    db_session.add(att3)
    db_session.commit()

    # Create tokens
    return {
        "admin_token": create_access_token(subject=admin.id, role=admin.role.value, department_id=admin.department_id),
        "hod_token": create_access_token(subject=hod.id, role=hod.role.value, department_id=hod.department_id),
        "teacher_token": create_access_token(subject=teacher.id, role=teacher.role.value, department_id=teacher.department_id),
        "student_token": create_access_token(subject=student_user.id, role=student_user.role.value, department_id=student_user.department_id)
    }

def test_analytics_student_unauthorized(client: TestClient):
    response = client.get("/analytics/student")
    assert response.status_code == 401

def test_analytics_teacher_unauthorized(client: TestClient):
    response = client.get("/analytics/teacher")
    assert response.status_code == 401

def test_analytics_hod_unauthorized(client: TestClient):
    response = client.get("/analytics/hod")
    assert response.status_code == 401

def test_analytics_admin_unauthorized(client: TestClient):
    response = client.get("/analytics/admin")
    assert response.status_code == 401

def test_student_analytics_logic(client: TestClient, analytics_data):
    headers = {"Authorization": f"Bearer {analytics_data['student_token']}"}
    response = client.get("/analytics/student", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # 2 submitted classes, 1 present, 1 absent -> 50%
    assert data["total_classes"] == 2
    assert data["present_count"] == 1
    assert data["absent_count"] == 1
    assert data["attendance_percentage"] == 50.0
    assert len(data["history"]) == 2

def test_teacher_analytics_logic(client: TestClient, analytics_data):
    headers = {"Authorization": f"Bearer {analytics_data['teacher_token']}"}
    response = client.get("/analytics/teacher", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_sessions"] == 2
    assert data["total_records"] == 2
    assert data["present_count"] == 1
    assert data["absent_count"] == 1
    assert data["attendance_percentage"] == 50.0
    assert len(data["student_stats"]) == 1
    assert data["student_stats"][0]["attendance_percentage"] == 50.0

def test_hod_analytics_logic(client: TestClient, analytics_data):
    headers = {"Authorization": f"Bearer {analytics_data['hod_token']}"}
    response = client.get("/analytics/hod", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["total_sessions"] == 2
    assert data["total_records"] == 2
    assert len(data["section_stats"]) == 1
    assert data["section_stats"][0]["attendance_percentage"] == 50.0

def test_admin_analytics_logic(client: TestClient, analytics_data):
    headers = {"Authorization": f"Bearer {analytics_data['admin_token']}"}
    response = client.get("/analytics/admin", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Check that it at least includes the analytics_data department
    assert data["total_departments_active"] >= 1
    # System totals will include other test data, so we can't strict assert total_sessions=2
    # but we can verify response structure
    assert "total_sessions" in data
    assert "attendance_percentage" in data
    assert "department_stats" in data
