"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Empleado {
  id: string; orden: number;
  tipo_documento: string; numero_documento: string;
  primer_nombre: string; otros_nombres: string | null;
  primer_apellido: string; segundo_apellido: string | null;
  cargo: string | null;
  salario_basico: string; dias_trabajados: string;
  sueldo: string; auxilio_transporte: string; horas_extra: string;
  bonificaciones: string; comisiones: string;
  devengados_extra: Record<string, number | string> | null;
  salud: string; pension: string; fondo_solidaridad: string; retencion_fuente: string;
  deducciones_extra: Record<string, number | string> | null;
  total_devengado: string; total_deducciones: string; neto: string;
}

interface Periodo {
  id: string; numero: string; tipo: string;
  periodo_pago_inicio: string; periodo_pago_fin: string; fecha_generacion: string;
  total_devengado: string; total_deducciones: string; total_neto: string;
  notas: string | null; estado: string;
  cune: string | null; dian_estado: string | null;
  empleados: Empleado[];
}

interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function suma(o: Record<string, number | string> | null) {
  if (!o) return 0;
  return Object.values(o).reduce<number>((a, v) => a + (parseFloat(String(v)) || 0), 0);
}
const nombre = (e: Empleado) =>
  [e.primer_nombre, e.otros_nombres, e.primer_apellido, e.segundo_apellido].filter(Boolean).join(" ");

