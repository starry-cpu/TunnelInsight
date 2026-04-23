"""Services module"""
from app.services.ai_service import AIService
from app.services.status_calculator import status_calculator

try:
    from app.services.email_service import email_service
except ImportError:
    email_service = None  # aiosmtplib not installed

try:
    from app.services.rag_client import rag_client
except ImportError:
    rag_client = None  # httpx not installed

__all__ = ["email_service", "AIService", "status_calculator", "rag_client"]
