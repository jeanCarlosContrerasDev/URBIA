import { http, API_V1 } from "../../lib/http.js";

const BASE = `${API_V1}/monitoring`;

export async function getHealth() {
  const { data } = await http.get("/health");
  return data;
}

export async function getAlerts(limit = 100) {
  const { data } = await http.get(`${BASE}/alerts`, { params: { limit } });
  return data;
}

export async function getAlertById(id) {
  const { data } = await http.get(`${BASE}/alerts/${id}`);
  return data;
}

export async function deleteAlertById(id) {
  await http.delete(`${BASE}/alerts/${id}`);
}

export async function clearAlerts() {
  await http.delete(`${BASE}/alerts`);
}

export async function detectImage(file, opts = {}) {
  const { conf = 0.25, source, lat, lng, cooldown, createAlerts = true } = opts;
  const form = new FormData();
  form.append("file", file, file.name || "frame.jpg");
  const { data } = await http.post(`${API_V1}/detection/image`, form, {
    params: { conf, source, lat, lng, cooldown, create_alerts: createAlerts },
    timeout: 120000,
  });
  return data;
}

export function buildStreamUrl({ url, conf = 0.25, source = "Cámara RTSP", lat, lng, fps = 10 }) {
  const params = new URLSearchParams({ url, conf, source, fps });
  if (lat != null) params.set("lat", lat);
  if (lng != null) params.set("lng", lng);
  return `/api${API_V1}/detection/stream?${params}`;
}
