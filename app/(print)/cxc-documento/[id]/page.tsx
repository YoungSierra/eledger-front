"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Retencion {
  tipo: string; concepto: string;
  base: string | null; porcentaje: string | null; valor: string;
  cuenta_codigo: string | null; cuenta_nombre: string | null;
}

interface Doc {
  id: string; numero: string; tipo: string; fecha: string;
  fecha_vencimiento: string | null;
  tercero_nit: string | null; tercero_nombre: string | null;
  moneda_codigo: string; trm: string | null;
  subtotal: string; total_iva: string; total_retenciones: string;
  total: string; saldo: string;
  descripcion: string | null; estado: string;
  factura_afectada_numero: string | null;
  retenciones: Retencion[];
  creado_por: string;
}

interface LineaAsiento {
  cuenta_codigo: string | null; cuenta_nombre: string | null;
  tercero_nombre: string | null; debito: string; credito: string;
}
interface Asiento {
  asiento_numero: number | null;
  lineas: LineaAsiento[];
  total_debito: string; total_credito: string;
}

interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }
interface Usuario { nombre: string; apellido: string; }

const TITULOS: Record<string, string> = {
  NOTA_CREDITO: "Nota Crédito",
  NOTA_DEBITO:  "Nota Débito",
  ANTICIPO:     "Anticipo de Cliente",
  FACTURA:      "Factura de Venta",
  RECIBO:       "Recibo de Caja",
};

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImprimirCxcDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const [doc, setDoc]           = useState<Doc | null>(null);
  const [asiento, setAsiento]   = useState<Asiento | null>(null);
  const [empresa, setEmpresa]   = useState<Empresa | null>(null);
  const [elaborador, setElaborador] = useState<Usuario | null>(null);
  const [id, setId]             = useState("");

  useEffect(() => { params.then(({ id }) => setId(id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    apiFetch<Doc>(`/cxc/${id}`).then((d) => {
      setDoc(d);
      document.title = d.numero;
      apiFetch<Usuario>(`/usuarios/${d.creado_por}`).catch(() => null).then((u) => { if (u) setElaborador(u); });
      if (d.estado === "contabilizado") {
        apiFetch<Asiento>(`/cxc/${id}/asiento`).catch(() => null).then((a) => { if (a) setAsiento(a); });
      }
    });
    apiFetch<Empresa>("/empresa").catch(() => null).then((e) => { if (e) setEmpresa(e); });
  }, [id]);

  if (!doc) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const esFuncional = !doc.trm;
  const esNota = doc.tipo === "NOTA_CREDITO" || doc.tipo === "NOTA_DEBITO";
  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb", thick: "#000" };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { background: #fff; font-family: system-ui, -apple-system, sans-serif; color: #000; }
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

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 36px", fontSize: 11, lineHeight: 1.5 }}>

        {/* ── Encabezado ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 18, borderBottom: `2px solid ${s.thick}` }}>
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
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 160, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>{TITULOS[doc.tipo] ?? doc.tipo}</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{doc.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              <div><strong>Fecha:</strong> {doc.fecha}</div>
              {doc.fecha_vencimiento && <div><strong>Vence:</strong> {doc.fecha_vencimiento}</div>}
              {!esFuncional && doc.trm && <div><strong>TRM:</strong> {fmt(doc.trm)}</div>}
              <div style={{ marginTop: 4 }}>
                <span style={{ border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                  {doc.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Datos ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: esNota ? "0 0 78%" : "1 1 100%", border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Cliente</div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{doc.tercero_nombre ?? "—"}</div>
            {doc.tercero_nit && <div style={{ fontSize: 10, color: s.mid }}>NIT / CC: {doc.tercero_nit}</div>}
          </div>
          {esNota && (
            <div style={{ flex: "1 1 20%", border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Factura afectada</div>
              <div style={{ fontWeight: 600, fontSize: 12, fontFamily: "monospace" }}>{doc.factura_afectada_numero ?? "—"}</div>
            </div>
          )}
        </div>

        {doc.descripcion && (
          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Concepto</div>
            <div style={{ fontWeight: 500, fontSize: 12 }}>{doc.descripcion}</div>
          </div>
        )}

        {/* ── Retenciones ── */}
        {doc.retenciones.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Retenciones</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
                  <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Concepto</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Base</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>%</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {doc.retenciones.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "5px 8px" }}>{r.concepto}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", color: s.mid }}>{r.base ? fmt(r.base) : "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", color: s.mid }}>{r.porcentaje ?? "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Resumen de valores ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <table style={{ fontSize: 11, borderCollapse: "collapse", minWidth: 280 }}>
            <tbody>
              <tr>
                <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>Subtotal</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 600, minWidth: 120 }}>{fmt(doc.subtotal)}</td>
              </tr>
              {parseFloat(doc.total_iva) > 0 && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>IVA</td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: s.mid }}>{fmt(doc.total_iva)}</td>
                </tr>
              )}
              {parseFloat(doc.total_retenciones) > 0 && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>Retenciones</td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: s.mid }}>({fmt(doc.total_retenciones)})</td>
                </tr>
              )}
              <tr style={{ borderTop: `2px solid ${s.thick}` }}>
                <td style={{ padding: "6px 12px 3px 0", fontWeight: 700, textAlign: "right", textTransform: "uppercase", fontSize: 12 }}>Total</td>
                <td style={{ padding: "6px 0 3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 14 }}>{fmt(doc.total)}</td>
              </tr>
              {doc.estado === "contabilizado" && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right", fontSize: 10 }}>Saldo pendiente</td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: s.mid, fontSize: 10 }}>{fmt(doc.saldo)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Asiento contable ── */}
        {asiento && asiento.lineas.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ borderTop: `2px solid ${s.thick}`, paddingTop: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.mid }}>Asiento contable</div>
              {asiento.asiento_numero != null && <div style={{ fontSize: 10, color: s.light }}>N° interno {asiento.asiento_numero}</div>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 4 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Cuenta</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Nombre</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Tercero</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Débito</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Crédito</th>
                </tr>
              </thead>
              <tbody>
                {asiento.lineas.map((l, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", fontWeight: 600 }}>{l.cuenta_codigo ?? ""}</td>
                    <td style={{ padding: "5px 8px" }}>{l.cuenta_nombre ?? ""}</td>
                    <td style={{ padding: "5px 8px", color: s.mid }}>{l.tercero_nombre ?? "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{parseFloat(l.credito) > 0 ? fmt(l.credito) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${s.thick}`, fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: "6px 8px" }}></td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{fmt(asiento.total_debito)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{fmt(asiento.total_credito)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Pie de página ── */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${s.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, textAlign: "center" }}>
          {[
            { label: "Elaborado por", nombre: elaborador ? `${elaborador.nombre} ${elaborador.apellido}` : "" },
            { label: "Revisado por",  nombre: "" },
            { label: "Aprobado por",  nombre: "" },
          ].map(({ label, nombre }) => (
            <div key={label}>
              <div style={{ height: 40, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4 }}>
                {nombre && <span style={{ fontSize: 11, fontWeight: 600 }}>{nombre}</span>}
              </div>
              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 6, fontSize: 10, color: s.mid }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 9, color: s.light }}>
          Generado el {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
          {" · "}{doc.numero}
        </div>
      </div>
    </>
  );
}
