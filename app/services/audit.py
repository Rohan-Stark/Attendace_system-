from sqlalchemy.orm import Session
from typing import Optional, Any
import json

from app.models.audit import AuditLog

def log_audit(
    db: Session,
    actor_id: int,
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    reason: Optional[str] = None
) -> AuditLog:
    """
    Creates an audit log entry in the database.
    Does not commit the transaction, so it can be rolled back with the main operation.
    """
    
    def _safe_serialize(val: Any) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, (dict, list, tuple)):
            # Ensure we never serialize passwords or hashes accidentally if passed as dicts
            safe_val = {}
            if isinstance(val, dict):
                for k, v in val.items():
                    if 'password' not in k.lower() and 'token' not in k.lower():
                        safe_val[k] = v
                return json.dumps(safe_val)
            return json.dumps(val)
        return str(val)

    log_entry = AuditLog(
        actor_user_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_value=_safe_serialize(old_value),
        new_value=_safe_serialize(new_value),
        reason=reason
    )
    
    db.add(log_entry)
    # We do NOT commit here. The caller should commit their entire unit of work.
    return log_entry
