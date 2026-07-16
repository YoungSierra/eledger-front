"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Fila {
  id: string; identificador: string; nombre: string; cantidad: string;
  subtotal: string; total_iva: string; total: string; pct_total: string;
}
interface Reporte {
  empresa: string; fecha_desde: string; fecha_hasta: string; agrupar_por: string;
  filas: Fila[]; gran_subtotal: string; gran_iva: string; gran_total: string;
}
interface Empresa {
  razon_social: string; nit: string; digito_verif: string | null;
  direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null;
}

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "0.00";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return "0.00 %";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";
}

const tdBase: React.CSSProperties = { padding: "3px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 9.5, color: "#1e293b" };
const tdR: React.CSSProperties    = { ...tdBase, textAlign: "right", fontFamily: "monospace" };
const thHdr: React.CSSProperties  = { background: "#1e3a5f", color: "#fff", fontWeight: 700, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, padding: "5px 8px", textAlign: "left" };
const thHdrR: React.CSSProperties = { ...thHdr, textAlign: "right" };

const LABELS: Record<string, string> = { cliente: "Cliente", producto: "Producto", familia: "Familia" };

function VentasContent() {
  const params = useSearchParams();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    const fd = params.get("fecha_desde"); if (fd) p.set("fecha_desde", fd);
    const fh = params.get("fecha_hasta"); if (fh) p.set("fecha_hasta", fh);
    const ag = params.get("agrupar_por"); if (ag) p.set("agrupar_por", ag);

    Promise.all([
      apiFetch<Reporte>(`/reportes/ventas-agrupacion?${p}`),
      apiFetch<Empresa>("/empresa").catch(() => null),
    ]).then(([r, e]) => { setReporte(r); if (e) setEmpresa(e); })
      .catch(err => setError(err.message ?? "Error"));
  }, [params]);

  useEffect(() => {
    if (reporte) document.title = `Ventas por ${reporte.agrupar_por} ${reporte.fecha_desde} ${reporte.fecha_hasta}`;
  }, [reporte]);

  if (error)    return <div style={{ padding: 40, color: "red", fontSize: 13 }}>{error}</div>;
  if (!reporte) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const hoy = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const nit = empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : "";
  const colLabel = LABELS[reporte.agrupar_por] ?? reporte.agrupar_por;
  const mostrarCantidad = reporte.agrupar_por !== "cliente";
  const mostrarId = reporte.agrupar_por !== "familia";
  const idHeader = reporte.agrupar_por === "cliente" ? "NIT" : "Código";

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

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 32px", fontSize: 11, lineHeight: 1.5 }}>

        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #1e293b" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 40, marginBottom: 6, objectFit: "contain" }} />
            <div style={{ fontSize: 10 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 12 }}>{empresa?.razon_social ?? reporte.empresa}</div>
              {nit && <div style={{ color: "#64748b" }}>NIT: {nit}</div>}
              {empresa?.direccion && <div style={{ color: "#64748b" }}>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>}
              {empresa?.telefono && <div style={{ color: "#64748b" }}>Tel: {empresa.telefono}{empresa.email ? ` · ${empresa.email}` : ""}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ border: "2px solid #1e293b", borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 190 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>Ventas por {colLabel}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Per&iacute;odo:</strong> {reporte.fecha_desde} al {reporte.fecha_hasta}</div>
              <div><strong>Generado:</strong> {hoy}</div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {mostrarId && <th style={{ ...thHdr, width: 90 }}>{idHeader}</th>}
              <th style={thHdr}>{colLabel}</th>
              {mostrarCantidad && <th style={{ ...thHdrR, width: 80 }}>Cantidad</th>}
              <th style={{ ...thHdrR, width: 110 }}>Subtotal</th>
              <th style={{ ...thHdrR, width: 100 }}>IVA</th>
              <th style={{ ...thHdrR, width: 110 }}>Total</th>
              <th style={{ ...thHdrR, width: 80 }}>% total</th>
            </tr>
          </thead>
          <tbody>
            {reporte.filas.map((f, i) => (
              <tr key={i}>
                {mostrarId && <td style={{ ...tdBase, fontFamily: "monospace", color: "#2563eb", fontSize: 8.5 }}>{f.identificador}</td>}
                <td style={tdBase}>{f.nombre}</td>
                {mostrarCantidad && <td style={tdR}>{fmt(f.cantidad)}</td>}
                <td style={tdR}>{fmt(f.subtotal)}</td>
                <td style={{ ...tdR, color: "#64748b" }}>{fmt(f.total_iva)}</td>
                <td style={{ ...tdR, fontWeight: 600 }}>{fmt(f.total)}</td>
                <td style={{ ...tdR, color: "#64748b", fontSize: 8.5 }}>{fmtPct(f.pct_total)}</td>
              </tr>
            ))}
            <tr style={{ background: "#1e3a5f" }}>
              {mostrarId && <td style={{ padding: "5px 8px" }}></td>}
              <td style={{ padding: "5px 8px", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: "#fff" }}>TOTAL</td>
              {mostrarCantidad && <td style={{ padding: "5px 8px" }}></td>}
              <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 9.5, color: "#fff" }}>{fmt(reporte.gran_subtotal)}</td>
              <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 9.5, color: "#fff" }}>{fmt(reporte.gran_iva)}</td>
              <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 10, color: "#fff" }}>{fmt(reporte.gran_total)}</td>
              <td style={{ padding: "5px 8px", textAlign: "right", color: "#cbd5e1", fontSize: 8.5 }}>100.00 %</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid #d1d5db", fontSize: 9, color: "#94a3b8" }}>
          Documento generado por el sistema Emperador Ledger
        </div>
      </div>
    </>
  );
}

export default function VentasAgrupacionPrint() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}>
      <VentasContent />
    </Suspense>
  );
}
