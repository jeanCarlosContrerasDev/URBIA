import { useEffect, useRef, useState } from "react";
import { useFrameDetector } from "../useFrameDetector.js";
import DetectionOverlay from "./DetectionOverlay.jsx";
import DetectionSummary from "./DetectionSummary.jsx";

/**
 * Detección sobre video en el navegador.
 * mode="webcam": cámara del equipo (getUserMedia).
 * mode="file":   archivo de video local.
 */
export default function VideoDetector({ mode, conf, location, onAlerts }) {
  const videoRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [camError, setCamError] = useState(null);

  const source = mode === "webcam" ? "Webcam" : `Video: ${fileName}`;
  const { result, fps, error } = useFrameDetector(videoRef, {
    enabled: running,
    conf,
    source,
    lat: location.lat,
    lng: location.lng,
    onAlerts,
  });

  // Webcam: abrir / cerrar la cámara
  useEffect(() => {
    if (mode !== "webcam" || !running) return;
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s;
        videoRef.current.srcObject = s;
        videoRef.current.play();
        setCamError(null);
      })
      .catch((e) => {
        setCamError(`No se pudo acceder a la cámara: ${e.message}`);
        setRunning(false);
      });
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [mode, running]);

  useEffect(() => () => videoUrl && URL.revokeObjectURL(videoUrl), [videoUrl]);

  // Video: reproducir al iniciar el análisis
  useEffect(() => {
    if (mode === "file" && running && videoRef.current?.paused) videoRef.current.play();
  }, [mode, running]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRunning(false);
    setFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
  };

  const showVideo = mode === "webcam" ? running : !!videoUrl;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "file" && (
          <input
            type="file"
            accept="video/*"
            onChange={onFile}
            className="block flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
          />
        )}
        <button
          onClick={() => setRunning((r) => !r)}
          disabled={mode === "file" && !videoUrl}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40 ${
            running ? "bg-red-600 hover:bg-red-500" : "bg-urbix-700 hover:bg-urbix-600"
          }`}
        >
          {running ? "Detener análisis" : mode === "webcam" ? "Iniciar webcam" : "Analizar video"}
        </button>
        {running && result && (
          <span className="text-xs text-slate-400">{fps.toFixed(1)} análisis/s</span>
        )}
      </div>

      {showVideo && (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={mode === "file" ? videoUrl : undefined}
            className="block h-auto w-full"
            muted
            playsInline
            loop={mode === "file"}
            controls={mode === "file"}
            onPlay={() => mode === "file" && setRunning(true)}
          />
          {running && result && (
            <DetectionOverlay width={result.width} height={result.height} detections={result.detections} />
          )}
          {running && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-xs font-bold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> EN VIVO
            </span>
          )}
        </div>
      )}

      {(camError || error) && <p className="text-sm text-red-400">{camError || error}</p>}
      {running && result && <DetectionSummary detections={result.detections} />}
      {mode === "file" && !videoUrl && (
        <p className="text-xs text-slate-500">Selecciona un video (mp4, webm…). Se analiza en tu navegador frame a frame.</p>
      )}
    </div>
  );
}
