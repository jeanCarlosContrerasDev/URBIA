import axios from "axios";

/**
 * Cliente HTTP compartido. Usa rutas relativas (/api/...) que Vite
 * redirige al backend en http://localhost:8000 durante el desarrollo.
 */
export const http = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("urbix_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const API_V1 = "/v1";

