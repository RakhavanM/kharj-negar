from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Kharj Negar API"
    environment: str = "production"
    database_url: str = "postgresql+psycopg://kharj_app:change-me@127.0.0.1:5432/kharj_negar"
    session_cookie_name: str = "kharj_session"
    csrf_cookie_name: str = "kharj_csrf"
    session_ttl_hours: int = 168
    cookie_secure: bool = True
    allowed_origin: str = "https://kharjnegar.raminakhavan.ir"
    login_rate_limit_attempts: int = 10
    login_rate_limit_window_seconds: int = 900


@lru_cache
def get_settings() -> Settings:
    return Settings()
