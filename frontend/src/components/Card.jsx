export default function Card({ title, children, className = "" }) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 ${className}`}>
      {title && <h2 className="mb-3 shrink-0 text-sm font-semibold text-slate-300">{title}</h2>}
      <div className="flex-1 flex flex-col">{children}</div>
    </section>
  );
}
