from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import require_role
from app.core.security import generate_temporary_password, get_password_hash
from app.models.user import User, UserRole
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.schemas.hod import HODCreate, HODUpdate, HODResponse, HODCreationResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/departments", response_model=DepartmentResponse)
def create_department(request: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    existing = db.query(Department).filter(Department.code == request.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department code already exists")
        
    department = Department(name=request.name, code=request.code)
    db.add(department)
    db.flush()
    
    log_audit(db, current_user.id, "create_department", "Department", department.id, new_value={"name": request.name, "code": request.code})
    db.commit()
    db.refresh(department)
    return department

@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    return db.query(Department).all()

@router.get("/departments/{department_id}", response_model=DepartmentResponse)
def get_department(department_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return department

@router.patch("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(department_id: int, request: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
    if request.code and request.code != department.code:
        existing = db.query(Department).filter(Department.code == request.code).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department code already exists")
            
    old_data = {"name": department.name, "code": department.code}
    
    if request.name is not None:
        department.name = request.name
    if request.code is not None:
        department.code = request.code
        
    new_data = {"name": department.name, "code": department.code}
    
    log_audit(db, current_user.id, "update_department", "Department", department.id, old_value=old_data, new_value=new_data)
    db.commit()
    db.refresh(department)
    return department

@router.post("/hods", response_model=HODCreationResponse)
def create_hod(request: HODCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    dept = db.query(Department).filter(Department.id == request.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User email already exists")
        
    temp_password = generate_temporary_password()
    hashed_password = get_password_hash(temp_password)
    
    hod = User(
        email=request.email,
        full_name=request.name,
        password_hash=hashed_password,
        role=UserRole.hod,
        department_id=dept.id,
        is_active=True,
        must_change_password=True
    )
    db.add(hod)
    db.flush()
    
    # We do not create an HOD profile because there isn't one in the schema, but we can store the name if we want.
    # However, Phase 2 schema didn't have an HODProfile. We will respect the schema.
    
    log_audit(db, current_user.id, "create_hod", "User", hod.id, new_value={"email": request.email, "department_id": dept.id})
    db.commit()
    db.refresh(hod)
    
    # Construct response
    hod_response = HODResponse(
        id=hod.id,
        email=hod.email,
        is_active=hod.is_active,
        department_id=hod.department_id,
        name=request.name, # Passing name through from request
        created_at=hod.created_at
    )
    
    return HODCreationResponse(hod=hod_response, temporary_password=temp_password)

@router.get("/hods", response_model=List[HODResponse])
def list_hods(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hods = db.query(User).filter(User.role == UserRole.hod).all()
    # Name isn't stored in User, we might just map it as None
    results = []
    for h in hods:
        results.append(HODResponse(
            id=h.id,
            email=h.email,
            is_active=h.is_active,
            department_id=h.department_id,
            name=h.full_name,
            created_at=h.created_at
        ))
    return results

@router.get("/hods/{hod_id}", response_model=HODResponse)
def get_hod(hod_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hod = db.query(User).filter(User.id == hod_id, User.role == UserRole.hod).first()
    if not hod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD not found")
    
    return HODResponse(
        id=hod.id,
        email=hod.email,
        is_active=hod.is_active,
        department_id=hod.department_id,
        name=hod.full_name,
        created_at=hod.created_at
    )

@router.patch("/hods/{hod_id}", response_model=HODResponse)
def update_hod(hod_id: int, request: HODUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hod = db.query(User).filter(User.id == hod_id, User.role == UserRole.hod).first()
    if not hod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD not found")
        
    old_data = {"department_id": hod.department_id, "is_active": hod.is_active, "email": hod.email}
    
    if request.email is not None and request.email != hod.email:
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User email already exists")
        hod.email = request.email
        
    if request.department_id is not None:
        dept = db.query(Department).filter(Department.id == request.department_id).first()
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        hod.department_id = request.department_id
        
    if request.is_active is not None:
        hod.is_active = request.is_active
        
    if request.name is not None:
        hod.full_name = request.name
        
    new_data = {"department_id": hod.department_id, "is_active": hod.is_active, "name": hod.full_name, "email": hod.email}
    
    log_audit(db, current_user.id, "update_hod", "User", hod.id, old_value=old_data, new_value=new_data)
    db.commit()
    db.refresh(hod)
    
    return HODResponse(
        id=hod.id,
        email=hod.email,
        is_active=hod.is_active,
        department_id=hod.department_id,
        name=hod.full_name,
        created_at=hod.created_at
    )

@router.post("/hods/{hod_id}/deactivate")
def deactivate_hod(hod_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hod = db.query(User).filter(User.id == hod_id, User.role == UserRole.hod).first()
    if not hod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD not found")
        
    old_data = {"is_active": hod.is_active}
    hod.is_active = False
    
    log_audit(db, current_user.id, "deactivate_hod", "User", hod.id, old_value=old_data, new_value={"is_active": False})
    db.commit()
    return {"message": "HOD deactivated successfully"}

@router.post("/hods/{hod_id}/activate")
def activate_hod(hod_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hod = db.query(User).filter(User.id == hod_id, User.role == UserRole.hod).first()
    if not hod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD not found")
        
    old_data = {"is_active": hod.is_active}
    hod.is_active = True
    
    log_audit(db, current_user.id, "activate_hod", "User", hod.id, old_value=old_data, new_value={"is_active": True})
    db.commit()
    return {"message": "HOD activated successfully"}

@router.delete("/hods/{hod_id}")
def remove_hod(hod_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hod = db.query(User).filter(User.id == hod_id, User.role == UserRole.hod).first()
    if not hod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD not found")
        
    # Log the audit first before we delete the user
    log_audit(db, current_user.id, "remove_hod", "User", hod.id, old_value={"email": hod.email, "department_id": hod.department_id}, new_value=None)
    
    db.delete(hod)
    db.commit()
    return {"message": "HOD permanently removed"}

@router.post("/hods/{hod_id}/reset-password")
def reset_hod_password(hod_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.primary_admin.value))):
    hod = db.query(User).filter(User.id == hod_id, User.role == UserRole.hod).first()
    if not hod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD not found")
        
    temp_password = generate_temporary_password()
    hod.password_hash = get_password_hash(temp_password)
    hod.must_change_password = True
    
    log_audit(db, current_user.id, "reset_hod_password", "User", hod.id, new_value={"must_change_password": True})
    db.commit()
    
    return {
        "message": "Password reset successfully",
        "temporary_password": temp_password
    }
