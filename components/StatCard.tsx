// Tarjeta de indicador reutilizable — estilo "fresco": borde superior de color,
// número grande en color, icono en cuadro tintado, y hover que la eleva.
// Úsala en cualquier fila de resúmenes/indicadores para un look consistente.

interface StatCardProps {
  label: string;
  value: string | number;
  hex: string;                 // color de acento (borde, número, icono)
  icon?: React.ReactNode;      // paths de un <svg> 24x24 (stroke currentColor)
  sub?: string;
  mono?: boolean;              // valor en monoespaciado (montos)
  size?: "md" | "lg";          // md=22px (montos), lg=30px (conteos)
}

export default function StatCard({ label, value, hex, icon, sub, mono, size = "md" }: StatCardProps) {
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl shadow p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ borderTop: `3px solid ${hex}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-bold leading-none ${size === "lg" ? "text-[30px]" : "text-[21px]"} ${mono ? "font-mono" : ""}`}
          style={{ color: hex }}>
          {value}
        </p>
        {icon && (
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${hex}1a`, color: hex }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 mt-2.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// Iconos comunes para reutilizar en las tarjetas
export const ICONS = {
  check:  (<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>),
  clock:  (<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>),
  alert:  (<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  sum:    (<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>),
  money:  (<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>),
  doc:    (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
};
