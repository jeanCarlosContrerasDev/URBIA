import { http, API_V1 } from "../../lib/http.js";

const BASE = `${API_V1}/training`;

export async function getClasses() {
  const { data } = await http.get(`${BASE}/classes`);
  return data;
}

export async function createClass(name) {
  const { data } = await http.post(`${BASE}/classes`, { name });
  return data;
}

export async function getStats() {
  const { data } = await http.get(`${BASE}/stats`);
  return data;
}

export async function getStatus() {
  const { data } = await http.get(`${BASE}/status`);
  return data;
}

export async function saveAnnotation(file, annotations, coords = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("annotations", JSON.stringify(annotations));
  if (coords.lat != null) formData.append("lat", coords.lat);
  if (coords.lng != null) formData.append("lng", coords.lng);
  const { data } = await http.post(`${BASE}/annotate`, formData);
  return data;
}

export async function startTraining(epochs = 20) {
  const { data } = await http.post(`${BASE}/start`, null, { params: { epochs } });
  return data;
}