export default function ImprimirNominaPage({ params }: { params: Promise<{ id: string }> }) {
  const [doc, setDoc]         = useState<Periodo | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [id, setId]           = useState("");

  useEffect(() => { params.then(({ id }) => setId(id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    apiFetch<Periodo>(`/nomina/${id}`).then((p) => { setDoc(p); document.title = p.numero; });
    apiFetch<Empresa>("/empresa").catch(() => null).then((e) => { if (e) setEmpresa(e); });
  }, [id]);

  if (!doc) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb", thick: "#000" };
  const th: React.CSSProperties = { padding: "5px 6px", fontWeight: 700, fontSize: 8.5, textTransform: "uppercase" };
  const td: React.CSSProperties = { padding: "4px 6px", textAlign: "right", fontFamily: "monospace" };

  const otrosDev = (e: Empleado) =>
    parseFloat(e.horas_extra) + parseFloat(e.bonificaciones) + parseFloat(e.comisiones) + suma(e.devengados_extra);
  const otrasDed = (e: Empleado) =>
    parseFloat(e.fondo_solidaridad) + suma(e.deducciones_extra);

  const tot = (f: (e: Empleado) => number) => doc.empleados.reduce((a, e) => a + f(e), 0);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { background: #fff; font-family: system-ui, -apple-system, sans-serif; color: #000; }
        @page { margin: 10mm 12mm; size: A4 landscape; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
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

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 28px", fontSize: 10, lineHeight: 1.4 }}>

        {/* ── Encabezado ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${s.thick}` }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 40, marginBottom: 6, objectFit: "contain" }} />
            <div style={{ fontSize: 9.5, color: s.mid }}>
              <div style={{ fontWeight: 700, color: s.black, fontSize: 11.5 }}>
                {empresa?.razon_social ?? "UNIVERSAL CARGO COLOMBIA S.A.S"}
              </div>
              <div>NIT: {empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : ""}</div>
              {empresa?.direccion && <div>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "8px 16px", display: "inline-block", minWidth: 200, textAlign: "right" }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>
                {doc.tipo === "AJUSTE" ? "Nómina electrónica — Ajuste" : "Nómina electrónica"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{doc.numero}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 9.5, color: s.mid }}>
              <div><strong>Período de pago:</strong> {doc.periodo_pago_inicio} a {doc.periodo_pago_fin}</div>
              <div><strong>Generación:</strong> {doc.fecha_generacion}</div>
              <div style={{ marginTop: 3 }}>
                <span style={{ border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                  {doc.estado}
                </span>
                {doc.dian_estado && (
                  <span style={{ marginLeft: 4, border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                    DIAN: {doc.dian_estado}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Detalle por empleado ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
              <th style={{ ...th, textAlign: "left" }}>Documento</th>
              <th style={{ ...th, textAlign: "left" }}>Empleado</th>
              <th style={{ ...th, textAlign: "left" }}>Cargo</th>
              <th style={{ ...th, textAlign: "right" }}>Días</th>
              <th style={{ ...th, textAlign: "right" }}>Sueldo</th>
              <th style={{ ...th, textAlign: "right" }}>Aux. transp.</th>
              <th style={{ ...th, textAlign: "right" }}>Otros deveng.</th>
              <th style={{ ...th, textAlign: "right" }}>Total deveng.</th>
              <th style={{ ...th, textAlign: "right" }}>Salud</th>
              <th style={{ ...th, textAlign: "right" }}>Pensión</th>
              <th style={{ ...th, textAlign: "right" }}>Retefuente</th>
              <th style={{ ...th, textAlign: "right" }}>Otras deduc.</th>
              <th style={{ ...th, textAlign: "right" }}>Total deduc.</th>
              <th style={{ ...th, textAlign: "right" }}>Neto</th>
            </tr>
          </thead>
          <tbody>
            {doc.empleados.map((e) => (
              <tr key={e.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                <td style={{ padding: "4px 6px", fontFamily: "monospace" }}>{e.tipo_documento} {e.numero_documento}</td>
                <td style={{ padding: "4px 6px" }}>{nombre(e)}</td>
                <td style={{ padding: "4px 6px", color: s.mid }}>{e.cargo ?? "—"}</td>
                <td style={td}>{parseFloat(e.dias_trabajados).toLocaleString("es-CO")}</td>
                <td style={td}>{fmt(e.sueldo)}</td>
                <td style={td}>{fmt(e.auxilio_transporte)}</td>
                <td style={td}>{fmt(otrosDev(e))}</td>
                <td style={{ ...td, fontWeight: 700 }}>{fmt(e.total_devengado)}</td>
                <td style={td}>{fmt(e.salud)}</td>
                <td style={td}>{fmt(e.pension)}</td>
                <td style={td}>{fmt(e.retencion_fuente)}</td>
                <td style={td}>{fmt(otrasDed(e))}</td>
                <td style={{ ...td, fontWeight: 700 }}>({fmt(e.total_deducciones)})</td>
                <td style={{ ...td, fontWeight: 800 }}>{fmt(e.neto)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${s.thick}`, fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: "6px", textTransform: "uppercase", fontSize: 9 }}>
                {doc.empleados.length} empleado{doc.empleados.length === 1 ? "" : "s"}
              </td>
              <td style={td}></td>
              <td style={td}>{fmt(tot(e => parseFloat(e.sueldo)))}</td>
              <td style={td}>{fmt(tot(e => parseFloat(e.auxilio_transporte)))}</td>
              <td style={td}>{fmt(tot(otrosDev))}</td>
              <td style={{ ...td, fontSize: 11 }}>{fmt(doc.total_devengado)}</td>
              <td style={td}>{fmt(tot(e => parseFloat(e.salud)))}</td>
              <td style={td}>{fmt(tot(e => parseFloat(e.pension)))}</td>
              <td style={td}>{fmt(tot(e => parseFloat(e.retencion_fuente)))}</td>
              <td style={td}>{fmt(tot(otrasDed))}</td>
              <td style={{ ...td, fontSize: 11 }}>({fmt(doc.total_deducciones)})</td>
              <td style={{ ...td, fontSize: 12 }}>{fmt(doc.total_neto)}</td>
            </tr>
          </tfoot>
        </table>

        {doc.notas && (
          <div style={{ marginTop: 16, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 3 }}>Notas</div>
            <div style={{ fontSize: 10 }}>{doc.notas}</div>
          </div>
        )}

        {doc.cune && (
          <div style={{ marginTop: 12, fontSize: 8.5, color: s.mid, wordBreak: "break-all" }}>
            <strong>CUNE:</strong> {doc.cune}
          </div>
        )}

        {/* ── Firmas ── */}
        <div style={{ marginTop: 36, paddingTop: 14, borderTop: `1px solid ${s.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, textAlign: "center" }}>
          {["Elaborado por", "Revisado por", "Aprobado por"].map((label) => (
            <div key={label}>
              <div style={{ height: 36 }} />
              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 5, fontSize: 9.5, color: s.mid }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 8.5, color: s.light }}>
          Generado el {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
          {" · "}{doc.numero}
        </div>
      </div>
    </>
  );
}
