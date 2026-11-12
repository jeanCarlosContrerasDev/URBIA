import { useEffect, useRef, useState } from "react";
import { detectImage } from "./services.js";

const MAX_WIDTH = 640; // los frames se reducen para ahorrar ancho de banda y CPU

/**
 * Captura frames de un <video> en bucle y los envía a YOLO.
 * El siguiente frame se envía solo cuando llega la respuesta del anterior
 * (control de contrapresión), con un intervalo mínimo `intervalMs`.
 */
export function useFrameDetector(videoRef, { enabled, intervalMs = 400, conf, source, lat, lng, onAlerts }) {
  const [result, setResult] = useState(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);
  const optsRef = useRef({});
  optsRef.current = { conf, source, lat, lng, onAlerts };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer;
    const canvas = document.createElement("canvas");

    const tick = async () => {
      const video = videoRef.current;
      const started = performance.now();
      if (video && video.readyState >= 2 && !video.paused && video.videoWidth) {
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.75));
        try {
          const { conf, source, lat, lng, onAlerts } = optsRef.current;
          const data = await detectImage(blob, { conf, source, lat, lng });
          if (cancelled) return;
          setResult(data);
          setError(null);
          setFps(1000 / (performance.now() - started));
          if (data.alerts?.length) onAlerts?.(data.alerts);
        } catch (e) {
          if (!cancelled) setError(e.response?.data?.detail || e.message);
        }
      }
      if (!cancelled) {
        const wait = Math.max(0, intervalMs - (performance.now() - started));
        timer = setTimeout(tick, wait);
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, intervalMs, videoRef]);

  useEffect(() => {
    if (!enabled) setResult(null);
  }, [enabled]);

  return { result, fps, error };
}

