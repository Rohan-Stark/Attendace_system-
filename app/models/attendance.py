from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base, TimestampMixin

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"

class MarkingMethod(str, enum.Enum):
    face_recognition = "face_recognition"
    manual = "manual"

class AttendanceRecord(TimestampMixin, Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True, index=True)
    
    status = Column(Enum(AttendanceStatus), nullable=False)
    marking_method = Column(Enum(MarkingMethod), nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Null if system/face_recognition auto-marked
    marked_at = Column(DateTime(timezone=True), nullable=False)

    session = relationship("ClassSession", back_populates="attendance_records")
    student = relationship("StudentProfile", back_populates="attendance_records")
    subject = relationship("Subject")
    marker = relationship("User")
    disputes = relationship("AttendanceDispute", back_populates="attendance_record")

    __table_args__ = (
        UniqueConstraint('session_id', 'student_id', name='uix_session_student_attendance'),
    )
