import { http, API_V1 } from "../../lib/http.js";

/** Servicios HTTP del módulo: Cuadrillas y Proveedores. Rutas backend: /api/v1/cuadrillas/* */
const BASE = `${API_V1}/cuadrillas`;

export async function list(params = {}) {
  const { data } = await http.get(BASE, { params });
  return data;
}

export async function getById(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return data;
}

export async function create(payload) {
  const { data } = await http.post(BASE, payload);
  return data;
}

export async function update(id, payload) {
  const { data } = await http.put(`${BASE}/${id}`, payload);
  return data;
}