"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Item {
  id: string; numero: string;
  fecha: string; fecha_vencimiento: string;
  cliente_nit: string | null; cliente_nombre: string | null;
  total: string; estado: string;
  dian_estado: string | null;
}

interface ListResponse { items: Item[]; total: number; pagina: number; por_pagina: number; }

const DIAN_BADGE: Record<string, string> = {
  pendiente:  "bg-amber-50 text-amber-700 border border-amber-200",
  enviada:    "bg-blue-50 text-blue-700 border border-blue-200",
  aceptada:   "bg-green-50 text-green-700 border border-green-200",
  rechazada:  "bg-red-50 text-red-600 border border-red-200",
};

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FacturacionElectronicaPage() {
  const title = usePageTitle();

  const [lista, setLista] = useState<Item[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);
  const { orden, alternar } = useOrden<
    "numero" | "fecha" | "cliente" | "total" | "dianEstado"
  >("fecha", "desc");

  const [fDianEstado, setFDianEstado] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");

  const cargar = useCallback(async (pag = pagina) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina), estado: "contabilizada" });
      if (fDianEstado) p.set("dian_estado", fDianEstado);
      if (fDesde)      p.set("fecha_desde", fDesde);
      if (fHasta)      p.set("fecha_hasta", fHasta);
      const data = await apiFetch<ListResponse>(`/facturacion/facturas?${p}`);
      setLista(data.items);
      setTotalItems(data.total);
    } finally { setLoading(false); }
  }, [pagina, fDianEstado, fDesde, fHasta]);

  useEffect(() => { cargar(pagina); }, [pagina]);
  useEffect(() => { setPagina(1); cargar(1); }, [fDianEstado, fDesde, fHasta]);

  // El backend pagina; se ordena la página cargada antes de pintarla.
  const ordenada = ordenarFilas(lista, orden, {
    numero:     (d) => d.numero,
    fecha:      (d) => d.fecha,
    cliente:    (d) => d.cliente_nombre,
    total:      (d) => Number(d.total),
    // dian_estado nulo se pinta como "pendiente": se ordena por lo que se ve.
    dianEstado: (d) => d.dian_estado ?? "pendiente",
  });

  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Seguimiento de emisión electrónica ante la DIAN</p>
        </div>
      </div>

      {/* Aviso integración pendiente */}
      <div className="mb-4 shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[12px] text-amber-700">
        La integración con la DIAN vía PTH aún no está activa. Las facturas se contabilizan normalmente pero el envío electrónico está pendiente de implementación.
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Estado DIAN</label>
          <select value={fDianEstado} onChange={e => setFDianEstado(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviada">Enviada</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        {(fDianEstado || fDesde || fHasta) && (
          <button onClick={() => { setFDianEstado(""); setFDesde(""); setFHasta(""); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline pb-0.5">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 max-w-5xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10 border-b border-gray-100">
              <tr>
                <Th campo="numero"     orden={orden} alternar={alternar} className="whitespace-nowrap">Número</Th>
                <Th campo="fecha"      orden={orden} alternar={alternar} className="whitespace-nowrap">Fecha</Th>
                <Th campo="cliente"    orden={orden} alternar={alternar} className="whitespace-nowrap">Cliente</Th>
                <Th campo="total"      orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Total</Th>
                <Th campo="dianEstado" orden={orden} alternar={alternar} className="whitespace-nowrap">Estado DIAN</Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin facturas contabilizadas</td></tr>
              ) : ordenada.map(d => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-blue-600">{d.numero}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                  <td className="px-3 py-3 max-w-[200px]">
                    <div className="font-medium text-gray-800 truncate">{d.cliente_nombre ?? "—"}</div>
                    <div className="text-[10px] font-mono text-gray-400">{d.cliente_nit ?? ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">{fmt(d.total)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIAN_BADGE[d.dian_estado ?? "pendiente"] ?? DIAN_BADGE.pendiente}`}>
                      {d.dian_estado ?? "pendiente"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <a href={`/factura/${d.id}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Imprimir">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      </a>
                      {(d.dian_estado === "pendiente" || d.dian_estado === "rechazada") && (
                        <button disabled title="Integración DIAN pendiente de implementación"
                          className="p-1.5 text-gray-300 rounded-md cursor-not-allowed" >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {totalItems === 0 ? "0" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, totalItems)}`} de {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={pagina === 1}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pagina} / {totalPags}</span>
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPags)} disabled={pagina === totalPags}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
