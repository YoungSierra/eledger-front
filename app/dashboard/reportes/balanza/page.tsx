"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Fila {
  codigo: string; nombre: string; naturaleza: string;
  si_debito: string; si_credito: string;
  periodo_debito: string; periodo_credito: string;
  sf_debito: string; sf_credito: string;
}
interface Totales {
  si_debito: string; si_credito: string;
  periodo_debito: string; periodo_credito: string;
  sf_debito: string; sf_credito: string;
}
interface Balanza {
  fecha_desde: string; fecha_hasta: string; nivel: number;
  filas: Fila[]; totales: Totales; cuadrado: boolean;
}

const NIVELES = [
  { value: 1, label: "Clase (1 dígito)" },
  { value: 2, label: "Grupo (2 dígitos)" },
  { value: 3, label: "Cuenta (4 dígitos)" },
  { value: 4, label: "Subcuenta (6 dígitos)" },
];

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const th  = "px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200";
const thL = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200";
const td  = "px-3 py-1.5 text-right font-mono text-[11px] text-gray-700";
const tdL = "px-3 py-1.5 text-left text-[11px] text-gray-700";

export default function BalanzaPage() {
  usePageTitle();

  const hoy          = hoyLocal();
  const primerDiaMes = hoy.slice(0, 7) + "-01";

  const [desde,     setDesde]     = useState(primerDiaMes);
  const [hasta,     setHasta]     = useState(hoy);
  const [nivel,     setNivel]     = useState(3);
  const [data,      setData]      = useState<Balanza | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const generar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, nivel: String(nivel) });
      setData(await apiFetch<Balanza>(`/reportes/balanza?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar el reporte");
    } finally { setLoading(false); }
  }, [desde, hasta, nivel]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, nivel: String(nivel) });
      const res = await fetch(`${BASE_URL}/reportes/balanza/excel?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `balanza_${desde}_${hasta}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, nivel: String(nivel) });
    window.open(`/balanza?${p}`, "_blank");
  }

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
            <label className={lbl}>Nivel de detalle</label>
            <select value={nivel} onChange={e => setNivel(Number(e.target.value))} className={inp}>
              {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <button onClick={generar} disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Generando…" : "Generar"}
          </button>
          <button onClick={imprimir} disabled={!data || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] font-medium rounded-md disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
          <button onClick={exportarExcel} disabled={!data || loading || exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 hover:bg-green-50 text-[12px] font-medium rounded-md disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            {exporting ? "Exportando…" : "Excel"}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto px-5 py-4">

        {error && (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</div>
        )}

        {!data && !loading && (
          <div className="text-[12px] text-gray-400 mt-8 text-center">Configura los filtros y haz clic en Generar</div>
        )}

        {data && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] text-gray-500">
                {data.fecha_desde} — {data.fecha_hasta}
                {" · "}{NIVELES.find(n => n.value === data.nivel)?.label}
                {" · "}{data.filas.length} cuentas
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${data.cuadrado ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                {data.cuadrado ? "✓ Cuadrada" : "⚠ Descuadrada"}
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className={thL} rowSpan={2} style={{ width: 90 }}>Código</th>
                    <th className={thL} rowSpan={2}>Nombre</th>
                    <th className={th} colSpan={2} style={{ borderLeft: "1px solid #e5e7eb" }}>Saldo inicial</th>
                    <th className={th} colSpan={2} style={{ borderLeft: "1px solid #e5e7eb" }}>Movimiento del período</th>
                    <th className={th} colSpan={2} style={{ borderLeft: "1px solid #e5e7eb" }}>Saldo final</th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th className={`${th} border-l border-gray-200`}>Débito</th>
                    <th className={th}>Crédito</th>
                    <th className={`${th} border-l border-gray-200`}>Débito</th>
                    <th className={th}>Crédito</th>
                    <th className={`${th} border-l border-gray-200`}>Débito</th>
                    <th className={th}>Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {data.filas.map((f, i) => (
                    <tr key={f.codigo} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                      <td className={`${tdL} font-mono font-semibold text-gray-800`}>{f.codigo}</td>
                      <td className={tdL}>{f.nombre}</td>
                      <td className={`${td} border-l border-gray-100`}>{fmt(f.si_debito)}</td>
                      <td className={td}>{fmt(f.si_credito)}</td>
                      <td className={`${td} border-l border-gray-100`}>{fmt(f.periodo_debito)}</td>
                      <td className={td}>{fmt(f.periodo_credito)}</td>
                      <td className={`${td} border-l border-gray-100`}>{fmt(f.sf_debito)}</td>
                      <td className={td}>{fmt(f.sf_credito)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className={`${tdL} font-bold text-gray-800 uppercase text-[10px]`} colSpan={2}>Totales</td>
                    <td className={`${td} border-l border-gray-200 font-bold text-gray-900`}>{fmt(data.totales.si_debito)}</td>
                    <td className={`${td} font-bold text-gray-900`}>{fmt(data.totales.si_credito)}</td>
                    <td className={`${td} border-l border-gray-200 font-bold text-gray-900`}>{fmt(data.totales.periodo_debito)}</td>
                    <td className={`${td} font-bold text-gray-900`}>{fmt(data.totales.periodo_credito)}</td>
                    <td className={`${td} border-l border-gray-200 font-bold text-gray-900`}>{fmt(data.totales.sf_debito)}</td>
                    <td className={`${td} font-bold text-gray-900`}>{fmt(data.totales.sf_credito)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
