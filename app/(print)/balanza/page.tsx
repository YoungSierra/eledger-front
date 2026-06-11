"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Fila {
  codigo: string; nombre: string;
  si_debito: string; si_credito: string;
  periodo_debito: string; periodo_credito: string;
  sf_debito: string; sf_credito: string;
}
interface Totales {
  si_debito: string; si_credito: string;
  periodo_debito: string; periodo_credito: string;
  sf_debito: string; sf_credito: string;
}
interface Balanza { fecha_desde: string; fecha_hasta: string; nivel: number; filas: Fila[]; totales: Totales; cuadrado: boolean; }
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }

const NIVELES: Record<number, string> = { 1: "Clase", 2: "Grupo", 3: "Cuenta", 4: "Subcuenta" };

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const th: React.CSSProperties = { padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#1e293b", borderBottom: "2px solid #1e293b" };
const thL: React.CSSProperties = { ...th, textAlign: "left" };
const td: React.CSSProperties = { padding: "4px 8px", textAlign: "right", fontSize: 9.5, fontFamily: "monospace", borderBottom: "1px solid #d1d5db", color: "#1e293b" };
const tdL: React.CSSProperties = { ...td, textAlign: "left", fontFamily: "system-ui", color: "#374151" };

function BalanzaContent() {
  const params      = useSearchParams();
  const fechaDesde  = params.get("fecha_desde") ?? "";
  const fechaHasta  = params.get("fecha_hasta") ?? "";
  const nivel       = parseInt(params.get("nivel") ?? "3", 10);

  const [data,    setData]    = useState<Balanza | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!fechaDesde || !fechaHasta) return;
    const p = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, nivel: String(nivel) });
    apiFetch<Balanza>(`/reportes/balanza?${p}`).then(setData);
    apiFetch<Empresa>("/empresa").catch(() => null).then(e => { if (e) setEmpresa(e); });
  }, [fechaDesde, fechaHasta, nivel]);

  useEffect(() => {
    if (data) document.title = `Balanza ${data.fecha_desde} ${data.fecha_hasta}`;
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
        @page { margin: 12mm 15mm; size: A4 landscape; }
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

      <div style={{ maxWidth: 1050, margin: "0 auto", padding: "24px 32px", fontSize: 11, lineHeight: 1.5 }}>

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
            <div style={{ border: "2px solid #1e293b", borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 200 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>Balanza de Comprobación</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#64748b", marginTop: 2 }}>Nivel: {NIVELES[nivel] ?? nivel}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Desde:</strong> {data.fecha_desde}</div>
              <div><strong>Hasta:</strong> {data.fecha_hasta}</div>
              <div><strong>Generado:</strong> {hoy}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: data.cuadrado ? "#dcfce7" : "#fee2e2", color: data.cuadrado ? "#166534" : "#991b1b" }}>
                  {data.cuadrado ? "✓ Cuadrada" : "⚠ Descuadrada"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thL} rowSpan={2}>Código</th>
              <th style={{ ...thL, minWidth: 200 }} rowSpan={2}>Nombre</th>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }} colSpan={2}>Saldo inicial</th>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }} colSpan={2}>Movimiento del período</th>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }} colSpan={2}>Saldo final</th>
            </tr>
            <tr>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }}>Débito</th>
              <th style={th}>Crédito</th>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }}>Débito</th>
              <th style={th}>Crédito</th>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }}>Débito</th>
              <th style={th}>Crédito</th>
            </tr>
          </thead>
          <tbody>
            {data.filas.map((f, i) => (
              <tr key={f.codigo} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                <td style={{ ...tdL, fontFamily: "monospace", fontWeight: 600 }}>{f.codigo}</td>
                <td style={tdL}>{f.nombre}</td>
                <td style={{ ...td, borderLeft: "1px solid #e5e7eb" }}>{fmt(f.si_debito)}</td>
                <td style={td}>{fmt(f.si_credito)}</td>
                <td style={{ ...td, borderLeft: "1px solid #e5e7eb" }}>{fmt(f.periodo_debito)}</td>
                <td style={td}>{fmt(f.periodo_credito)}</td>
                <td style={{ ...td, borderLeft: "1px solid #e5e7eb" }}>{fmt(f.sf_debito)}</td>
                <td style={td}>{fmt(f.sf_credito)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #1e293b" }}>
              <td colSpan={2} style={{ ...tdL, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Totales</td>
              <td style={{ ...td, fontWeight: 700, borderLeft: "1px solid #e5e7eb" }}>{fmt(data.totales.si_debito)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmt(data.totales.si_credito)}</td>
              <td style={{ ...td, fontWeight: 700, borderLeft: "1px solid #e5e7eb" }}>{fmt(data.totales.periodo_debito)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmt(data.totales.periodo_credito)}</td>
              <td style={{ ...td, fontWeight: 700, borderLeft: "1px solid #e5e7eb" }}>{fmt(data.totales.sf_debito)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmt(data.totales.sf_credito)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid #d1d5db", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
          <span>Documento generado por el sistema Emperador Ledger</span>
        </div>
      </div>
    </>
  );
}

export default function ImprimirBalanzaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}>
      <BalanzaContent />
    </Suspense>
  );
}
