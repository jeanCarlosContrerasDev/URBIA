import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import AlertList from "./components/AlertList.jsx";
import LiveFeed from "./components/LiveFeed.jsx";
import MapView, { VALLEDUPAR_ZONAS } from "./components/MapView.jsx";
import { clearAlerts, deleteAlertById, getAlerts } from "./services.js";

const VALLEDUPAR_CENTRO = VALLEDUPAR_ZONAS[0];
// Sondeo periódico cada 5 segundos para evitar saturación
const POLL_MS = 5000;

export default function MonitoringPage() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [cameraLocation, setCameraLocation] = useState({ lat: VALLEDUPAR_CENTRO.lat, lng: VALLEDUPAR_CENTRO.lng });
  const [selected, setSelected] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const [locating, setLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState(null);
  const knownIds = useRef(null);

  // Función explícita para solicitar la ubicación por GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsMessage({ type: "error", text: "Tu navegador no soporta geolocalización." });
      return;
    }
    setLocating(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCameraLocation(coords);
        setGpsMessage({
          type: "success",
          text: `Ubicación GPS obtenida: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
        });
      },
      (err) => {
        setLocating(false);
        let msg = "No se pudo obtener la ubicación.";
        if (err.code === 1) {
          msg = "Permiso de ubicación denegado en el navegador. Haz clic en el ícono de candado o ubicación en la barra de direcciones y selecciona 'Permitir'.";
        } else if (err.code === 2) {
          msg = "Señal GPS no disponible. Asegúrate de tener conexión o haz clic directo en el mapa sobre tu calle.";
        }
        setGpsMessage({ type: "error", text: msg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Intentar obtener automáticamente al cargar
  useEffect(() => {
    handleLocateMe();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getAlerts(200);
      if (knownIds.current) {
        const fresh = data.filter((a) => !knownIds.current.has(a.id)).map((a) => a.id);
        if (fresh.length) {
          setNewIds(new Set(fresh));
          setTimeout(() => setNewIds(new Set()), 3000);
        }
      }
      knownIds.current = new Set(data.map((a) => a.id));
      setAlerts(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const onClear = async () => {
    await clearAlerts();
    setSelected(null);
    refresh();
  };

  const onDeleteIndividual = async (id) => {
    try {
      await deleteAlertById(id);
      if (selected?.id === id) setSelected(null);
      refresh();
    } catch (e) {
      alert("Error al eliminar la alerta: " + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between mb-4">
        <PageHeader
          title="Centro de Monitoreo · Valledupar"
          subtitle="Monitoreo territorial, estado vial y análisis en tiempo real con IA"
        />
        <span className="rounded-full bg-cyan-950 border border-cyan-800/60 px-3.5 py-1 text-xs text-cyan-300 font-semibold shadow-sm">
          📍 Valledupar, Cesar
        </span>
      </div>

      {gpsMessage && (
        <div
          className={`mb-4 rounded-lg p-2.5 text-xs flex items-center justify-between ${
            gpsMessage.type === "success"
              ? "bg-emerald-950/70 border border-emerald-800/60 text-emerald-300"
              : "bg-amber-950/70 border border-amber-800/60 text-amber-300"
          }`}
        >
          <span>{gpsMessage.text}</span>
          <button
            onClick={() => setGpsMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2 items-stretch">
        <Card title="LiveFeed · Detección YOLO" className="h-full">
          <LiveFeed location={cameraLocation} onAlerts={refresh} />
        </Card>
        <Card title={`Mapa Territorial de Valledupar · ${alerts.length} alertas activas`} className="h-full">
          <MapView
            alerts={alerts}
            cameraLocation={cameraLocation}
            onCameraLocationChange={setCameraLocation}
            selectedAlert={selected}
            onSelectAlert={setSelected}
            onLocateMe={handleLocateMe}
            locating={locating}
          />
        </Card>
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Alertas territoriales en Valledupar</h2>
            <button onClick={onClear} className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              Limpiar alertas
            </button>
          </div>
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <AlertList
              alerts={alerts}
              selectedId={selected?.id}
              onSelect={setSelected}
              onDelete={onDeleteIndividual}
              newIds={newIds}
            />
          )}
        </Card>
      </div>
    </>
  );
}
