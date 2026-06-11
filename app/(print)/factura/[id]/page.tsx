"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import QRCode from "qrcode";

interface LineaResp {
  id: string; orden: number;
  producto_codigo: string | null; producto_nombre: string | null;
  descripcion: string; cantidad: string;
  um_codigo: string | null; precio_unitario: string;
  descuento_pct: string; subtotal: string;
  iva_tipo: string; iva_pct: string; total_iva: string; total: string;
}
interface RetencionResp {
  tipo: string; concepto: string; base: string; porcentaje: string; valor: string;
}
interface Factura {
  id: string; numero: string; fecha: string; fecha_vencimiento: string;
  cliente_nit: string | null; cliente_nombre: string | null;
  cliente_direccion: string | null; cliente_ciudad: string | null;
  cliente_departamento: string | null; cliente_telefono: string | null;
  cliente_email: string | null; cliente_regimen: string | null;
  cliente_responsable_iva: boolean;
  moneda_codigo: string; trm: string | null; condicion_pago_nombre: string | null;
  subtotal: string; total_descuentos: string; total_iva: string;
  total_retenciones: string; total: string;
  notas: string | null; estado: string;
  cufe: string | null; dian_estado: string | null; fecha_dian: string | null;
  lineas: LineaResp[]; retenciones: RetencionResp[];
  creado_por: string; creado_en: string;
}
interface Empresa {
  razon_social: string; nit: string; digito_verif: string | null;
  direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null;
  regimen: string | null; responsable_iva: boolean;
  actividad_economica_codigo: string | null; actividad_economica_descripcion: string | null;
}
interface Resolucion {
  numero_resolucion: string; prefijo: string | null;
  rango_desde: number; rango_hasta: number;
  fecha_desde: string; fecha_hasta: string;
}

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const U = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE","VEINTE"];
const D = ["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
const C = ["","CIEN","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

function _cientos(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100), resto = n % 100;
  const sc = c > 0 ? C[c] : "";
  if (resto === 0) return sc;
  const sr = resto <= 20 ? U[resto] : D[Math.floor(resto / 10)] + (resto % 10 ? " Y " + U[resto % 10] : "");
  return (sc ? sc + " " : "") + sr;
}

function numeroALetras(total: number, moneda: string): string {
  const entero = Math.floor(total);
  const cents = Math.round((total - entero) * 100);
  let s = "";
  if (entero === 0) {
    s = "CERO";
  } else {
    const mill = Math.floor(entero / 1_000_000);
    const miles = Math.floor((entero % 1_000_000) / 1_000);
    const cien = entero % 1_000;
    if (mill > 0) s += (mill === 1 ? "UN MILLÓN" : _cientos(mill) + " MILLONES") + " ";
    if (miles > 0) s += (miles === 1 ? "MIL" : _cientos(miles) + " MIL") + " ";
    if (cien > 0) s += _cientos(cien);
    s = s.trim();
  }
  const sufijo = moneda === "COP" ? "PESOS M/CTE" : moneda;
  return `${s} ${sufijo}${cents > 0 ? ` CON ${String(cents).padStart(2,"0")}/100` : ""}`;
}

export default function PrintFactura() {
  const { id } = useParams<{ id: string }>();
  const [factura, setFactura]   = useState<Factura | null>(null);
  const [empresa, setEmpresa]   = useState<Empresa | null>(null);
  const [resolucion, setResolucion] = useState<Resolucion | null>(null);
  const [pth, setPth] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch<Factura>(`/facturacion/facturas/${id}`),
      apiFetch<Empresa>("/empresa").catch(() => null),
      apiFetch<Resolucion>("/facturacion/resoluciones/activa").catch(() => null),
      apiFetch<{clave:string;valor:string}[]>("/configuracion").catch(() => null),
    ]).then(([f, e, r, cfg]) => {
      setFactura(f);
      if (e) setEmpresa(e);
      if (r) setResolucion(r);
      if (cfg) setPth(cfg.find(c => c.clave === "proveedor_tecnologico_nombre")?.valor ?? "");
      document.title = f.numero;
      if (f.cufe) {
        const url = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${f.cufe}`;
        QRCode.toDataURL(url, { width: 100, margin: 1 }).then(setQrDataUrl).catch(() => {});
      }
    });
  }, [id]);

  if (!factura) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb", thick: "#000" };
  const esFuncional = !factura.trm;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; }
        body { background: #fff; font-family: system-ui, -apple-system, sans-serif; color: #000; }
        @page { margin: 14mm 16mm; size: A4; }
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 36px", fontSize: 11, lineHeight: 1.5 }}>

        {/* Advertencia DIAN */}
        {!factura.cufe && (
          <div style={{ marginBottom: 16, border: "1px solid #f59e0b", borderRadius: 6, padding: "8px 14px", background: "#fffbeb", color: "#92400e", fontSize: 10, textAlign: "center", fontWeight: 600 }}>
            FACTURA PENDIENTE DE EMISIÓN ELECTRÓNICA ANTE LA DIAN — NO TIENE VALIDEZ FISCAL HASTA SU ACEPTACIÓN
          </div>
        )}

        {/* Encabezado — 3 columnas: empresa | QR+CUFE | número */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "flex-start", marginBottom: 24, paddingBottom: 18, borderBottom: `2px solid ${s.thick}` }}>
          {/* Columna izquierda: logo + empresa */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 44, marginBottom: 6, objectFit: "contain" }} />
            <div style={{ fontSize: 10, color: s.mid }}>
              <div style={{ fontWeight: 700, color: s.black, fontSize: 12 }}>{empresa?.razon_social ?? ""}</div>
              <div>NIT: {empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : ""}</div>
              {empresa?.direccion && <div>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>}
              {empresa?.telefono && <div>Tel: {empresa.telefono}{empresa.email ? ` · ${empresa.email}` : ""}</div>}
            </div>
          </div>

          {/* Columna central: QR + CUFE (solo si existe) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR DIAN" style={{ width: 90, height: 90 }} />
            )}
            {factura.cufe && (
              <div style={{ maxWidth: 140, textAlign: "center" }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: s.light, letterSpacing: 1 }}>CUFE</div>
                <div style={{ fontFamily: "monospace", fontSize: 7, color: s.mid, wordBreak: "break-all", lineHeight: 1.4 }}>{factura.cufe.slice(0, 40)}…</div>
                {factura.fecha_dian && <div style={{ fontSize: 8, color: "#166534", fontWeight: 600, marginTop: 2 }}>Aceptada {String(factura.fecha_dian).slice(0, 10)}</div>}
              </div>
            )}
          </div>

          {/* Columna derecha: número + fechas */}
          <div style={{ textAlign: "right" }}>
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 190, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>Factura de Venta</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{factura.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              {(() => {
                const fmtDT = (iso: string, hora = true) => {
                  const d = new Date(iso);
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  const hh = String(d.getHours()).padStart(2, "0");
                  const min = String(d.getMinutes()).padStart(2, "0");
                  return hora ? `${yyyy}-${mm}-${dd}, ${hh}:${min}` : `${yyyy}-${mm}-${dd}`;
                };
                return (
                  <>
                    <div><strong>Generación:</strong> {fmtDT(factura.creado_en)}</div>
                    <div><strong>Expedición:</strong> {fmtDT(factura.creado_en)}</div>
                    <div><strong>Vencimiento:</strong> {fmtDT(factura.fecha_vencimiento, false)}</div>
                    {!esFuncional && factura.trm && <div><strong>TRM:</strong> {fmt(factura.trm)}</div>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 6 }}>Cliente</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px", fontSize: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: s.black }}>{factura.cliente_nombre ?? "—"}</div>
              {factura.cliente_nit && <div style={{ color: s.mid }}>NIT: <strong>{factura.cliente_nit}</strong></div>}
              {factura.cliente_direccion && <div style={{ color: s.mid }}>{factura.cliente_direccion}</div>}
              {(factura.cliente_ciudad || factura.cliente_departamento) && (
                <div style={{ color: s.mid }}>
                  {[factura.cliente_ciudad, factura.cliente_departamento].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
            <div>
              {factura.cliente_telefono && <div style={{ color: s.mid }}>Tel: {factura.cliente_telefono}</div>}
              {factura.cliente_email && <div style={{ color: s.mid }}>{factura.cliente_email}</div>}
              {factura.cliente_regimen && <div style={{ color: s.mid }}>Régimen: {factura.cliente_regimen}</div>}
              <div style={{ color: s.mid }}>
                {factura.cliente_responsable_iva ? "Responsable de IVA" : "No responsable de IVA"}
              </div>
            </div>
          </div>
        </div>

        {/* Líneas */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
              {["Producto", "Cant.", "UM", "Precio unit.", "Subtotal", "IVA", "Total IVA", "Total"].map((h, i) => (
                <th key={h} style={{ padding: "6px 8px", textAlign: i >= 3 ? "right" : i === 2 ? "left" : "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factura.lineas.map(l => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                <td style={{ padding: "5px 8px" }}>{l.descripcion}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.cantidad)}</td>
                <td style={{ padding: "5px 8px", color: s.mid }}>{l.um_codigo ?? ""}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.precio_unitario)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.subtotal)}</td>
                <td style={{ padding: "5px 8px", color: s.mid, fontSize: 10 }}>
                  {l.iva_tipo !== "NINGUNO" ? `${l.iva_tipo.replace("GRAVADO_", "")}%` : "—"}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.total_iva)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales + Retenciones + Notas */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            {factura.retenciones.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Retenciones</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                      {["Concepto", "Base", "%", "Valor"].map((h, i) => (
                        <th key={h} style={{ padding: "4px 6px", textAlign: i > 0 ? "right" : "left", fontWeight: 600, fontSize: 9, textTransform: "uppercase", color: s.light }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factura.retenciones.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "4px 6px" }}>{r.concepto}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace" }}>{fmt(r.base)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>{r.porcentaje}%</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace" }}>({fmt(r.valor)})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 3 }}>Valor en letras</div>
              <div style={{ fontSize: 10, color: s.dark, fontWeight: 600 }}>{numeroALetras(parseFloat(String(factura.total)), factura.moneda_codigo)}</div>
            </div>
            {factura.condicion_pago_nombre && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 3 }}>Condición de pago</div>
                <div style={{ fontSize: 10, color: s.dark }}>{factura.condicion_pago_nombre}</div>
              </div>
            )}
            {factura.notas && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Notas</div>
                <div style={{ fontSize: 11, color: s.mid }}>{factura.notas}</div>
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, overflow: "hidden", minWidth: 240, alignSelf: "flex-start" }}>
            <table style={{ fontSize: 11, borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "5px 14px 5px 12px", textAlign: "right", color: s.mid }}>Subtotal</td>
                  <td style={{ padding: "5px 14px 5px 0", textAlign: "right", fontFamily: "monospace", minWidth: 110 }}>{fmt(factura.subtotal)}</td>
                </tr>
                {parseFloat(factura.total_descuentos) > 0 && (
                  <tr>
                    <td style={{ padding: "5px 14px 5px 12px", textAlign: "right", color: s.mid }}>Descuentos</td>
                    <td style={{ padding: "5px 14px 5px 0", textAlign: "right", fontFamily: "monospace" }}>- {fmt(factura.total_descuentos)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "5px 14px 5px 12px", textAlign: "right", color: s.mid }}>IVA</td>
                  <td style={{ padding: "5px 14px 5px 0", textAlign: "right", fontFamily: "monospace" }}>{fmt(factura.total_iva)}</td>
                </tr>
                {parseFloat(factura.total_retenciones) > 0 && (
                  <tr>
                    <td style={{ padding: "5px 14px 5px 12px", textAlign: "right", color: s.mid }}>Retenciones</td>
                    <td style={{ padding: "5px 14px 5px 0", textAlign: "right", fontFamily: "monospace" }}>({fmt(factura.total_retenciones)})</td>
                  </tr>
                )}
                <tr style={{ borderTop: `2px solid ${s.thick}`, background: "#f8fafc" }}>
                  <td style={{ padding: "8px 14px 8px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Total {factura.moneda_codigo}</td>
                  <td style={{ padding: "8px 14px 8px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 14 }}>{fmt(factura.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>


        {/* Espaciado para que el contenido no quede debajo del footer */}
        <div style={{ height: 180 }} />
      </div>

      {/* Pie de página fijo */}
      <div className="page-footer" style={{ background: "#fff", padding: "8px 36px 6px", borderTop: `1px solid ${s.border}` }}>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* Pie legal colombiano — izquierda */}
          <div style={{ flex: 1, fontSize: 8, color: s.mid, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 2 }}>
              A esta factura de venta aplican las normas relativas a la letra de cambio (artículo 5 Ley 1231 de 2008).
              Con esta el Comprador declara haber recibido real y materialmente las mercancías o prestación de servicios descritos en este título - Valor.
            </div>
            {resolucion && (
              <div style={{ marginBottom: 2 }}>
                Número Autorización {resolucion.numero_resolucion} aprobado en {resolucion.fecha_desde.replace(/-/g, "")}
                {resolucion.prefijo ? ` prefijo ${resolucion.prefijo}` : ""} desde el número {resolucion.rango_desde} al {resolucion.rango_hasta}
                {" · "}Vigencia:{" "}
                {Math.round(
                  (new Date(resolucion.fecha_hasta).getTime() - new Date(resolucion.fecha_desde).getTime()) /
                  (1000 * 60 * 60 * 24 * 30.44)
                )}{" "}Meses
              </div>
            )}
            {(empresa?.responsable_iva != null || empresa?.actividad_economica_codigo) && (
              <div>
                {empresa.responsable_iva ? "Responsable de IVA" : "No responsable de IVA"}
                {empresa.actividad_economica_codigo && (
                  <> · Actividad Económica {empresa.actividad_economica_codigo}{empresa.actividad_economica_descripcion ? ` ${empresa.actividad_economica_descripcion}` : ""}</>
                )}
              </div>
            )}
            {factura.cufe && (
              <div style={{ fontFamily: "monospace", wordBreak: "break-all", marginTop: 2 }}>
                CUFE: {factura.cufe}
              </div>
            )}
          </div>

          {/* Software / PTH — derecha */}
          <div style={{ minWidth: 200, textAlign: "right", fontSize: 7.5, color: s.light, fontStyle: "italic", lineHeight: 1.6 }}>
            <div>Elaborado por software Emperador Ledger</div>
            {pth && <div>Enviado electrónicamente por proveedor tecnológico {pth}</div>}
          </div>

        </div>
      </div>
    </>
  );
}
