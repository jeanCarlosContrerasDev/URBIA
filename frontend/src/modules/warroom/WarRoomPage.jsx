import { useEffect, useState } from "react";
import { getAlerts } from "../monitoring/services.js";
import WarRoomMasterMap from "./components/WarRoomMasterMap.jsx";
import WarRoomTacticalDisplay from "./components/WarRoomTacticalDisplay.jsx";

export default function WarRoomPage() {
  const [alerts, setAlerts] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [mapTheme, setMapTheme] = useState("tactical"); // 'streets' | 'satellite' | 'normal' | 'tactical'

  useEffect(() => {
    const fetchAlerts = () => {
      getAlerts(500).then(setAlerts).catch(console.error);
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalBaches = alerts.filter((a) => (a.label || "").toLowerCase().includes("bache")).length;
  const totalCriticos = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Cabecera Táctica */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-cyan-900/60 p-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <h1 className="text-base font-black tracking-wider text-cyan-300 uppercase">
              SALA DE GUERRA TERRITORIAL · VALLEDUPAR
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              CONEXIÓN DIRECTA A SQL SERVER (`URBIXIA.dbo.alertas_territoriales`)
            </p>
          </div>
        </div>

        {/* Indicadores Tácticos de la Base de Datos */}
        <div className="flex items-center gap-2.5 font-mono">
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-bold">Registros en BD</span>
            <span className="text-sm font-black text-cyan-400">{alerts.length}</span>
          </div>
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-bold">Baches</span>
            <span className="text-sm font-black text-orange-400">{totalBaches}</span>
          </div>
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-bold">Críticos</span>
            <span className="text-sm font-black text-red-400">{totalCriticos}</span>
          </div>
        </div>
      </div>

      {/* Controles de Capas y Temas */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-lg text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono uppercase text-[11px]">Estilo Cartográfico:</span>
          <div className="flex rounded bg-slate-900 p-0.5 border border-slate-800">
            <button
              onClick={() => setMapTheme("tactical")}
              className={`rounded px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                mapTheme === "tactical"
                  ? "bg-cyan-600 text-white shadow-[0_0_10px_#06b6d4]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⬡ Cuadrantes Tácticos
            </button>
            <button
              onClick={() => setMapTheme("streets")}
              className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                mapTheme === "streets" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🌑 Táctico Urbano
            </button>
            <button
              onClick={() => setMapTheme("satellite")}
              className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                mapTheme === "satellite" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🛰️ Satelital Esri
            </button>
            <button
              onClick={() => setMapTheme("normal")}
              className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                mapTheme === "normal" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              🗺️ OpenStreetMap
            </button>
          </div>
        </div>

        {mapTheme !== "tactical" ? (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-amber-300 transition">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 accent-amber-500 cursor-pointer"
              />
              🔥 Mapa de Calor
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-cyan-300 transition">
              <input
                type="checkbox"
                checked={showMesh}
                onChange={(e) => setShowMesh(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 accent-cyan-500 cursor-pointer"
              />
              🌐 Malla Táctica
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-mono">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            VISTA TÁCTICA VECTORIAL ACTIVA
          </div>
        )}
      </div>

      {/* MAPA MASTER / VISTA TÁCTICA */}
      <div className="flex-1 min-h-[560px] w-full rounded-2xl overflow-hidden border border-cyan-950/80 bg-slate-950 relative shadow-2xl">
        {mapTheme === "tactical" ? (
          <WarRoomTacticalDisplay alerts={alerts} />
        ) : (
          <WarRoomMasterMap
            alerts={alerts}
            showHeatmap={showHeatmap}
            showMesh={showMesh}
            mapTheme={mapTheme}
          />
        )}
      </div>
    </div>
  );
}
