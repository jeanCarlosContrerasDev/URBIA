import { useState } from "react";
import ImageDetector from "./ImageDetector.jsx";
import RtspDetector from "./RtspDetector.jsx";
import VideoDetector from "./VideoDetector.jsx";

const TABS = [
  { id: "image", label: "Imagen" },
  { id: "webcam", label: "Webcam" },
  { id: "video", label: "Video" },
  { id: "rtsp", label: "RTSP / URL" },
];

export default function LiveFeed({ location, onAlerts }) {
  const [tab, setTab] = useState("image");
  const [conf, setConf] = useState(0.35);

  return (
    <div className="flex flex-col flex-1 h-full space-y-4">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-slate-950 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id ? "bg-urbix-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Confianza
          <input
            type="range" min="0.1" max="0.9" step="0.05" value={conf}
            onChange={(e) => setConf(Number(e.target.value))}
            className="accent-cyan-500"
          />
          <span className="w-8 text-slate-200">{Math.round(conf * 100)}%</span>
        </label>
      </div>

      <p className="shrink-0 text-xs text-slate-500">
        Ubicación: {location.lat.toFixed(4)}, {location.lng.toFixed(4)} — haz clic en el mapa para moverla.
      </p>

      {/* Contenedor flexible que llena la altura de la columna */}
      <div className="flex-1 flex flex-col justify-start">
        {tab === "image" && <ImageDetector key="image" conf={conf} location={location} onAlerts={onAlerts} />}
        {tab === "webcam" && <VideoDetector key="webcam" mode="webcam" conf={conf} location={location} onAlerts={onAlerts} />}
        {tab === "video" && <VideoDetector key="video" mode="file" conf={conf} location={location} onAlerts={onAlerts} />}
        {tab === "rtsp" && <RtspDetector key="rtsp" conf={conf} location={location} />}
      </div>
    </div>
  );
}
