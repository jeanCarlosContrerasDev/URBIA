import { translateLabel } from "../translations.js";
import { colorFor } from "./DetectionOverlay.jsx";

// Clases que NO son incidencias urbanas / territoriales por sí solas
const NON_INCIDENCE_CLASSES = new Set([
  "person",
  "teddy bear",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "book",
  "clock",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "bottle",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
]);

export default function DetectionSummary({ detections = [] }) {
  if (!detections.length) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          No se detectan objetos ni personas en la escena.
        </p>
      </div>
    );
  }

  const counts = detections.reduce((acc, d) => ({ ...acc, [d.label]: (acc[d.label] || 0) + 1 }), {});
  
  // Analizar si hay incidencias viales/urbanas o solo objetos cotidianos
  const onlyEverydayObjects = Object.keys(counts).every((label) => NON_INCIDENCE_CLASSES.has(label));
  const hasPerson = !!counts["person"];

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      {/* Banner de estado claro en español */}
      {onlyEverydayObjects ? (
        <div className="flex items-start gap-2 text-xs text-emerald-400">
          <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span>
            <strong>Sin incidencias urbanas:</strong>{" "}
            {hasPerson 
              ? "Se detecta persona / elementos en entorno privado. (No es un bache ni daño en vía pública)." 
              : "Objetos cotidianos detectados. Vía sin novedad."}
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-xs text-amber-400">
          <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
          <span>
            <strong>Atención:</strong> Objetos de interés vial/territorial detectados en el cuadro.
          </span>
        </div>
      )}

      {/* Badges con nombres traducidos al español */}
      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(counts).map(([label, n]) => {
          const translated = translateLabel(label);
          return (
            <span
              key={label}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-slate-950 shadow-sm"
              style={{ backgroundColor: colorFor(label) }}
            >
              {n}× {translated}
            </span>
          );
        })}
      </div>
    </div>
  );
}
