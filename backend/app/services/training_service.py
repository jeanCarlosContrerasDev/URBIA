"""Servicio para gestionar datasets, categorías dinámicas, etiquetado y entrenamiento de modelos YOLO."""
import json
import os
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings

# Rutas de almacenamiento
TRAINING_DIR = Path("training_workspace")
DATASET_DIR = TRAINING_DIR / "dataset"
IMAGES_DIR = DATASET_DIR / "images"
LABELS_DIR = DATASET_DIR / "labels"
MODELS_DIR = TRAINING_DIR / "models"
CLASSES_FILE = TRAINING_DIR / "classes.json"
YAML_FILE = DATASET_DIR / "urbix_data.yaml"

# Crear estructura
for d in [IMAGES_DIR, LABELS_DIR, MODELS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

DEFAULT_CLASSES = [
    "bache",
    "basura",
    "semaforo_danado",
    "alcantarilla_abierta",
    "vandalismo",
    "inundacion",
    "vehiculo_abandonado",
]

_training_state = {
    "is_training": False,
    "progress": 0,
    "current_epoch": 0,
    "total_epochs": 0,
    "status_message": "Inactivo. Listo para entrenar.",
    "started_at": None,
    "last_result": None,
}


def get_classes() -> list[str]:
    """Obtiene la lista de categorías dinámicas guardadas."""
    if not CLASSES_FILE.exists():
        with open(CLASSES_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CLASSES, f, indent=2, ensure_ascii=False)
        return list(DEFAULT_CLASSES)
    try:
        with open(CLASSES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return list(DEFAULT_CLASSES)


def add_or_get_class(class_name: str) -> tuple[int, list[str]]:
    """Agrega una nueva categoría si no existe y devuelve su índice numérico YOLO."""
    clean_name = class_name.strip().lower().replace(" ", "_")
    if not clean_name:
        clean_name = "objeto_desconocido"

    current = get_classes()
    if clean_name not in current:
        current.append(clean_name)
        with open(CLASSES_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
        _generate_yaml_internal(current)
    idx = current.index(clean_name)
    return idx, current


def get_training_status() -> dict[str, Any]:
    return dict(_training_state)


def get_dataset_stats() -> dict[str, Any]:
    images = list(IMAGES_DIR.glob("*.*"))
    labels = list(LABELS_DIR.glob("*.txt"))
    classes = get_classes()

    classes_counter = {c: 0 for c in classes}
    for lbl in labels:
        try:
            with open(lbl, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split()
                    if parts:
                        idx = int(parts[0])
                        if 0 <= idx < len(classes):
                            classes_counter[classes[idx]] += 1
        except Exception:
            pass

    return {
        "total_images": len(images),
        "total_labeled": len(labels),
        "classes": classes,
        "counts_by_class": classes_counter,
    }


def save_image_and_annotation(
    image_bytes: bytes,
    filename: str,
    annotations: list[dict],
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    """
    1. Guarda la imagen y etiquetas .txt para entrenamiento de YOLO.
    2. Registra la alerta en SQL Server para Valledupar.
    """
    classes = get_classes()
    parsed_annotations = []
    first_category = "bache"

    for ann in annotations:
        cat_name = ann.get("category_name")
        if cat_name:
            c_idx, classes = add_or_get_class(cat_name)
            first_category = cat_name
        else:
            c_idx = ann.get("class_id", 0)

        parsed_annotations.append({
            "class_id": c_idx,
            "x_center": ann["x_center"],
            "y_center": ann["y_center"],
            "width": ann["width"],
            "height": ann["height"],
        })

    stem = Path(filename).stem
    timestamp = int(datetime.now().timestamp())
    img_name = f"{stem}_{timestamp}.jpg"
    img_path = IMAGES_DIR / img_name
    lbl_path = LABELS_DIR / f"{Path(img_name).stem}.txt"

    with open(img_path, "wb") as f:
        f.write(image_bytes)

    with open(lbl_path, "w", encoding="utf-8") as f:
        for ann in parsed_annotations:
            f.write(f"{ann['class_id']} {ann['x_center']} {ann['y_center']} {ann['width']} {ann['height']}\n")

    _generate_yaml_internal(classes)

    # 3. Guardar en SQL Server como Alerta Territorial en Valledupar
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import AlertDB
        from app.core.translations import translate_label

        db = SessionLocal()
        alert_lat = lat if lat is not None else settings.DEFAULT_LAT
        alert_lng = lng if lng is not None else settings.DEFAULT_LNG
        nombre_es = translate_label(first_category)
        img_url = f"/api/v1/training/images/{img_name}"

        new_alert = AlertDB(
            title=f"Reporte Manual: {nombre_es.capitalize()} identificado",
            severity="high" if first_category in ["bache", "alcantarilla_abierta", "vandalismo"] else "medium",
            lat=alert_lat,
            lng=alert_lng,
            source=f"Enseñanza Manual ({filename})",
            label=first_category,
            count=len(annotations),
            confidence=1.0,
            image_url=img_url,
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_alert)
        db.commit()
        db.close()
    except Exception as e:
        print("Aviso: no se pudo insertar en SQL Server:", e)

    return {"filename": img_name, "image_url": f"/api/v1/training/images/{img_name}", "classes": classes}


def _generate_yaml_internal(classes: list[str]):
    abs_img_dir = str(IMAGES_DIR.resolve()).replace("\\", "/")
    content = f"""path: {abs_img_dir}
train: .
val: .

names:
"""
    for i, c in enumerate(classes):
        content += f"  {i}: {c}\n"

    with open(YAML_FILE, "w", encoding="utf-8") as f:
        f.write(content)


def start_training_job(epochs: int = 20, model_base: str = "yolo11n.pt"):
    if _training_state["is_training"]:
        raise ValueError("Ya hay un entrenamiento en ejecución.")
    _training_state["is_training"] = True
    _training_state["progress"] = 0
    _training_state["current_epoch"] = 0
    _training_state["total_epochs"] = epochs
    _training_state["status_message"] = "Iniciando entrenamiento con Ultralytics YOLO..."
    _training_state["started_at"] = datetime.now(timezone.utc).isoformat()

    def _worker():
        try:
            from ultralytics import YOLO

            classes = get_classes()
            _generate_yaml_internal(classes)
            model = YOLO(model_base)

            def on_train_epoch_end(trainer):
                _training_state["current_epoch"] = trainer.epoch + 1
                _training_state["progress"] = int((_training_state["current_epoch"] / epochs) * 100)
                _training_state["status_message"] = f"Entrenando época {trainer.epoch + 1}/{epochs}..."

            model.add_callback("on_train_epoch_end", on_train_epoch_end)

            project_dir = TRAINING_DIR / "runs"
            model.train(
                data=str(YAML_FILE),
                epochs=epochs,
                imgsz=640,
                project=str(project_dir),
                name="urbix_custom",
                exist_ok=True,
                verbose=False,
            )

            best_weight = project_dir / "urbix_custom" / "weights" / "best.pt"
            custom_name = f"urbix_model_v{int(datetime.now().timestamp())}.pt"
            saved_model_path = MODELS_DIR / custom_name

            if best_weight.exists():
                shutil.copy(best_weight, saved_model_path)
                shutil.copy(best_weight, "urbix_model_active.pt")
                from app.services import yolo_service
                yolo_service.reload_model_instance("urbix_model_active.pt")

            _training_state["is_training"] = False
            _training_state["progress"] = 100
            _training_state["status_message"] = f"¡Entrenamiento exitoso! Modelo guardado como {custom_name}"
            _training_state["last_result"] = {
                "model_file": custom_name,
                "saved_path": str(saved_model_path),
            }

        except Exception as e:
            _training_state["is_training"] = False
            _training_state["status_message"] = f"Error en entrenamiento: {str(e)}"

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
