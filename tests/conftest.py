import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import SQLALCHEMY_DATABASE_URL
from app.models import Base

# Use the same database for testing for simplicity of Phase 2
# In a real project you'd use a separate test db. Here we just rollback after each test.
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def setup_database():
    # Make sure all tables are created. Alembic already did this, but this guarantees it.
    Base.metadata.create_all(bind=engine)
    yield
    # No teardown needed as we rollback sessions

@pytest.fixture(scope="function")
def db_session(setup_database):
    """Provides a transactional scope around a series of operations."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
