from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración central. Se puede sobrescribir con variables de entorno o backend/.env"""

    PROJECT_NAME: str = "URBIX AI"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    YOLO_MODEL_PATH: str = "yolo11n.pt"
    # Ubicación por defecto: Valledupar, Cesar, Colombia (Plaza Alfonso López / Centro)
    DEFAULT_LAT: float = 10.4631
    DEFAULT_LNG: float = -73.2532
    MAX_ALERTS: int = 500

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

