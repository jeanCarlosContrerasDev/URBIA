import json
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.services import training_service

router = APIRouter()


class NewClassRequest(BaseModel):
    name: str


@router.get("/classes")
async def get_classes():
    return await run_in_threadpool(training_service.get_classes)


@router.post("/classes")
async def add_class(req: NewClassRequest):
    idx, classes = await run_in_threadpool(training_service.add_or_get_class, req.name)
    return {"index": idx, "name": req.name.strip().lower(), "classes": classes}


@router.get("/stats")
async def get_dataset_stats():
    return await run_in_threadpool(training_service.get_dataset_stats)


@router.get("/status")
async def get_training_status():
    return await run_in_threadpool(training_service.get_training_status)


@router.post("/annotate")
async def save_annotation(
    file: UploadFile = File(...),
    annotations: str = Form(..., description="JSON con cajas y nombres de categorías"),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
):
    """
    1. Guarda la muestra para reentrenamiento de YOLO.
    2. Inserta simultáneamente la alerta en la base de datos SQL Server (alertas_territoriales).
    """
    try:
        ann_list = json.loads(annotations)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de anotaciones inválido")

    data = await file.read()
    res = await run_in_threadpool(
        training_service.save_image_and_annotation,
        data,
        file.filename or "image.jpg",
        ann_list,
        lat,
        lng,
    )
    return {"message": "Muestra guardada para reentrenar YOLO y registrada en alertas_territoriales de SQL Server", **res}


@router.post("/start")
async def start_training(epochs: int = Query(20, ge=1, le=200)):
    stats = await run_in_threadpool(training_service.get_dataset_stats)
    if stats["total_images"] == 0:
        raise HTTPException(status_code=400, detail="No puedes entrenar sin imágenes en el dataset.")
    try:
        await run_in_threadpool(training_service.start_training_job, epochs)
        return {"message": f"Entrenamiento iniciado para {epochs} épocas."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
