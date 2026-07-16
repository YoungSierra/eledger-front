"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Fila {
  id: string; identificador: string; nombre: string; cantidad: string;
  subtotal: string; total_iva: string; total: string; pct_total: string;
}
interface Reporte {
  empresa: string; fecha_desde: string; fecha_hasta: string; agrupar_por: string;
  filas: Fila[]; gran_subtotal: string; gran_iva: string; gran_total: string;
}

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
}

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const OPCIONES_AGRUP = [
  { value: "cliente",  label: "Por cliente" },
  { value: "producto", label: "Por producto" },
  { value: "familia",  label: "Por familia" },
];

export default function VentasAgrupacionPage() {
  usePageTitle();

  const [desde,     setDesde]     = useState(primerDiaMes());
  const [hasta,     setHasta]     = useState(hoyLocal());
  const [agrupPor,  setAgrupPor]  = useState("cliente");
  const [data,      setData]      = useState<Reporte | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const generar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, agrupar_por: agrupPor });
      setData(await apiFetch<Reporte>(`/reportes/ventas-agrupacion?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar el reporte");
    } finally { setLoading(false); }
  }, [desde, hasta, agrupPor]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, agrupar_por: agrupPor });
      const res = await fetch(`${BASE_URL}/reportes/ventas-agrupacion/excel?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ventas_${agrupPor}_${desde}_${hasta}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, agrupar_por: agrupPor });
    window.open(`/ventas-agrupacion?${p}`, "_blank");
  }

  const mostrarCantidad = agrupPor !== "cliente";
  const mostrarId = agrupPor !== "familia";
  const idHeader = agrupPor === "cliente" ? "NIT" : "Código";

  return (
    <div className="h-full flex flex-col">
      {/* Filtros */}
      <div className="flex-none border-b border-gray-100 px-5 py-3 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={lbl}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Agrupar por</label>
            <select value={agrupPor} onChange={e => { setAgrupPor(e.target.value); setData(null); }} className={inp}>
              {OPCIONES_AGRUP.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={generar} disabled={loading || !desde || !hasta}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Generando…" : "Generar"}
          </button>
          {data && (
            <>
              <button onClick={imprimir}
                className="px-3 py-1.5 border border-gray-200 text-[12px] text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Imprimir
              </button>
              <button onClick={exportarExcel} disabled={exporting}
                className="px-3 py-1.5 border border-gray-200 text-[12px] text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {exporting ? "Exportando…" : "Excel"}
              </button>
            </>
          )}
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {!data ? (
          <div className="flex items-center justify-center h-full text-[13px] text-gray-400">
            Selecciona los filtros y haz clic en Generar
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-[10px] font-bold uppercase text-white bg-[#1e3a5f]">
                {mostrarId && <th className="px-4 py-2.5 text-left w-36">{idHeader}</th>}
                <th className="px-4 py-2.5 text-left">Agrupador</th>
                {mostrarCantidad && <th className="px-4 py-2.5 text-right w-32">Cantidad</th>}
                <th className="px-4 py-2.5 text-right w-40">Subtotal</th>
                <th className="px-4 py-2.5 text-right w-36">IVA</th>
                <th className="px-4 py-2.5 text-right w-40">Total</th>
                <th className="px-4 py-2.5 text-right w-28">% del total</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f, i) => (
                <tr key={f.id || i} className="border-b border-gray-100 hover:bg-gray-50/60">
                  {mostrarId && <td className="px-4 py-2 font-mono text-[11px] text-blue-600 whitespace-nowrap">{f.identificador}</td>}
                  <td className="px-4 py-2 text-gray-800">{f.nombre}</td>
                  {mostrarCantidad && <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(f.cantidad)}</td>}
                  <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(f.subtotal)}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">{fmt(f.total_iva)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(f.total)}</td>
                  <td className="px-4 py-2 text-right text-gray-500 text-[11px]">{fmtPct(f.pct_total)}</td>
                </tr>
              ))}
              {/* Gran total */}
              <tr className="bg-[#1e3a5f] border-t-2 border-[#1e3a5f]">
                {mostrarId && <td className="px-4 py-2.5"></td>}
                <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white">TOTAL</td>
                {mostrarCantidad && <td className="px-4 py-2.5"></td>}
                <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmt(data.gran_subtotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmt(data.gran_iva)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-white text-[13px]">{fmt(data.gran_total)}</td>
                <td className="px-4 py-2.5 text-right text-white text-[11px]">100.00 %</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
