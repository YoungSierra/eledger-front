"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

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
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }

const NIVELES: Record<number, string> = { 1: "Clase", 2: "Grupo", 3: "Cuenta", 4: "Subcuenta" };
const INDENT_PX = 14;

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

const tdBase: React.CSSProperties = { padding: "3px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 9.5, color: "#1e293b" };
const tdNum: React.CSSProperties  = { ...tdBase, textAlign: "right", fontFamily: "monospace" };
const thBase: React.CSSProperties = { padding: "5px 8px", fontWeight: 700, fontSize: 8.5, textTransform: "uppercase" as const, letterSpacing: 0.5, color: "#1e293b", borderBottom: "2px solid #1e293b" };
const secHdr: React.CSSProperties = { padding: "5px 8px", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: "#1d4ed8", background: "#eff6ff", borderTop: "2px solid #93c5fd", borderBottom: "1px solid #bfdbfe" };
const totSec: React.CSSProperties = { padding: "3px 8px", fontWeight: 700, fontSize: 9, color: "#374151", background: "#f1f5f9", borderTop: "1px solid #94a3b8" };
const utilRow: React.CSSProperties = { padding: "4px 8px", fontWeight: 700, fontSize: 9.5, background: "#eff6ff", borderTop: "1px solid #93c5fd" };
const utilFinal: React.CSSProperties = { padding: "6px 8px", fontWeight: 700, fontSize: 11, background: "#1e3a5f", color: "#fff", borderTop: "2px solid #1e3a5f" };

function FilaRow({ fila, maxNivel }: { fila: Fila; maxNivel: number }) {
  const indent = (fila.nivel - 1) * INDENT_PX;
  const isTop  = fila.nivel === 1;
  const isLeaf = fila.nivel === maxNivel;
  return (
    <tr style={{ background: isTop ? "#f8fafc" : "#fff" }}>
      <td style={{ ...tdBase, fontFamily: "monospace", fontWeight: isTop ? 700 : 500, color: isTop ? "#1e293b" : "#64748b", width: 70 }}>{fila.codigo}</td>
      <td style={{ ...tdBase, paddingLeft: indent + 8, fontWeight: isTop ? 700 : isLeaf ? 400 : 600 }}>{fila.nombre}</td>
      <td style={tdNum}>{fmt(fila.saldo)}</td>
    </tr>
  );
}

function ResultadosContent() {
  const params     = useSearchParams();
  const fechaDesde = params.get("fecha_desde") ?? "";
  const fechaHasta = params.get("fecha_hasta") ?? "";
  const nivel      = parseInt(params.get("nivel") ?? "3", 10);
  const arbol      = params.get("arbol") !== "0";

  const [data,    setData]    = useState<Resultados | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!fechaDesde || !fechaHasta) return;
    const p = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, nivel: String(nivel) });
    apiFetch<Resultados>(`/reportes/resultados?${p}`).then(setData);
    apiFetch<Empresa>("/empresa").catch(() => null).then(e => { if (e) setEmpresa(e); });
  }, [fechaDesde, fechaHasta, nivel]);

  useEffect(() => {
    if (data) document.title = `Estado de Resultados ${data.fecha_desde} ${data.fecha_hasta}`;
  }, [data]);

  if (!data) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const hoy = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const nitEmpresa = empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : "";

  function filas(arr: Fila[]) {
    return arbol ? arr : arr.filter(f => f.nivel === nivel);
  }

  const hayNoOper = data.ing_no_oper.length > 0 || data.gasto_no_oper.length > 0;
  const utilNeta  = parseFloat(data.subtotales.utilidad_neta);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { background: #fff; font-family: system-ui, -apple-system, sans-serif; color: #1e293b; }
        @page { margin: 14mm 18mm; size: A4 portrait; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 32px", fontSize: 11, lineHeight: 1.5 }}>

        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #1e293b" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 40, marginBottom: 6, objectFit: "contain" }} />
            <div style={{ fontSize: 10 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 12 }}>{empresa?.razon_social ?? ""}</div>
              {nitEmpresa && <div style={{ color: "#64748b" }}>NIT: {nitEmpresa}</div>}
              {empresa?.direccion && <div style={{ color: "#64748b" }}>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>}
              {empresa?.telefono && <div style={{ color: "#64748b" }}>Tel: {empresa.telefono}{empresa.email ? ` · ${empresa.email}` : ""}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ border: "2px solid #1e293b", borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 190 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>Estado de Resultados</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#64748b", marginTop: 2 }}>Nivel: {NIVELES[nivel] ?? nivel}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Desde:</strong> {data.fecha_desde}</div>
              <div><strong>Hasta:</strong> {data.fecha_hasta}</div>
              <div><strong>Generado:</strong> {hoy}</div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "left", width: 70 }}>Código</th>
              <th style={{ ...thBase, textAlign: "left", minWidth: 220 }}>Nombre</th>
              <th style={{ ...thBase, textAlign: "right", width: 130 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {/* Ingresos operacionales */}
            <tr><td colSpan={3} style={secHdr}>Ingresos operacionales</td></tr>
            {filas(data.ing_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={nivel} />)}
            <tr><td colSpan={2} style={totSec}>Total ingresos operacionales</td><td style={{ ...totSec, textAlign: "right", fontFamily: "monospace" }}>{fmtSigned(data.subtotales.ing_oper)}</td></tr>

            {/* Costos */}
            <tr><td colSpan={3} style={secHdr}>Costo de ventas</td></tr>
            {filas(data.costos).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={nivel} />)}
            <tr><td colSpan={2} style={totSec}>Total costo de ventas</td><td style={{ ...totSec, textAlign: "right", fontFamily: "monospace" }}>{fmtSigned(data.subtotales.costos)}</td></tr>
            <tr>
              <td colSpan={2} style={{ ...utilRow, color: "#1d4ed8" }}>= UTILIDAD BRUTA</td>
              <td style={{ ...utilRow, textAlign: "right", fontFamily: "monospace", color: parseFloat(data.subtotales.utilidad_bruta) >= 0 ? "#1d4ed8" : "#dc2626" }}>{fmtSigned(data.subtotales.utilidad_bruta)}</td>
            </tr>

            {/* Gastos operacionales */}
            <tr><td colSpan={3} style={secHdr}>Gastos operacionales</td></tr>
            {filas(data.gasto_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={nivel} />)}
            <tr><td colSpan={2} style={totSec}>Total gastos operacionales</td><td style={{ ...totSec, textAlign: "right", fontFamily: "monospace" }}>{fmtSigned(data.subtotales.gasto_oper)}</td></tr>
            <tr>
              <td colSpan={2} style={{ ...utilRow, color: "#1d4ed8" }}>= UTILIDAD OPERACIONAL</td>
              <td style={{ ...utilRow, textAlign: "right", fontFamily: "monospace", color: parseFloat(data.subtotales.utilidad_operacional) >= 0 ? "#1d4ed8" : "#dc2626" }}>{fmtSigned(data.subtotales.utilidad_operacional)}</td>
            </tr>

            {/* No operacionales */}
            {hayNoOper && <>
              {data.ing_no_oper.length > 0 && <>
                <tr><td colSpan={3} style={secHdr}>Ingresos no operacionales</td></tr>
                {filas(data.ing_no_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={nivel} />)}
                <tr><td colSpan={2} style={totSec}>Total ingresos no operacionales</td><td style={{ ...totSec, textAlign: "right", fontFamily: "monospace" }}>{fmtSigned(data.subtotales.ing_no_oper)}</td></tr>
              </>}
              {data.gasto_no_oper.length > 0 && <>
                <tr><td colSpan={3} style={secHdr}>Gastos no operacionales</td></tr>
                {filas(data.gasto_no_oper).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={nivel} />)}
                <tr><td colSpan={2} style={totSec}>Total gastos no operacionales</td><td style={{ ...totSec, textAlign: "right", fontFamily: "monospace" }}>{fmtSigned(data.subtotales.gasto_no_oper)}</td></tr>
              </>}
              <tr>
                <td colSpan={2} style={{ ...utilRow, color: "#1d4ed8" }}>= UTILIDAD ANTES DE IMPUESTOS</td>
                <td style={{ ...utilRow, textAlign: "right", fontFamily: "monospace", color: parseFloat(data.subtotales.utilidad_antes_impuestos) >= 0 ? "#1d4ed8" : "#dc2626" }}>{fmtSigned(data.subtotales.utilidad_antes_impuestos)}</td>
              </tr>
            </>}

            {/* Utilidad neta */}
            <tr>
              <td colSpan={2} style={utilFinal}>= UTILIDAD NETA DEL PERÍODO</td>
              <td style={{ ...utilFinal, textAlign: "right", fontFamily: "monospace", color: utilNeta >= 0 ? "#fff" : "#fca5a5" }}>{fmtSigned(data.subtotales.utilidad_neta)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid #d1d5db", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
          <span>Documento generado por el sistema Emperador Ledger</span>
        </div>
      </div>
    </>
  );
}

export default function ImprimirResultadosPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}>
      <ResultadosContent />
    </Suspense>
  );
}

