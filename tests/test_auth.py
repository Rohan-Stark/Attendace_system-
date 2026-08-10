import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.password_reset import PasswordResetToken
from app.core.security import get_password_hash, create_access_token

@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session
        
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def setup_users(db_session: Session):
    dept1 = Department(name="D1", code="C1")
    dept2 = Department(name="D2", code="C2")
    db_session.add_all([dept1, dept2])
    db_session.commit()
    
    admin = User(email="admin@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.primary_admin, must_change_password=False, is_active=True)
    hod1 = User(email="hod1@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept1.id, must_change_password=False, is_active=True)
    student1 = User(email="USN123", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept1.id, must_change_password=True, is_active=True)
    inactive_student = User(email="USN456", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept1.id, must_change_password=False, is_active=False)
    
    db_session.add_all([admin, hod1, student1, inactive_student])
    db_session.commit()
    
    return {
        "dept1": dept1,
        "dept2": dept2,
        "admin": admin,
        "hod1": hod1,
        "student1": student1,
        "inactive": inactive_student
    }

def test_login_success(client, setup_users):
    response = client.post("/auth/login", json={"login_id": "admin@test.com", "password": "Pass123!"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "primary_admin"
    assert data["requires_password_change"] is False

def test_login_student_usn(client, setup_users):
    response = client.post("/auth/login", json={"login_id": "USN123", "password": "Pass123!"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "student"
    assert data["requires_password_change"] is True

def test_login_invalid_password(client, setup_users):
    response = client.post("/auth/login", json={"login_id": "admin@test.com", "password": "wrong"})
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_login_inactive_user(client, setup_users):
    response = client.post("/auth/login", json={"login_id": "USN456", "password": "Pass123!"})
    assert response.status_code == 400
    assert "Inactive user" in response.json()["detail"]

def test_get_me_success(client, setup_users):
    token = create_access_token(subject=setup_users["admin"].id, role="primary_admin")
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "admin@test.com"

def test_auth_required(client):
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_invalid_token(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401

def test_change_password(client, setup_users):
    token = create_access_token(subject=setup_users["student1"].id, role="student")
    
    # Needs change password initially
    response = client.post("/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": "Pass123!",
        "new_password": "NewStrongPass1!"
    })
    assert response.status_code == 200
    
    # Check if must_change_password is False
    res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.json()["must_change_password"] is False
    
    # Old password shouldn't work
    res_login = client.post("/auth/login", json={"login_id": "USN123", "password": "Pass123!"})
    assert res_login.status_code == 401

def test_forgot_password(client, setup_users, db_session):
    response = client.post("/auth/forgot-password", json={"login_id": "admin@test.com"})
    assert response.status_code == 200
    assert "If the account exists" in response.json()["message"]
    
    tokens = db_session.query(PasswordResetToken).all()
    assert len(tokens) == 1

def test_forgot_password_nonexistent(client, db_session):
    response = client.post("/auth/forgot-password", json={"login_id": "nobody@test.com"})
    assert response.status_code == 200 # Should not reveal existence
    assert "If the account exists" in response.json()["message"]
    
    tokens = db_session.query(PasswordResetToken).all()
    assert len(tokens) == 0

def test_forgot_password_no_plaintext_leak(client, setup_users, capsys):
    # Call forgot password
    response = client.post("/auth/forgot-password", json={"login_id": "admin@test.com"})
    
    # 1. Verify token is NOT in the HTTP response
    response_text = response.text
    assert "token" not in response_text.lower()
    
    # 2. Verify token is NOT printed to standard output / logs
    captured = capsys.readouterr()
    assert "RESET TOKEN" not in captured.out
    assert "RESET TOKEN" not in captured.err

    # We can test it by generating a token manually in the test.
def test_reset_password_flow(client, setup_users, db_session):
    from app.core.security import generate_reset_token
    token, token_hash = generate_reset_token()
    
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    reset_record = PasswordResetToken(user_id=setup_users["admin"].id, token_hash=token_hash, expires_at=expires_at)
    db_session.add(reset_record)
    db_session.commit()
    
    response = client.post("/auth/reset-password", json={
        "token": token,
        "new_password": "NewAdminPass123!"
    })
    assert response.status_code == 200
    
    # Token should be marked used
    db_session.refresh(reset_record)
    assert reset_record.used_at is not None
    
    # Login with new password
    res_login = client.post("/auth/login", json={"login_id": "admin@test.com", "password": "NewAdminPass123!"})
    assert res_login.status_code == 200

def test_reset_password_invalid_token(client):
    response = client.post("/auth/reset-password", json={
        "token": "invalid_random_token",
        "new_password": "NewAdminPass123!"
    })
    assert response.status_code == 400

# Testing role and department auth via mock endpoints
def test_role_authorization(client, setup_users):
    from fastapi import Depends
    from app.core.deps import require_role
    
    @app.get("/test/admin-only")
    def admin_only(user=Depends(require_role("primary_admin"))):
        return {"ok": True}
        
    admin_token = create_access_token(subject=setup_users["admin"].id, role="primary_admin")
    student_token = create_access_token(subject=setup_users["student1"].id, role="student")
    
    res_admin = client.get("/test/admin-only", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    
    res_student = client.get("/test/admin-only", headers={"Authorization": f"Bearer {student_token}"})
    assert res_student.status_code == 403

def test_department_authorization(client, setup_users, db_session):
    from fastapi import Depends
    from app.core.deps import require_department_access
    
    dept1_id = setup_users["dept1"].id
    dept2_id = setup_users["dept2"].id
    
    @app.get("/test/dept1-only")
    def dept1_only(user=Depends(require_department_access(dept1_id))):
        return {"ok": True}
        
    admin_token = create_access_token(subject=setup_users["admin"].id, role="primary_admin")
    hod1_token = create_access_token(subject=setup_users["hod1"].id, role="hod", department_id=dept1_id)
    
    res_admin = client.get("/test/dept1-only", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200 # Admin bypasses
    
    res_hod1 = client.get("/test/dept1-only", headers={"Authorization": f"Bearer {hod1_token}"})
    assert res_hod1.status_code == 200 # Matches dept1
    
    hod2 = User(email="hod2@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept2_id, is_active=True, must_change_password=False)
    db_session.add(hod2)
    db_session.commit()
    
    hod2_token = create_access_token(subject=hod2.id, role="hod", department_id=dept2_id)
    res_hod2 = client.get("/test/dept1-only", headers={"Authorization": f"Bearer {hod2_token}"})
    assert res_hod2.status_code == 403 # Rejected
