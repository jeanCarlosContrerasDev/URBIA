# URBIX AI — Monorepositorio

Plataforma Inteligente de Monitoreo y Gestión Territorial.

| Capa      | Stack                                                     | Puerto |
|-----------|-----------------------------------------------------------|--------|
| Backend   | Python · FastAPI · Uvicorn · Ultralytics YOLO · OpenCV    | 8000   |
| Frontend  | React · Vite · Tailwind CSS v4 · React Router · Axios     | 5173   |
| Raíz      | Node.js · `concurrently`                                  | —      |

## Requisitos
- Node.js 20+ y npm
- Python 3.10+ (con `python` en el PATH)

## Inicialización (una sola vez)

```bash
npm run setup
```

Esto ejecuta:
1. `npm install` en la raíz (instala `concurrently`).
2. Crea `backend/venv` e instala `backend/requirements.txt`.
3. `npm install` en `frontend/`.

Manual equivalente (Windows PowerShell):

```powershell
npm install
cd backend; python -m venv venv; .\venv\Scripts\python -m pip install -r requirements.txt; cd ..
npm --prefix frontend install
```

## Ejecución local

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API health: http://localhost:8000/api/health (o vía proxy: http://localhost:5173/api/health)
- Swagger: http://localhost:8000/api/docs

Scripts individuales: `npm run dev:backend`, `npm run dev:frontend`, `npm run build`.

## Endpoints iniciales

| Método | Ruta                               | Descripción                         |
|--------|------------------------------------|-------------------------------------|
| GET    | `/api/health`                      | Estado del servicio                 |
| GET    | `/api/v1/monitoring/alerts`        | Lista de alertas                    |
| DELETE | `/api/v1/monitoring/alerts`        | Limpiar alertas                     |
| GET    | `/api/v1/monitoring/alerts/{id}`   | Detalle de alerta                   |
| POST   | `/api/v1/detection/image`          | YOLO sobre imagen/frame → detecciones + alertas (`lat`, `lng`, `source`, `conf`, `cooldown`) |
| GET    | `/api/v1/detection/stream?url=`    | Stream MJPEG con recuadros desde RTSP/HTTP/archivo/cámara del servidor; genera alertas |

### Centro de Monitoreo — fuentes de video
- **Imagen:** sube una foto; se dibujan los recuadros y se crea una alerta por clase detectada.
- **Webcam:** la cámara del navegador envía frames (~2/s) al backend.
- **Video:** un archivo local se analiza frame a frame en el navegador.
- **RTSP / URL:** el backend abre el stream con OpenCV, dibuja los recuadros y lo reenvía como MJPEG.
- Haz clic en el mapa para fijar la ubicación de la cámara; las alertas se ubican ahí.
- En video, la misma clase desde la misma fuente genera como máximo una alerta cada 15 s.

> La primera llamada a `/detection/image` descarga automáticamente los pesos `yolo11n.pt`.
> Cambia el modelo con la variable `YOLO_MODEL_PATH` en `backend/.env`.

## Estructura

```text
backend/app/
  api/v1/        routers + endpoints
  core/          config (pydantic-settings) y seguridad
  models/        esquemas Pydantic
  services/      lógica de negocio y YOLO
  main.py        FastAPI + CORS + /api/health
frontend/src/
  assets/ components/ context/ lib/http.js
  modules/<modulo>/{components/, services.js, <Modulo>Page.jsx}
  App.jsx  main.jsx
```

### Añadir un nuevo módulo frontend
1. Crear `src/modules/<nombre>/` con `components/`, `services.js` y `<Nombre>Page.jsx`.
2. Registrar la ruta en `src/App.jsx` y el enlace en `src/components/Layout.jsx`.

