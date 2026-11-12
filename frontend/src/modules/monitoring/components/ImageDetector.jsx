import { useEffect, useState, useRef } from "react";
import { detectImage } from "../services.js";
import DetectionOverlay from "./DetectionOverlay.jsx";
import DetectionSummary from "./DetectionSummary.jsx";
import { getClasses, saveAnnotation } from "../../training/services.js";

export default function ImageDetector({ conf, location, onAlerts }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modo feedback / corrección manual
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [classes, setClasses] = useState(["bache", "basura", "semaforo_danado", "alcantarilla_abierta", "vandalismo"]);
  const [selectedClass, setSelectedClass] = useState("bache");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [manualBoxes, setManualBoxes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    getClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const onFile = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setLoading(true);
    setIsFeedbackMode(false);
    setManualBoxes([]);
    setFeedbackMsg(null);

    try {
      const data = await detectImage(selected, {
        conf,
        source: `Imagen: ${selected.name}`,
        lat: location.lat,
        lng: location.lng,
        cooldown: 0,
      });
      setResult(data);
      if (data.alerts?.length) onAlerts?.(data.alerts);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (!isFeedbackMode) return;
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    setCurrentBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;
    const { x, y } = getCoords(e);
    setCurrentBox((prev) => ({ ...prev, currentX: x, currentY: y }));
  };

  const activeCategoryName = isNewCategory ? newCategoryName.trim().toLowerCase().replace(/\s+/g, "_") : selectedClass;

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);

    const x1 = Math.min(currentBox.startX, currentBox.currentX);
    const y1 = Math.min(currentBox.startY, currentBox.currentY);
    const x2 = Math.max(currentBox.startX, currentBox.currentX);
    const y2 = Math.max(currentBox.startY, currentBox.currentY);
    const w = x2 - x1;
    const h = y2 - y1;

    if (w > 0.02 && h > 0.02) {
      const cat = activeCategoryName || "objeto";
      const newBox = {
        category_name: cat,
        className: cat,
        x_center: Number((x1 + w / 2).toFixed(4)),
        y_center: Number((y1 + h / 2).toFixed(4)),
        width: Number(w.toFixed(4)),
        height: Number(h.toFixed(4)),
      };
      setManualBoxes((prev) => [...prev, newBox]);
    }
    setCurrentBox(null);
  };

  const handleSaveFeedback = async () => {
    if (!file || manualBoxes.length === 0) {
      setFeedbackMsg({ type: "error", text: "Dibuja al menos un recuadro sobre el objeto." });
      return;
    }
    try {
      const res = await saveAnnotation(file, manualBoxes, { lat: location.lat, lng: location.lng });
      if (res.classes) setClasses(res.classes);
      setFeedbackMsg({
        type: "success",
        text: `¡Guardado exitoso! Registrado en SQL Server (alertas_territoriales) y dataset de entrenamiento.`,
      });
      setIsFeedbackMode(false);
      setManualBoxes([]);
      setIsNewCategory(false);
      setNewCategoryName("");
      onAlerts?.();
    } catch (e) {
      setFeedbackMsg({ type: "error", text: e.response?.data?.detail || e.message });
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        onChange={onFile}
        className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-urbix-700 file:px-3 file:py-2 file:text-white"
      />

      {preview && (
        /* Contenedor con altura fija exacta de 280px para que nunca desborde ni agrande el card */
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`relative h-[280px] w-full overflow-hidden rounded-lg bg-black select-none flex items-center justify-center ${
            isFeedbackMode ? "cursor-crosshair ring-2 ring-amber-500" : ""
          }`}
        >
          <img
            src={preview}
            alt="Imagen analizada"
            className="h-full w-full object-contain pointer-events-none select-none block"
          />

          {!isFeedbackMode && result && (
            <DetectionOverlay width={result.width} height={result.height} detections={result.detections} />
          )}

          {isFeedbackMode &&
            manualBoxes.map((b, idx) => (
              <div
                key={idx}
                className="absolute border-2 border-amber-400 bg-amber-500/20"
                style={{
                  left: `${(b.x_center - b.width / 2) * 100}%`,
                  top: `${(b.y_center - b.height / 2) * 100}%`,
                  width: `${b.width * 100}%`,
                  height: `${b.height * 100}%`,
                }}
              >
                <span className="bg-amber-500 text-[10px] font-bold text-black px-1 absolute -top-4 left-0 uppercase">
                  {b.className}
                </span>
              </div>
            ))}

          {isDrawing && currentBox && (
            <div
              className="absolute border-2 border-dashed border-cyan-400 bg-cyan-500/20"
              style={{
                left: `${Math.min(currentBox.startX, currentBox.currentX) * 100}%`,
                top: `${Math.min(currentBox.startY, currentBox.currentY) * 100}%`,
                width: `${Math.abs(currentBox.currentX - currentBox.startX) * 100}%`,
                height: `${Math.abs(currentBox.currentY - currentBox.startY) * 100}%`,
              }}
            />
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
              Analizando con IA...
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && !isFeedbackMode && <DetectionSummary detections={result.detections} />}

      {result && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-2.5">
          {!isFeedbackMode ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  ¿Nuestro modelo YOLO no reconoció la imagen o se equivocó?
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Puedes enseñarle cualquier elemento y asignarle una categoría para alimentarlo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFeedbackMode(true);
                  setFeedbackMsg(null);
                }}
                className="cursor-pointer rounded-lg bg-amber-600/20 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-600/30 transition"
              >
                ✏️ Enseñar y categorizar a YOLO
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
                <span className="text-xs text-amber-300 font-medium">
                  👉 Arrastra el ratón sobre la imagen para encerrar el objeto:
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Categoría:</span>
                  {!isNewCategory ? (
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsNewCategory(true);
                        } else {
                          setSelectedClass(e.target.value);
                        }
                      }}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-cyan-300 font-bold uppercase"
                    >
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </option>
                      ))}
                      <option value="__NEW__" className="text-amber-400 font-bold">
                        ➕ + Crear nueva categoría...
                      </option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej: poste_caido..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="rounded border border-amber-600 bg-slate-950 px-2 py-1 text-xs text-amber-200 outline-none w-32"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewCategory(false)}
                        className="text-xs text-slate-400 hover:text-slate-200 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {manualBoxes.length} elemento(s) marcado(s) como:{" "}
                  <strong className="text-amber-300 uppercase">{activeCategoryName || "sin definir"}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFeedbackMode(false);
                      setManualBoxes([]);
                      setIsNewCategory(false);
                    }}
                    className="cursor-pointer rounded px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFeedback}
                    disabled={manualBoxes.length === 0}
                    className="cursor-pointer rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
                  >
                    Guardar para reentrenar YOLO
                  </button>
                </div>
              </div>
            </div>
          )}

          {feedbackMsg && (
            <p
              className={`text-xs ${
                feedbackMsg.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {feedbackMsg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
