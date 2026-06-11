"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface FilaBalance { codigo: string; nombre: string; saldo: string; nivel: number; }
interface Totales { activo: string; pasivo: string; patrimonio: string; pasivo_mas_patrimonio: string; }
interface Balance {
  fecha_corte: string; nivel: number;
  activo: FilaBalance[]; pasivo: FilaBalance[]; patrimonio: FilaBalance[];
  utilidad_periodo: string; totales: Totales; cuadrado: boolean;
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
  if (!n) return "";
  const abs = Math.abs(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${abs})` : abs;
}

const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const th  = "px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200";
const thL = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200";
const td  = "py-1.5 text-right font-mono text-[11px] text-gray-700 pr-3";

// Indent por nivel: nivel=1 → 0px, nivel=2 → 14px, nivel=3 → 28px, nivel=4 → 42px
const INDENT = 14;

function FilaRow({ fila, maxNivel }: { fila: FilaBalance; maxNivel: number }) {
  const indent   = (fila.nivel - 1) * INDENT;
  const isLeaf   = fila.nivel === maxNivel;
  const isTop    = fila.nivel === 1;

  const rowBg = isTop
    ? "bg-slate-50 border-t border-gray-200"
    : isLeaf
    ? "bg-white"
    : "bg-gray-50/60";

  const nameStyle: React.CSSProperties = {
    paddingLeft: indent + 12,
    fontWeight: isTop ? 700 : fila.nivel < maxNivel ? 600 : 400,
    fontSize: isTop ? 11 : 11,
    color: isTop ? "#1e293b" : "#374151",
  };
  const codeStyle: React.CSSProperties = {
    paddingLeft: 12,
    fontFamily: "monospace",
    fontWeight: isTop ? 700 : 500,
    color: isTop ? "#1e293b" : "#64748b",
    fontSize: 11,
    width: 90,
  };

  return (
    <tr className={rowBg}>
      <td style={codeStyle} className="py-1.5">{fila.codigo}</td>
      <td style={nameStyle} className="py-1.5">{fila.nombre}</td>
      <td className={td}>{fmt(fila.saldo)}</td>
    </tr>
  );
}

function SeccionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-blue-700 bg-blue-50 border-t-2 border-b border-blue-200">
        {label}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, valor, highlight }: { label: string; valor: string; highlight?: boolean }) {
  return (
    <tr className={highlight ? "bg-blue-50 border-t-2 border-blue-300" : "bg-gray-100 border-t border-gray-300"}>
      <td colSpan={2} className={`pl-3 py-1.5 font-bold text-[10px] uppercase tracking-wide ${highlight ? "text-blue-800" : "text-gray-700"}`}>{label}</td>
      <td className={`${td} font-bold ${highlight ? "text-blue-900" : "text-gray-900"}`}>{fmtSigned(valor)}</td>
    </tr>
  );
}

export default function BalancePage() {
  usePageTitle();

  const hoy = hoyLocal();
  const [corte,     setCorte]     = useState(hoy);
  const [nivel,     setNivel]     = useState(3);
  const [arbol,     setArbol]     = useState(true);
  const [data,      setData]      = useState<Balance | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const generar = useCallback(async () => {
    if (!corte) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ fecha_corte: corte, nivel: String(nivel) });
      setData(await apiFetch<Balance>(`/reportes/balance?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar el reporte");
    } finally { setLoading(false); }
  }, [corte, nivel]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ fecha_corte: corte, nivel: String(nivel) });
      const res = await fetch(`${BASE_URL}/reportes/balance/excel?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `balance_${corte}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ fecha_corte: corte, nivel: String(nivel), arbol: arbol ? "1" : "0" });
    window.open(`/balance?${p}`, "_blank");
  }

  return (
    <div className="h-full flex flex-col">

      {/* Filtros */}
      <div className="flex-none border-b border-gray-100 px-5 py-3 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={lbl}>Fecha de corte</label>
            <input type="date" value={corte} onChange={e => setCorte(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Nivel de detalle</label>
            <select value={nivel} onChange={e => setNivel(Number(e.target.value))} className={inp}>
              {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={arbol} onChange={e => setArbol(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600" />
            <span className="text-[12px] text-gray-600">Mostrar árbol</span>
          </label>
          <button onClick={generar} disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Generando…" : "Generar"}
          </button>
          <button onClick={imprimir} disabled={!data || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] font-medium rounded-md disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir / PDF
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
                Corte al {data.fecha_corte}
                {" · "}{NIVELES.find(n => n.value === data.nivel)?.label}
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${data.cuadrado ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                {data.cuadrado ? "✓ Cuadrado" : "⚠ Descuadrado"}
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-4xl">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className={thL} style={{ width: 90 }}>Código</th>
                    <th className={thL}>Nombre</th>
                    <th className={th} style={{ width: 140 }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <SeccionHeader label="ACTIVO" />
                  {(arbol ? data.activo : data.activo.filter(f => f.nivel === data.nivel)).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                  <SubtotalRow label="Total Activo" valor={data.totales.activo} />

                  <SeccionHeader label="PASIVO" />
                  {(arbol ? data.pasivo : data.pasivo.filter(f => f.nivel === data.nivel)).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                  <SubtotalRow label="Total Pasivo" valor={data.totales.pasivo} />

                  <SeccionHeader label="PATRIMONIO" />
                  {(arbol ? data.patrimonio : data.patrimonio.filter(f => f.nivel === data.nivel)).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
                  <tr className="bg-white">
                    <td className="py-1.5 pl-3 text-gray-400 italic font-mono text-[11px]"></td>
                    <td className="py-1.5 pl-3 text-gray-400 italic text-[11px]">Utilidad del período</td>
                    <td className={`${td} text-gray-400 italic`}>{fmtSigned(data.utilidad_periodo)}</td>
                  </tr>
                  <SubtotalRow label="Total Patrimonio" valor={data.totales.patrimonio} />

                  <SubtotalRow label="TOTAL PASIVO + PATRIMONIO" valor={data.totales.pasivo_mas_patrimonio} highlight />
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
