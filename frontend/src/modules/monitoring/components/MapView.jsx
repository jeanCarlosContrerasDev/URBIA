import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";

export const SEVERITY_COLORS = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export const CATEGORY_COLORS = {
  bache: "#f97316",
  basura: "#eab308",
  semaforo_danado: "#ef4444",
  alcantarilla_abierta: "#dc2626",
  vandalismo: "#a855f7",
  inundacion: "#06b6d4",
  vehiculo_abandonado: "#64748b",
};

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], map.getZoom() || 15);
    }
  }, [center, map]);
  return null;
}

function FlyTo({ alert }) {
  const map = useMap();
  useEffect(() => {
    if (alert) map.flyTo([alert.lat, alert.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [alert, map]);
  return null;
}

function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || !points.length) return;
    const heatData = points.map((p) => [
      p.lat,
      p.lng,
      p.severity === "critical" ? 1.0 : p.severity === "high" ? 0.75 : p.severity === "medium" ? 0.5 : 0.25,
    ]);
    const heat = L.heatLayer(heatData, {
      radius: 28,
      blur: 18,
      maxZoom: 17,
      gradient: {
        0.2: "#3b82f6",
        0.4: "#06b6d4",
        0.6: "#eab308",
        0.8: "#f97316",
        1.0: "#ef4444",
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [points, map]);

  return null;
}

export const VALLEDUPAR_ZONAS = [
  { name: "Plaza Alfonso López", lat: 10.4631, lng: -73.2532 },
  { name: "Av. Simón Bolívar", lat: 10.4680, lng: -73.2510 },
  { name: "Carrera 9", lat: 10.4720, lng: -73.2450 },
  { name: "La Pilonera Mayor", lat: 10.4855, lng: -73.2650 },
  { name: "Guatapurí", lat: 10.4980, lng: -73.2710 },
];

export default function MapView({
  alerts,
  cameraLocation,
  onCameraLocationChange,
  selectedAlert,
  onSelectAlert,
  onLocateMe,
  locating,
}) {
  const [viewMode, setViewMode] = useState("markers");
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredAlerts = alerts.filter((a) => {
    if (filterCategory === "all") return true;
    return (a.label || "").toLowerCase() === filterCategory.toLowerCase();
  });

  const availableCategories = Array.from(new Set(alerts.map((a) => a.label).filter(Boolean)));

  return (
    <div className="flex flex-col flex-1 h-full min-h-[520px] space-y-2">
      {/* Barra de Filtros */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold">Capa:</span>
          <div className="flex rounded-md bg-slate-950 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("markers")}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                viewMode === "markers" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              📍 Marcadores
            </button>
            <button
              type="button"
              onClick={() => setViewMode("heatmap")}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                viewMode === "heatmap" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🔥 Mapa de Calor
            </button>
            <button
              type="button"
              onClick={() => setViewMode("both")}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                viewMode === "both" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🌐 Mixto
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">Filtrar:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-[11px] text-cyan-300 font-bold uppercase"
            >
              <option value="all">Todas ({alerts.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()} ({alerts.filter((a) => a.label === cat).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onLocateMe}
          disabled={locating}
          className="flex items-center gap-1.5 rounded bg-emerald-600/20 border border-emerald-500/50 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition shadow-sm disabled:opacity-50"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          {locating ? "Localizando..." : "🎯 Mi ubicación"}
        </button>
      </div>

      {/* Mapa ocupando toda la altura disponible */}
      <div className="flex-1 min-h-[440px] overflow-hidden rounded-lg border border-slate-800 relative shadow-inner">
        <MapContainer center={[cameraLocation.lat, cameraLocation.lng]} zoom={15} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={cameraLocation} />
          <ClickHandler onClick={onCameraLocationChange} />
          <FlyTo alert={selectedAlert} />

          {(viewMode === "heatmap" || viewMode === "both") && <HeatmapLayer points={filteredAlerts} />}

          <CircleMarker
            center={[cameraLocation.lat, cameraLocation.lng]}
            radius={9}
            pathOptions={{ color: "#22d3ee", fillColor: "#06b6d4", fillOpacity: 0.95, weight: 3 }}
          >
            <Tooltip permanent direction="top">
              📍 Sensor / Cámara Activa
            </Tooltip>
          </CircleMarker>

          {(viewMode === "markers" || viewMode === "both") &&
            filteredAlerts.map((a) => {
              const markerColor = CATEGORY_COLORS[a.label] || SEVERITY_COLORS[a.severity] || "#f97316";
              return (
                <CircleMarker
                  key={a.id}
                  center={[a.lat, a.lng]}
                  radius={selectedAlert?.id === a.id ? 12 : 8}
                  pathOptions={{
                    color: selectedAlert?.id === a.id ? "#ffffff" : markerColor,
                    fillColor: markerColor,
                    fillOpacity: 0.85,
                    weight: selectedAlert?.id === a.id ? 3 : 2,
                  }}
                  eventHandlers={{ click: () => onSelectAlert?.(a) }}
                >
                  <Popup>
                    <div className="text-slate-900 text-xs">
                      <strong className="text-sm block font-bold text-slate-950 mb-1">{a.title}</strong>
                      <p>
                        <strong>Categoría:</strong> <span className="uppercase font-semibold">{a.label || "Sin clasificar"}</span>
                      </p>
                      <p>
                        <strong>Severidad:</strong> <span className="uppercase font-semibold">{a.severity}</span>
                      </p>
                      <p>
                        <strong>Coordenadas:</strong> {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                        Registrado: {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-lg text-[10px] space-y-1 shadow-lg pointer-events-none">
          <p className="font-bold text-slate-300">Valledupar · {filteredAlerts.length} puntos en BD</p>
          <div className="flex items-center gap-3 pt-0.5">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-orange-500" /> Bache
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-yellow-400" /> Basura
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Crítico
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
