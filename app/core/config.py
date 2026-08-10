"""
Centralized application configuration using pydantic-settings.
All secrets and configuration are read from environment variables.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database (reuse existing env vars from database.py)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "smartattend"
    POSTGRES_PORT: str = "5433"
    POSTGRES_HOST: str = "127.0.0.1"

    # JWT
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"  # Must be overridden via env
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30

    # Password reset tokens
    RESET_TOKEN_EXPIRATION_MINUTES: int = 15

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Environment
    DEMO_MODE: bool = False
    APP_TIMEZONE: str = "Asia/Kolkata"
    
    # Face Recognition
    FACE_RECOGNITION_THRESHOLD: float = 0.4

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
