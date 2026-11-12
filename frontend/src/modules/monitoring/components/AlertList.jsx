const SEVERITY = {
  low: "bg-slate-600/30 text-slate-300",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-600/20 text-red-400",
};

export default function AlertList({ alerts, selectedId, onSelect, onDelete, newIds = new Set() }) {
  if (!alerts.length) return <p className="text-sm text-slate-400 p-2">Sin alertas registradas.</p>;

  return (
    <ul className="max-h-96 divide-y divide-slate-800 overflow-y-auto">
      {alerts.map((a) => (
        <li
          key={a.id}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 transition group hover:bg-slate-800/60 ${
            selectedId === a.id ? "bg-slate-800" : ""
          } ${newIds.has(a.id) ? "animate-pulse" : ""}`}
        >
          {/* Zona cliqueable para enfocar en mapa */}
          <div
            onClick={() => onSelect?.(a)}
            className="min-w-0 flex-1 cursor-pointer"
          >
            <p className="truncate text-sm font-medium text-slate-200 group-hover:text-cyan-400 transition">
              {a.title}
            </p>
            <p className="text-xs text-slate-500">
              {a.lat.toFixed(4)}, {a.lng.toFixed(4)} · {new Date(a.created_at).toLocaleTimeString()}
              {a.confidence != null && ` · ${(a.confidence * 100).toFixed(0)}% conf.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full px-2 py-0.5 text-xs uppercase font-semibold ${SEVERITY[a.severity]}`}>
              {a.severity}
            </span>

            {/* Botón para eliminar individualmente */}
            <button
              type="button"
              title="Eliminar esta alerta de SQL Server"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`¿Eliminar la alerta "${a.title}" de la base de datos?`)) {
                  onDelete?.(a.id);
                }
              }}
              className="cursor-pointer rounded p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
