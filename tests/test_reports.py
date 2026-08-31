import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import csv
import io

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
def report_data(db_session: Session):
    dept = Department(name="Report Dept", code="RPT")
    dept2 = Department(name="Other Dept", code="OTH")
    db_session.add_all([dept, dept2])
    db_session.commit()

    admin = User(email="admin_rpt@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.primary_admin, is_active=True, must_change_password=False)
    hod = User(email="hod_rpt@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept.id, is_active=True, must_change_password=False)
    teacher = User(email="teacher_rpt@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.teacher, department_id=dept.id, is_active=True, must_change_password=False)
    student_user = User(email="student_rpt@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept.id, is_active=True, must_change_password=False)
    student2_user = User(email="student2_rpt@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept.id, is_active=True, must_change_password=False)
    
    db_session.add_all([admin, hod, teacher, student_user, student2_user])
    db_session.commit()

    student = StudentProfile(user_id=student_user.id, usn="RPT001", name="Report Student", current_semester=1, current_section="A", status=StudentStatus.active)
    student2 = StudentProfile(user_id=student2_user.id, usn="RPT002", name="Report Student 2", current_semester=1, current_section="A", status=StudentStatus.active)
    db_session.add_all([student, student2])
    db_session.commit()

    session1 = ClassSession(teacher_id=teacher.id, department_id=dept.id, semester=1, section="A", date=datetime.now(timezone.utc).date(), status=SessionStatus.submitted)
    db_session.add(session1)
    db_session.commit()
    
    att1 = AttendanceRecord(session_id=session1.id, student_id=student.id, status=AttendanceStatus.present, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    att2 = AttendanceRecord(session_id=session1.id, student_id=student2.id, status=AttendanceStatus.absent, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    db_session.add_all([att1, att2])
    db_session.commit()

    # Add an unsubmitted active session
    active_session = ClassSession(teacher_id=teacher.id, department_id=dept.id, semester=1, section="A", date=datetime.now(timezone.utc).date(), status=SessionStatus.active)
    db_session.add(active_session)
    db_session.commit()
    att3 = AttendanceRecord(session_id=active_session.id, student_id=student.id, status=AttendanceStatus.present, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    db_session.add(att3)
    db_session.commit()

    # Add a historical session where student 1 was in dept2
    hist_session = ClassSession(teacher_id=teacher.id, department_id=dept2.id, semester=1, section="B", date=datetime.now(timezone.utc).date(), status=SessionStatus.submitted)
    db_session.add(hist_session)
    db_session.commit()
    att4 = AttendanceRecord(session_id=hist_session.id, student_id=student.id, status=AttendanceStatus.present, marking_method=MarkingMethod.manual, marked_at=datetime.now(timezone.utc))
    db_session.add(att4)
    db_session.commit()

    return {
        "admin_token": create_access_token(subject=admin.id, role=admin.role.value, department_id=admin.department_id),
        "hod_token": create_access_token(subject=hod.id, role=hod.role.value, department_id=hod.department_id),
        "teacher_token": create_access_token(subject=teacher.id, role=teacher.role.value, department_id=teacher.department_id),
        "student_token": create_access_token(subject=student_user.id, role=student_user.role.value, department_id=student_user.department_id),
        "student2_token": create_access_token(subject=student2_user.id, role=student2_user.role.value, department_id=student2_user.department_id),
        "student_id": student.id
    }

def test_student_report_csv(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['student_token']}"}
    response = client.get("/reports/student/csv", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/csv; charset=utf-8"
    assert "attachment" in response.headers["Content-Disposition"]
    
    # Parse CSV
    content = response.text
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    # Check that Percentage 100.0% is in there for student 1
    found_percentage = False
    for row in rows:
        if len(row) >= 2 and row[0] == "Percentage" and row[1] == "100.0%":
            found_percentage = True
    assert found_percentage, "Student 1 should have 100% attendance"

def test_student_report_pdf(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['student_token']}"}
    response = client.get("/reports/student/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "attachment" in response.headers["Content-Disposition"]
    
    # PDF starts with %PDF
    assert response.content.startswith(b"%PDF")

def test_teacher_report_csv(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['teacher_token']}"}
    response = client.get("/reports/teacher/csv", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/csv; charset=utf-8"
    
    content = response.text
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    found_student1 = False
    found_student2 = False
    for row in rows:
        if len(row) > 1 and "RPT001" in row:
            found_student1 = True
            assert row[-1] == "100.0%"
        if len(row) > 1 and "RPT002" in row:
            found_student2 = True
            assert row[-1] == "0.0%"
    assert found_student1 and found_student2

def test_teacher_report_pdf(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['teacher_token']}"}
    response = client.get("/reports/teacher/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")

def test_hod_report_csv(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['hod_token']}"}
    response = client.get("/reports/hod/csv", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/csv; charset=utf-8"
    
    content = response.text
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    assert len(rows) > 0

def test_admin_report_pdf(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['admin_token']}"}
    response = client.get("/reports/admin/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")

def test_unauthorized_cross_role(client: TestClient, report_data):
    # Student trying to get teacher report
    headers = {"Authorization": f"Bearer {report_data['student_token']}"}
    response = client.get("/reports/teacher/csv", headers=headers)
    assert response.status_code == 403

def test_date_filter_validation(client: TestClient, report_data):
    headers = {"Authorization": f"Bearer {report_data['teacher_token']}"}
    # from > to should 400
    response = client.get("/reports/teacher/csv?from_date=2026-10-01&to_date=2026-09-01", headers=headers)
    assert response.status_code == 400

def test_unsubmitted_session_exclusion(client: TestClient, report_data):
    # The teacher has 1 submitted session and 1 active session.
    # The report should only count the submitted session.
    headers = {"Authorization": f"Bearer {report_data['teacher_token']}"}
    response = client.get("/reports/teacher/csv", headers=headers)
    
    content = response.text
    # We expect Total Sessions: 2 (1 submitted from dept1 + 1 submitted from dept2 for that teacher)
    # The active session should be excluded.
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    total_sessions_row = next((row for row in rows if row and row[0] == "Total Sessions"), None)
    assert total_sessions_row is not None
    assert total_sessions_row[1] == "2", "Active sessions must be excluded"

def test_historical_transfer_preservation(client: TestClient, report_data):
    # Student 1 has a record in dept2 (historical) and dept1 (current)
    headers = {"Authorization": f"Bearer {report_data['student_token']}"}
    response = client.get("/reports/student/csv", headers=headers)
    
    content = response.text
    # Total Classes for student should be 2, 2 Present, 100%
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    total_classes = next((row for row in rows if row and row[0] == "Total Classes"), None)
    assert total_classes is not None
    assert total_classes[1] == "2"

def test_read_only_behavior(client: TestClient, report_data, db_session: Session):
    # Count records before
    sessions_before = db_session.query(ClassSession).count()
    records_before = db_session.query(AttendanceRecord).count()
    
    # Generate reports
    headers = {"Authorization": f"Bearer {report_data['student_token']}"}
    client.get("/reports/student/csv", headers=headers)
    client.get("/reports/student/pdf", headers=headers)
    
    headers_teacher = {"Authorization": f"Bearer {report_data['teacher_token']}"}
    client.get("/reports/teacher/csv", headers=headers_teacher)
    
    # Count records after
    sessions_after = db_session.query(ClassSession).count()
    records_after = db_session.query(AttendanceRecord).count()
    
    assert sessions_before == sessions_after
    assert records_before == records_after

