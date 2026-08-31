from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from .base import Base, TimestampMixin

class DisputeStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class AttendanceDispute(TimestampMixin, Base):
    __tablename__ = "attendance_disputes"

    id = Column(Integer, primary_key=True, index=True)
    attendance_record_id = Column(Integer, ForeignKey("attendance_records.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False, index=True)
    reason = Column(String(500), nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.pending, nullable=False, index=True)
    
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_comment = Column(String(500), nullable=True)

    attendance_record = relationship("AttendanceRecord", back_populates="disputes")
    student = relationship("StudentProfile", back_populates="disputes")
    resolver = relationship("User")
