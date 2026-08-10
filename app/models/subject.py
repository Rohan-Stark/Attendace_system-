from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class Subject(TimestampMixin, Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    semester = Column(Integer, nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    department = relationship("Department", back_populates="subjects")
    timetables = relationship("Timetable", back_populates="subject")
