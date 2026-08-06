"use client";

import { useMemo, useRef, useState } from "react";

export interface OpcionBuscable {
  valor: string;
  etiqueta: string;
  /** Texto secundario alineado a la derecha (departamento, código…). */
  detalle?: string;
}

const triggerCls =
  "w-full flex items-center justify-between gap-1 px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

/**
 * Desplegable con buscador, mismo patrón visual que el selector de centros de
 * costo. El menú se posiciona fijo respecto al disparador para que no lo
 * recorte el contenedor con scroll de un drawer o un modal.
 */
export default function SelectBuscable({
  opciones, value, onChange, placeholder = "—", textoBusqueda = "Buscar…",
  permiteVacio = true, maxResultados = 80,
}: {
  opciones: OpcionBuscable[];
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  textoBusqueda?: string;
  permiteVacio?: boolean;
  maxResultados?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const seleccionado = opciones.find((o) => o.valor === value) ?? null;

  function abrir() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
    }
    setQ("");
    setOpen(true);
  }

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t
      ? opciones.filter((o) =>
          o.etiqueta.toLowerCase().includes(t) ||
          o.valor.toLowerCase().includes(t) ||
          (o.detalle ?? "").toLowerCase().includes(t))
      : opciones;
    return base.slice(0, maxResultados);
  }, [q, opciones, maxResultados]);

  function elegir(v: string) { onChange(v); setOpen(false); }

  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : abrir())} className={triggerCls}>
        <span className={`truncate ${seleccionado ? "text-gray-800" : "text-gray-400"}`}>
          {seleccionado ? seleccionado.etiqueta : placeholder}
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onMouseDown={() => setOpen(false)} />
          <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <div className="p-1.5 border-b border-gray-100">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={textoBusqueda}
                className="w-full px-2 py-1 text-[11px] text-gray-700 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {permiteVacio && (
                <button type="button" onMouseDown={(e) => { e.preventDefault(); elegir(""); }}
                  className="w-full text-left px-3 py-1 text-[11px] text-gray-400 hover:bg-gray-50">
                  — Ninguno —
                </button>
              )}
              {filtrados.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-gray-400">Sin resultados</p>
              ) : (
                filtrados.map((o) => (
                  <button key={o.valor} type="button"
                    onMouseDown={(e) => { e.preventDefault(); elegir(o.valor); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1 hover:bg-blue-50 ${value === o.valor ? "bg-blue-50" : ""}`}>
                    <span className="text-[11px] text-gray-700 truncate">{o.etiqueta}</span>
                    {o.detalle && <span className="text-[10px] text-gray-400 truncate ml-auto">{o.detalle}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
