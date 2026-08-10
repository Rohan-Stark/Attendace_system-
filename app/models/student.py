from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from .base import Base, TimestampMixin

class StudentStatus(str, enum.Enum):
    active = "active"
    removed = "removed"

class StudentProfile(TimestampMixin, Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    usn = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    current_semester = Column(Integer, nullable=False, index=True)
    current_section = Column(String(10), nullable=False, index=True)
    status = Column(Enum(StudentStatus), default=StudentStatus.active, nullable=False)

    user = relationship("User", back_populates="student_profile")
    face_embeddings = relationship("FaceEmbedding", back_populates="student")
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    transfers = relationship("StudentTransfer", back_populates="student", foreign_keys="[StudentTransfer.student_id]")
    disputes = relationship("AttendanceDispute", back_populates="student")
