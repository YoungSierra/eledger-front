// Cabecera azul reutilizable para los drawers de maestros (crear/editar).
// Fondo azul de marca, icono en círculo translúcido, título + subtítulo en
// blanco y botón de cerrar. Úsalo en todos los drawers para consistencia.

export default function DrawerHeader({
  title,
  subtitle,
  onClose,
  icon,
}: {
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 bg-blue-600 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-white">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-blue-100 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <button onClick={onClose}
        className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors shrink-0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
