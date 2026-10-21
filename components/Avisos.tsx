"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * Avisos flotantes (toasts) del dashboard. Reemplazan el `alert()` nativo para
 * confirmar una acción o informar un error que no cabe en el formulario.
 *
 *   const aviso = useAviso();
 *   aviso.exito("Cotización aprobada");
 *   aviso.error("No se pudo eliminar", detalle);
 *
 * El proveedor vive en app/dashboard/layout.tsx. Los errores de validación de
 * un formulario siguen yendo en su recuadro, junto al formulario.
 */

type TipoAviso = "exito" | "error" | "advertencia" | "info";

interface Aviso {
  id: number;
  tipo: TipoAviso;
  titulo: string;
  detalle?: string;
}

interface AvisosApi {
  exito: (titulo: string, detalle?: string) => void;
  error: (titulo: string, detalle?: string) => void;
  advertencia: (titulo: string, detalle?: string) => void;
  info: (titulo: string, detalle?: string) => void;
}

const AvisosContext = createContext<AvisosApi | null>(null);

// Errores y advertencias se quedan más: suelen pedir que el usuario haga algo.
const DURACION: Record<TipoAviso, number> = { exito: 5000, info: 5000, advertencia: 9000, error: 9000 };

const ESTILO: Record<TipoAviso, { borde: string; icono: string; fondoIcono: string }> = {
  exito:       { borde: "border-l-green-500", icono: "text-green-600", fondoIcono: "bg-green-50" },
  error:       { borde: "border-l-red-500",   icono: "text-red-600",   fondoIcono: "bg-red-50" },
  advertencia: { borde: "border-l-amber-500", icono: "text-amber-600", fondoIcono: "bg-amber-50" },
  info:        { borde: "border-l-blue-500",  icono: "text-blue-600",  fondoIcono: "bg-blue-50" },
};

function Icono({ tipo }: { tipo: TipoAviso }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (tipo === "exito") return <svg {...p}><path d="M20 6 9 17l-5-5" /></svg>;
  if (tipo === "error") return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>;
  if (tipo === "advertencia") return <svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
}

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const sig = useRef(1);

  const cerrar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const mostrar = useCallback((tipo: TipoAviso, titulo: string, detalle?: string) => {
    const id = sig.current++;
    setAvisos((a) => [...a.slice(-3), { id, tipo, titulo, detalle }]); // máximo 4 a la vez
    setTimeout(() => cerrar(id), DURACION[tipo]);
  }, [cerrar]);

  const api = useRef<AvisosApi>({
    exito: (t, d) => mostrar("exito", t, d),
    error: (t, d) => mostrar("error", t, d),
    advertencia: (t, d) => mostrar("advertencia", t, d),
    info: (t, d) => mostrar("info", t, d),
  }).current;

  return (
    <AvisosContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[90] flex flex-col gap-2 sm:w-[380px] pointer-events-none" aria-live="polite">
        {avisos.map((a) => {
          const e = ESTILO[a.tipo];
          return (
            <div key={a.id} role={a.tipo === "error" ? "alert" : "status"}
              className={`pointer-events-auto bg-white border border-gray-200 border-l-4 ${e.borde} rounded-lg shadow-lg px-3 py-2.5 flex items-start gap-2.5`}>
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${e.fondoIcono} ${e.icono}`}>
                <Icono tipo={a.tipo} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[12px] font-semibold text-gray-800">{a.titulo}</p>
                {a.detalle && <p className="text-[11px] text-gray-600 mt-0.5 break-words">{a.detalle}</p>}
              </div>
              <button onClick={() => cerrar(a.id)} aria-label="Cerrar aviso"
                className="shrink-0 text-gray-400 hover:text-gray-600 text-[16px] leading-none px-1">×</button>
            </div>
          );
        })}
      </div>
    </AvisosContext.Provider>
  );
}

export function useAviso(): AvisosApi {
  const ctx = useContext(AvisosContext);
  if (!ctx) throw new Error("useAviso debe usarse dentro de AvisosProvider");
  return ctx;
}
