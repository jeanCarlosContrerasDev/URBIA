import { translateLabel } from "../translations.js";

const PALETTE = ["#22d3ee", "#f97316", "#a3e635", "#f43f5e", "#eab308", "#a78bfa", "#34d399", "#fb7185"];

export function colorFor(label) {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * Capa SVG que dibuja los recuadros y etiquetas traducidas en español sobre una imagen o video.
 */
export default function DetectionOverlay({ width, height, detections = [] }) {
  if (!width || !height) return null;
  const font = Math.max(12, width / 45);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {detections.map((d, i) => {
        const [x1, y1, x2, y2] = d.bbox;
        const color = colorFor(d.label);
        const translated = translateLabel(d.label);
        const text = `${translated} ${(d.confidence * 100).toFixed(0)}%`;
        const labelW = text.length * font * 0.65 + 10;
        const labelY = y1 - font - 6 < 0 ? y1 : y1 - font - 6;
        return (
          <g key={i}>
            <rect
              x={x1} y={y1} width={x2 - x1} height={y2 - y1}
              fill="none" stroke={color} strokeWidth={3} vectorEffect="non-scaling-stroke"
            />
            <rect x={x1} y={labelY} width={labelW} height={font + 6} fill={color} />
            <text x={x1 + 4} y={labelY + font} fontSize={font} fill="#020617" fontWeight="700">
              {text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
