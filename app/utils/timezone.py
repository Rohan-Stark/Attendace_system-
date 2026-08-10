"""
Centralized timezone utilities for SmartAttend.
All attendance date/time calculations use the configured APP_TIMEZONE.
"""
from datetime import datetime, date
import pytz
from app.core.config import settings


def get_timezone():
    """Returns the configured application timezone object."""
    return pytz.timezone(settings.APP_TIMEZONE)


def get_current_datetime() -> datetime:
    """Returns the current datetime in the configured application timezone."""
    return datetime.now(get_timezone())


def get_current_date() -> date:
    """Returns the current date in the configured application timezone."""
    return get_current_datetime().date()


def is_attendance_date_modifiable(attendance_date: date) -> bool:
    """
    Returns True only if the attendance date matches the current calendar date
    in the application's configured business timezone.
    This is the single source of truth for the same-day attendance rule.
    """
    return attendance_date == get_current_date()
