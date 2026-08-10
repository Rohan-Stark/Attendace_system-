import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.department import Department
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
def setup_admin(db_session: Session):
    admin = User(email="admin2@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.primary_admin, must_change_password=False, is_active=True)
    db_session.add(admin)
    db_session.commit()
    token = create_access_token(subject=admin.id, role="primary_admin")
    return {"admin": admin, "token": token}

def test_admin_create_department(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    response = client.post("/admin/departments", json={"name": "Computer Science", "code": "CSE"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Computer Science"
    assert data["code"] == "CSE"
    assert "id" in data
    
    # Verify audit log
    audit = db_session.query(AuditLog).filter(AuditLog.action == "create_department").first()
    assert audit is not None
    assert audit.actor_user_id == setup_admin["admin"].id

def test_admin_duplicate_department(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    db_session.add(Department(name="Existing", code="EXT"))
    db_session.commit()
    
    response = client.post("/admin/departments", json={"name": "New Name", "code": "EXT"}, headers=headers)
    assert response.status_code == 409

def test_admin_create_hod(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    dept = Department(name="Electrical", code="EEE")
    db_session.add(dept)
    db_session.commit()
    
    response = client.post("/admin/hods", json={"email": "hod.eee@test.com", "name": "Dr. Smith", "department_id": dept.id}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "hod" in data
    assert "temporary_password" in data
    
    hod_data = data["hod"]
    assert hod_data["email"] == "hod.eee@test.com"
    assert hod_data["department_id"] == dept.id
    
    # Verify user was created properly
    user = db_session.query(User).filter(User.id == hod_data["id"]).first()
    assert user.role == UserRole.hod
    assert user.must_change_password is True
    
    # Temporary password works
    login_res = client.post("/auth/login", json={"login_id": "hod.eee@test.com", "password": data["temporary_password"]})
    assert login_res.status_code == 200
    assert login_res.json()["requires_password_change"] is True

def test_admin_deactivate_hod(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    dept = Department(name="Civil", code="CV")
    hod = User(email="hod.cv@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, is_active=True, must_change_password=False)
    db_session.add_all([dept, hod])
    db_session.commit()
    hod.department_id = dept.id
    db_session.commit()
    
    response = client.post(f"/admin/hods/{hod.id}/deactivate", headers=headers)
    assert response.status_code == 200
    
    db_session.refresh(hod)
    assert hod.is_active is False
    
    # Verify audit
    audit = db_session.query(AuditLog).filter(AuditLog.action == "deactivate_hod").first()
    assert audit is not None
    
    # Verify login blocked
    login_res = client.post("/auth/login", json={"login_id": "hod.cv@test.com", "password": "Pass123!"})
    assert login_res.status_code == 400
    assert "Inactive user" in login_res.json()["detail"]

def test_non_admin_blocked(client, db_session):
    student = User(email="USN999", password_hash=get_password_hash("Pass123!"), role=UserRole.student, is_active=True, must_change_password=False)
    db_session.add(student)
    db_session.commit()
    token = create_access_token(subject=student.id, role="student")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/admin/departments", headers=headers)
    assert response.status_code == 403
