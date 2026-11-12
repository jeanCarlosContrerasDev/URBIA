import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";

// Malla táctica dinámica sobre el mapa
function DynamicTacticalMesh({ enabled }) {
  const map = useMap();
  const gridRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (gridRef.current) {
        map.removeLayer(gridRef.current);
        gridRef.current = null;
      }
      return;
    }

    const drawGrid = () => {
      if (gridRef.current) map.removeLayer(gridRef.current);

      const bounds = map.getBounds();
      const latStep = (bounds.getNorth() - bounds.getSouth()) / 12;
      const lngStep = (bounds.getEast() - bounds.getWest()) / 14;

      const lines = [];
      for (let lat = bounds.getSouth(); lat <= bounds.getNorth(); lat += latStep) {
        lines.push([
          [lat, bounds.getWest()],
          [lat, bounds.getEast()],
        ]);
      }
      for (let lng = bounds.getWest(); lng <= bounds.getEast(); lng += lngStep) {
        lines.push([
          [bounds.getSouth(), lng],
          [bounds.getNorth(), lng],
        ]);
      }

      gridRef.current = L.polyline(lines, {
        color: "#22d3ee",
        weight: 1,
        opacity: 0.28,
        dashArray: "3, 6",
      }).addTo(map);
    };

    drawGrid();
    map.on("moveend", drawGrid);

    return () => {
      map.off("moveend", drawGrid);
      if (gridRef.current) map.removeLayer(gridRef.current);
    };
  }, [enabled, map]);

  return null;
}

// Capa de calor 100% de la BD
function RealHeatmapLayer({ points, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !points || points.length === 0) return;

    const heatData = points.map((p) => [
      p.lat,
      p.lng,
      p.severity === "critical" ? 1.0 : p.severity === "high" ? 0.8 : 0.45,
    ]);

    const heat = L.heatLayer(heatData, {
      radius: 38,
      blur: 24,
      maxZoom: 16,
      gradient: { 0.2: "#06b6d4", 0.5: "#eab308", 0.8: "#f97316", 1.0: "#ef4444" },
    }).addTo(map);

    return () => map.removeLayer(heat);
  }, [points, enabled, map]);

  return null;
}

// Recentrar cuando haya alertas si se desea
function MapAutoCenter({ alerts }) {
  const map = useMap();
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const first = alerts[0];
      map.setView([first.lat, first.lng], map.getZoom() || 15);
    }
  }, [alerts, map]);
  return null;
}

export default function WarRoomMasterMap({ alerts = [], showHeatmap = true, showMesh = true, mapTheme = "streets" }) {
  const defaultCenter = [10.4631, -73.2532]; // Valledupar

  // Proveedores de mapas libres SIN API KEY
  const providers = {
    // OpenStreetMap estándar libre (Muestra todas las calles, avenidas y barrios de Valledupar)
    streets: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      filter: "invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%)", // Estilo táctico oscuro sin costo
    },
    // Satélite real de Esri libre
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "&copy; Esri &mdash; Valledupar",
      filter: "none",
    },
    // Estándar claro sin filtros
    normal: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      filter: "none",
    },
  };

  const currentProvider = providers[mapTheme] || providers.streets;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={alerts.length > 0 ? [alerts[0].lat, alerts[0].lng] : defaultCenter}
        zoom={15}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution={currentProvider.attribution}
          url={currentProvider.url}
          className={mapTheme === "streets" ? "leaflet-tactical-tiles" : ""}
        />

        <MapAutoCenter alerts={alerts} />
        <DynamicTacticalMesh enabled={showMesh} />
        <RealHeatmapLayer points={alerts} enabled={showHeatmap} />

        {/* Marcadores reales con estilo neón */}
        {alerts.map((a) => {
          const isCrit = a.severity === "critical";
          const color = isCrit ? "#ef4444" : a.severity === "high" ? "#f97316" : "#06b6d4";

          return (
            <CircleMarker
              key={a.id}
              center={[a.lat, a.lng]}
              radius={isCrit ? 12 : 9}
              pathOptions={{
                color: "#ffffff",
                fillColor: color,
                fillOpacity: 1.0,
                weight: 2.5,
              }}
            >
              <Tooltip direction="top" permanent>
                {a.label ? a.label.toUpperCase() : "INCIDENCIA"} (ID #{a.id})
              </Tooltip>
              <Popup>
                <div className="text-slate-900 text-xs min-w-[200px]">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mb-1 bg-cyan-100 text-cyan-900">
                    SQL Server ID #{a.id}
                  </span>
                  <strong className="block text-sm font-bold text-slate-950 mb-1">{a.title}</strong>
                  <p><strong>Categoría:</strong> <span className="uppercase text-cyan-800 font-bold">{a.label || "Sin clasificar"}</span></p>
                  <p><strong>Severidad:</strong> <span className="uppercase font-semibold">{a.severity}</span></p>
                  <p><strong>Coordenadas:</strong> {a.lat.toFixed(5)}, {a.lng.toFixed(5)}</p>
                  <p className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                    Registrado: {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {alerts.length === 0 && (
        <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
          <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-900/60 p-4 rounded-xl text-center shadow-2xl">
            <p className="font-mono text-cyan-300 font-bold text-sm">
              BASE DE DATOS LIMPIA (0 ALERTAS EN SQL SERVER)
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Las alertas guardadas en el Centro de Monitoreo aparecerán automáticamente aquí.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
