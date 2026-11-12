import { useEffect, useState } from "react";
import { http } from "../lib/http.js";

export default function HealthBadge() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    http
      .get("/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("down"));
  }, []);

  const styles = {
    checking: "bg-slate-700 text-slate-200",
    ok: "bg-emerald-600/20 text-emerald-400",
    down: "bg-red-600/20 text-red-400",
  };
  const labels = { checking: "Verificando API…", ok: "API conectada", down: "API sin conexión" };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

