import { NavLink, Outlet } from "react-router-dom";
import logo from "../assets/logo.svg";
import HealthBadge from "./HealthBadge.jsx";

const NAV = [
  { to: "/monitoring", label: "Centro de Monitoreo" },
  { to: "/warroom", label: "🛡️ Sala de Guerra" },
  { to: "/training", label: "Entrenamiento IA (Baches)" },
];

export default function Layout() {
  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center gap-3">
            <img src={logo} alt="URBIX AI" className="h-9 w-9" />
            <div>
              <p className="text-lg font-bold text-urbix-400">URBIX AI</p>
              <p className="text-xs text-slate-400">Valledupar · Territorio</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-urbix-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 font-mono">
          <p className="text-cyan-400 font-semibold">URBIX OPS v0.2</p>
          <p>Valledupar, Cesar, COL</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b border-slate-800 px-6">
          <HealthBadge />
        </header>
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
