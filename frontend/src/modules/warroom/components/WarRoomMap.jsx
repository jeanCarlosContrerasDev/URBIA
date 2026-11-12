import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";

// Geocercas estratégicas predefinidas para Valledupar
export const GEOFENCES_VALLEDUPAR = [
  {
    id: "centro",
    name: "Geocerca Comuna 1 · Centro Histórico",
    center: [10.4631, -73.2532],
    radius: 950,
    color: "#3b82f6",
    description: "Zona colonial, comercial y gubernamental (Plaza Alfonso López).",
  },
  {
    id: "norte",
    name: "Geocerca Comuna 6 · Corredor Norte / Hurtado",
    center: [10.4890, -73.2680],
    radius: 1200,
    color: "#06b6d4",
    description: "Parque La Pilonera Mayor, Balneario Hurtado y río Guatapurí.",
  },
  {
    id: "sur",
    name: "Geocerca Comuna 3 · Eje Sur / Av. Simón Bolívar",
    center: [10.4510, -73.2480],
    radius: 1100,
    color: "#eab308",
    description: "Zona industrial y corredor de alto tránsito vehicular.",
  },
];

function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || !points.length) return;
    const heatData = points.map((p) => [
      p.lat,
      p.lng,
      p.severity === "critical" ? 1.0 : p.severity === "high" ? 0.75 : p.severity === "medium" ? 0.5 : 0.3,
    ]);
    const heat = L.heatLayer(heatData, {
      radius: 35,
      blur: 22,
      maxZoom: 16,
      gradient: { 0.2: "#06b6d4", 0.5: "#eab308", 0.8: "#f97316", 1.0: "#ef4444" },
    }).addTo(map);

    return () => map.removeLayer(heat);
  }, [points, map]);
  return null;
}

export default function WarRoomMap({ alerts = [], showHeatmap = true, showGeofences = true, activeGeofenceId = "all" }) {
  const defaultCenter = [10.4631, -73.2532]; // Valledupar Centro

  const visibleGeofences =
    activeGeofenceId === "all"
      ? GEOFENCES_VALLEDUPAR
      : GEOFENCES_VALLEDUPAR.filter((g) => g.id === activeGeofenceId);

  return (
    <div className="h-full w-full relative">
      <MapContainer center={defaultCenter} zoom={14} className="h-full w-full" zoomControl={true}>
        {/* Capa de satélite / mapa oscuro estilizado para sala de guerra */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {showHeatmap && <HeatmapLayer points={alerts} />}

        {/* Geocercas Volumétricas en 2D interactivo */}
        {showGeofences &&
          visibleGeofences.map((geo) => (
            <Circle
              key={geo.id}
              center={geo.center}
              radius={geo.radius}
              pathOptions={{
                color: geo.color,
                fillColor: geo.color,
                fillOpacity: 0.12,
                weight: 2,
                dashArray: "6, 6",
              }}
            >
              <Tooltip direction="top" permanent>
                🛡️ {geo.name}
              </Tooltip>
              <Popup>
                <div className="text-slate-900 text-xs">
                  <strong className="block text-sm font-bold text-slate-950 mb-1">{geo.name}</strong>
                  <p>{geo.description}</p>
                  <p className="mt-1 font-semibold text-cyan-700">Radio de contención: {geo.radius}m</p>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* Marcadores de Alertas en Tiempo Real desde SQL Server */}
        {alerts.map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.lat, a.lng]}
            radius={a.severity === "critical" ? 10 : 7}
            pathOptions={{
              color: "#ffffff",
              fillColor: a.severity === "critical" ? "#ef4444" : "#f97316",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-slate-900 text-xs">
                <strong className="block text-sm font-bold text-slate-950 mb-1">{a.title}</strong>
                <p><strong>Categoría:</strong> {a.label || "Sin clasificar"}</p>
                <p><strong>Severidad:</strong> {a.severity.toUpperCase()}</p>
                <p className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

