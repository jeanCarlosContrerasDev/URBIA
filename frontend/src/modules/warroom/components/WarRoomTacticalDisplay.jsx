import { useState, useMemo } from "react";

// Límites geográficos de Valledupar para proyección en lienzo SVG
const GEO_BOUNDS = {
  minLat: 10.430,
  maxLat: 10.495,
  minLng: -73.285,
  maxLng: -73.220,
};

function geoToSvg(lat, lng) {
  const clampLat = Math.max(GEO_BOUNDS.minLat, Math.min(GEO_BOUNDS.maxLat, lat));
  const clampLng = Math.max(GEO_BOUNDS.minLng, Math.min(GEO_BOUNDS.maxLng, lng));

  const x = 140 + ((clampLng - GEO_BOUNDS.minLng) / (GEO_BOUNDS.maxLng - GEO_BOUNDS.minLng)) * 700;
  const y = 580 - ((clampLat - GEO_BOUNDS.minLat) / (GEO_BOUNDS.maxLat - GEO_BOUNDS.minLat)) * 460;

  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

// Cuadrantes operacionales tácticos de Valledupar
const MASTER_ZONES = [
  { id: "c01", name: "CUADRANTE 01", lat: 10.485, lng: -73.255, reference: "Sector Norte" },
  { id: "c02", name: "CUADRANTE 02", lat: 10.465, lng: -73.275, reference: "Sector Noroccidental" },
  { id: "c03", name: "CUADRANTE 03", lat: 10.465, lng: -73.250, reference: "Sector Central" },
  { id: "c04", name: "CUADRANTE 04", lat: 10.458, lng: -73.235, reference: "Sector Oriental" },
  { id: "c05", name: "CUADRANTE 05", lat: 10.440, lng: -73.255, reference: "Sector Sur" },
  { id: "c06", name: "CUADRANTE 06", lat: 10.450, lng: -73.270, reference: "Sector Suroccidental" },
  { id: "c07", name: "CUADRANTE 07", lat: 10.475, lng: -73.240, reference: "Sector Nororiental" },
];

function generateHexagon(x, y, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    points.push(`${(x + r * Math.cos(angle)).toFixed(1)},${(y + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(" ");
}

export default function WarRoomTacticalDisplay({ alerts = [] }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [filterType, setFilterType] = useState("all");

  // 1. Proyectar alertas reales a coordenadas SVG
  const mappedAlerts = useMemo(() => {
    return alerts.map((a, idx) => {
      const { x, y } = geoToSvg(a.lat, a.lng);
      const labelLower = (a.label || "").toLowerCase();
      const isCrit = a.severity === "critical";

      const letter =
        labelLower.includes("bache") ? "B" :
        labelLower.includes("basura") ? "L" :
        labelLower.includes("semaforo") ? "S" :
        isCrit ? "Q" : "D";

      const type =
        isCrit ? "critico" :
        labelLower.includes("bache") ? "bache" :
        labelLower.includes("basura") ? "basura" : "general";

      return {
        ...a,
        px: x,
        py: y,
        letter,
        type,
        colorIndex: idx % 3,
      };
    });
  }, [alerts]);

  const filteredAlerts = mappedAlerts.filter((a) => {
    if (filterType === "all") return true;
    if (filterType === "bache") return a.type === "bache";
    if (filterType === "basura") return a.type === "basura";
    if (filterType === "critico") return a.severity === "critical";
    return true;
  });

  // 2. AGRUPACIÓN DINÁMICA ESTRICTA: Solo cuadrantes que realmente tienen alertas en la BD
  const activeClusters = useMemo(() => {
    if (filteredAlerts.length === 0) return [];

    // Asignar cada alerta real a su zona geográfica más cercana en Valledupar
    const clustersMap = new Map();

    filteredAlerts.forEach((alert) => {
      let nearestZone = MASTER_ZONES[0];
      let minDist = Infinity;

      MASTER_ZONES.forEach((zone) => {
        const dist = Math.hypot(alert.lat - zone.lat, alert.lng - zone.lng);
        if (dist < minDist) {
          minDist = dist;
          nearestZone = zone;
        }
      });

      if (!clustersMap.has(nearestZone.id)) {
        clustersMap.set(nearestZone.id, {
          zone: nearestZone,
          alerts: [],
        });
      }
      clustersMap.get(nearestZone.id).alerts.push(alert);
    });

    // Calcular centroide real y dimensiones según la dispersión de las alertas del grupo
    return Array.from(clustersMap.values()).map(({ zone, alerts: clusterAlerts }) => {
      const avgX = clusterAlerts.reduce((sum, a) => sum + a.px, 0) / clusterAlerts.length;
      const avgY = clusterAlerts.reduce((sum, a) => sum + a.py, 0) / clusterAlerts.length;

      // Calcular radio según cantidad y dispersión real
      let maxDist = 0;
      clusterAlerts.forEach((a) => {
        const d = Math.hypot(a.px - avgX, a.py - avgY);
        if (d > maxDist) maxDist = d;
      });

      const rx = Math.max(75, Math.min(130, maxDist + 45));
      const ry = Math.max(50, Math.min(85, maxDist * 0.6 + 35));

      return {
        id: zone.id,
        name: zone.name,
        reference: zone.reference,
        cx: avgX,
        cy: avgY,
        rx,
        ry,
        count: clusterAlerts.length,
        alerts: clusterAlerts,
      };
    });
  }, [filteredAlerts]);

  // 3. Malla de fondo general (azul marino tenue)
  const bgHexGrid = useMemo(() => {
    const hexes = [];
    const r = 20;
    const dx = r * Math.sqrt(3);
    const dy = r * 1.5;
    const cols = 28;
    const rows = 18;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * dx + (row % 2 === 1 ? dx / 2 : 0) + 40;
        const y = row * dy + 60;
        hexes.push({
          id: `bg-${col}-${row}`,
          points: generateHexagon(x, y, r),
        });
      }
    }
    return hexes;
  }, []);

  // 4. CLUSTERS DE HEXÁGONOS COBRIZOS: Se generan ÚNICAMENTE alrededor de los cuadrantes con datos reales
  const dynamicHexagons = useMemo(() => {
    if (activeClusters.length === 0) return [];

    const hexes = [];
    const r = 18;
    const dx = r * Math.sqrt(3);
    const dy = r * 1.5;
    const shades = ["#382015", "#442417", "#2e1810", "#4d2215", "#26140d", "#522516"];

    activeClusters.forEach((cluster, cIdx) => {
      // Rejilla ajustada a la extensión real del cluster
      const colsSpan = Math.ceil(cluster.rx / dx) + 1;
      const rowsSpan = Math.ceil(cluster.ry / dy) + 1;

      for (let ro = -rowsSpan; ro <= rowsSpan; ro++) {
        for (let co = -colsSpan; co <= colsSpan; co++) {
          const x = cluster.cx + co * dx + (Math.abs(ro) % 2 === 1 ? dx / 2 : 0);
          const y = cluster.cy + ro * dy;

          const normX = (x - cluster.cx) / cluster.rx;
          const normY = (y - cluster.cy) / cluster.ry;

          if (normX * normX + normY * normY <= 1) {
            // Verificar si una alerta real coincide con este hexágono
            let nearestAlert = null;
            for (const a of cluster.alerts) {
              if (Math.hypot(x - a.px, y - a.py) < 30) {
                nearestAlert = a;
                break;
              }
            }

            const baseColor = shades[(Math.abs(ro * 3 + co * 5 + cIdx)) % shades.length];

            hexes.push({
              id: `cluster-${cluster.id}-${ro}-${co}`,
              points: generateHexagon(x, y, r),
              baseColor,
              heatAlert: nearestAlert,
            });
          }
        }
      }
    });

    return hexes;
  }, [activeClusters]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050c14] text-slate-200 select-none overflow-hidden rounded-xl border border-cyan-950 shadow-2xl">
      {/* Barra Superior con Métricas Reales de la Base de Datos */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#03080f]/90 border-b border-cyan-950 text-xs z-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
            ALERTAS REALES EN BD ({alerts.length}) · CUADRANTES ACTIVOS ({activeClusters.length}):
          </span>
          <div className="flex rounded bg-[#091522] p-0.5 border border-cyan-900/50">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                filterType === "all" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              TODAS ({alerts.length})
            </button>
            <button
              onClick={() => setFilterType("bache")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                filterType === "bache" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              BACHES ({alerts.filter((a) => (a.label || "").toLowerCase().includes("bache")).length})
            </button>
            <button
              onClick={() => setFilterType("critico")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                filterType === "critico" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              CRÍTICOS ({alerts.filter((a) => a.severity === "critical").length})
            </button>
          </div>
        </div>

        {/* Leyenda Táctica */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-cyan-400 inline-block" /> Incidente Real
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-orange-500 inline-block" /> Bache Alta Prioridad
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500 inline-block shadow-[0_0_8px_#ef4444]" /> Crítico
          </span>
        </div>
      </div>

      {/* SVG Canvas Proyectado Estrictamente según la Data Real */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 980 660"
          className="w-full h-full object-contain"
          style={{ background: "radial-gradient(circle at 50% 50%, #071625 0%, #030810 100%)" }}
        >
          <defs>
            <radialGradient id="hexHeatRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#991b1b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#450a0a" stopOpacity="0.1" />
            </radialGradient>

            <radialGradient id="hexHeatOrange" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#9a3412" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#431407" stopOpacity="0.1" />
            </radialGradient>

            <filter id="tacticalGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Malla base general tenue de Valledupar */}
          <g id="bg-mesh" opacity="0.35">
            {bgHexGrid.map((h) => (
              <polygon
                key={h.id}
                points={h.points}
                fill="none"
                stroke="#0e2a44"
                strokeWidth="0.6"
              />
            ))}
          </g>

          {/* 2. Geocerca Perimetral Exterior de Valledupar */}
          <polygon
            points="140,240 370,120 730,125 870,210 890,460 740,610 330,620 120,500 70,340"
            fill="none"
            stroke="#0e7490"
            strokeWidth="1.8"
            strokeDasharray="9 6"
            strokeOpacity="0.6"
          />

          {/* 3. CLUSTERS DE HEXÁGONOS COBRIZOS (Solo donde hay datos reales) */}
          <g id="active-hex-clusters">
            {dynamicHexagons.map((h) => {
              const alert = h.heatAlert;
              const isCrit = alert && alert.severity === "critical";

              return (
                <polygon
                  key={h.id}
                  points={h.points}
                  fill={
                    alert
                      ? isCrit
                        ? "url(#hexHeatRed)"
                        : "url(#hexHeatOrange)"
                      : h.baseColor
                  }
                  stroke={alert ? (isCrit ? "#ef4444" : "#f97316") : "#542817"}
                  strokeWidth={alert ? "1.6" : "0.7"}
                  strokeOpacity={alert ? 0.95 : 0.65}
                />
              );
            })}
          </g>

          {/* 4. PERÍMETRO Y RÓTULO DINÁMICO DE CADA CUADRANTE ACTIVO */}
          {activeClusters.map((cluster) => (
            <g
              key={cluster.id}
              onClick={() => setSelectedCluster(cluster)}
              className="cursor-pointer group"
            >
              <ellipse
                cx={cluster.cx}
                cy={cluster.cy}
                rx={cluster.rx}
                ry={cluster.ry}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="5 5"
                strokeOpacity="0.75"
              />

              {/* Rótulo con el conteo REAL de registros en BD */}
              <text
                x={cluster.cx}
                y={cluster.cy - cluster.ry - 8}
                textAnchor="middle"
                fill="#93c5fd"
                fontSize="12"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="1.5"
                className="group-hover:fill-cyan-300 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              >
                {cluster.name} - {cluster.count}
              </text>
            </g>
          ))}

          {/* 5. VECTORES TÁCTICOS CONECTORES HACIA CUADRANTES ACTIVOS */}
          {activeClusters.map((cluster, i) => (
            <g key={`vector-${cluster.id}`}>
              <line
                x1="220"
                y1="560"
                x2={cluster.cx}
                y2={cluster.cy}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeOpacity="0.35"
                strokeDasharray="4 4"
              />
              <circle
                cx={cluster.cx - 25}
                cy={cluster.cy + cluster.ry * 0.5}
                r="8"
                fill="#030810"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <circle
                cx={cluster.cx - 25}
                cy={cluster.cy + cluster.ry * 0.5}
                r="3.5"
                fill="#f59e0b"
              />
              <text
                x={cluster.cx - 12}
                y={cluster.cy + cluster.ry * 0.5 + 4}
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                V-{String(i * 4 + 3).padStart(2, "0")}
              </text>
            </g>
          ))}

          {/* 6. PUNTOS REALES DE ALERTAS (EXACTAMENTE 1 NODO POR CADA REGISTRO EN SQL SERVER) */}
          <g id="incident-dots">
            {filteredAlerts.length === 0 ? (
              <g transform="translate(490, 330)">
                <rect
                  x="-200"
                  y="-32"
                  width="400"
                  height="64"
                  rx="10"
                  fill="#030810"
                  stroke="#0e7490"
                  strokeDasharray="4 4"
                  fillOpacity="0.9"
                />
                <text
                  textAnchor="middle"
                  y="2"
                  fill="#38bdf8"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SIN CUADRANTES ACTIVOS (0 ALERTAS EN BD)
                </text>
                <text
                  textAnchor="middle"
                  y="20"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  Registra incidencias en Monitoreo para agruparlas aquí
                </text>
              </g>
            ) : (
              filteredAlerts.map((a) => {
                const isCrit = a.severity === "critical";
                const isHigh = a.severity === "high";
                const isSelected = selectedIncident?.id === a.id;

                const dotColor = isCrit
                  ? "#ef4444"
                  : isHigh
                  ? "#f97316"
                  : a.colorIndex === 0
                  ? "#38bdf8"
                  : a.colorIndex === 1
                  ? "#0284c7"
                  : "#fbbf24";

                return (
                  <g
                    key={a.id}
                    transform={`translate(${a.px}, ${a.py})`}
                    onClick={() => setSelectedIncident(a)}
                    className="cursor-pointer transition-transform hover:scale-150"
                  >
                    {/* Halo de calor */}
                    <circle
                      r={isCrit ? "26" : "18"}
                      fill={dotColor}
                      fillOpacity={isCrit ? "0.4" : "0.22"}
                      filter="url(#tacticalGlow)"
                    />

                    {isCrit && (
                      <circle
                        r="18"
                        fill="#ef4444"
                        fillOpacity="0.45"
                        className="animate-ping"
                      />
                    )}

                    {/* Nodo central */}
                    <circle
                      r={isCrit ? "10" : "8.5"}
                      fill={dotColor}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "2.5" : "1.2"}
                    />

                    {/* Letra del nodo */}
                    <text
                      y="3.2"
                      textAnchor="middle"
                      fill={isCrit ? "#ffffff" : dotColor === "#fbbf24" ? "#1e293b" : "#ffffff"}
                      fontSize={isCrit ? "9" : "8"}
                      fontFamily="monospace"
                      fontWeight="900"
                    >
                      {a.letter}
                    </text>
                  </g>
                );
              })
            )}
          </g>
        </svg>

        {/* HUD Flotante: Detalle de Alerta Seleccionada (Data de SQL Server) */}
        {selectedIncident && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-slate-950/95 border border-cyan-800 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">
                ID #{selectedIncident.id} · REGISTRO REAL BD
              </span>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <strong className="block text-sm font-sans font-bold text-white mb-2">
              {selectedIncident.title}
            </strong>
            <p className="text-slate-300">
              <span className="text-slate-500">CATEGORÍA:</span>{" "}
              <strong className="text-orange-400 uppercase">
                {selectedIncident.label || "BACHE"}
              </strong>
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">SEVERIDAD:</span>{" "}
              <span
                className={`font-bold uppercase ${
                  selectedIncident.severity === "critical"
                    ? "text-red-400"
                    : selectedIncident.severity === "high"
                    ? "text-orange-400"
                    : "text-cyan-400"
                }`}
              >
                {selectedIncident.severity}
              </span>
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">COORDENADAS:</span>{" "}
              {selectedIncident.lat?.toFixed(5)}, {selectedIncident.lng?.toFixed(5)}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">ORIGEN:</span> {selectedIncident.source}
            </p>
            <p className="text-[10px] text-slate-500 mt-2 border-t border-slate-800 pt-1">
              FECHA: {new Date(selectedIncident.created_at).toLocaleString()}
            </p>
          </div>
        )}

        {/* HUD Flotante: Cuadrante Dinámico Seleccionado */}
        {selectedCluster && (
          <div className="absolute bottom-4 left-4 z-20 w-80 bg-slate-950/95 border border-cyan-800/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-cyan-400 font-bold">{selectedCluster.name}</span>
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <strong className="block text-sm font-sans font-bold text-cyan-200">
              {selectedCluster.name}
            </strong>
            <p className="text-slate-400 text-[11px] mt-1">
              Referencia territorial: {selectedCluster.reference}
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-between text-[11px]">
              <span className="text-slate-500">Registros reales agrupados:</span>
              <span className="text-orange-400 font-bold">
                {selectedCluster.count} alerta(s) en SQL Server
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}