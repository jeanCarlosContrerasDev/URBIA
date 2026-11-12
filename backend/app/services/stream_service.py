"""Procesamiento de streams en el servidor (RTSP, HTTP, archivos o cámaras locales).

El navegador no puede reproducir RTSP, así que el backend abre el stream con
OpenCV, ejecuta YOLO, dibuja los recuadros y lo reenvía como MJPEG
(multipart/x-mixed-replace), que cualquier <img> puede mostrar.
"""
import asyncio
import time

from fastapi.concurrency import run_in_threadpool

from app.services import monitoring_service, yolo_service

BOUNDARY = "frame"


def open_capture(url: str):
    import cv2

    # "0", "1"... = cámara local del servidor
    if url.strip().isdigit():
        cap = cv2.VideoCapture(int(url))
    else:
        cap = cv2.VideoCapture(
            url.strip(),
            cv2.CAP_FFMPEG,
            [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 8000],
        )
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    if not cap.isOpened():
        cap.release()
        raise ValueError(f"No se pudo abrir el stream: {url}")
    return cap


def _process_frame(cap, conf: float):
    import cv2

    ok, frame = cap.read()
    if not ok:
        return None, []
    detections, result = yolo_service.predict(frame, conf)
    annotated = result.plot()  # frame con recuadros y etiquetas
    ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return (jpg.tobytes() if ok else None), detections


async def mjpeg_stream(cap, source: str, conf: float, lat: float | None,
                       lng: float | None, max_fps: float = 10.0):
    min_interval = 1.0 / max_fps
    failures = 0
    try:
        while True:
            started = time.monotonic()
            jpg, detections = await run_in_threadpool(_process_frame, cap, conf)
            if jpg is None:
                failures += 1
                if failures > 50:  # fin del archivo o stream caído
                    break
                await asyncio.sleep(0.1)
                continue
            failures = 0
            if detections:
                monitoring_service.alerts_from_detections(detections, source, lat, lng)
            yield (
                f"--{BOUNDARY}\r\nContent-Type: image/jpeg\r\n"
                f"Content-Length: {len(jpg)}\r\n\r\n"
            ).encode() + jpg + b"\r\n"
            elapsed = time.monotonic() - started
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
    finally:
        cap.release()  # se ejecuta también cuando el cliente se desconecta

