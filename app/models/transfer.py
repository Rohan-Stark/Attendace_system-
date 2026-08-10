from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class StudentTransfer(TimestampMixin, Base):
    __tablename__ = "student_transfers"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False, index=True)
    from_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    from_semester = Column(Integer, nullable=False)
    to_semester = Column(Integer, nullable=False)
    from_section = Column(String(10), nullable=False)
    to_section = Column(String(10), nullable=False)
    transferred_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    transferred_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(500), nullable=True)

    student = relationship("StudentProfile", back_populates="transfers")
    from_department = relationship("Department", foreign_keys=[from_department_id])
    to_department = relationship("Department", foreign_keys=[to_department_id])
    transferring_user = relationship("User")
