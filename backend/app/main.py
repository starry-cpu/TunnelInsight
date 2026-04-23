import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1 import api_router
from app.schemas.common import ApiResponse
from app.database import AsyncSessionLocal
from app.services.status_calculator import status_calculator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info("Starting TunnelInsight API...")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs on startup and cleanup on shutdown.
    """
    # Startup: Initialize StatusCalculator
    logger.info("Initializing StatusCalculator...")
    try:
        async with AsyncSessionLocal() as db:
            await status_calculator.initialize(db)
        logger.info("StatusCalculator initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize StatusCalculator: {e}")
        # Continue without initialized calculator - it will use fallback behavior

    yield

    # Shutdown: Cleanup if needed
    logger.info("Shutting down TunnelInsight API...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TunnelInsight - AI-powered tunnel defect detection system",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return ApiResponse(
        success=True,
        data={
            "message": "Welcome to TunnelInsight API",
            "version": settings.VERSION,
            "docs": "/api/docs",
        }
    )


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# File serving endpoint
@app.get("/uploads/{filename:path}")
async def serve_upload(filename: str):
    """Serve uploaded files"""
    import os
    from pathlib import Path

    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = Path(app_dir) / "uploads"
    file_path = uploads_dir / filename

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {filename}")

    return FileResponse(str(file_path))


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
            },
            "meta": {"timestamp": "now"}
        }
    )


# Include API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
