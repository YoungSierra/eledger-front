"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Factura {
  id: string; numero: string; fecha: string; fecha_vencimiento: string | null;
  moneda: string; total: string; saldo: string;
  estado: string; estado_pago: "pendiente" | "pagada" | "anulada";
  dias_vencimiento: number | null;
}

function fmt(v: string | number) { return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const PAGO_BADGE: Record<string, string> = {
  pagada: "bg-green-50 text-green-700 border border-green-200",
  pendiente: "bg-amber-50 text-amber-700 border border-amber-200",
  anulada: "bg-red-50 text-red-600 border border-red-200",
};

export default function PortalFacturasPage() {
  const [rows, setRows] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"TODAS" | "pendiente" | "pagada">("TODAS");
  const [fDesde, setFDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [fHasta, setFHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  function cargar() {
    setLoading(true);
    const q = new URLSearchParams();
    if (fDesde) q.set("fecha_desde", fDesde);
    if (fHasta) q.set("fecha_hasta", fHasta);
    apiFetch<Factura[]>(`/portal/facturas?${q}`).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const filtradas = filtro === "TODAS" ? rows : rows.filter((r) => r.estado_pago === filtro);
  const totalPags = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pageActual = Math.min(pagina, totalPags);
  const visibles = filtradas.slice((pageActual - 1) * POR_PAGINA, pageActual * POR_PAGINA);
  useEffect(() => { setPagina(1); }, [filtro, rows]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-blue-600">Mis facturas</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Facturas emitidas por Universal Cargo</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Desde</label>
          <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Hasta</label>
          <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" />
        </div>
        <button onClick={cargar} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">Consultar</button>
      </div>

      <div className="flex gap-2">
        {(["TODAS", "pendiente", "pagada"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${filtro === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {f === "TODAS" ? "Todas" : f === "pendiente" ? "Pendientes" : "Pagadas"}
            <span className="ml-1 opacity-60">{f === "TODAS" ? rows.length : rows.filter((r) => r.estado_pago === f).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[13px] text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase text-gray-400">Factura</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase text-gray-400">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase text-gray-400">Vence</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase text-gray-400">Total</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase text-gray-400">Saldo</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase text-gray-400">Estado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No hay facturas en este filtro</td></tr>
                )}
                {visibles.map((f) => {
                  const vencida = f.estado_pago === "pendiente" && f.dias_vencimiento !== null && f.dias_vencimiento < 0;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-mono font-medium text-gray-800">{f.numero}</td>
                      <td className="px-4 py-2.5 text-gray-500">{f.fecha}</td>
                      <td className="px-4 py-2.5">
                        <span className={vencida ? "text-red-600 font-medium" : "text-gray-500"}>{f.fecha_vencimiento ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600">{f.moneda} {fmt(f.total)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800">{fmt(f.saldo)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${PAGO_BADGE[f.estado_pago]}`}>{f.estado_pago}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a href={`/factura/${f.id}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          PDF
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtradas.length > POR_PAGINA && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                {`${(pageActual - 1) * POR_PAGINA + 1}–${Math.min(pageActual * POR_PAGINA, filtradas.length)}`} de {filtradas.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(1)} disabled={pageActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pageActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
                <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pageActual} / {totalPags}</span>
                <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pageActual === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
                <button onClick={() => setPagina(totalPags)} disabled={pageActual === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
