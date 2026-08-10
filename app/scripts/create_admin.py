import os
import sys
from sqlalchemy.orm import Session

# Add the backend directory to sys.path so we can import 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def bootstrap_admin():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    
    if not email or not password:
        print("Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.")
        print("Usage:")
        print("  set ADMIN_EMAIL=admin@smartattend.edu")
        print("  set ADMIN_PASSWORD=StrongPassword123!")
        print("  python app/scripts/create_admin.py")
        sys.exit(1)
        
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.primary_admin).first()
        if existing:
            print(f"Primary Admin already exists with email: {existing.email}")
            print("Operation aborted.")
            return
            
        admin_user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.primary_admin,
            must_change_password=False,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f"Primary Admin created successfully with email: {email}")
        
    except Exception as e:
        print(f"Error creating Primary Admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    bootstrap_admin()
