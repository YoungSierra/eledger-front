"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Linea { fecha: string; numero: number; descripcion: string; debito: string; credito: string; saldo: string; }
interface SeccionTercero { tercero_id: string | null; tercero_nit: string; tercero_nombre: string; saldo_inicial: string; lineas: Linea[]; totales: { debito: string; credito: string; saldo_final: string }; }
interface CuentaAux { cuenta_codigo: string; cuenta_nombre: string; naturaleza: string; terceros: SeccionTercero[]; }
interface Auxiliar { fecha_desde: string; fecha_hasta: string; cuenta_desde: string; cuenta_hasta: string; cuentas: CuentaAux[]; }
interface Tercero { id: string; nit: string; razon_social: string; }

function BuscadorTercero({ onChange }: { onChange: (id: string) => void }) {
  const [query,    setQuery]    = useState("");
  const [opciones, setOpciones] = useState<Tercero[]>([]);
  const [abierto,  setAbierto]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setOpciones([]); setAbierto(false); return; }
    const t = setTimeout(() => {
      apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(query)}`)
        .then(r => { setOpciones(r); setAbierto(true); })
        .catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  function seleccionar(t: Tercero) {
    setQuery(`${t.nit} · ${t.razon_social}`);
    setAbierto(false);
    onChange(t.id);
  }

  function limpiar() {
    setQuery(""); setOpciones([]); setAbierto(false); onChange("");
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <input value={query} onChange={e => { setQuery(e.target.value); if (!e.target.value) limpiar(); }}
          onFocus={() => { if (opciones.length) setAbierto(true); }}
          placeholder="Buscar por NIT o nombre…"
          className="px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 pr-6" />
        {query && (
          <button onClick={limpiar} className="absolute right-1.5 text-gray-400 hover:text-gray-600 text-[14px] leading-none">×</button>
        )}
      </div>
      {abierto && opciones.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {opciones.map(t => (
            <button key={t.id} onMouseDown={() => seleccionar(t)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-[11px] border-b border-gray-100 last:border-0">
              <span className="font-mono text-gray-500 mr-2">{t.nit}</span>
              <span className="text-gray-800">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtSaldo(v: string | number) {
  const n = parseFloat(String(v));
  if (n === 0) return "—";
  const abs = Math.abs(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${abs})` : abs;
}

const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";

export default function AuxiliarPage() {
  usePageTitle();

  const hoy          = hoyLocal();
  const primerDiaMes = hoy.slice(0, 7) + "-01";

  const [desde,     setDesde]     = useState(primerDiaMes);
  const [hasta,     setHasta]     = useState(hoy);
  const [cDesde,    setCDesde]    = useState("");
  const [cHasta,    setCHasta]    = useState("");
  const [terceroId, setTerceroId] = useState("");
  const [data,      setData]      = useState<Auxiliar | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const generar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ cuenta_desde: cDesde, cuenta_hasta: cHasta, fecha_desde: desde, fecha_hasta: hasta });
      if (terceroId) p.set("tercero_id", terceroId);
      setData(await apiFetch<Auxiliar>(`/reportes/auxiliar?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar");
    } finally { setLoading(false); }
  }, [cDesde, cHasta, desde, hasta, terceroId]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ cuenta_desde: cDesde, cuenta_hasta: cHasta, fecha_desde: desde, fecha_hasta: hasta });
      if (terceroId) p.set("tercero_id", terceroId);
      const res = await fetch(`${BASE_URL}/reportes/auxiliar/excel?${p}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `auxiliar_${cDesde}_${cHasta}_${desde}_${hasta}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ cuenta_desde: cDesde, cuenta_hasta: cHasta, fecha_desde: desde, fecha_hasta: hasta });
    if (terceroId) p.set("tercero_id", terceroId);
    window.open(`/auxiliar?${p}`, "_blank");
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
          <div>
            <label className={lbl}>Tercero</label>
            <BuscadorTercero onChange={id => setTerceroId(id)} />
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {exporting ? "Exportando…" : "Excel"}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {error && <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</div>}
        {!data && !loading && <div className="text-[12px] text-gray-400 mt-8 text-center">Configura las fechas y haz clic en Generar (el rango de cuentas es opcional)</div>}

        {data && (
          <>
            <div className="text-[11px] text-gray-500 mb-3">
              {data.fecha_desde} — {data.fecha_hasta} · Cuentas {data.cuenta_desde} – {data.cuenta_hasta}
              {" · "}{data.cuentas.length} cuenta(s)
            </div>

            <div className="space-y-5">
              {data.cuentas.map(cuenta => (
                <div key={cuenta.cuenta_codigo} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-800 text-white flex items-baseline gap-3">
                    <span className="font-mono font-bold text-[13px]">{cuenta.cuenta_codigo}</span>
                    <span className="text-[12px] font-semibold">{cuenta.cuenta_nombre}</span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {cuenta.terceros.map(sec => (
                      <div key={sec.tercero_id ?? "sin-tercero"}>
                        {/* Sub-encabezado tercero */}
                        <div className="px-4 py-1.5 bg-blue-600 text-white flex items-baseline gap-2">
                          {sec.tercero_nit && <span className="font-mono text-[10px] text-blue-200">{sec.tercero_nit}</span>}
                          {sec.tercero_nit && <span className="text-blue-300 text-[10px]">·</span>}
                          <span className="text-[11px] font-bold">{sec.tercero_nombre}</span>
                          <span className="ml-auto text-[10px] text-blue-200">
                            Saldo inicial: <span className="font-mono font-bold text-white">{fmtSaldo(sec.saldo_inicial)}</span>
                          </span>
                        </div>

                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-500 w-20">Fecha</th>
                              <th className="px-2 py-1 text-center text-[9px] font-bold uppercase text-gray-500 w-[120px]">N° Asiento</th>
                              <th className="px-2 py-1 text-left text-[9px] font-bold uppercase text-gray-500 max-w-[160px]">Descripción</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-500 w-24">Débito</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-500 w-24">Crédito</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase text-gray-500 w-24">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sec.lineas.map((ln, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                <td className="px-2 py-1 font-mono text-[10px] text-gray-600 whitespace-nowrap">{ln.fecha}</td>
                                <td className="px-2 py-1 font-mono text-[10px] text-gray-600 text-center">{ln.numero}</td>
                                <td className="px-2 py-1 text-gray-700 truncate max-w-[160px]" title={ln.descripcion}>{ln.descripcion}</td>
                                <td className="px-2 py-1 text-right font-mono text-[10px] text-gray-700">{fmt(ln.debito)}</td>
                                <td className="px-2 py-1 text-right font-mono text-[10px] text-gray-700">{fmt(ln.credito)}</td>
                                <td className="px-2 py-1 text-right font-mono text-[10px] font-semibold text-gray-900">{fmtSaldo(ln.saldo)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-100">
                              <td colSpan={3} className="px-2 py-1.5 font-bold text-[10px] uppercase text-gray-600">Totales</td>
                              <td className="px-2 py-1.5 text-right font-mono text-[10px] font-bold text-gray-900">{fmt(sec.totales.debito)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-[10px] font-bold text-gray-900">{fmt(sec.totales.credito)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-[10px] font-bold text-blue-800">{fmtSaldo(sec.totales.saldo_final)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
