from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    admin_password: str = "admin123"
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:///./photo_platform.db"
    google_service_account_file: str = "service_account.json"
    frontend_url: str = "http://localhost:5173"
    app_env: str = "development"
    base_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
