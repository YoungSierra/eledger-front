"use client";

/**
 * Aviso bloqueante (no editable) para transacciones que requieren la TRM del día
 * cuando ésta no ha sido registrada. Bloquea solo la transacción, no el sistema:
 * el usuario puede navegar a otra opción del menú.
 */
export function AvisoTrmFaltante({ onVolver, compacto = false }: {
  onVolver?: () => void;
  compacto?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compacto ? "py-8 px-4" : "py-16 px-6"}`}>
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Falta la TRM de hoy</h3>
      <p className="text-[12px] text-gray-500 max-w-sm mb-4">
        No es posible continuar con esta operación porque aún no se ha registrado la TRM del día.
        Solicítala al administrador para poder crear el documento.
      </p>
      {onVolver && (
        <button onClick={onVolver}
          className="px-4 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          Volver
        </button>
      )}
    </div>
  );
}
