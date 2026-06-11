"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface FilaBalance { codigo: string; nombre: string; saldo: string; nivel: number; }
interface Totales { activo: string; pasivo: string; patrimonio: string; pasivo_mas_patrimonio: string; }
interface Balance {
  fecha_corte: string; nivel: number;
  activo: FilaBalance[]; pasivo: FilaBalance[]; patrimonio: FilaBalance[];
  utilidad_periodo: string; totales: Totales; cuadrado: boolean;
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
  if (!n) return "";
  const abs = Math.abs(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${abs})` : abs;
}

const tdBase: React.CSSProperties = { padding: "3px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 9.5, color: "#1e293b" };
const tdNum: React.CSSProperties  = { ...tdBase, textAlign: "right", fontFamily: "monospace" };
const thBase: React.CSSProperties = { padding: "5px 8px", fontWeight: 700, fontSize: 8.5, textTransform: "uppercase" as const, letterSpacing: 0.5, color: "#1e293b", borderBottom: "2px solid #1e293b" };

function FilaRow({ fila, maxNivel }: { fila: FilaBalance; maxNivel: number }) {
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

function SeccionHdr({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} style={{ padding: "5px 8px", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: "#1d4ed8", background: "#eff6ff", borderTop: "2px solid #93c5fd", borderBottom: "1px solid #bfdbfe" }}>
        {label}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, valor, highlight }: { label: string; valor: string; highlight?: boolean }) {
  const bg = highlight ? "#dbeafe" : "#f1f5f9";
  const bt = highlight ? "2px solid #3b82f6" : "1px solid #94a3b8";
  return (
    <tr style={{ background: bg, borderTop: bt }}>
      <td colSpan={2} style={{ ...tdBase, background: bg, fontWeight: 700, fontSize: 9, textTransform: "uppercase" as const, color: highlight ? "#1e40af" : "#374151", borderTop: bt }}>{label}</td>
      <td style={{ ...tdNum, background: bg, fontWeight: 700, color: highlight ? "#1e40af" : "#1e293b", borderTop: bt }}>{fmtSigned(valor)}</td>
    </tr>
  );
}

function BalanceContent() {
  const params     = useSearchParams();
  const fechaCorte = params.get("fecha_corte") ?? "";
  const nivel      = parseInt(params.get("nivel") ?? "3", 10);
  const arbol      = params.get("arbol") !== "0";

  const [data,    setData]    = useState<Balance | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!fechaCorte) return;
    const p = new URLSearchParams({ fecha_corte: fechaCorte, nivel: String(nivel) });
    apiFetch<Balance>(`/reportes/balance?${p}`).then(setData);
    apiFetch<Empresa>("/empresa").catch(() => null).then(e => { if (e) setEmpresa(e); });
  }, [fechaCorte, nivel]);

  useEffect(() => {
    if (data) document.title = `Balance General ${data.fecha_corte}`;
  }, [data]);

  if (!data) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const hoy = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const nitEmpresa = empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : "";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; }
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
          Imprimir / Guardar PDF
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
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>Balance General</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#64748b", marginTop: 2 }}>Nivel: {NIVELES[nivel] ?? nivel}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Corte al:</strong> {data.fecha_corte}</div>
              <div><strong>Generado:</strong> {hoy}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: data.cuadrado ? "#dcfce7" : "#fee2e2", color: data.cuadrado ? "#166534" : "#991b1b" }}>
                  {data.cuadrado ? "✓ Cuadrado" : "⚠ Descuadrado"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "left", width: 70 }}>Código</th>
              <th style={{ ...thBase, textAlign: "left", minWidth: 220 }}>Nombre</th>
              <th style={{ ...thBase, textAlign: "right", width: 130 }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            <SeccionHdr label="ACTIVO" />
            {(arbol ? data.activo : data.activo.filter(f => f.nivel === data.nivel)).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
            <SubtotalRow label="Total Activo" valor={data.totales.activo} />

            <SeccionHdr label="PASIVO" />
            {(arbol ? data.pasivo : data.pasivo.filter(f => f.nivel === data.nivel)).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
            <SubtotalRow label="Total Pasivo" valor={data.totales.pasivo} />

            <SeccionHdr label="PATRIMONIO" />
            {(arbol ? data.patrimonio : data.patrimonio.filter(f => f.nivel === data.nivel)).map(f => <FilaRow key={f.codigo} fila={f} maxNivel={data.nivel} />)}
            <tr style={{ background: "#fff" }}>
              <td style={{ ...tdBase, color: "#94a3b8" }}></td>
              <td style={{ ...tdBase, color: "#94a3b8", fontStyle: "italic" }}>Utilidad del período</td>
              <td style={{ ...tdNum, color: "#94a3b8", fontStyle: "italic" }}>{fmtSigned(data.utilidad_periodo)}</td>
            </tr>
            <SubtotalRow label="Total Patrimonio" valor={data.totales.patrimonio} />

            <SubtotalRow label="TOTAL PASIVO + PATRIMONIO" valor={data.totales.pasivo_mas_patrimonio} highlight />
          </tbody>
        </table>

        <div style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid #d1d5db", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
          <span>Documento generado por el sistema Emperador Ledger</span>
        </div>
      </div>
    </>
  );
}

export default function ImprimirBalancePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}>
      <BalanceContent />
    </Suspense>
  );
}
