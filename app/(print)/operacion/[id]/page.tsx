"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

// Documento INTERNO: lleva costos, proveedores y margen. No es para el cliente.

interface HojaCotizacion {
  numero: string; cliente_nombre: string; moneda: string; trm: string | null;
  cotizado_cop: string; confirmado_cop: string; facturado_cop: string; pendiente_cop: string;
  estado_facturacion: string; lineas_total: number; lineas_confirmadas: number; opcionales: number;
}
interface HojaFactura {
  numero: string; fecha: string; cliente_nombre: string; moneda: string;
  total: string; total_cop: string; estado: string; dian_estado: string | null;
}
interface HojaProveedor {
  proveedor: string; conceptos: number; costo_cotizado_cop: string; costo_confirmado_cop: string;
}
interface HojaGuia {
  numero: string; referencia: string | null; vuelo: string | null;
  fecha_vuelo: string | null; piezas: number | null; peso_kg: string | null; estado: string;
}
interface HojaManifiesto {
  fecha: string; mawb: string | null; aerolinea: string | null;
  hawbs: number; piezas: number | null; peso_kg: string | null; estado: string;
}
interface HojaEvento {
  fecha_hora: string; tipo: string; descripcion: string; hawb_numero: string | null;
}
interface Hoja {
  numero: string; estado: string; fecha_apertura: string;
  aerolinea: string | null; ruta: string | null;
  piezas_total: number | null; peso_kg_total: string | null; clientes: string[];
  cotizaciones: HojaCotizacion[];
  total_cotizado_cop: string; total_confirmado_cop: string;
  total_facturado_cop: string; total_pendiente_cop: string;
  facturas: HojaFactura[];
  proveedores: HojaProveedor[];
  total_costo_cotizado_cop: string; total_costo_confirmado_cop: string;
  margen_cop: string; margen_pct: string;
  mawbs: HojaGuia[]; hawbs: HojaGuia[]; manifiestos: HojaManifiesto[];
  eventos: HojaEvento[]; eventos_total: number;
  generado_en: string;
}
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; }

const s = { black: "#0f172a", thick: "#1e40af", mid: "#475569", light: "#94a3b8", border: "#e2e8f0" };

function fmt(v: string | number | null | undefined, dec = 0) {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return (isNaN(n) ? 0 : n).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fecha(f: string | null) {
  return f ? f.slice(0, 10) : "—";
}
function fechaHora(f: string) {
  return `${f.slice(0, 10)} ${f.slice(11, 16)}`;
}

const ESTADO_COLOR: Record<string, string> = {
  facturada: "#166534", parcial: "#a16207", pendiente: "#475569", sin_confirmar: "#7e22ce",
};

/** Título de bloque con línea al ancho completo. */
function Bloque({ titulo, extra }: { titulo: string; extra?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14, marginBottom: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.thick }}>{titulo}</span>
      {extra && <span style={{ fontSize: 8, color: s.light }}>{extra}</span>}
      <div style={{ flex: 1, height: 1, background: s.border }} />
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "3px 6px", fontWeight: 700, fontSize: 8,
  textTransform: "uppercase", color: s.mid, borderBottom: `1px solid ${s.border}`,
};
const td: React.CSSProperties = { padding: "3px 6px", borderBottom: `1px solid #f1f5f9` };
const num: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "monospace" };

