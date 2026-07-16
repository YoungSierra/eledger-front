"use client";

import { useEffect, useState, Fragment } from "react";
import { apiFetch } from "@/lib/api";

interface Linea {
  id: string;
  producto_codigo: string | null; producto_nombre: string | null;
  maneja_inventario: boolean;
  cantidad: string; um_codigo: string | null;
  precio_unitario: string; descuento_pct: string;
  subtotal: string; iva_pct: string; total_iva: string; total: string;
  centro_costo_codigo: string | null; centro_costo_nombre: string | null;
}

interface Oc {
  id: string; numero: string;
  fecha: string; fecha_entrega_esperada: string | null;
  proveedor_nit: string | null; proveedor_nombre: string | null;
  moneda_codigo: string | null; trm: string | null;
  subtotal: string; total_iva: string; total: string;
  notas: string | null; estado: string;
  creado_por: string;
  aprobado_por: string | null; aprobado_en: string | null;
  lineas: Linea[];
}

interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }
interface Usuario { nombre: string; apellido: string; }

function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", aprobada: "Aprobada", en_proceso: "En proceso",
  recibida_total: "Recibida total", anulada: "Anulada",
};

export default function ImprimirOcPage({ params }: { params: Promise<{ id: string }> }) {
  const [oc, setOc] = useState<Oc | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [elaborador, setElaborador] = useState<Usuario | null>(null);
  const [autorizador, setAutorizador] = useState<Usuario | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      Promise.all([
        apiFetch<Oc>(`/compras/ordenes/${id}`),
        apiFetch<Empresa>("/empresa").catch(() => null),
      ]).then(([data, emp]) => {
        setOc(data);
        if (emp) setEmpresa(emp);
        document.title = `OC ${data.numero}`;
        apiFetch<Usuario>(`/usuarios/${data.creado_por}`).catch(() => null).then(u => { if (u) setElaborador(u); });
        if (data.aprobado_por) {
          apiFetch<Usuario>(`/usuarios/${data.aprobado_por}`).catch(() => null).then(u => { if (u) setAutorizador(u); });
        }
      });
    });
  }, [params]);

  if (!oc) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const esFuncional = !oc.trm;
  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb", thick: "#000" };

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
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 180, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>Orden de Compra</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{oc.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              <div><strong>Fecha:</strong> {oc.fecha}</div>
              {oc.fecha_entrega_esperada && <div><strong>Entrega esperada:</strong> {oc.fecha_entrega_esperada}</div>}
              {!esFuncional && oc.trm && <div><strong>TRM:</strong> {fmt(oc.trm)}</div>}
              <div><strong>Moneda:</strong> {oc.moneda_codigo ?? "COP"}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                  {ESTADO_LABEL[oc.estado] ?? oc.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Proveedor */}
        <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Proveedor</div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{oc.proveedor_nombre ?? "—"}</div>
          {oc.proveedor_nit && <div style={{ fontSize: 10, color: s.mid }}>NIT / CC: {oc.proveedor_nit}</div>}
        </div>

        {/* Líneas */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Productos / Servicios</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Producto</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 60 }}>Cant.</th>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 44 }}>UM</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 90 }}>Precio unit.</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 56 }}>Desc %</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 90 }}>Subtotal</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {oc.lineas.map((l) => {
                const descValor = parseFloat(l.cantidad) * parseFloat(l.precio_unitario) * parseFloat(l.descuento_pct) / 100;
                return (
                  <Fragment key={l.id}>
                    {/* Fila 1 — comercial + Subtotal + Total */}
                    <tr style={{ borderTop: `1px solid ${s.border}`, ...(parseFloat(l.iva_pct) <= 0 && descValor <= 0 ? { borderBottom: `1px solid ${s.border}` } : {}) }}>
                      <td style={{ padding: "5px 8px", color: s.dark }}>
                        {l.producto_codigo && <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 9.5, color: s.mid, marginRight: 5 }}>{l.producto_codigo}</span>}
                        {l.producto_nombre ?? "—"}
                        {!l.maneja_inventario && <span style={{ marginLeft: 5, fontSize: 8.5, color: s.light }}>[servicio]</span>}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.cantidad, 4)}</td>
                      <td style={{ padding: "5px 8px", color: s.mid }}>{l.um_codigo ?? "—"}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.precio_unitario)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", color: s.mid }}>
                        {parseFloat(l.descuento_pct) > 0 ? `${fmt(l.descuento_pct)}%` : "—"}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", color: s.mid }}>{fmt(l.subtotal)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(l.total)}</td>
                    </tr>
                    {/* Fila 2 — IVA y descuento $ (solo cuando aplica) */}
                    {(parseFloat(l.iva_pct) > 0 || descValor > 0) && (
                      <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "2px 8px 5px 8px", fontSize: 9, color: s.light }}>
                          {parseFloat(l.iva_pct) > 0
                            ? <>IVA {fmt(l.iva_pct, 0)}% <span style={{ fontFamily: "monospace", color: s.mid }}>{fmt(l.total_iva)}</span></>
                            : null}
                        </td>
                        <td colSpan={5} style={{ padding: "2px 8px 5px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 9, color: "#ef4444" }}>
                          {descValor > 0 ? `-${fmt(descValor)}` : ""}
                        </td>
                        <td style={{ padding: "0" }} />
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1 }} />

        {/* Notas + Totales */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, gap: 24 }}>
          <div style={{ flex: 1, paddingTop: 4 }}>
            {oc.notas && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Notas</div>
                <div style={{ fontSize: 11, color: s.dark }}>{oc.notas}</div>
              </>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ fontSize: 11, borderCollapse: "collapse", minWidth: 280 }}>
            <tbody>
              {(() => {
                const bruto = oc.lineas.reduce((s, l) => s + parseFloat(l.cantidad) * parseFloat(l.precio_unitario), 0);
                const desc  = bruto - parseFloat(oc.subtotal);
                return desc > 0.001 ? (
                  <>
                    <tr>
                      <td style={{ padding: "3px 12px 3px 0", color: s.light, textAlign: "right" }}>Bruto</td>
                      <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: s.light, minWidth: 120 }}>{fmt(bruto)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "3px 12px 3px 0", color: "#ef4444", textAlign: "right" }}>Descuento</td>
                      <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: "#ef4444" }}>-{fmt(desc)}</td>
                    </tr>
                  </>
                ) : null;
              })()}
              <tr>
                <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>Subtotal</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 600, minWidth: 120 }}>{fmt(oc.subtotal)}</td>
              </tr>
              {parseFloat(oc.total_iva) > 0 && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>IVA</td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: s.mid }}>{fmt(oc.total_iva)}</td>
                </tr>
              )}
              <tr style={{ borderTop: `2px solid ${s.thick}` }}>
                <td style={{ padding: "6px 12px 3px 0", fontWeight: 700, textAlign: "right", textTransform: "uppercase", fontSize: 12 }}>Total</td>
                <td style={{ padding: "6px 0 3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 14 }}>{fmt(oc.total)}</td>
              </tr>
              {!esFuncional && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right", fontSize: 10 }}>Equiv. COP (TRM {fmt(oc.trm ?? "0")})</td>
                  <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", fontSize: 10, color: s.mid }}>
                    {fmt(parseFloat(oc.total) * parseFloat(oc.trm ?? "1"))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Firmas */}
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, textAlign: "center" }}>
          {[
            { label: "Elaborado por", nombre: elaborador ? `${elaborador.nombre} ${elaborador.apellido}` : "" },
            { label: "Autorizado por", nombre: autorizador ? `${autorizador.nombre} ${autorizador.apellido}` : "" },
          ].map(({ label, nombre }) => (
            <div key={label}>
              <div style={{ height: 36, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4 }}>
                {nombre && <span style={{ fontSize: 11, fontWeight: 600 }}>{nombre}</span>}
              </div>
              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 6, fontSize: 10, color: s.mid }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
