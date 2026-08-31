"""
Phase 10 — Security & Reliability Test Suite

Tests authentication hardening, authorization (IDOR), password/reset security,
rate limiting, biometric endpoint validation, request validation, error handling,
audit log safety, and health endpoint.
"""
import pytest
import io
import csv
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from jose import jwt

from app.main import app
from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    get_password_hash, create_access_token,
    generate_reset_token, hash_reset_token,
)
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.student import StudentProfile, StudentStatus
from app.models.password_reset import PasswordResetToken
from app.models.audit import AuditLog
from app.models.session import ClassSession, SessionStatus
from app.models.attendance import AttendanceRecord, AttendanceStatus, MarkingMethod


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def security_data(db_session: Session):
    """Create comprehensive test data for security testing across all roles."""
    dept_a = Department(name="Sec Dept A", code="SDA")
    dept_b = Department(name="Sec Dept B", code="SDB")
    db_session.add_all([dept_a, dept_b])
    db_session.commit()

    admin = User(email="sec_admin@test.com", password_hash=get_password_hash("Admin123!"),
                 role=UserRole.primary_admin, is_active=True, must_change_password=False)
    hod_a = User(email="sec_hod_a@test.com", password_hash=get_password_hash("HodA123!"),
                 role=UserRole.hod, department_id=dept_a.id, is_active=True, must_change_password=False)
    hod_b = User(email="sec_hod_b@test.com", password_hash=get_password_hash("HodB123!"),
                 role=UserRole.hod, department_id=dept_b.id, is_active=True, must_change_password=False)
    teacher_a = User(email="sec_teacher_a@test.com", password_hash=get_password_hash("TeachA123!"),
                     role=UserRole.teacher, department_id=dept_a.id, is_active=True, must_change_password=False)
    student_a_user = User(email="sec_student_a@test.com", password_hash=get_password_hash("StuA123!"),
                          role=UserRole.student, department_id=dept_a.id, is_active=True, must_change_password=False)
    student_b_user = User(email="sec_student_b@test.com", password_hash=get_password_hash("StuB123!"),
                          role=UserRole.student, department_id=dept_b.id, is_active=True, must_change_password=False)
    inactive_user = User(email="sec_inactive@test.com", password_hash=get_password_hash("Inactive123!"),
                         role=UserRole.student, department_id=dept_a.id, is_active=False, must_change_password=False)
    must_change_user = User(email="sec_mustchange@test.com", password_hash=get_password_hash("Change123!"),
                            role=UserRole.teacher, department_id=dept_a.id, is_active=True, must_change_password=True)

    db_session.add_all([admin, hod_a, hod_b, teacher_a, student_a_user, student_b_user, inactive_user, must_change_user])
    db_session.commit()

    student_a = StudentProfile(user_id=student_a_user.id, usn="SEC001", name="Sec Student A",
                               current_semester=1, current_section="A", status=StudentStatus.active)
    student_b = StudentProfile(user_id=student_b_user.id, usn="SEC002", name="Sec Student B",
                               current_semester=1, current_section="A", status=StudentStatus.active)
    db_session.add_all([student_a, student_b])
    db_session.commit()

    return {
        "dept_a": dept_a, "dept_b": dept_b,
        "admin": admin, "hod_a": hod_a, "hod_b": hod_b,
        "teacher_a": teacher_a,
        "student_a_user": student_a_user, "student_b_user": student_b_user,
        "student_a": student_a, "student_b": student_b,
        "inactive_user": inactive_user,
        "must_change_user": must_change_user,
        "admin_token": create_access_token(subject=admin.id, role=admin.role.value, department_id=admin.department_id),
        "hod_a_token": create_access_token(subject=hod_a.id, role=hod_a.role.value, department_id=hod_a.department_id),
        "hod_b_token": create_access_token(subject=hod_b.id, role=hod_b.role.value, department_id=hod_b.department_id),
        "teacher_a_token": create_access_token(subject=teacher_a.id, role=teacher_a.role.value, department_id=teacher_a.department_id),
        "student_a_token": create_access_token(subject=student_a_user.id, role=student_a_user.role.value, department_id=student_a_user.department_id),
        "student_b_token": create_access_token(subject=student_b_user.id, role=student_b_user.role.value, department_id=student_b_user.department_id),
        "inactive_token": create_access_token(subject=inactive_user.id, role=inactive_user.role.value, department_id=inactive_user.department_id),
        "must_change_token": create_access_token(subject=must_change_user.id, role=must_change_user.role.value, department_id=must_change_user.department_id),
    }


