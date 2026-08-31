import os
# Force ALL database connections in the test suite to use the test database
# This must happen before ANY app imports so that app.core.database picks it up globally.
os.environ["POSTGRES_DB"] = "smartattend_test"

import pytest
from app.core.database import engine, SessionLocal
from app.core.rate_limit import reset_all_limiters
from app.models import Base

@pytest.fixture(scope="session")
def setup_database():
    # Drop and recreate all tables once per test session to guarantee clean isolated state
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # We do not drop tables at the end so they can be inspected if a test fails
    # The next pytest run will drop them anyway.

@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Reset all rate limiter state before each test to prevent cross-test contamination."""
    reset_all_limiters()
    yield
    reset_all_limiters()

@pytest.fixture(scope="function")
def db_session(setup_database):
    """Provides a transactional scope around a series of operations."""
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
