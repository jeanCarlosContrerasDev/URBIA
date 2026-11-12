import { useState } from "react";
import { buildStreamUrl } from "../services.js";

/**
 * Streams procesados en el servidor: RTSP, HTTP/MJPEG, archivo del servidor
 * o índice de cámara local del servidor (0, 1…). El backend dibuja los
 * recuadros y genera las alertas; aquí solo se muestra el MJPEG resultante.
 */
export default function RtspDetector({ conf, location }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("Cámara RTSP");
  const [src, setSrc] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | live | error

  const connect = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus("connecting");
    setSrc(buildStreamUrl({ url: url.trim(), conf, source: name, lat: location.lat, lng: location.lng }));
  };

  const stop = () => {
    setSrc(null);
    setStatus("idle");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={connect} className="space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="rtsp://usuario:clave@192.168.1.10:554/stream1"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-urbix-500"
        />
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la cámara"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-urbix-500"
          />
          {src ? (
            <button type="button" onClick={stop} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500">
              Desconectar
            </button>
          ) : (
            <button type="submit" className="rounded-lg bg-urbix-700 px-4 py-2 text-sm font-medium hover:bg-urbix-600">
              Conectar
            </button>
          )}
        </div>
      </form>

      {src && (
        <div className="relative min-h-40 overflow-hidden rounded-lg bg-black">
          <img
            src={src}
            alt="Stream procesado"
            className="block h-auto w-full"
            onLoad={() => setStatus("live")}
            onError={() => {
              setStatus("error");
              setSrc(null);
            }}
          />
          {status === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              Conectando con el stream…
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-red-400">No se pudo abrir el stream. Verifica la URL y que el servidor tenga acceso a la cámara.</p>
      )}
      <p className="text-xs text-slate-500">
        Acepta <code>rtsp://</code>, <code>http://</code> (MJPEG/HLS), una ruta de archivo del servidor o un índice de cámara
        del servidor (<code>0</code>). El servidor procesa el video y genera las alertas.
      </p>
    </div>
  );
}

