"use client";

import { useEffect, useState, Suspense, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Linea {
  producto_codigo: string; producto_nombre: string; familia: string; um: string;
  cantidad: string; costo_promedio: string; valor_total: string;
}
interface Grupo { bodega_id: string; bodega: string; lineas: Linea[]; subtotal: string; }
interface Reporte { empresa: string; fecha_corte: string; grupos: Grupo[]; gran_total: string; }
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }

function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const tdBase: React.CSSProperties = { padding: "3px 8px", borderBottom: "1px solid #e2e8f0", fontSize: 9.5, color: "#1e293b" };
const tdR:    React.CSSProperties = { ...tdBase, textAlign: "right", fontFamily: "monospace" };
const tdMono: React.CSSProperties = { ...tdBase, fontFamily: "monospace", color: "#2563eb" };
const thHdr:  React.CSSProperties = { background: "#1e3a5f", color: "#fff", fontWeight: 700, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, padding: "5px 8px" };
const thHdrR: React.CSSProperties = { ...thHdr, textAlign: "right" };

function ReporteContent() {
  const params = useSearchParams();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    const fc  = params.get("fecha_corte"); if (fc)  p.set("fecha_corte", fc);
    const bid = params.get("bodega_id");   if (bid) p.set("bodega_id", bid);
    const fid = params.get("familia_id");  if (fid) p.set("familia_id", fid);

    Promise.all([
      apiFetch<Reporte>(`/reportes/inventario-valorado?${p}`),
      apiFetch<Empresa>("/empresa").catch(() => null),
    ]).then(([r, e]) => { setReporte(r); if (e) setEmpresa(e); })
      .catch(err => setError(err.message ?? "Error"));
  }, [params]);

  useEffect(() => {
    if (reporte) document.title = `Inventario Valorado ${reporte.fecha_corte}`;
  }, [reporte]);

  if (error)    return <div style={{ padding: 40, color: "red", fontSize: 13 }}>{error}</div>;
  if (!reporte) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const hoy = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const nit  = empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : "";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { background: #fff; font-family: system-ui, -apple-system, sans-serif; color: #1e293b; }
        @page { margin: 14mm 18mm; size: A4 landscape; }
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

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px", fontSize: 11, lineHeight: 1.5 }}>

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
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>Inventario valorado</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Corte al:</strong> {reporte.fecha_corte}</div>
              <div><strong>Generado:</strong> {hoy}</div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thHdr, width: 130 }}>C&oacute;digo</th>
              <th style={thHdr}>Producto</th>
              <th style={{ ...thHdr, width: 140 }}>Familia</th>
              <th style={{ ...thHdrR, width: 40 }}>UM</th>
              <th style={{ ...thHdrR, width: 90 }}>Cantidad</th>
              <th style={{ ...thHdrR, width: 105 }}>Costo prom.</th>
              <th style={{ ...thHdrR, width: 115 }}>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {reporte.grupos.map(g => (
              <Fragment key={g.bodega_id}>
                <tr>
                  <td colSpan={7} style={{ background: "#dbeafe", color: "#1e40af", fontWeight: 700, fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 8px" }}>
                    {g.bodega}
                  </td>
                </tr>
                {g.lineas.map((ln, i) => (
                  <tr key={i}>
                    <td style={tdMono}>{ln.producto_codigo}</td>
                    <td style={tdBase}>{ln.producto_nombre}</td>
                    <td style={{ ...tdBase, color: "#64748b" }}>{ln.familia}</td>
                    <td style={{ ...tdBase, textAlign: "center", color: "#94a3b8" }}>{ln.um}</td>
                    <td style={tdR}>{fmt(ln.cantidad, 4)}</td>
                    <td style={tdR}>{fmt(ln.costo_promedio)}</td>
                    <td style={{ ...tdR, fontWeight: 600 }}>{fmt(ln.valor_total)}</td>
                  </tr>
                ))}
                <tr style={{ background: "#eff6ff" }}>
                  <td colSpan={6} style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: "#1e40af" }}>Subtotal {g.bodega}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: "#1e40af" }}>{fmt(g.subtotal)}</td>
                </tr>
              </Fragment>
            ))}
            <tr style={{ background: "#1e3a5f" }}>
              <td colSpan={6} style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: "#fff" }}>
                Total inventario
              </td>
              <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 10, color: "#fff" }}>
                {fmt(reporte.gran_total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function InventarioValoradoPrint() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}>
      <ReporteContent />
    </Suspense>
  );
}
