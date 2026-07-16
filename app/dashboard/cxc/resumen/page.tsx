"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
import { usePageTitle, useHasRuta } from "@/lib/menu-context";
import StatCard, { ICONS } from "@/components/StatCard";

interface ResumenItem {
  tercero_id: string;
  tercero_nit: string | null;
  tercero_nombre: string | null;
  corriente: string;
  dias_1_30: string;
  dias_31_60: string;
  dias_61_90: string;
  mas_90: string;
  total: string;
}

interface ResumenResponse {
  fecha_corte: string;
  items: ResumenItem[];
  total_corriente: string;
  total_1_30: string;
  total_31_60: string;
  total_61_90: string;
  total_mas_90: string;
  total_general: string;
}

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtTotal(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const celda = "px-3 py-2.5 text-right font-mono text-[12px]";
const celdaHeader = "px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400";

export default function ResumenCxcPage() {
  const title = usePageTitle();
  const router = useRouter();
  const puedeCrearRecibo = useHasRuta("/dashboard/cxc/recibos");
  const hoy = new Date().toISOString().slice(0, 10);
  const [fechaCorte, setFechaCorte]   = useState(hoy);
  const [data, setData]               = useState<ResumenResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState(false);

  const cargar = useCallback(async (fecha: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<ResumenResponse>(`/cxc/resumen?fecha_corte=${fecha}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(fechaCorte); }, []);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/cxc/resumen/excel?fecha_corte=${fechaCorte}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `resumen_cxc_${fechaCorte}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const sinSaldo = !loading && data?.items.length === 0;

  return (
    <div className="h-full flex flex-col">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; padding: 24px; }
          .no-print { display: none !important; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #999; padding: 4px 8px; }
          th { font-weight: bold; background: none !important; }
          td { background: none !important; color: #000 !important; }
          tfoot td { font-weight: bold; border-top: 2px solid #000; }
        }
      `}</style>

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Saldos pendientes de cobro agrupados por antigüedad</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <label className="text-[11px] text-gray-500 font-medium">Fecha de corte</label>
          <input type="date" value={fechaCorte}
            onChange={(e) => setFechaCorte(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={() => cargar(fechaCorte)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
            Consultar
          </button>
          <button onClick={() => window.open(`/cxc-resumen?fecha_corte=${fechaCorte}`, "_blank")} disabled={!data || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
          <button onClick={exportarExcel} disabled={!data || loading || exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 hover:bg-green-50 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            {exporting ? "Exportando..." : "Excel"}
          </button>
        </div>
      </div>

      {/* Cards de totales */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 shrink-0 no-print">
          {[
            { label: "Corriente",    value: data.total_corriente, hex: "#059669", icon: ICONS.check },
            { label: "1 – 30 días",  value: data.total_1_30,      hex: "#d97706", icon: ICONS.clock },
            { label: "31 – 60 días", value: data.total_31_60,     hex: "#ea580c", icon: ICONS.clock },
            { label: "61 – 90 días", value: data.total_61_90,     hex: "#dc2626", icon: ICONS.clock },
            { label: "+ 90 días",    value: data.total_mas_90,    hex: "#b91c1c", icon: ICONS.alert },
            { label: "Total",        value: data.total_general,   hex: "#475569", icon: ICONS.sum   },
          ].map(({ label, value, hex, icon }) => (
            <StatCard key={label} label={label} value={fmtTotal(value)} hex={hex} icon={icon} mono />
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="print-area flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">NIT</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">Cliente</th>
                <th className={celdaHeader}>Corriente</th>
                <th className={celdaHeader}>1 – 30d</th>
                <th className={celdaHeader}>31 – 60d</th>
                <th className={celdaHeader}>61 – 90d</th>
                <th className={celdaHeader}>+ 90d</th>
                <th className={`${celdaHeader} text-gray-600`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : sinSaldo ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin saldos pendientes al {fechaCorte}</td></tr>
              ) : data?.items.map((item) => (
                <tr key={item.tercero_id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5">
                    {puedeCrearRecibo ? (
                      <button
                        onClick={() => router.push(`/dashboard/cxc/recibos?tercero_id=${item.tercero_id}&tercero_display=${encodeURIComponent(`${item.tercero_nit ?? ""} — ${item.tercero_nombre ?? ""}`)}`)}
                        title="Crear recibo de caja para este cliente"
                        className="font-mono text-[11px] text-blue-600 hover:underline hover:text-blue-800 cursor-pointer">
                        {item.tercero_nit ?? "—"}
                      </button>
                    ) : (
                      <span className="font-mono text-[11px] text-gray-600">{item.tercero_nit ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 max-w-[200px] truncate">{item.tercero_nombre ?? "—"}</td>
                  <td className={`${celda} text-green-700`}>{fmt(item.corriente)}</td>
                  <td className={`${celda} text-yellow-700`}>{fmt(item.dias_1_30)}</td>
                  <td className={`${celda} text-orange-700`}>{fmt(item.dias_31_60)}</td>
                  <td className={`${celda} text-red-600`}>{fmt(item.dias_61_90)}</td>
                  <td className={`${celda} text-red-800 font-semibold`}>{fmt(item.mas_90)}</td>
                  <td className={`${celda} text-gray-800 font-semibold`}>{fmtTotal(item.total)}</td>
                </tr>
              ))}
            </tbody>
            {data && data.items.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase tracking-wide">Total general</td>
                  <td className={`${celda} text-green-700 font-bold`}>{fmtTotal(data.total_corriente)}</td>
                  <td className={`${celda} text-yellow-700 font-bold`}>{fmtTotal(data.total_1_30)}</td>
                  <td className={`${celda} text-orange-700 font-bold`}>{fmtTotal(data.total_31_60)}</td>
                  <td className={`${celda} text-red-600 font-bold`}>{fmtTotal(data.total_61_90)}</td>
                  <td className={`${celda} text-red-800 font-bold`}>{fmtTotal(data.total_mas_90)}</td>
                  <td className={`${celda} text-gray-800 font-bold`}>{fmtTotal(data.total_general)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
