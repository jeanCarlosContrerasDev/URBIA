from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime


class AlertSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Alert(BaseModel):
    id: int
    title: str
    severity: AlertSeverity
    lat: float
    lng: float
    created_at: datetime
    source: str = "manual"
    label: str | None = None
    count: int = 1
    confidence: float | None = None
    image_url: str | None = None


class Detection(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    bbox: list[float] = Field(description="[x1, y1, x2, y2] en píxeles")


class DetectionResponse(BaseModel):
    filename: str
    width: int
    height: int
    detections: list[Detection]
    alerts: list[Alert] = []
