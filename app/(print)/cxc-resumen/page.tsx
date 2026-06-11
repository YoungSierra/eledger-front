"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

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

interface Empresa {
  razon_social: string; nit: string; digito_verif: string | null;
  direccion: string | null; ciudad: string | null;
  telefono: string | null; email: string | null;
}

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtTotal(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const th: React.CSSProperties = {
  padding: "6px 10px", textAlign: "right", fontWeight: 700, fontSize: 9,
  textTransform: "uppercase" as const, letterSpacing: 0.5, color: "#1e293b",
  borderBottom: "2px solid #1e293b",
};
const thLeft: React.CSSProperties = { ...th, textAlign: "left" };
const td: React.CSSProperties = {
  padding: "5px 10px", textAlign: "right", fontSize: 10,
  fontFamily: "monospace", borderBottom: "1px solid #d1d5db", color: "#1e293b",
};
const tdLeft: React.CSSProperties = { ...td, textAlign: "left", fontFamily: "system-ui", color: "#374151" };

function ResumenContent() {
  const params     = useSearchParams();
  const fechaCorte = params.get("fecha_corte") ?? new Date().toISOString().slice(0, 10);

  const [data,    setData]    = useState<ResumenResponse | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    apiFetch<ResumenResponse>(`/cxc/resumen?fecha_corte=${fechaCorte}`).then(setData);
    apiFetch<Empresa>("/empresa").catch(() => null).then((e) => { if (e) setEmpresa(e); });
  }, [fechaCorte]);

  useEffect(() => {
    if (!data) return;
    document.title = `Resumen CxC ${fechaCorte}`;
  }, [data, fechaCorte]);

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

      {/* Botón imprimir */}
      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div style={{ maxWidth: 1050, margin: "0 auto", padding: "24px 32px", fontSize: 11, lineHeight: 1.5 }}>

        {/* ── Encabezado empresa ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #1e293b" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 40, marginBottom: 6, objectFit: "contain" }} />
            <div style={{ fontSize: 10 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 12 }}>
                {empresa?.razon_social ?? "UNIVERSAL CARGO COLOMBIA S.A.S"}
              </div>
              <div style={{ color: "#64748b" }}>NIT: {nitEmpresa || "901.702.367"}</div>
              {empresa?.direccion && (
                <div style={{ color: "#64748b" }}>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>
              )}
              {empresa?.telefono && (
                <div style={{ color: "#64748b" }}>Tel: {empresa.telefono}{empresa.email ? ` · ${empresa.email}` : ""}</div>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ border: "2px solid #1e293b", borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 200, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>
                Resumen de Cartera
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b", marginTop: 2 }}>
                Cuentas por Cobrar
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Fecha de corte:</strong> {fechaCorte}</div>
              <div><strong>Generado:</strong> {hoy}</div>
              <div style={{ marginTop: 4, fontSize: 10, color: "#374151" }}>
                Total pendiente: <strong style={{ fontSize: 12 }}>{fmtTotal(data.total_general)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cards totales ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Corriente",    value: data.total_corriente },
            { label: "1 – 30 días",  value: data.total_1_30 },
            { label: "31 – 60 días", value: data.total_31_60 },
            { label: "61 – 90 días", value: data.total_61_90 },
            { label: "+ 90 días",    value: data.total_mas_90 },
            { label: "TOTAL",        value: data.total_general },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px", textAlign: "right" }}>
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>{fmtTotal(value)}</div>
            </div>
          ))}
        </div>

        {/* ── Tabla de antigüedad ── */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thLeft}>NIT</th>
              <th style={{ ...thLeft, minWidth: 180 }}>Cliente</th>
              <th style={th}>Corriente</th>
              <th style={th}>1 – 30 días</th>
              <th style={th}>31 – 60 días</th>
              <th style={th}>61 – 90 días</th>
              <th style={th}>+ 90 días</th>
              <th style={{ ...th, borderLeft: "1px solid #94a3b8" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={item.tercero_id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                <td style={{ ...tdLeft, fontFamily: "monospace", fontSize: 10 }}>{item.tercero_nit ?? "—"}</td>
                <td style={{ ...tdLeft, maxWidth: 200 }}>{item.tercero_nombre ?? "—"}</td>
                <td style={td}>{fmt(item.corriente)}</td>
                <td style={td}>{fmt(item.dias_1_30)}</td>
                <td style={td}>{fmt(item.dias_31_60)}</td>
                <td style={td}>{fmt(item.dias_61_90)}</td>
                <td style={{ ...td, fontWeight: parseFloat(item.mas_90) > 0 ? 700 : 400 }}>{fmt(item.mas_90)}</td>
                <td style={{ ...td, fontWeight: 700, borderLeft: "1px solid #94a3b8" }}>{fmtTotal(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #1e293b" }}>
              <td colSpan={2} style={{ ...tdLeft, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Total general
              </td>
              <td style={{ ...td, fontWeight: 700 }}>{fmtTotal(data.total_corriente)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmtTotal(data.total_1_30)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmtTotal(data.total_31_60)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmtTotal(data.total_61_90)}</td>
              <td style={{ ...td, fontWeight: 700 }}>{fmtTotal(data.total_mas_90)}</td>
              <td style={{ ...td, fontWeight: 700, borderLeft: "1px solid #94a3b8" }}>{fmtTotal(data.total_general)}</td>
            </tr>
          </tfoot>
        </table>

        {/* ── Pie ── */}
        <div style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid #d1d5db", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
          <span>Documento generado por el sistema Emperador Ledger</span>
          <span>Generado el {hoy} · Fecha de corte: {fechaCorte}</span>
        </div>
      </div>
    </>
  );
}

export default function ImprimirResumenCxcPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}>
      <ResumenContent />
    </Suspense>
  );
}
