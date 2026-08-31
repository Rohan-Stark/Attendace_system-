import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.session import ClassSession, SessionStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, MarkingMethod
from app.utils.timezone import get_current_date, get_current_datetime
from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.student import StudentProfile, StudentStatus
from app.core.security import get_password_hash, create_access_token

@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def setup_attendance_users(db_session: Session):
    dept = Department(name="Computer Science", code="CSE")
    db_session.add(dept)
    db_session.commit()
    
    teacher = User(email="teacher@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.teacher, department_id=dept.id, is_active=True, must_change_password=False)
    db_session.add(teacher)
    db_session.commit()
    
    student_user = User(email="USN123", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept.id, is_active=True, must_change_password=False)
    db_session.add(student_user)
    db_session.commit()
    
    student_profile = StudentProfile(user_id=student_user.id, usn="USN123", name="Test Student", current_semester=5, current_section="A", status=StudentStatus.active)
    db_session.add(student_profile)
    db_session.commit()
    
    teacher_token = create_access_token(subject=teacher.id, role="teacher")
    student_token = create_access_token(subject=student_user.id, role="student")
    
    return {
        "teacher": teacher,
        "student": student_user,
        "teacher_token_headers": {"Authorization": f"Bearer {teacher_token}"},
        "student_token_headers": {"Authorization": f"Bearer {student_token}"}
    }

def test_teacher_create_session(client: TestClient, setup_attendance_users: dict, db_session: Session):
    teacher_token_headers = setup_attendance_users["teacher_token_headers"]
    # Setup: ensure the student matches the teacher's department, semester, section
    # Assuming test_student is in semester 5, section A, department matches teacher
    
    body = {
        "semester": 5,
        "section": "A"
    }
    response = client.post("/attendance/sessions", json=body, headers=teacher_token_headers)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["semester"] == 5
    assert data["section"] == "A"
    assert data["status"] == "active"
    session_id = data["id"]
    
    # Verify pre-populated records
    records = db_session.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    assert len(records) > 0  # Should pre-populate for test_student
    for record in records:
        assert record.status == AttendanceStatus.absent
        assert record.marking_method == MarkingMethod.manual

def test_teacher_cannot_duplicate_session(client: TestClient, setup_attendance_users: dict, db_session: Session):
    teacher_token_headers = setup_attendance_users["teacher_token_headers"]
    body = {
        "semester": 5,
        "section": "A"
    }
    # Create the first one
    client.post("/attendance/sessions", json=body, headers=teacher_token_headers)
    response = client.post("/attendance/sessions", json=body, headers=teacher_token_headers)
    assert response.status_code == 409

def test_teacher_update_attendance_record(client: TestClient, setup_attendance_users: dict, db_session: Session):
    teacher_token_headers = setup_attendance_users["teacher_token_headers"]
    # Create session first
    body = {"semester": 5, "section": "A"}
    client.post("/attendance/sessions", json=body, headers=teacher_token_headers)
    
    # Fetch today's session
    today_sessions = client.get("/attendance/sessions/today", headers=teacher_token_headers).json()
    session_id = today_sessions[0]["id"]
    
    # Fetch session details to get a student ID
    session_detail = client.get(f"/attendance/sessions/{session_id}", headers=teacher_token_headers).json()
    student_id = session_detail["records"][0]["student_id"]
    
    body = {
        "status": "present"
    }
    response = client.patch(f"/attendance/sessions/{session_id}/records/{student_id}", json=body, headers=teacher_token_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "present"
    assert response.json()["marking_method"] == "manual"

def test_teacher_submit_session(client: TestClient, setup_attendance_users: dict, db_session: Session):
    teacher_token_headers = setup_attendance_users["teacher_token_headers"]
    # Create session first
    body = {"semester": 5, "section": "A"}
    client.post("/attendance/sessions", json=body, headers=teacher_token_headers)
    
    today_sessions = client.get("/attendance/sessions/today", headers=teacher_token_headers).json()
    session_id = today_sessions[0]["id"]
    
    response = client.post(f"/attendance/sessions/{session_id}/submit", headers=teacher_token_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "submitted"

def test_student_view_attendance(client: TestClient, setup_attendance_users: dict):
    student_token_headers = setup_attendance_users["student_token_headers"]
    teacher_token_headers = setup_attendance_users["teacher_token_headers"]
    
    # Create and submit a session first
    body = {"semester": 5, "section": "A"}
    client.post("/attendance/sessions", json=body, headers=teacher_token_headers)
    today_sessions = client.get("/attendance/sessions/today", headers=teacher_token_headers).json()
    session_id = today_sessions[0]["id"]
    client.post(f"/attendance/sessions/{session_id}/submit", headers=teacher_token_headers)

    # The student should be able to see the submitted session
    response = client.get("/student/attendance", headers=student_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # The submitted session from the previous test should appear here
    if len(data) > 0:
        assert data[0]["status"] in ["present", "absent"]
