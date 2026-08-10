from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Time
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class Timetable(TimestampMixin, Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("teacher_profiles.id"), nullable=False, index=True)
    semester = Column(Integer, nullable=False, index=True)
    section = Column(String(10), nullable=False, index=True)
    day_of_week = Column(String(20), nullable=False) # e.g. "Monday"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    subject = relationship("Subject", back_populates="timetables")
    teacher = relationship("TeacherProfile", back_populates="timetables")
    sessions = relationship("ClassSession", back_populates="timetable")
