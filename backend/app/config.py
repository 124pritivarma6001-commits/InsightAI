"""
Application configuration.
Reads from environment variables (see .env.example).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # General
    APP_NAME: str = "AI Dashboard Generator"
    ENV: str = "development"
    SECRET_KEY: str = "change-this-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_dashboard"

    # File storage
    STORAGE_BACKEND: str = "local"  # local | s3 | cloudinary
    UPLOAD_DIR: str = "./storage/uploads"
    MAX_UPLOAD_MB: int = 1024

    # LLM / AI layer (OpenAI-compatible). Modular: swap base_url/model to
    # point at any OpenAI-compatible provider (OpenAI, Azure OpenAI,
    # Anthropic-compatible gateway, local vLLM, etc.)
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_ENABLED: bool = False  # falls back to template-based insights if False

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
