from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.config import settings
from app.core.deps import require_role
from app.core.security import generate_temporary_password, get_password_hash
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.teacher import TeacherProfile
from app.models.student import StudentProfile, StudentStatus
from app.models.transfer import StudentTransfer
from app.models.attendance import AttendanceRecord
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse, TeacherCreationResponse, TeacherProfileResponse
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse, StudentTransferRequest, StudentProfileResponse, StudentCreationResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/hod", tags=["hod"])

@router.post("/teachers", response_model=TeacherCreationResponse)
def create_teacher(request: TeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    existing_employee = db.query(TeacherProfile).filter(TeacherProfile.employee_id == request.employee_id).first()
    if existing_employee:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists")
        
    temp_password = generate_temporary_password()
    hashed_password = get_password_hash(temp_password)
    
    # We use employee_id as email/login_id for simplicity, since schema needs unique email in User.
    # We append a dummy domain if it's just an ID, or just use the ID if it fits. 
    # Let's assume login_id is employee_id.
    login_id = request.employee_id
    existing_user = db.query(User).filter(User.email == login_id).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User login ID already exists")
    
    teacher_user = User(
        email=login_id,
        password_hash=hashed_password,
        role=UserRole.teacher,
        department_id=current_user.department_id, # Scoped to HOD's department
        is_active=True,
        must_change_password=True
    )
    db.add(teacher_user)
    db.flush()
    
    teacher_profile = TeacherProfile(
        user_id=teacher_user.id,
        employee_id=request.employee_id,
        name=request.name
    )
    db.add(teacher_profile)
    
    log_audit(db, current_user.id, "create_teacher", "User", teacher_user.id, new_value={"employee_id": request.employee_id, "department_id": current_user.department_id})
    db.commit()
    db.refresh(teacher_user)
    db.refresh(teacher_profile)
    
    profile_resp = TeacherProfileResponse.model_validate(teacher_profile)
    
    teacher_resp = TeacherResponse(
        id=teacher_user.id,
        is_active=teacher_user.is_active,
        department_id=teacher_user.department_id,
        profile=profile_resp,
        created_at=teacher_user.created_at
    )
    
    return TeacherCreationResponse(teacher=teacher_resp, temporary_password=temp_password)

@router.get("/teachers", response_model=List[TeacherResponse])
def list_teachers(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    teachers = db.query(User).filter(User.role == UserRole.teacher, User.department_id == current_user.department_id).all()
    results = []
    for t in teachers:
        profile_resp = TeacherProfileResponse.model_validate(t.teacher_profile) if t.teacher_profile else None
        results.append(TeacherResponse(
            id=t.id,
            is_active=t.is_active,
            department_id=t.department_id,
            profile=profile_resp,
            created_at=t.created_at
        ))
    return results

@router.get("/teachers/{teacher_id}", response_model=TeacherResponse)
def get_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == UserRole.teacher).first()
    if not teacher or teacher.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        
    profile_resp = TeacherProfileResponse.model_validate(teacher.teacher_profile) if teacher.teacher_profile else None
    return TeacherResponse(
        id=teacher.id,
        is_active=teacher.is_active,
        department_id=teacher.department_id,
        profile=profile_resp,
        created_at=teacher.created_at
    )

@router.patch("/teachers/{teacher_id}", response_model=TeacherResponse)
def update_teacher(teacher_id: int, request: TeacherUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == UserRole.teacher).first()
    if not teacher or teacher.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        
    old_data = {"is_active": teacher.is_active}
    new_data = {}
    
    if request.is_active is not None:
        teacher.is_active = request.is_active
        new_data["is_active"] = request.is_active
        
    if teacher.teacher_profile:
        old_data["name"] = teacher.teacher_profile.name
        old_data["employee_id"] = teacher.teacher_profile.employee_id
        
        if request.name is not None:
            teacher.teacher_profile.name = request.name
            new_data["name"] = request.name
        if request.employee_id is not None:
            # Check for conflict
            if request.employee_id != teacher.teacher_profile.employee_id:
                existing = db.query(TeacherProfile).filter(TeacherProfile.employee_id == request.employee_id).first()
                if existing:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists")
            teacher.teacher_profile.employee_id = request.employee_id
            new_data["employee_id"] = request.employee_id
            
    log_audit(db, current_user.id, "update_teacher", "User", teacher.id, old_value=old_data, new_value=new_data)
    db.commit()
    db.refresh(teacher)
    
    profile_resp = TeacherProfileResponse.model_validate(teacher.teacher_profile) if teacher.teacher_profile else None
    return TeacherResponse(
        id=teacher.id,
        is_active=teacher.is_active,
        department_id=teacher.department_id,
        profile=profile_resp,
        created_at=teacher.created_at
    )

@router.post("/teachers/{teacher_id}/deactivate")
def deactivate_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == UserRole.teacher).first()
    if not teacher or teacher.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        
    old_data = {"is_active": teacher.is_active}
    teacher.is_active = False
    
    log_audit(db, current_user.id, "deactivate_teacher", "User", teacher.id, old_value=old_data, new_value={"is_active": False})
    db.commit()
    return {"message": "Teacher deactivated successfully"}

