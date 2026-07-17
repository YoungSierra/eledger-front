"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import CentroCostoTreeSelect, { CentroNode } from "@/components/CentroCostoTreeSelect";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Movimiento { fecha: string; numero: number; cuenta_codigo: string; cuenta_nombre: string; centro_costo_codigo: string; centro_costo_nombre: string; descripcion: string; debito: string; credito: string; }
interface Auxiliar { fecha_desde: string; fecha_hasta: string; cuenta_desde: string; cuenta_hasta: string; movimientos: Movimiento[]; totales: { debito: string; credito: string }; }

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

export default function AuxiliarCentroCostoPage() {
  usePageTitle();

  const hoy          = hoyLocal();
  const primerDiaMes = hoy.slice(0, 7) + "-01";

  const [desde,    setDesde]    = useState(primerDiaMes);
  const [hasta,    setHasta]    = useState(hoy);
  const [cDesde,   setCDesde]   = useState("");
  const [cHasta,   setCHasta]   = useState("");
  const [centroId, setCentroId] = useState("");
  const [incluirHijos, setIncluirHijos] = useState(false);
  const [centros,  setCentros]  = useState<CentroNode[]>([]);
  const [data,     setData]     = useState<Auxiliar | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CentroNode[]>("/centros-costo?plano=true").then(setCentros).catch(() => {});
  }, []);

  const generar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ cuenta_desde: cDesde, cuenta_hasta: cHasta, fecha_desde: desde, fecha_hasta: hasta });
      if (centroId) { p.set("centro_costo_id", centroId); if (incluirHijos) p.set("incluir_hijos", "true"); }
      setData(await apiFetch<Auxiliar>(`/reportes/auxiliar-centro-costo?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar");
    } finally { setLoading(false); }
  }, [cDesde, cHasta, desde, hasta, centroId, incluirHijos]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ cuenta_desde: cDesde, cuenta_hasta: cHasta, fecha_desde: desde, fecha_hasta: hasta });
      if (centroId) { p.set("centro_costo_id", centroId); if (incluirHijos) p.set("incluir_hijos", "true"); }
      const res = await fetch(`${BASE_URL}/reportes/auxiliar-centro-costo/excel?${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `auxiliar_cc_${cDesde}_${cHasta}_${desde}_${hasta}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ cuenta_desde: cDesde, cuenta_hasta: cHasta, fecha_desde: desde, fecha_hasta: hasta });
    if (centroId) { p.set("centro_costo_id", centroId); if (incluirHijos) p.set("incluir_hijos", "true"); }
    window.open(`/auxiliar-cc?${p}`, "_blank");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filtros */}
      <div className="flex-none border-b border-gray-100 px-5 py-3 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={lbl}>Cuenta desde</label>
            <input value={cDesde} onChange={e => setCDesde(e.target.value)} placeholder="opcional" className={`${inp} w-28`} />
          </div>
          <div>
            <label className={lbl}>Cuenta hasta</label>
            <input value={cHasta} onChange={e => setCHasta(e.target.value)} placeholder="opcional" className={`${inp} w-28`} />
          </div>
          <div>
            <label className={lbl}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inp} />
          </div>
          <div className="w-64">
            <label className={lbl}>Centro de costo</label>
            <CentroCostoTreeSelect centros={centros} value={centroId} onChange={setCentroId} placeholder="Todos" />
          </div>
          <label className={`flex items-center gap-1.5 pb-1.5 ${centroId ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`} title={centroId ? "" : "Selecciona un centro de costo"}>
            <input type="checkbox" checked={incluirHijos} disabled={!centroId}
              onChange={e => setIncluirHijos(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600" />
            <span className="text-[12px] text-gray-600">Incluir subcentros</span>
          </label>
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {exporting ? "Exportando…" : "Excel"}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {error && <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</div>}
        {!data && !loading && <div className="text-[12px] text-gray-400 mt-8 text-center">Configura las fechas y haz clic en Generar (el rango de cuentas y el centro son opcionales)</div>}

        {data && (
          <>
            <div className="text-[11px] text-gray-500 mb-3">
              {data.fecha_desde} — {data.fecha_hasta} · Cuentas {data.cuenta_desde} – {data.cuenta_hasta}
              {" · "}{data.movimientos.length} movimiento(s)
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase w-20">Fecha</th>
                    <th className="px-2 py-1.5 text-center text-[9px] font-bold uppercase w-16">Asiento</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase">Cuenta</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase">Centro de costo</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase">Descripción</th>
                    <th className="px-2 py-1.5 text-right text-[9px] font-bold uppercase w-24">Débito</th>
                    <th className="px-2 py-1.5 text-right text-[9px] font-bold uppercase w-24">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.length === 0 ? (
                    <tr><td colSpan={7} className="px-2 py-6 text-center text-gray-400 text-[12px]">Sin movimientos en el rango</td></tr>
                  ) : data.movimientos.map((m, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-2 py-1 font-mono text-[10px] text-gray-600 whitespace-nowrap">{m.fecha}</td>
                      <td className="px-2 py-1 font-mono text-[10px] text-gray-600 text-center">{m.numero}</td>
                      <td className="px-2 py-1 text-gray-700">
                        <span className="font-mono text-[10px] font-bold text-blue-700 mr-1.5">{m.cuenta_codigo}</span>
                        <span className="text-gray-600">{m.cuenta_nombre}</span>
                      </td>
                      <td className="px-2 py-1 text-gray-700">
                        {m.centro_costo_codigo
                          ? <><span className="font-mono text-[10px] font-bold text-emerald-700 mr-1.5">{m.centro_costo_codigo}</span><span className="text-gray-600">{m.centro_costo_nombre}</span></>
                          : <span className="text-gray-300 italic">Sin centro</span>}
                      </td>
                      <td className="px-2 py-1 text-gray-700 truncate max-w-[220px]" title={m.descripcion}>{m.descripcion}</td>
                      <td className="px-2 py-1 text-right font-mono text-[10px] text-gray-700">{fmt(m.debito)}</td>
                      <td className="px-2 py-1 text-right font-mono text-[10px] text-gray-700">{fmt(m.credito)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-100">
                    <td colSpan={5} className="px-2 py-1.5 font-bold text-[10px] uppercase text-gray-600 text-right">Totales</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[10px] font-bold text-gray-900">{fmt(data.totales.debito)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[10px] font-bold text-gray-900">{fmt(data.totales.credito)}</td>
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
