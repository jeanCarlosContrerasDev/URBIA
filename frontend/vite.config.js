import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Todas las peticiones /api/* se redirigen al backend FastAPI
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});