@router.post("/students", response_model=StudentCreationResponse)
def create_student(request: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    existing_usn = db.query(StudentProfile).filter(StudentProfile.usn == request.usn).first()
    if existing_usn:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="USN already exists")
        
    existing_user = db.query(User).filter(User.email == request.usn).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User login ID (USN) already exists")
        
    temp_password = None
    if request.generate_demo_password:
        if not settings.DEMO_MODE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo student provisioning is disabled in this environment")
        temp_password = generate_temporary_password()
        hashed_password = get_password_hash(temp_password)
    else:
        if not request.initial_password or not request.initial_password.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Initial password cannot be empty for production provisioning")
        hashed_password = get_password_hash(request.initial_password)
    
    student_user = User(
        email=request.usn,
        password_hash=hashed_password,
        role=UserRole.student,
        department_id=current_user.department_id,
        is_active=True,
        must_change_password=True
    )
    db.add(student_user)
    db.flush()
    
    student_profile = StudentProfile(
        user_id=student_user.id,
        usn=request.usn,
        name=request.name,
        current_semester=request.current_semester,
        current_section=request.current_section,
        status=StudentStatus.active
    )
    db.add(student_profile)
    
    log_audit(db, current_user.id, "create_student", "User", student_user.id, new_value={"usn": request.usn, "department_id": current_user.department_id})
    db.commit()
    db.refresh(student_user)
    db.refresh(student_profile)
    
    profile_resp = StudentProfileResponse.model_validate(student_profile)
    
    student_resp = StudentResponse(
        id=student_user.id,
        is_active=student_user.is_active,
        department_id=student_user.department_id,
        profile=profile_resp,
        created_at=student_user.created_at
    )
    
    return StudentCreationResponse(student=student_resp, temporary_password=temp_password)

@router.get("/students", response_model=List[StudentResponse])
def list_students(
    semester: int = None,
    section: str = None,
    usn: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(UserRole.hod.value))
):
    query = db.query(User).join(StudentProfile).filter(
        User.role == UserRole.student, 
        User.department_id == current_user.department_id,
        StudentProfile.status == StudentStatus.active
    )
    
    if semester:
        query = query.filter(StudentProfile.current_semester == semester)
    if section:
        query = query.filter(StudentProfile.current_section == section)
    if usn:
        query = query.filter(StudentProfile.usn == usn)
        
    students = query.all()
    results = []
    for s in students:
        profile_resp = StudentProfileResponse.model_validate(s.student_profile) if s.student_profile else None
        results.append(StudentResponse(
            id=s.id,
            is_active=s.is_active,
            department_id=s.department_id,
            profile=profile_resp,
            created_at=s.created_at
        ))
    return results

@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student or student.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    profile_resp = StudentProfileResponse.model_validate(student.student_profile) if student.student_profile else None
    return StudentResponse(
        id=student.id,
        is_active=student.is_active,
        department_id=student.department_id,
        profile=profile_resp,
        created_at=student.created_at
    )

@router.patch("/students/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, request: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student or student.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    old_data = {}
    new_data = {}
    
    if student.student_profile:
        old_data["current_semester"] = student.student_profile.current_semester
        old_data["current_section"] = student.student_profile.current_section
        old_data["name"] = student.student_profile.name
        
        if request.name is not None:
            student.student_profile.name = request.name
            new_data["name"] = request.name
        if request.current_semester is not None:
            student.student_profile.current_semester = request.current_semester
            new_data["current_semester"] = request.current_semester
        if request.current_section is not None:
            student.student_profile.current_section = request.current_section
            new_data["current_section"] = request.current_section
            
    log_audit(db, current_user.id, "update_student", "User", student.id, old_value=old_data, new_value=new_data)
    db.commit()
    db.refresh(student)
    
    profile_resp = StudentProfileResponse.model_validate(student.student_profile) if student.student_profile else None
    return StudentResponse(
        id=student.id,
        is_active=student.is_active,
        department_id=student.department_id,
        profile=profile_resp,
        created_at=student.created_at
    )

@router.post("/students/{student_id}/transfer")
def transfer_student(student_id: int, request: StudentTransferRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student or student.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    target_dept = db.query(Department).filter(Department.id == request.to_department_id).first()
    if not target_dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target department not found")
        
    profile = student.student_profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile missing")
        
    # Create Transfer Record
    transfer = StudentTransfer(
        student_id=profile.id,
        from_department_id=student.department_id,
        to_department_id=request.to_department_id,
        from_semester=profile.current_semester,
        to_semester=request.to_semester,
        from_section=profile.current_section,
        to_section=request.to_section,
        transferred_by=current_user.id,
        reason=request.reason
    )
    db.add(transfer)
    
    # Update Student
    student.department_id = request.to_department_id
    profile.current_semester = request.to_semester
    profile.current_section = request.to_section
    
    log_audit(db, current_user.id, "transfer_student", "User", student.id, old_value={"dept": transfer.from_department_id}, new_value={"dept": transfer.to_department_id})
    db.commit()
    return {"message": "Student transferred successfully"}

@router.post("/students/{student_id}/remove")
def remove_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.hod.value))):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student or student.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        
    profile = student.student_profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile missing")
        
    # Check attendance history
    attendance_count = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == profile.id).count()
    
    if attendance_count == 0:
        # Safe to hard delete
        db.delete(profile) # Deletes profile, cascade may or may not be defined, so delete explicitly
        db.delete(student)
        action = "hard_delete_student"
    else:
        # Soft delete
        profile.status = StudentStatus.removed
        student.is_active = False
        action = "soft_remove_student"
        
    log_audit(db, current_user.id, action, "User", student.id, old_value={"active": True}, new_value={"active": False})
    db.commit()
    return {"message": f"Student {action.replace('_', ' ')} successfully"}
