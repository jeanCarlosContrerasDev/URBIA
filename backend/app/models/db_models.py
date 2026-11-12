from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String

from app.core.database import Base


class AlertDB(Base):
    __tablename__ = "alertas_territoriales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False, default="low")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    source = Column(String(100), default="manual")
    label = Column(String(100), nullable=True)
    count = Column(Integer, default=1)
    confidence = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

