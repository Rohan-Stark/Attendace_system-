from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from .base import Base, TimestampMixin

class SessionStatus(str, enum.Enum):
    active = "active"
    submitted = "submitted"

class ClassSession(TimestampMixin, Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)

    # Phase 7: Direct class context (used when no timetable entry exists)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    section = Column(String(10), nullable=False, index=True)

    # Preserved for future timetable integration (nullable for Phase 7)
    timetable_id = Column(Integer, ForeignKey("timetables.id"), nullable=True, index=True)

    date = Column(Date, nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(SessionStatus), default=SessionStatus.active, nullable=False)

    # Relationships
    teacher = relationship("User")
    department = relationship("Department")
    timetable = relationship("Timetable", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session")
