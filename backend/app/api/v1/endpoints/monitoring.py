from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.models.schemas import Alert
from app.services import monitoring_service

router = APIRouter()


@router.get("/alerts", response_model=list[Alert])
async def get_alerts(limit: int = Query(100, ge=1, le=1000)):
    return await run_in_threadpool(monitoring_service.list_alerts, limit)


@router.delete("/alerts", status_code=204)
async def clear_alerts():
    await run_in_threadpool(monitoring_service.clear_alerts)


@router.get("/alerts/{alert_id}", response_model=Alert)
async def get_alert(alert_id: int):
    alert = await run_in_threadpool(monitoring_service.get_alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return alert


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(alert_id: int):
    """Elimina una alerta individual por su ID en SQL Server."""
    deleted = await run_in_threadpool(monitoring_service.delete_alert, alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
