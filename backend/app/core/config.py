from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # Database
    DATABASE_URL: str
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 86400

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "TunnelInsight"
    VERSION: str = "1.0.0"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AI Model
    MODEL_PATH: str = "./models/qwen2.5-vl-defect"  # LoRA 微调模型路径
    BASE_MODEL_NAME: str = "unsloth/Qwen2.5-VL-7B-Instruct-unsloth-bnb-4bit"
    INFERENCE_TIMEOUT: int = 30

    # Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"

    # Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "TunnelInsight"
    SMTP_USE_TLS: bool = True

    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Email settings
    EMAIL_ENABLED: bool = False  # 开发环境默认关闭,生产环境开启
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24

    # RAG Service Configuration (LightRAG)
    RAG_SERVICE_URL: str = "http://localhost:9621"
    RAG_ENABLED: bool = True
    RAG_TIMEOUT: float = 15.0  # 超时时间（秒）

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


settings = Settings()
