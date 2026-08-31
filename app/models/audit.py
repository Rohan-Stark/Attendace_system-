from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False) # e.g. "update_attendance", "branch_transfer"
    entity_type = Column(String(100), nullable=False, index=True) # e.g. "AttendanceRecord"
    entity_id = Column(String(100), nullable=False, index=True)
    old_value = Column(String(2000), nullable=True) # Could be JSON in real prod, using String for simplicity if schema allows
    new_value = Column(String(2000), nullable=True)
    reason = Column(String(500), nullable=True)

    actor = relationship("User")
