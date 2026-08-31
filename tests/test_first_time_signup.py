import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User, UserRole
from app.models.department import Department
from app.core.database import get_db
from app.core.security import get_password_hash
from sqlalchemy.orm import Session
from sqlalchemy.orm import Session

@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session
        
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
@pytest.fixture
def signup_test_data(db_session):
    # Create department
    dept = Department(name="Test Dept Signup", code="TDS1")
    db_session.add(dept)
    db_session.commit()

    # Create provisioned student
    student = User(
        email="student_signup@test.edu",
        password_hash=get_password_hash("Initial123!"),
        role=UserRole.student,
        department_id=dept.id,
        must_change_password=True,
        is_active=True
    )
    db_session.add(student)

    # Create provisioned teacher
    teacher = User(
        email="teacher_signup@test.edu",
        password_hash=get_password_hash("Initial123!"),
        role=UserRole.teacher,
        department_id=dept.id,
        must_change_password=True,
        is_active=True
    )
    db_session.add(teacher)

    # Create already registered student
    registered = User(
        email="registered_signup@test.edu",
        password_hash=get_password_hash("Permanent123!"),
        role=UserRole.student,
        department_id=dept.id,
        must_change_password=False,
        is_active=True
    )
    db_session.add(registered)
    
    # Create inactive user
    inactive = User(
        email="inactive_signup@test.edu",
        password_hash=get_password_hash("Initial123!"),
        role=UserRole.student,
        department_id=dept.id,
        must_change_password=True,
        is_active=False
    )
    db_session.add(inactive)

    db_session.commit()
    
    return {
        "dept_id": dept.id,
        "student_id": student.id,
        "teacher_id": teacher.id,
        "registered_id": registered.id,
        "inactive_id": inactive.id
    }

def test_provisioned_student_can_signup(client, signup_test_data, db_session):
    response = client.post("/auth/first-time-signup", json={
        "login_id": "student_signup@test.edu",
        "initial_password": "Initial123!",
        "new_password": "NewPermanent123!"
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Account registered successfully."
    
    # Verify DB update
    user = db_session.query(User).filter(User.email == "student_signup@test.edu").first()
    assert user.must_change_password is False
    assert user.role == UserRole.student
    assert user.department_id == signup_test_data["dept_id"]

def test_provisioned_teacher_can_signup(client, signup_test_data, db_session):
    response = client.post("/auth/first-time-signup", json={
        "login_id": "teacher_signup@test.edu",
        "initial_password": "Initial123!",
        "new_password": "NewPermanent123!"
    })
    assert response.status_code == 200

def test_correct_initial_credentials_required(client, signup_test_data):
    response = client.post("/auth/first-time-signup", json={
        "login_id": "student_signup@test.edu",
        "initial_password": "WrongPassword123!",
        "new_password": "NewPermanent123!"
    })
    assert response.status_code == 401

def test_nonexistent_account_cannot_signup(client):
    response = client.post("/auth/first-time-signup", json={
        "login_id": "does_not_exist@test.edu",
        "initial_password": "Initial123!",
        "new_password": "NewPermanent123!"
    })
    assert response.status_code == 401

def test_inactive_account_cannot_signup(client, signup_test_data):
    response = client.post("/auth/first-time-signup", json={
        "login_id": "inactive_signup@test.edu",
        "initial_password": "Initial123!",
        "new_password": "NewPermanent123!"
    })
    assert response.status_code == 400
    assert "Inactive" in response.json()["detail"]

def test_already_registered_account_cannot_signup_again(client, signup_test_data):
    response = client.post("/auth/first-time-signup", json={
        "login_id": "registered_signup@test.edu",
        "initial_password": "Permanent123!",
        "new_password": "NewPermanent123!"
    })
    assert response.status_code == 400
    assert "Account already registered" in response.json()["detail"]

def test_login_works_after_signup(client, signup_test_data):
    # First signup
    client.post("/auth/first-time-signup", json={
        "login_id": "student_signup@test.edu",
        "initial_password": "Initial123!",
        "new_password": "NewPermanent123!"
    })
    
    # Then login
    response = client.post("/auth/login", json={
        "login_id": "student_signup@test.edu",
        "password": "NewPermanent123!"
    })
    assert response.status_code == 200
    assert response.json()["requires_password_change"] is False
    assert "access_token" in response.json()
