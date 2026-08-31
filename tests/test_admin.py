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

def test_admin_activate_hod(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    dept = Department(name="Physics", code="PHY")
    hod = User(email="hod.phy@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, is_active=False, must_change_password=False)
    db_session.add_all([dept, hod])
    db_session.commit()
    hod.department_id = dept.id
    db_session.commit()
    
    response = client.post(f"/admin/hods/{hod.id}/activate", headers=headers)
    assert response.status_code == 200
    
    db_session.refresh(hod)
    assert hod.is_active is True
    
    # Verify audit
    audit = db_session.query(AuditLog).filter(AuditLog.action == "activate_hod").first()
    assert audit is not None
    
    # Verify login works again
    login_res = client.post("/auth/login", json={"login_id": "hod.phy@test.com", "password": "Pass123!"})
    assert login_res.status_code == 200

def test_non_admin_blocked(client, db_session):
    student = User(email="USN999", password_hash=get_password_hash("Pass123!"), role=UserRole.student, is_active=True, must_change_password=False)
    db_session.add(student)
    db_session.commit()
    token = create_access_token(subject=student.id, role="student")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/admin/departments", headers=headers)
    assert response.status_code == 403
    
    response = client.post("/admin/hods/999/activate", headers=headers)
    assert response.status_code == 403

    response = client.post("/admin/hods/999/deactivate", headers=headers)
    assert response.status_code == 403

def test_admin_hod_name_persistence(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    dept = Department(name="Mechanical", code="ME")
    db_session.add(dept)
    db_session.commit()
    
    # 1. Create HOD with name "LK Sudha"
    create_res = client.post(
        "/admin/hods", 
        json={"email": "hod.me@test.com", "name": "LK Sudha", "department_id": dept.id}, 
        headers=headers
    )
    assert create_res.status_code == 200
    hod_id = create_res.json()["hod"]["id"]
    
    # 2. Database persists "LK Sudha"
    db_session.expire_all()
    hod_user = db_session.query(User).filter(User.id == hod_id).first()
    assert hod_user.full_name == "LK Sudha"
    
    # 3. GET /admin/hods returns "LK Sudha"
    list_res = client.get("/admin/hods", headers=headers)
    assert list_res.status_code == 200
    hods = list_res.json()
    created_hod = next((h for h in hods if h["id"] == hod_id), None)
    assert created_hod is not None
    assert created_hod["name"] == "LK Sudha"
    
    # 4. GET /admin/hods/{id} returns "LK Sudha"
    get_res = client.get(f"/admin/hods/{hod_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "LK Sudha"
    
    # 5. PATCH HOD name works
    patch_res = client.patch(
        f"/admin/hods/{hod_id}",
        json={"name": "LK Sudha Updated"},
        headers=headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "LK Sudha Updated"
    
    # Verify in DB again
    db_session.expire_all()
    hod_user = db_session.query(User).filter(User.id == hod_id).first()
    assert hod_user.full_name == "LK Sudha Updated"

def test_admin_remove_hod(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    
    # 1. Setup Department, HOD, Teacher, Student, Attendance
    dept = Department(name="Aero", code="AE")
    db_session.add(dept)
    db_session.commit()
    
    hod = User(email="hod.ae@test.com", full_name="Aero HOD", password_hash=get_password_hash("Pass123!"), role=UserRole.hod, department_id=dept.id, is_active=True, must_change_password=False)
    teacher = User(email="t1.ae@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.teacher, department_id=dept.id, is_active=True, must_change_password=False)
    student = User(email="s1.ae@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.student, department_id=dept.id, is_active=True, must_change_password=False)
    
    db_session.add_all([hod, teacher, student])
    db_session.commit()
    
    # Audit log from HOD
    audit = AuditLog(actor_user_id=hod.id, action="test_action", entity_type="test", entity_id="1")
    db_session.add(audit)
    db_session.commit()
    
    hod_id = hod.id
    dept_id = dept.id
    teacher_id = teacher.id
    student_id = student.id
    audit_id = audit.id
    
    # Attempt to remove teacher via HOD endpoint
    res_teacher = client.delete(f"/admin/hods/{teacher_id}", headers=headers)
    assert res_teacher.status_code == 404
    
    # Attempt to remove student via HOD endpoint
    res_student = client.delete(f"/admin/hods/{student_id}", headers=headers)
    assert res_student.status_code == 404
    
    # Remove actual HOD
    res_remove = client.delete(f"/admin/hods/{hod_id}", headers=headers)
    assert res_remove.status_code == 200
    
    # HOD no longer exists
    db_session.expire_all()
    assert db_session.query(User).filter(User.id == hod_id).first() is None
    
    # GET /admin/hods no longer contains HOD
    res_list = client.get("/admin/hods", headers=headers)
    assert not any(h["id"] == hod_id for h in res_list.json())
    
    # Login fails
    login_res = client.post("/auth/login", json={"login_id": "hod.ae@test.com", "password": "Pass123!"})
    assert login_res.status_code in [401, 400, 404]
    
    # Department exists
    assert db_session.query(Department).filter(Department.id == dept_id).first() is not None
    
    # Teacher and student exist
    assert db_session.query(User).filter(User.id == teacher_id).first() is not None
    assert db_session.query(User).filter(User.id == student_id).first() is not None
    
    # Audit log exists but actor_user_id is NULL
    audit_db = db_session.query(AuditLog).filter(AuditLog.id == audit_id).first()
    assert audit_db is not None
    assert audit_db.actor_user_id is None

def test_non_admin_remove_hod(client, db_session):
    teacher = User(email="t2@test.com", password_hash=get_password_hash("Pass123!"), role=UserRole.teacher, is_active=True, must_change_password=False)
    db_session.add(teacher)
    db_session.commit()
    token = create_access_token(subject=teacher.id, role="teacher")
    
    res = client.delete("/admin/hods/999", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403

def test_remove_nonexistent_hod(client, setup_admin):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    res = client.delete("/admin/hods/999999", headers=headers)
    assert res.status_code == 404

def test_admin_update_hod_email(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    dept = Department(name="Email Dept", code="EM")
    db_session.add(dept)
    db_session.commit()
    
    hod1 = User(email="hod1@test.com", password_hash="hash", role=UserRole.hod, department_id=dept.id, is_active=True, must_change_password=False)
    hod2 = User(email="hod2@test.com", password_hash="hash", role=UserRole.hod, department_id=dept.id, is_active=True, must_change_password=False)
    db_session.add_all([hod1, hod2])
    db_session.commit()
    
    hod1_id = hod1.id
    
    # Update email successfully
    res = client.patch(f"/admin/hods/{hod1_id}", json={"email": "hod1_new@test.com"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "hod1_new@test.com"
    
    db_session.expire_all()
    updated_hod = db_session.query(User).filter(User.id == hod1_id).first()
    assert updated_hod.email == "hod1_new@test.com"
    
    # Update email to duplicate fails
    res_dup = client.patch(f"/admin/hods/{hod1_id}", json={"email": "hod2@test.com"}, headers=headers)
    assert res_dup.status_code == 409

def test_admin_reset_hod_password(client, setup_admin, db_session):
    headers = {"Authorization": f"Bearer {setup_admin['token']}"}
    dept = Department(name="Reset Dept", code="RD")
    db_session.add(dept)
    db_session.commit()
    
    hod = User(email="reset@test.com", password_hash=get_password_hash("OldPassword123!"), role=UserRole.hod, department_id=dept.id, is_active=True, must_change_password=False)
    db_session.add(hod)
    db_session.commit()
    
    hod_id = hod.id
    
    res = client.post(f"/admin/hods/{hod_id}/reset-password", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "temporary_password" in data
    temp_pwd = data["temporary_password"]
    
    db_session.expire_all()
    updated_hod = db_session.query(User).filter(User.id == hod_id).first()
    assert updated_hod.must_change_password is True
    
    # Old password fails
    login_old = client.post("/auth/login", json={"login_id": "reset@test.com", "password": "OldPassword123!"})
    assert login_old.status_code == 401
    
    # New temp password works and requires password change
    login_new = client.post("/auth/login", json={"login_id": "reset@test.com", "password": temp_pwd})
    assert login_new.status_code == 200
    assert login_new.json()["requires_password_change"] is True
