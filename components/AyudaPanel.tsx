"use client";

import { usePathname, useRouter } from "next/navigation";
import { getTemaPorRuta } from "@/lib/ayuda/contenido";
import AyudaContenido from "@/components/AyudaContenido";

// Panel de ayuda contextual: se abre desde el botón "?" del toolbar y muestra
// la ayuda de la pantalla actual (según el pathname). Si la pantalla no tiene
// ayuda todavía, ofrece abrir el manual completo.
export default function AyudaPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const tema = getTemaPorRuta(pathname);

  if (!open) return null;

  function abrirManual() {
    onClose();
    router.push(tema ? `/dashboard/ayuda?tema=${tema.id}` : "/dashboard/ayuda");
  }

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Fondo: cierra al hacer clic */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <aside className="absolute top-0 right-0 h-full w-full max-w-[440px] bg-white shadow-xl flex flex-col">
        {/* Cabecera */}
        <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">?</span>
              <h2 className="text-[13px] font-semibold text-gray-800 truncate">
                {tema ? `Ayuda · ${tema.titulo}` : "Ayuda"}
              </h2>
            </div>
            {tema && <p className="text-[11px] text-gray-400 mt-1 leading-snug">{tema.resumen}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5" title="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tema ? (
            <AyudaContenido bloques={tema.bloques} />
          ) : (
            <div className="text-center pt-10">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed">
                Todavía no hay ayuda específica para esta pantalla.
              </p>
              <p className="text-[11.5px] text-gray-400 mt-1">Consulta el manual completo del sistema.</p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="shrink-0 px-5 py-3 border-t border-gray-100">
          <button
            onClick={abrirManual}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Abrir manual completo
          </button>
        </div>
      </aside>
    </div>
  );
}
