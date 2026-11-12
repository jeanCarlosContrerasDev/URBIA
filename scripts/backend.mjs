// Helper multiplataforma para el backend (Windows / macOS / Linux).
// Uso: node scripts/backend.mjs setup | dev
import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(root, "backend");
const isWin = process.platform === "win32";
const venvPython = isWin
  ? join(backendDir, "venv", "Scripts", "python.exe")
  : join(backendDir, "venv", "bin", "python");

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: backendDir, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const mode = process.argv[2];

if (mode === "setup") {
  if (!existsSync(venvPython)) {
    console.log("> Creando entorno virtual en backend/venv ...");
    run(isWin ? "python" : "python3", ["-m", "venv", "venv"]);
  }
  run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
  run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"]);
} else if (mode === "dev") {
  if (!existsSync(venvPython)) {
    console.error("No existe backend/venv. Ejecuta primero: npm run setup:backend");
    process.exit(1);
  }
  const child = spawn(
    venvPython,
    ["-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
    { cwd: backendDir, stdio: "inherit" }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  console.error("Uso: node scripts/backend.mjs <setup|dev>");
  process.exit(1);
}

