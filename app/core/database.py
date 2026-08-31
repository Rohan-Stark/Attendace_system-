import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Support a single DATABASE_URL (provided by Render/Railway) or individual vars
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
else:
    POSTGRES_USER = os.getenv("POSTGRES_USER", "") or "postgres"
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "") or "postgres"
    POSTGRES_DB = os.getenv("POSTGRES_DB", "") or "smartattend"
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "") or "5433"
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "") or "127.0.0.1"

    SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"


engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