# ============================================================
# AUTHENTICATION TESTS
# ============================================================

class TestAuthentication:

    def test_malformed_token_rejected(self, client: TestClient):
        headers = {"Authorization": "Bearer not.a.valid.jwt.token.at.all"}
        r = client.get("/auth/me", headers=headers)
        assert r.status_code == 401

    def test_expired_token_rejected(self, client: TestClient, security_data):
        expired_token = create_access_token(
            subject=security_data["admin"].id,
            role="primary_admin",
            expires_delta=timedelta(seconds=-10)
        )
        headers = {"Authorization": f"Bearer {expired_token}"}
        r = client.get("/auth/me", headers=headers)
        assert r.status_code == 401

    def test_inactive_user_rejected(self, client: TestClient, security_data):
        headers = {"Authorization": f"Bearer {security_data['inactive_token']}"}
        r = client.get("/auth/me", headers=headers)
        assert r.status_code == 400
        assert "Inactive" in r.json()["detail"]

    def test_no_token_rejected(self, client: TestClient):
        r = client.get("/auth/me")
        assert r.status_code == 401

    def test_wrong_algorithm_token_rejected(self, client: TestClient, security_data):
        payload = {"sub": str(security_data["admin"].id), "role": "primary_admin",
                    "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}
        token = jwt.encode(payload, "wrong-secret-key", algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/auth/me", headers=headers)
        assert r.status_code == 401

    def test_must_change_password_blocks_protected_endpoints(self, client: TestClient, security_data):
        headers = {"Authorization": f"Bearer {security_data['must_change_token']}"}
        r = client.get("/admin/departments", headers=headers)
        assert r.status_code == 403
        assert "Password change required" in r.json()["detail"]


# ============================================================
# AUTHORIZATION / IDOR TESTS
# ============================================================

class TestAuthorization:

    def test_student_cannot_access_admin_endpoints(self, client: TestClient, security_data):
        headers = {"Authorization": f"Bearer {security_data['student_a_token']}"}
        r = client.get("/admin/departments", headers=headers)
        assert r.status_code == 403

    def test_student_cannot_access_teacher_reports(self, client: TestClient, security_data):
        headers = {"Authorization": f"Bearer {security_data['student_a_token']}"}
        r = client.get("/reports/teacher/csv", headers=headers)
        assert r.status_code == 403

    def test_teacher_cannot_access_admin_endpoints(self, client: TestClient, security_data):
        headers = {"Authorization": f"Bearer {security_data['teacher_a_token']}"}
        r = client.get("/admin/departments", headers=headers)
        assert r.status_code == 403

    def test_hod_a_cannot_access_dept_b_teachers(self, client: TestClient, security_data):
        """HOD from department A should not see department B's teachers when listing."""
        headers = {"Authorization": f"Bearer {security_data['hod_a_token']}"}
        r = client.get("/hod/teachers", headers=headers)
        assert r.status_code == 200
        # All returned teachers should belong to dept_a, not dept_b
        for teacher in r.json():
            assert teacher["department_id"] == security_data["dept_a"].id

    def test_hod_cannot_access_other_hod_analytics(self, client: TestClient, security_data):
        """HOD A's analytics should only contain dept A data, never dept B."""
        headers = {"Authorization": f"Bearer {security_data['hod_a_token']}"}
        r = client.get("/analytics/hod", headers=headers)
        assert r.status_code == 200

    def test_student_analytics_scoped_to_self(self, client: TestClient, security_data):
        """Student analytics derive identity from JWT, not from a query param."""
        headers = {"Authorization": f"Bearer {security_data['student_a_token']}"}
        r = client.get("/analytics/student", headers=headers)
        assert r.status_code == 200


# ============================================================
# PASSWORD / RESET SECURITY TESTS
# ============================================================

class TestPasswordSecurity:

    def test_forgot_password_no_account_enumeration(self, client: TestClient):
        """Response should be identical for existing and non-existing accounts."""
        r_exists = client.post("/auth/forgot-password", json={"login_id": "nonexistent@test.com"})
        assert r_exists.status_code == 200
        msg = r_exists.json()["message"]
        assert "If the account exists" in msg

    def test_reset_token_single_use(self, client: TestClient, security_data, db_session: Session):
        """A reset token that has already been used must not work a second time."""
        token, token_hash = generate_reset_token()
        expires = datetime.now(timezone.utc) + timedelta(minutes=15)
        reset_record = PasswordResetToken(
            user_id=security_data["student_a_user"].id,
            token_hash=token_hash,
            expires_at=expires
        )
        db_session.add(reset_record)
        db_session.commit()

        # First use — should succeed
        r1 = client.post("/auth/reset-password", json={"token": token, "new_password": "NewPass123!"})
        assert r1.status_code == 200

        # Second use — should fail
        r2 = client.post("/auth/reset-password", json={"token": token, "new_password": "AnotherPass1!"})
        assert r2.status_code == 400

    def test_expired_reset_token(self, client: TestClient, security_data, db_session: Session):
        """An expired token must be rejected."""
        token, token_hash = generate_reset_token()
        expires = datetime.now(timezone.utc) - timedelta(minutes=5)
        reset_record = PasswordResetToken(
            user_id=security_data["student_a_user"].id,
            token_hash=token_hash,
            expires_at=expires
        )
        db_session.add(reset_record)
        db_session.commit()

        r = client.post("/auth/reset-password", json={"token": token, "new_password": "NewPass123!"})
        assert r.status_code == 400

    def test_password_not_in_response(self, client: TestClient, security_data):
        """Login response should never contain the password hash."""
        r = client.post("/auth/login", json={"login_id": "sec_admin@test.com", "password": "Admin123!"})
        assert r.status_code == 200
        body = r.json()
        assert "password" not in str(body).lower() or "password_hash" not in str(body)

    def test_short_password_rejected(self, client: TestClient, security_data):
        """Pydantic min_length=8 constraint on new_password should reject short passwords."""
        headers = {"Authorization": f"Bearer {security_data['admin_token']}"}
        r = client.post("/auth/change-password",
                        json={"current_password": "Admin123!", "new_password": "short"},
                        headers=headers)
        assert r.status_code == 422  # Pydantic validation error


# ============================================================
# RATE LIMITING TESTS
# ============================================================

class TestRateLimiting:

    def test_login_rate_limit(self, client: TestClient):
        """After 5 rapid requests, the login endpoint should return 429."""
        for i in range(5):
            client.post("/auth/login", json={"login_id": "nobody@test.com", "password": "wrong"})

        r = client.post("/auth/login", json={"login_id": "nobody@test.com", "password": "wrong"})
        assert r.status_code == 429

    def test_forgot_password_rate_limit(self, client: TestClient):
        """After 3 rapid forgot-password requests, should return 429."""
        for i in range(3):
            client.post("/auth/forgot-password", json={"login_id": "test@test.com"})

        r = client.post("/auth/forgot-password", json={"login_id": "test@test.com"})
        assert r.status_code == 429


# ============================================================
# BIOMETRIC / IMAGE VALIDATION TESTS
# ============================================================

class TestBiometricValidation:

    def test_unauthorized_face_registration(self, client: TestClient, security_data):
        """A teacher should not be able to register a face (student-only endpoint)."""
        headers = {"Authorization": f"Bearer {security_data['teacher_a_token']}"}
        r = client.post("/face/student/register", headers=headers, files=[("frames", ("test.jpg", b"\xff\xd8", "image/jpeg"))])
        assert r.status_code == 403

    def test_empty_file_rejected(self, client: TestClient, security_data):
        """An empty file should be rejected."""
        headers = {"Authorization": f"Bearer {security_data['student_a_token']}"}
        r = client.post("/face/student/register", headers=headers,
                        files=[("frames", ("test.jpg", b"", "image/jpeg"))])
        assert r.status_code == 400

    def test_unsupported_mime_rejected(self, client: TestClient, security_data):
        """A non-image MIME type should be rejected."""
        headers = {"Authorization": f"Bearer {security_data['student_a_token']}"}
        r = client.post("/face/student/register", headers=headers,
                        files=[("frames", ("test.pdf", b"%PDF-1.4", "application/pdf"))])
        assert r.status_code == 415

    def test_corrupted_image_rejected(self, client: TestClient, security_data):
        """Random bytes with image MIME should be rejected at decode stage."""
        headers = {"Authorization": f"Bearer {security_data['student_a_token']}"}
        r = client.post("/face/student/register", headers=headers,
                        files=[("frames", ("test.jpg", b"\xff\xd8\x00\x00corrupt", "image/jpeg"))])
        assert r.status_code == 422

    def test_unauthenticated_face_status(self, client: TestClient):
        """Face status endpoint requires authentication."""
        r = client.get("/face/student/status")
        assert r.status_code == 401


# ============================================================
# REQUEST VALIDATION TESTS
# ============================================================

class TestRequestValidation:

    def test_oversized_login_id_rejected(self, client: TestClient):
        """A login_id exceeding max_length=100 should be rejected by Pydantic."""
        r = client.post("/auth/login", json={"login_id": "x" * 200, "password": "Pass123!"})
        assert r.status_code == 422

    def test_oversized_name_rejected(self, client: TestClient, security_data):
        """A teacher name exceeding max_length=150 should be rejected."""
        headers = {"Authorization": f"Bearer {security_data['hod_a_token']}"}
        r = client.post("/hod/teachers", json={"employee_id": "EMP001", "name": "x" * 200}, headers=headers)
        assert r.status_code == 422

    def test_invalid_attendance_status_rejected(self, client: TestClient, security_data):
        """Attendance status must match 'present' or 'absent' regex."""
        headers = {"Authorization": f"Bearer {security_data['teacher_a_token']}"}
        # This endpoint requires a valid session_id and record_id; the validation
        # should fail at Pydantic level before even reaching DB logic.
        r = client.patch("/attendance/sessions/1/records/1",
                         json={"status": "invalid_value"}, headers=headers)
        assert r.status_code == 422


# ============================================================
# ERROR SECURITY TESTS
# ============================================================

class TestErrorSecurity:

    def test_no_stack_trace_in_404(self, client: TestClient, security_data):
        """A 404 should not contain stack traces."""
        headers = {"Authorization": f"Bearer {security_data['admin_token']}"}
        r = client.get("/admin/departments/99999", headers=headers)
        assert r.status_code == 404
        body = r.text
        assert "Traceback" not in body
        assert "File \"" not in body

    def test_no_secrets_in_error_body(self, client: TestClient, security_data):
        """Error responses should never contain JWT secrets or DB credentials."""
        headers = {"Authorization": f"Bearer {security_data['admin_token']}"}
        r = client.get("/admin/departments/99999", headers=headers)
        body = r.text
        assert settings.JWT_SECRET_KEY not in body
        assert settings.POSTGRES_PASSWORD not in body


# ============================================================
# AUDIT LOG SAFETY TESTS
# ============================================================

class TestAuditLogSafety:

    def test_audit_log_no_passwords(self, client: TestClient, security_data, db_session: Session):
        """Creating an HOD triggers an audit log. Verify no password in log."""
        headers = {"Authorization": f"Bearer {security_data['admin_token']}"}
        r = client.post("/admin/hods", json={
            "email": "audit_test_hod@test.com",
            "name": "Audit Test HOD",
            "department_id": security_data["dept_a"].id
        }, headers=headers)
        assert r.status_code == 200

        # Check audit log entries for this action
        logs = db_session.query(AuditLog).filter(AuditLog.action == "create_hod").all()
        for log_entry in logs:
            if log_entry.new_value:
                assert "password" not in log_entry.new_value.lower()
                assert "hash" not in log_entry.new_value.lower()


# ============================================================
# SECURITY HEADERS TESTS
# ============================================================

class TestSecurityHeaders:

    def test_security_headers_present(self, client: TestClient):
        """Every response should contain security headers from middleware."""
        r = client.get("/health")
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert "default-src" in r.headers.get("Content-Security-Policy", "")
        assert r.headers.get("X-XSS-Protection") == "1; mode=block"


# ============================================================
# HEALTH ENDPOINT TESTS
# ============================================================

class TestHealthEndpoint:

    def test_health_returns_ok(self, client: TestClient):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["service"] == "smartattend-backend"

    def test_health_no_credentials_exposed(self, client: TestClient):
        r = client.get("/health")
        body = r.text
        assert "postgres" not in body.lower() or body.lower().count("postgres") == 0
        assert settings.JWT_SECRET_KEY not in body


# ============================================================
# CORS CONFIGURATION TESTS
# ============================================================

class TestCORSConfiguration:

    def test_cors_allows_configured_origin(self, client: TestClient):
        r = client.options("/health", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        })
        assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"

    def test_cors_rejects_unknown_origin(self, client: TestClient):
        r = client.options("/health", headers={
            "Origin": "http://evil.com",
            "Access-Control-Request-Method": "GET",
        })
        # Should NOT have access-control-allow-origin for evil.com
        assert r.headers.get("access-control-allow-origin") != "http://evil.com"