export default function HojaOperacionPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [h, setH] = useState<Hoja | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Hoja>(`/operaciones/operaciones/${id}/hoja`).then(setH).catch(() => {});
    apiFetch<Empresa>("/empresa").then(setEmpresa).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (h) document.title = `Hoja ${h.numero}`;
  }, [h]);

  if (!h) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const sinConfirmar = h.cotizaciones.reduce((a, c) => a + (c.lineas_total - c.lineas_confirmadas), 0);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { background: #fff; font-family: system-ui, -apple-system, sans-serif; color: ${s.black}; }
        @page { margin: 14mm 14mm 12mm; size: A4; }
        /* Pie en tfoot: se repite por hoja Y reserva su espacio. Con
           position:fixed taparía el contenido — ver la factura de venta. */
        .doc { width: 100%; border-collapse: collapse; }
        .doc > tfoot { display: table-footer-group; }
        .doc > tbody { display: table-row-group; }
        .doc > tfoot td, .doc > tbody td { padding: 0; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          thead { display: table-header-group; }
          tr, td, th { break-inside: avoid; page-break-inside: avoid; }
        }
        @media screen { .hoja { padding-top: 24px; } }
      `}</style>

      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: `1px solid ${s.border}`, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir
        </button>
      </div>

      <table className="doc">
        <tfoot>
          <tr><td>
            <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 5, marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: s.light }}>
              <span>Documento interno · Contiene costos y márgenes · No entregar al cliente</span>
              <span>{h.numero} · generado {fechaHora(h.generado_en)}</span>
            </div>
          </td></tr>
        </tfoot>
        <tbody>
          <tr><td>
            <div className="hoja" style={{ maxWidth: 820, margin: "0 auto", padding: "0 8px 6px", fontSize: 9.5, lineHeight: 1.45 }}>

              {/* Encabezado */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${s.thick}`, paddingBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: s.light }}>Hoja de operación</div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: s.thick, lineHeight: 1.1 }}>{h.numero}</div>
                  <div style={{ fontSize: 10, color: s.mid }}>{h.ruta ?? "—"}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 9, color: s.mid }}>
                  <div><strong style={{ color: s.black }}>{empresa?.razon_social ?? ""}</strong></div>
                  <div>Estado: <strong style={{ color: s.black }}>{h.estado.replace("_", " ")}</strong></div>
                  <div>Apertura: {fecha(h.fecha_apertura)}</div>
                  <div>
                    {h.aerolinea ? `${h.aerolinea} · ` : ""}
                    {h.piezas_total ?? "—"} pzs · {h.peso_kg_total ? `${fmt(h.peso_kg_total, 2)} kg` : "—"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 9, color: s.mid, marginTop: 5 }}>
                <strong style={{ color: s.black }}>Clientes:</strong> {h.clientes.join(" · ") || "—"}
              </div>

              {/* Resumen económico */}
              <Bloque titulo="Resumen económico" extra="valores en COP" />
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                <thead>
                  <tr>
                    <th style={th}>Cotización</th>
                    <th style={th}>Cliente</th>
                    <th style={{ ...th, textAlign: "center" }}>Conf.</th>
                    <th style={{ ...th, textAlign: "right" }}>Cotizado</th>
                    <th style={{ ...th, textAlign: "right" }}>Confirmado</th>
                    <th style={{ ...th, textAlign: "right" }}>Facturado</th>
                    <th style={{ ...th, textAlign: "right" }}>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {h.cotizaciones.map((c) => (
                    <tr key={c.numero}>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>
                        {c.numero}
                        <span style={{ color: ESTADO_COLOR[c.estado_facturacion] ?? s.light, fontSize: 7.5, fontFamily: "system-ui", marginLeft: 4 }}>
                          {c.estado_facturacion.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ ...td, color: s.mid }}>{c.cliente_nombre}</td>
                      <td style={{ ...td, textAlign: "center", fontSize: 8, color: c.lineas_confirmadas === c.lineas_total ? "#166534" : "#a16207" }}>
                        {c.lineas_confirmadas}/{c.lineas_total}
                        {c.opcionales > 0 && <span style={{ color: "#7e22ce" }}> +{c.opcionales} opc</span>}
                      </td>
                      <td style={num}>{fmt(c.cotizado_cop)}</td>
                      <td style={{ ...num, fontWeight: 700 }}>{fmt(c.confirmado_cop)}</td>
                      <td style={num}>{fmt(c.facturado_cop)}</td>
                      <td style={{ ...num, color: parseFloat(c.pendiente_cop) > 0 ? "#a16207" : s.light }}>{fmt(c.pendiente_cop)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#eff6ff" }}>
                    <td colSpan={3} style={{ ...td, fontWeight: 700, color: s.thick }}>Total</td>
                    <td style={{ ...num, fontWeight: 700 }}>{fmt(h.total_cotizado_cop)}</td>
                    <td style={{ ...num, fontWeight: 800, color: s.thick }}>{fmt(h.total_confirmado_cop)}</td>
                    <td style={{ ...num, fontWeight: 700 }}>{fmt(h.total_facturado_cop)}</td>
                    <td style={{ ...num, fontWeight: 700 }}>{fmt(h.total_pendiente_cop)}</td>
                  </tr>
                </tbody>
              </table>
              {sinConfirmar > 0 && (
                <div style={{ fontSize: 8, color: "#a16207", marginTop: 3 }}>
                  {sinConfirmar} concepto(s) sin confirmar — la operación no se puede cerrar así.
                </div>
              )}

              {/* Costos y proveedores */}
              <Bloque titulo="Costos y proveedores" extra="según la cotización" />
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                <thead>
                  <tr>
                    <th style={th}>Proveedor</th>
                    <th style={{ ...th, textAlign: "center" }}>Conceptos</th>
                    <th style={{ ...th, textAlign: "right" }}>Costo cotizado</th>
                    <th style={{ ...th, textAlign: "right" }}>Costo confirmado</th>
                  </tr>
                </thead>
                <tbody>
                  {h.proveedores.map((p) => (
                    <tr key={p.proveedor}>
                      <td style={td}>{p.proveedor}</td>
                      <td style={{ ...td, textAlign: "center", color: s.mid }}>{p.conceptos}</td>
                      <td style={num}>{fmt(p.costo_cotizado_cop)}</td>
                      <td style={{ ...num, fontWeight: 700 }}>{fmt(p.costo_confirmado_cop)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={2} style={{ ...td, fontWeight: 700 }}>Total costo</td>
                    <td style={{ ...num, fontWeight: 700 }}>{fmt(h.total_costo_cotizado_cop)}</td>
                    <td style={{ ...num, fontWeight: 700 }}>{fmt(h.total_costo_confirmado_cop)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, marginTop: 5 }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 5, padding: "5px 14px", textAlign: "right" }}>
                  <span style={{ fontSize: 8, color: s.mid, textTransform: "uppercase", letterSpacing: 0.5 }}>Margen sobre lo confirmado</span>
                  <div style={{ fontSize: 13, fontWeight: 800, color: parseFloat(h.margen_cop) >= 0 ? "#15803d" : "#b91c1c" }}>
                    COP {fmt(h.margen_cop)} <span style={{ fontSize: 10 }}>({fmt(h.margen_pct, 1)}%)</span>
                  </div>
                </div>
              </div>

              {/* Facturas */}
              <Bloque titulo="Facturas" extra={h.facturas.length === 0 ? "sin facturas" : undefined} />
              {h.facturas.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <tr>
                      <th style={th}>Número</th>
                      <th style={th}>Fecha</th>
                      <th style={th}>Cliente</th>
                      <th style={{ ...th, textAlign: "right" }}>Total</th>
                      <th style={{ ...th, textAlign: "right" }}>Total COP</th>
                      <th style={th}>Estado</th>
                      <th style={th}>DIAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.facturas.map((f) => (
                      <tr key={f.numero}>
                        <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{f.numero}</td>
                        <td style={{ ...td, color: s.mid }}>{fecha(f.fecha)}</td>
                        <td style={{ ...td, color: s.mid }}>{f.cliente_nombre}</td>
                        <td style={num}>{f.moneda} {fmt(f.total, 2)}</td>
                        <td style={{ ...num, fontWeight: 700 }}>{fmt(f.total_cop)}</td>
                        <td style={{ ...td, fontSize: 8, color: f.estado === "contabilizada" ? "#166534" : s.mid }}>{f.estado}</td>
                        <td style={{ ...td, fontSize: 8, color: s.mid }}>{f.dian_estado ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Documentos de transporte */}
              <Bloque titulo="Documentos de transporte" />
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: s.mid, marginBottom: 2 }}>MAWB ({h.mawbs.length})</div>
                  {h.mawbs.length === 0 ? <div style={{ fontSize: 8, color: s.light }}>—</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
                      <tbody>
                        {h.mawbs.map((m) => (
                          <tr key={m.numero}>
                            <td style={{ ...td, fontFamily: "monospace" }}>{m.numero}</td>
                            <td style={{ ...td, color: s.mid }}>{m.referencia ?? ""} {m.vuelo ?? ""}</td>
                            <td style={{ ...num, padding: "3px 4px" }}>{m.piezas ?? "—"}</td>
                            <td style={{ ...num, padding: "3px 4px" }}>{m.peso_kg ? fmt(m.peso_kg, 1) : "—"}</td>
                            <td style={{ ...td, fontSize: 7.5, color: m.estado === "EMITIDA" ? "#166534" : s.light }}>{m.estado}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div style={{ flex: 1.3 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: s.mid, marginBottom: 2 }}>HAWB ({h.hawbs.length})</div>
                  {h.hawbs.length === 0 ? <div style={{ fontSize: 8, color: s.light }}>—</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
                      <tbody>
                        {h.hawbs.map((x) => (
                          <tr key={x.numero}>
                            <td style={{ ...td, fontFamily: "monospace" }}>{x.numero}</td>
                            <td style={{ ...td, color: s.mid, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.referencia ?? ""}</td>
                            <td style={{ ...num, padding: "3px 4px" }}>{x.piezas ?? "—"}</td>
                            <td style={{ ...num, padding: "3px 4px" }}>{x.peso_kg ? fmt(x.peso_kg, 1) : "—"}</td>
                            <td style={{ ...td, fontSize: 7.5, color: x.estado === "EMITIDA" ? "#166534" : s.light }}>{x.estado}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {h.manifiestos.length > 0 && (
                <>
                  <div style={{ fontSize: 8, fontWeight: 700, color: s.mid, marginTop: 8, marginBottom: 2 }}>Manifiestos ({h.manifiestos.length})</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
                    <tbody>
                      {h.manifiestos.map((m, i) => (
                        <tr key={i}>
                          <td style={td}>{fecha(m.fecha)}</td>
                          <td style={{ ...td, fontFamily: "monospace" }}>{m.mawb ?? "—"}</td>
                          <td style={{ ...td, color: s.mid }}>{m.aerolinea ?? ""}</td>
                          <td style={{ ...td, color: s.mid }}>{m.hawbs} HAWB</td>
                          <td style={num}>{m.piezas ?? "—"} pzs</td>
                          <td style={num}>{m.peso_kg ? `${fmt(m.peso_kg, 1)} kg` : "—"}</td>
                          <td style={{ ...td, fontSize: 7.5, color: m.estado === "EMITIDA" ? "#166534" : s.light }}>{m.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Bitácora */}
              <Bloque
                titulo="Bitácora"
                extra={h.eventos_total > h.eventos.length ? `últimos ${h.eventos.length} de ${h.eventos_total}` : `${h.eventos_total} evento(s)`}
              />
              {h.eventos.length === 0 ? (
                <div style={{ fontSize: 8.5, color: s.light }}>Sin eventos registrados.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
                  <tbody>
                    {h.eventos.map((e, i) => (
                      <tr key={i}>
                        <td style={{ ...td, whiteSpace: "nowrap", color: s.mid, width: 88 }}>{fechaHora(e.fecha_hora)}</td>
                        <td style={{ ...td, width: 92, fontSize: 7.5, color: s.thick, fontWeight: 700 }}>{e.tipo.replace("_", " ")}</td>
                        <td style={{ ...td, fontFamily: "monospace", fontSize: 7.5, color: s.light, width: 70 }}>{e.hawb_numero ?? ""}</td>
                        <td style={td}>{e.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </td></tr>
        </tbody>
      </table>
    </>
  );
}
