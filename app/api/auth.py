from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    is_valid_password_policy, generate_reset_token, hash_reset_token
)
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import (
    LoginRequest, LoginResponse, ChangePasswordRequest, 
    ForgotPasswordRequest, ResetPasswordRequest, UserMeResponse
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.login_id).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
        
    access_token = create_access_token(
        subject=user.id, role=user.role.value, department_id=user.department_id
    )
    
    return LoginResponse(
        access_token=access_token,
        role=user.role.value,
        requires_password_change=user.must_change_password,
        user_id=user.id
    )

@router.post("/change-password")
def change_password(request: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Note: Using get_current_user allows users with must_change_password=True to access this
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
        
    if not is_valid_password_policy(request.new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password does not meet policy requirements")
        
    current_user.password_hash = get_password_hash(request.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.login_id).first()
    
    if user and user.is_active:
        token, token_hash = generate_reset_token()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRATION_MINUTES)
        
        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        db.add(reset_record)
        db.commit()
        
        # In a real system, send email here. 
        # Token is purposefully NOT logged to console for security reasons.
        
    # Always return same response to prevent account enumeration
    return {"message": "If the account exists, password reset instructions have been initiated."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_reset_token(request.token)
    
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not reset_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
        
    if not is_valid_password_policy(request.new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password does not meet policy requirements")
        
    user = reset_record.user
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")
        
    user.password_hash = get_password_hash(request.new_password)
    user.must_change_password = False
    
    reset_record.used_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        department_id=current_user.department_id,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password
    )

@router.post("/logout")
def logout():
    # Since we use stateless JWT, logout is handled client-side by dropping the token.
    # A true server-side logout would require a blacklist table or Redis.
    # For Phase 3, we simply acknowledge the logout request.
    return {"message": "Logged out successfully"}
