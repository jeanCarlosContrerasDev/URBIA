import { useState, useRef, useEffect } from "react";
import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { getClasses, getStats, getStatus, saveAnnotation, startTraining } from "./services.js";

export default function TrainingPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(0);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState(null);
  const [epochs, setEpochs] = useState(20);
  const [file, setFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [msg, setMsg] = useState(null);

  const containerRef = useRef(null);

  const reloadData = () => {
    getClasses().then(setClasses).catch(console.error);
    getStats().then(setStats).catch(console.error);
    getStatus().then(setStatus).catch(console.error);
  };

  useEffect(() => {
    reloadData();
    const interval = setInterval(() => {
      getStatus().then(setStatus).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImageSrc(URL.createObjectURL(selected));
    setBoxes([]);
    setCurrentBox(null);
    setMsg(null);
  };

  // Coordenadas relativas al contenedor (0.0 a 1.0)
  const getCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    setCurrentBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;
    const { x, y } = getCoords(e);
    setCurrentBox((prev) => ({ ...prev, currentX: x, currentY: y }));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);

    const x1 = Math.min(currentBox.startX, currentBox.currentX);
    const y1 = Math.min(currentBox.startY, currentBox.currentY);
    const x2 = Math.max(currentBox.startX, currentBox.currentX);
    const y2 = Math.max(currentBox.startY, currentBox.currentY);

    const w = x2 - x1;
    const h = y2 - y1;

    // Ignorar clics diminutos accidentales
    if (w > 0.02 && h > 0.02) {
      const newBox = {
        class_id: selectedClass,
        className: classes[selectedClass],
        x_center: Number((x1 + w / 2).toFixed(4)),
        y_center: Number((y1 + h / 2).toFixed(4)),
        width: Number(w.toFixed(4)),
        height: Number(h.toFixed(4)),
      };
      setBoxes([...boxes, newBox]);
    }
    setCurrentBox(null);
  };

  const handleSaveSample = async () => {
    if (!file || boxes.length === 0) {
      setMsg({ type: "error", text: "Debes dibujar al menos un recuadro sobre la imagen antes de guardar." });
      return;
    }
    try {
      await saveAnnotation(file, boxes);
      setMsg({ type: "success", text: "¡Muestra guardada en el dataset de entrenamiento!" });
      setFile(null);
      setImageSrc(null);
      setBoxes([]);
      reloadData();
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.detail || e.message });
    }
  };

  const handleStartTraining = async () => {
    try {
      await startTraining(epochs);
      setMsg({ type: "success", text: "Entrenamiento iniciado en segundo plano." });
      reloadData();
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.detail || e.message });
    }
  };

  return (
    <>
      <PageHeader
        title="Estudio de Entrenamiento IA"
        subtitle="Alimenta el modelo con fotos de baches, alcantarillas o basura y reentrena YOLO directamente"
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Columna 1 y 2: Espacio de Etiquetado Interactivo */}
        <div className="space-y-6 xl:col-span-2">
          <Card title="1. Subir Imagen y Marcar Baches (Dataset Studio)">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-urbix-700 file:px-3 file:py-2 file:text-white"
                />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Etiquetar como:</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-cyan-300 font-semibold"
                  >
                    {classes.map((c, i) => (
                      <option key={i} value={i}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {imageSrc ? (
                <div className="space-y-3">
                  <p className="text-xs text-amber-400">
                    Arrastra el cursor sobre la foto para dibujar los rectángulos donde se ubiquen los baches u objetos.
                  </p>
                  <div
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="relative select-none overflow-hidden rounded-lg border border-slate-700 bg-black cursor-crosshair"
                    style={{ minHeight: "350px" }}
                  >
                    <img
                      src={imageSrc}
                      alt="Anotación"
                      className="pointer-events-none block w-full select-none"
                    />

                    {/* Cajas guardadas */}
                    {boxes.map((b, idx) => (
                      <div
                        key={idx}
                        className="absolute border-2 border-cyan-400 bg-cyan-500/20"
                        style={{
                          left: `${(b.x_center - b.width / 2) * 100}%`,
                          top: `${(b.y_center - b.height / 2) * 100}%`,
                          width: `${b.width * 100}%`,
                          height: `${b.height * 100}%`,
                        }}
                      >
                        <span className="bg-cyan-500 text-[10px] font-bold text-black px-1 absolute -top-4 left-0">
                          {b.className}
                        </span>
                      </div>
                    ))}

                    {/* Caja en dibujo actual */}
                    {isDrawing && currentBox && (
                      <div
                        className="absolute border-2 border-dashed border-amber-400 bg-amber-500/20"
                        style={{
                          left: `${Math.min(currentBox.startX, currentBox.currentX) * 100}%`,
                          top: `${Math.min(currentBox.startY, currentBox.currentY) * 100}%`,
                          width: `${Math.abs(currentBox.currentX - currentBox.startX) * 100}%`,
                          height: `${Math.abs(currentBox.currentY - currentBox.startY) * 100}%`,
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{boxes.length} recuadro(s) trazado(s)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBoxes([])}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Limpiar recuadros
                      </button>
                      <button
                        onClick={handleSaveSample}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        Guardar muestra al Dataset
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-500">
                  <p>Sube una foto de un bache o vía para comenzar a etiquetarla.</p>
                </div>
              )}

              {msg && (
                <div
                  className={`rounded-lg p-3 text-xs ${
                    msg.type === "success" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Columna 3: Métricas del Dataset y Ejecución de Entrenamiento */}
        <div className="space-y-6">
          <Card title="Dataset Acumulado">
            {stats ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total imágenes:</span>
                  <span className="font-bold text-slate-200">{stats.total_images}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Total etiquetas anotadas:</span>
                  <span className="font-bold text-slate-200">{stats.total_labeled}</span>
                </div>
                <div className="pt-2">
                  <p className="mb-2 font-semibold text-slate-300">Desglose por clase:</p>
                  <div className="space-y-1">
                    {Object.entries(stats.counts_by_class || {}).map(([c, count]) => (
                      <div key={c} className="flex justify-between text-slate-400">
                        <span>{c}:</span>
                        <span className="text-cyan-400 font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Cargando estadísticas...</p>
            )}
          </Card>

          <Card title="2. Entrenar Modelo YOLO">
            <div className="space-y-4">
              <label className="block text-xs text-slate-400">
                Épocas de entrenamiento:
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  disabled={status?.is_training}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>

              {status?.is_training ? (
                <div className="space-y-2 rounded-lg bg-cyan-950/40 border border-cyan-800/50 p-3">
                  <div className="flex justify-between text-xs text-cyan-300">
                    <span>{status.status_message}</span>
                    <span>{status.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleStartTraining}
                  disabled={!stats || stats.total_images === 0}
                  className="w-full rounded-lg bg-urbix-700 py-2.5 text-sm font-bold text-white hover:bg-urbix-600 disabled:opacity-40"
                >
                  🚀 Iniciar Entrenamiento YOLO
                </button>
              )}

              {status?.last_result && (
                <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-3 text-xs text-emerald-300">
                  <p className="font-bold">Último modelo generado:</p>
                  <p className="font-mono text-[11px] mt-1 text-slate-300">{status.last_result.model_file}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

