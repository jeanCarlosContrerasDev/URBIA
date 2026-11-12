from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from app.models.schemas import DetectionResponse
from app.services import monitoring_service, stream_service, yolo_service

router = APIRouter()


@router.post("/image", response_model=DetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.01, le=1),
    source: str = Query("Carga de imagen"),
    lat: float | None = None,
    lng: float | None = None,
    create_alerts: bool = True,
    cooldown: float = Query(15.0, ge=0, description="Segundos entre alertas iguales de la misma fuente"),
):
    """Analiza una imagen (o un frame de webcam/video) y genera alertas."""
    data = await file.read()
    try:
        detections, w, h = await run_in_threadpool(yolo_service.detect_from_bytes, data, conf)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    alerts = []
    if create_alerts:
        alerts = monitoring_service.alerts_from_detections(detections, source, lat, lng, cooldown)

    return DetectionResponse(
        filename=file.filename or "frame",
        width=w,
        height=h,
        detections=detections,
        alerts=alerts,
    )


@router.get("/stream")
async def detect_stream(
    url: str = Query(..., description="rtsp://..., http://..., ruta de archivo o índice de cámara (0)"),
    conf: float = Query(0.25, ge=0.01, le=1),
    source: str = Query("Cámara RTSP"),
    lat: float | None = None,
    lng: float | None = None,
    fps: float = Query(10, gt=0, le=30),
):
    """Stream MJPEG con recuadros dibujados. Usar como <img src=...>."""
    try:
        cap = await run_in_threadpool(stream_service.open_capture, url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return StreamingResponse(
        stream_service.mjpeg_stream(cap, source, conf, lat, lng, fps),
        media_type=f"multipart/x-mixed-replace; boundary={stream_service.BOUNDARY}",
        headers={"Cache-Control": "no-cache"},
    )
