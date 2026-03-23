from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ZAPI
    zapi_instance_id: str = ""
    zapi_token: str = ""
    zapi_security_token: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Admin WhatsApp
    admin_phone: str = "5511996554604"

    # App
    secret_key: str = "changeme-in-production"
    database_url: str = "sqlite:///./data/darkcred.db"
    upload_dir: str = "./uploads"
    base_url: str = "http://localhost:8000"

    # Auto-approval threshold (0.0 – 1.0)
    auto_approve_threshold: float = 0.85

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
