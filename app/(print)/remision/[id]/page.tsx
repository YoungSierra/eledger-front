"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface RemLinea {
  id: string; producto_codigo: string; producto_nombre: string;
  cantidad: string; um_codigo: string;
}
interface Remision {
  id: string; numero: string; fecha: string;
  cliente_nombre: string; bodega_nombre: string;
  notas: string | null; estado: string; lineas: RemLinea[];
}
interface Empresa {
  razon_social: string; nit: string; digito_verif: string | null;
  direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null;
}

function fmt(v: string | number, d = 0) {
  const n = parseFloat(String(v)); if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: 4 });
}

export default function ImprimirRemisionPage({ params }: { params: Promise<{ id: string }> }) {
  const [rem, setRem]       = useState<Remision | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      Promise.all([
        apiFetch<Remision>(`/inventario/remisiones/${id}`),
        apiFetch<Empresa>("/empresa").catch(() => null),
      ]).then(([data, emp]) => {
        setRem(data);
        if (emp) setEmpresa(emp);
        document.title = data.numero;
      });
    });
  }, [params]);

  if (!rem) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb" };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { font-family: system-ui, -apple-system, sans-serif; color: #000; }
        @page { margin: 14mm 16mm; size: A4; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 36px", fontSize: 11, lineHeight: 1.5, display: "flex", flexDirection: "column", minHeight: "269mm" }}>

        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 18, borderBottom: `2px solid ${s.black}` }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 44, marginBottom: 6, objectFit: "contain" }} />
            <div style={{ fontSize: 10, color: s.mid }}>
              <div style={{ fontWeight: 700, color: s.black, fontSize: 12 }}>
                {empresa?.razon_social ?? "UNIVERSAL CARGO COLOMBIA S.A.S"}
              </div>
              <div>NIT: {empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : "901.702.367"}</div>
              {empresa?.direccion && <div>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>}
              {empresa?.telefono && <div>Tel: {empresa.telefono}{empresa.email ? ` · ${empresa.email}` : ""}</div>}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ border: `2px solid ${s.black}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 210 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>Remisión de despacho</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{rem.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              <div><strong>Fecha:</strong> {rem.fecha}</div>
              <div><strong>Bodega:</strong> {rem.bodega_nombre}</div>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div style={{ marginBottom: 20, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Cliente</div>
          <div style={{ fontWeight: 600, fontSize: 12, color: s.black }}>{rem.cliente_nombre}</div>
        </div>

        {/* Notas */}
        {rem.notas && (
          <div style={{ marginBottom: 16, fontSize: 11, color: s.dark, background: "#f9fafb", borderRadius: 8, padding: "8px 14px", border: `1px solid ${s.border}` }}>
            {rem.notas}
          </div>
        )}

        {/* Líneas */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Productos despachados</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${s.black}` }}>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Producto</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 100 }}>Cantidad</th>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 60 }}>UM</th>
              </tr>
            </thead>
            <tbody>
              {rem.lineas.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                  <td style={{ padding: "5px 8px", color: s.dark }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 9.5, color: s.mid, marginRight: 5 }}>{l.producto_codigo}</span>
                    {l.producto_nombre}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(l.cantidad)}</td>
                  <td style={{ padding: "5px 8px", color: s.mid }}>{l.um_codigo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1 }} />

        {/* Firmas */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, textAlign: "center" }}>
          {["Despachado por", "Recibido por"].map((label) => (
            <div key={label}>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 6, fontSize: 10, color: s.mid }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
