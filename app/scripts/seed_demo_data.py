import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.department import Department
from app.core.security import get_password_hash

def seed_database():
    db: Session = SessionLocal()
    try:
        # Create Primary Admin
        admin_email = "admin@smartattend.edu"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                password_hash=get_password_hash("Admin@123456"),
                role=UserRole.primary_admin,
                must_change_password=False,
                is_active=True
            )
            db.add(admin)
            print(f"Created Admin: {admin_email}")
        
        # Create Demo Department
        dept_name = "Computer Science"
        department = db.query(Department).filter(Department.name == dept_name).first()
        if not department:
            department = Department(
                name=dept_name,
                code="CS001"
            )
            db.add(department)
            db.flush()
            print(f"Created Department: {dept_name}")
            
        # Create specific HOD account
        hod_email = "sudhalk@bit-bangalore.edu.in"
        hod = db.query(User).filter(User.email == hod_email).first()
        if not hod:
            hod = User(
                email=hod_email,
                password_hash=get_password_hash("Password123!"),
                role=UserRole.hod,
                department_id=department.id,
                must_change_password=False,
                is_active=True
            )
            db.add(hod)
            print(f"Created HOD: {hod_email}")
            
        db.commit()
        print("Database seeding completed successfully.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
