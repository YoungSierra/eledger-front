"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Fila { codigo: string; nombre: string; saldo: string; nivel: number; }
interface Subtotales {
  ing_oper: string; costos: string; utilidad_bruta: string;
  gasto_oper: string; utilidad_operacional: string;
  ing_no_oper: string; gasto_no_oper: string;
  utilidad_antes_impuestos: string; utilidad_neta: string;
}
interface Resultados {
  fecha_desde: string; fecha_hasta: string; nivel: number;
  ing_oper: Fila[]; costos: Fila[]; gasto_oper: Fila[];
  ing_no_oper: Fila[]; gasto_no_oper: Fila[];
  subtotales: Subtotales;
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

function fmtSigned(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "—";
  const abs = Math.abs(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${abs})` : abs;
}

const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const th  = "px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200";
const thL = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200";

const INDENT = 14;

function SeccionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-blue-700 bg-blue-50 border-t-2 border-b border-blue-200">
        {label}
      </td>
    </tr>
  );
}

function FilaRow({ fila, maxNivel }: { fila: Fila; maxNivel: number }) {
  const indent = (fila.nivel - 1) * INDENT;
  const isTop  = fila.nivel === 1;
  const isLeaf = fila.nivel === maxNivel;
  return (
    <tr className={isTop ? "bg-slate-50 border-t border-gray-200" : "bg-white"}>
      <td className="py-1.5 pl-3 font-mono text-[11px] text-gray-500" style={{ width: 90, fontWeight: isTop ? 700 : 500 }}>{fila.codigo}</td>
      <td className="py-1.5 text-[11px] text-gray-700" style={{ paddingLeft: indent + 12, fontWeight: isTop ? 700 : isLeaf ? 400 : 600 }}>{fila.nombre}</td>
      <td className="py-1.5 pr-3 text-right font-mono text-[11px] text-gray-700">{fmt(fila.saldo)}</td>
    </tr>
  );
}

function TotalSeccion({ label, valor }: { label: string; valor: string }) {
  return (
    <tr className="bg-gray-100 border-t border-gray-300">
      <td colSpan={2} className="pl-3 py-1.5 font-semibold text-[10px] uppercase tracking-wide text-gray-600">{label}</td>
      <td className="pr-3 py-1.5 text-right font-mono font-bold text-[11px] text-gray-800">{fmtSigned(valor)}</td>
    </tr>
  );
}

function UtilRow({ label, valor, variant = "normal" }: { label: string; valor: string; variant?: "normal" | "final" }) {
  const n = parseFloat(valor);
  const positivo = n >= 0;
  if (variant === "final") {
    return (
      <tr className="border-t-2 border-blue-700">
        <td colSpan={2} className="pl-3 py-2 font-bold text-[11px] uppercase tracking-wide text-blue-900 bg-blue-100">{label}</td>
        <td className={`pr-3 py-2 text-right font-mono font-bold text-[12px] bg-blue-100 ${positivo ? "text-blue-900" : "text-red-700"}`}>{fmtSigned(valor)}</td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-blue-200 bg-blue-50">
      <td colSpan={2} className="pl-3 py-1.5 font-bold text-[10px] uppercase tracking-wide text-blue-800">{label}</td>
      <td className={`pr-3 py-1.5 text-right font-mono font-bold text-[11px] ${positivo ? "text-blue-800" : "text-red-600"}`}>{fmtSigned(valor)}</td>
    </tr>
  );
}

export default function ResultadosPage() {
  usePageTitle();

  const hoy          = hoyLocal();
  const primerDiaMes = hoy.slice(0, 7) + "-01";

  const [desde,     setDesde]     = useState(primerDiaMes);
  const [hasta,     setHasta]     = useState(hoy);
  const [nivel,     setNivel]     = useState(3);
  const [arbol,     setArbol]     = useState(true);
  const [data,      setData]      = useState<Resultados | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const generar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, nivel: String(nivel) });
      setData(await apiFetch<Resultados>(`/reportes/resultados?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar el reporte");
    } finally { setLoading(false); }
  }, [desde, hasta, nivel]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, nivel: String(nivel) });
      const res = await fetch(`${BASE_URL}/reportes/resultados/excel?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href = url; a.download = `resultados_${desde}_${hasta}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta, nivel: String(nivel), arbol: arbol ? "1" : "0" });
    window.open(`/resultados?${p}`, "_blank");
  }

  function filas(arr: Fila[]) {
    return arbol ? arr : arr.filter(f => f.nivel === (data?.nivel ?? nivel));
  }

  const hayNoOper = data && (data.ing_no_oper.length > 0 || data.gasto_no_oper.length > 0);

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
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={arbol} onChange={e => setArbol(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
            <span className="text-[12px] text-gray-600">Mostrar árbol</span>
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            {exporting ? "Exportando…" : "Excel"}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {error && <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</div>}
        {!data && !loading && <div className="text-[12px] text-gray-400 mt-8 text-center">Configura los filtros y haz clic en Generar</div>}

        {data && (
          <>
            <div className="text-[11px] text-gray-500 mb-3">
              {data.fecha_desde} — {data.fecha_hasta} · {NIVELES.find(n => n.value === data.nivel)?.label}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-4xl">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className={thL} style={{ width: 90 }}>Código</th>
                    <th className={thL}>Nombre</th>
                    <th className={th} style={{ width: 140 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Ingresos operacionales */}
                  <SeccionHeader label="Ingresos operacionales" />
                  {filas(data.ing_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                  <TotalSeccion label="Total ingresos operacionales" valor={data.subtotales.ing_oper} />

                  {/* Costos */}
                  <SeccionHeader label="Costo de ventas" />
                  {filas(data.costos).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                  <TotalSeccion label="Total costo de ventas" valor={data.subtotales.costos} />
                  <UtilRow label="= Utilidad bruta" valor={data.subtotales.utilidad_bruta} />

                  {/* Gastos operacionales */}
                  <SeccionHeader label="Gastos operacionales" />
                  {filas(data.gasto_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                  <TotalSeccion label="Total gastos operacionales" valor={data.subtotales.gasto_oper} />
                  <UtilRow label="= Utilidad operacional" valor={data.subtotales.utilidad_operacional} />

                  {/* No operacionales (solo si hay datos) */}
                  {hayNoOper && <>
                    {data.ing_no_oper.length > 0 && <>
                      <SeccionHeader label="Ingresos no operacionales" />
                      {filas(data.ing_no_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                      <TotalSeccion label="Total ingresos no operacionales" valor={data.subtotales.ing_no_oper} />
                    </>}
                    {data.gasto_no_oper.length > 0 && <>
                      <SeccionHeader label="Gastos no operacionales" />
                      {filas(data.gasto_no_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                      <TotalSeccion label="Total gastos no operacionales" valor={data.subtotales.gasto_no_oper} />
                    </>}
                    <UtilRow label="= Utilidad antes de impuestos" valor={data.subtotales.utilidad_antes_impuestos} />
                  </>}

                  {/* Utilidad neta */}
                  <UtilRow label="= Utilidad neta del período" valor={data.subtotales.utilidad_neta} variant="final" />
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
