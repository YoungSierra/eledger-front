"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface CentroNode {
  id: string;
  codigo: string;
  nombre: string;
  padre_id: string | null;
}

const triggerCls =
  "w-full flex items-center justify-between gap-1 px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

/**
 * Selector en árbol de centros de costo. Recibe la lista PLANA (todos los
 * niveles) y arma la jerarquía. Permite elegir cualquier nivel.
 */
export default function CentroCostoTreeSelect({
  centros,
  value,
  onChange,
  placeholder = "—",
}: {
  centros: CentroNode[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const porId = useMemo(() => new Map(centros.map((c) => [c.id, c])), [centros]);
  const hijosDe = useMemo(() => {
    const m = new Map<string | null, CentroNode[]>();
    for (const c of centros) {
      const k = c.padre_id ?? null;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return m;
  }, [centros]);

  const seleccionado = value ? porId.get(value) ?? null : null;

  // Al abrir, expandir la ruta hasta el seleccionado para que quede visible.
  function abrir() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
    }
    // Expandir todos los nodos con hijos para que la jerarquía sea visible.
    const exp = new Set<string>();
    for (const c of centros) if (c.padre_id) exp.add(c.padre_id);
    setExpandidos(exp);
    setQ("");
    setOpen(true);
  }

  function elegir(id: string) {
    onChange(id);
    setOpen(false);
  }

  function toggle(id: string) {
    setExpandidos((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // Modo búsqueda: lista plana filtrada por código o nombre.
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    return centros
      .filter((c) => c.codigo.toLowerCase().includes(t) || c.nombre.toLowerCase().includes(t))
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .slice(0, 50);
  }, [q, centros]);

  function renderNodos(padre: string | null, depth: number): React.ReactNode {
    const nodos = hijosDe.get(padre) ?? [];
    return nodos.map((c) => {
      const tieneHijos = (hijosDe.get(c.id) ?? []).length > 0;
      const abierto = expandidos.has(c.id);
      return (
        <div key={c.id}>
          <div
            className={`flex items-center gap-1 px-2 py-1 hover:bg-blue-50 transition-colors ${
              value === c.id ? "bg-blue-50" : ""
            }`}
            style={{ paddingLeft: 8 + depth * 16 }}
          >
            {tieneHijos ? (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); toggle(c.id); }}
                className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400"
              >
                <svg className={`w-3 h-3 transition-transform ${abierto ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <span className="w-4 h-4 shrink-0 flex items-center justify-center text-gray-300">•</span>
            )}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); elegir(c.id); }}
              className="flex-1 text-left flex items-center gap-2 min-w-0"
            >
              <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                {c.codigo}
              </span>
              <span className="text-[11px] text-gray-700 truncate">{c.nombre}</span>
            </button>
          </div>
          {tieneHijos && abierto && renderNodos(c.id, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : abrir())}
        className={triggerCls}
      >
        <span className={`truncate ${seleccionado ? "text-gray-800" : "text-gray-400"}`}>
          {seleccionado ? `${seleccionado.codigo} ${seleccionado.nombre}` : placeholder}
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Click-away */}
          <div className="fixed inset-0 z-[9998]" onMouseDown={() => setOpen(false)} />
          <div
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="p-1.5 border-b border-gray-100">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por código o nombre…"
                className="w-full px-2 py-1 text-[11px] text-gray-700 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); elegir(""); }}
                className="w-full text-left px-3 py-1 text-[11px] text-gray-400 hover:bg-gray-50"
              >
                — Ninguno —
              </button>
              {filtrados
                ? filtrados.length === 0
                  ? <p className="px-3 py-2 text-[11px] text-gray-400">Sin resultados</p>
                  : filtrados.map((c) => (
                      <button key={c.id} type="button"
                        onMouseDown={(e) => { e.preventDefault(); elegir(c.id); }}
                        className={`w-full text-left flex items-center gap-2 px-3 py-1 hover:bg-blue-50 ${value === c.id ? "bg-blue-50" : ""}`}>
                        <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">{c.codigo}</span>
                        <span className="text-[11px] text-gray-700 truncate">{c.nombre}</span>
                      </button>
                    ))
                : renderNodos(null, 0)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
