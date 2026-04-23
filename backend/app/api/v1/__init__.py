from fastapi import APIRouter
from app.api.v1 import auth, projects, tunnels, defects, history, config

api_router = APIRouter()

# Include all API routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tunnels.router, prefix="/tunnels", tags=["Tunnels"])
api_router.include_router(defects.router, prefix="/defects", tags=["Defects"])
api_router.include_router(history.router, prefix="/history", tags=["History"])
api_router.include_router(config.router, prefix="/config", tags=["Configuration"])

__all__ = ["api_router"]
