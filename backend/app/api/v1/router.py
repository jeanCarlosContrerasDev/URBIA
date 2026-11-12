from fastapi import APIRouter

from app.api.v1.endpoints import detection, monitoring, training

api_router = APIRouter()
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(detection.router, prefix="/detection", tags=["detection"])
api_router.include_router(training.router, prefix="/training", tags=["training"])

