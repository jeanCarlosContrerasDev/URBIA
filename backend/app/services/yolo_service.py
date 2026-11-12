"""Servicio de detección con Ultralytics YOLO.

Soporta carga dinámica de modelos cuando se entrena uno nuevo en URBIX.
"""
import threading
from pathlib import Path
import numpy as np

from app.core.config import settings
from app.models.schemas import Detection

_predict_lock = threading.Lock()
_active_model = None
_active_model_path = None


def get_model():
    global _active_model, _active_model_path
    from ultralytics import YOLO

    # Si existe un modelo entrenado por URBIX 'urbix_model_active.pt', se prioriza automáticamente
    target_path = "urbix_model_active.pt" if Path("urbix_model_active.pt").exists() else settings.YOLO_MODEL_PATH

    if _active_model is None or _active_model_path != target_path:
        with _predict_lock:
            _active_model = YOLO(target_path)
            _active_model_path = target_path

    return _active_model


def reload_model_instance(new_path: str = "urbix_model_active.pt"):
    """Fuerza al servicio a recargar los nuevos pesos entrenados."""
    global _active_model, _active_model_path
    from ultralytics import YOLO

    with _predict_lock:
        _active_model = YOLO(new_path)
        _active_model_path = new_path


def decode_image(image_bytes: bytes) -> np.ndarray:
    import cv2

    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    return img


def predict(img: np.ndarray, conf: float = 0.25):
    """Devuelve (detecciones, resultado_crudo_ultralytics)."""
    model = get_model()
    with _predict_lock:
        result = model.predict(img, conf=conf, verbose=False)[0]
    detections = [
        Detection(
            label=result.names[int(box.cls)],
            confidence=float(box.conf),
            bbox=[float(v) for v in box.xyxy[0].tolist()],
        )
        for box in result.boxes
    ]
    return detections, result


def detect_from_bytes(image_bytes: bytes, conf: float = 0.25):
    """Devuelve (detecciones, ancho, alto)."""
    img = decode_image(image_bytes)
    detections, _ = predict(img, conf)
    h, w = img.shape[:2]
    return detections, w, h
