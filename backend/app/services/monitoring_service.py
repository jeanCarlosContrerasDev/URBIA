"""Gestión de alertas persistidas directamente en SQL Server (Base de datos URBIXIA)."""
import random
import threading
import time
from collections import Counter
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.translations import translate_label
from app.models.db_models import AlertDB
from app.models.schemas import Alert, AlertSeverity, Detection

# Inicializar tablas en SQL Server si no existen
Base.metadata.create_all(bind=engine)

_lock = threading.Lock()
_last_alert_at: dict[tuple[str, str], float] = {}

SEVERITY_BY_LABEL: dict[str, AlertSeverity] = {
    "bache": AlertSeverity.high,
    "pothole": AlertSeverity.high,
    "alcantarilla_abierta": AlertSeverity.critical,
    "vandalismo": AlertSeverity.high,
    "inundacion": AlertSeverity.critical,
    "basura": AlertSeverity.medium,
    "semaforo_danado": AlertSeverity.critical,
    "traffic light": AlertSeverity.medium,
    "truck": AlertSeverity.medium,
    "bus": AlertSeverity.medium,
    "motorcycle": AlertSeverity.medium,
}
_ORDER = [AlertSeverity.low, AlertSeverity.medium, AlertSeverity.high, AlertSeverity.critical]


def _severity_for(label: str, count: int) -> AlertSeverity:
    sev = SEVERITY_BY_LABEL.get(label, AlertSeverity.low)
    if count >= 10:
        sev = _ORDER[min(_ORDER.index(sev) + 1, len(_ORDER) - 1)]
    return sev


def _jitter(value: float) -> float:
    return value + random.uniform(-0.0002, 0.0002)


def list_alerts(limit: int = 100) -> list[Alert]:
    db = SessionLocal()
    try:
        rows = db.query(AlertDB).order_by(AlertDB.created_at.desc(), AlertDB.id.desc()).limit(limit).all()
        return [
            Alert(
                id=r.id,
                title=r.title,
                severity=AlertSeverity(r.severity) if r.severity in AlertSeverity._value2member_map_ else AlertSeverity.low,
                lat=r.lat,
                lng=r.lng,
                created_at=r.created_at,
                source=r.source,
                label=r.label,
                count=r.count,
                confidence=r.confidence,
            )
            for r in rows
        ]
    finally:
        db.close()


def get_alert(alert_id: int) -> Alert | None:
    db = SessionLocal()
    try:
        r = db.query(AlertDB).filter(AlertDB.id == alert_id).first()
        if not r:
            return None
        return Alert(
            id=r.id,
            title=r.title,
            severity=AlertSeverity(r.severity) if r.severity in AlertSeverity._value2member_map_ else AlertSeverity.low,
            lat=r.lat,
            lng=r.lng,
            created_at=r.created_at,
            source=r.source,
            label=r.label,
            count=r.count,
            confidence=r.confidence,
        )
    finally:
        db.close()


def delete_alert(alert_id: int) -> bool:
    """Elimina una alerta individual por ID en SQL Server."""
    db = SessionLocal()
    try:
        r = db.query(AlertDB).filter(AlertDB.id == alert_id).first()
        if not r:
            return False
        db.delete(r)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def clear_alerts() -> None:
    db = SessionLocal()
    try:
        db.query(AlertDB).delete()
        db.commit()
        with _lock:
            _last_alert_at.clear()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def alerts_from_detections(
    detections: list[Detection],
    source: str,
    lat: float | None = None,
    lng: float | None = None,
    cooldown_s: float = 15.0,
) -> list[Alert]:
    if not detections:
        return []
    lat = settings.DEFAULT_LAT if lat is None else lat
    lng = settings.DEFAULT_LNG if lng is None else lng

    counts = Counter(d.label for d in detections)
    best_conf = {}
    for d in detections:
        best_conf[d.label] = max(best_conf.get(d.label, 0), d.confidence)

    created: list[Alert] = []
    now = time.time()

    db = SessionLocal()
    try:
        with _lock:
            for label, count in counts.items():
                if label in {"teddy bear", "chair", "bed", "dining table", "clock", "remote", "cell phone"}:
                    continue

                key = (source, label)
                if cooldown_s > 0 and now - _last_alert_at.get(key, 0) < cooldown_s:
                    continue
                _last_alert_at[key] = now

                nombre_es = translate_label(label)
                title = f"{count}× {nombre_es} detectado" + ("s" if count > 1 else "")
                sev = _severity_for(label, count)

                new_alert = AlertDB(
                    title=f"{title} · {source}",
                    severity=sev.value,
                    lat=_jitter(lat),
                    lng=_jitter(lng),
                    source=source,
                    label=label,
                    count=count,
                    confidence=round(best_conf[label], 3),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(new_alert)
                db.flush()

                created.append(
                    Alert(
                        id=new_alert.id,
                        title=new_alert.title,
                        severity=sev,
                        lat=new_alert.lat,
                        lng=new_alert.lng,
                        created_at=new_alert.created_at,
                        source=new_alert.source,
                        label=new_alert.label,
                        count=new_alert.count,
                        confidence=new_alert.confidence,
                    )
                )

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return created
