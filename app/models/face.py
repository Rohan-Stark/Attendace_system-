from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .base import Base, TimestampMixin

class FaceEmbedding(TimestampMixin, Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False, index=True)
    # Using 512 dimension standard for ArcFace/InsightFace models
    embedding = Column(Vector(512), nullable=False)
    model_name = Column(String(100), nullable=False) # e.g. "arcface_r100_v1"
    is_active = Column(Boolean, default=True, nullable=False)

    student = relationship("StudentProfile", back_populates="face_embeddings")
