"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface MovLinea {
  id: string; producto_id: string; producto_codigo: string; producto_nombre: string;
  cantidad: string; um_codigo: string; costo_unitario: string; costo_total: string;
}
interface Movimiento {
  id: string; numero: string | null; tipo: string; fecha: string;
  bodega_nombre: string; bodega_destino_nombre: string | null;
  descripcion: string | null; estado: string;
  asiento_id: string | null; lineas: MovLinea[]; costo_total: string;
}
interface AsientoLinea {
  id: string; cuenta_codigo: string | null; cuenta_nombre: string | null;
  descripcion: string | null; debito: string; credito: string;
}
interface Asiento { id: string; documento_numero: string | null; lineas: AsientoLinea[]; }
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }

const TIPO_LABEL: Record<string, string> = {
  AJUSTE_ENTRADA:      "Ajuste de entrada",
  AJUSTE_SALIDA:       "Ajuste de salida",
  TRASLADO_SALIDA:     "Traslado entre bodegas",
  ENTRADA_COMPRA:      "Entrada por compra",
  SALIDA_VENTA:        "Salida por venta",
  DEVOLUCION_CLIENTE:  "Devolución cliente",
  DEVOLUCION_PROVEEDOR:"Devolución proveedor",
};

function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v)); if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function ImprimirMovimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const [mov, setMov]       = useState<Movimiento | null>(null);
  const [asiento, setAsiento] = useState<Asiento | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      Promise.all([
        apiFetch<Movimiento>(`/inventario/movimientos/${id}`),
        apiFetch<Empresa>("/empresa").catch(() => null),
      ]).then(([data, emp]) => {
        setMov(data);
        if (emp) setEmpresa(emp);
        document.title = `Movimiento ${data.numero ?? data.tipo} ${data.fecha}`;
        if (data.asiento_id) {
          apiFetch<Asiento>(`/asientos/${data.asiento_id}`).catch(() => null).then((a) => {
            if (a) setAsiento(a);
          });
        }
      });
    });
  }, [params]);

  if (!mov) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb" };
  const esTraslado = mov.tipo === "TRASLADO_SALIDA" || mov.tipo === "TRASLADO_ENTRADA";

  const totalDebito  = asiento?.lineas.reduce((t, l) => t + parseFloat(l.debito  || "0"), 0) ?? 0;
  const totalCredito = asiento?.lineas.reduce((t, l) => t + parseFloat(l.credito || "0"), 0) ?? 0;

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
            <div style={{ border: `2px solid ${s.black}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 210, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>
                {TIPO_LABEL[mov.tipo] ?? mov.tipo}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>
                {mov.numero ?? "—"}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid, textAlign: "right" }}>
              <div><strong>Fecha:</strong> {mov.fecha}</div>
              {esTraslado ? (
                <>
                  <div><strong>Origen:</strong> {mov.bodega_nombre}</div>
                  <div><strong>Destino:</strong> {mov.bodega_destino_nombre ?? "—"}</div>
                </>
              ) : (
                <div><strong>Bodega:</strong> {mov.bodega_nombre}</div>
              )}
            </div>
          </div>
        </div>

        {/* Descripción */}
        {mov.descripcion && (
          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", marginBottom: 20, fontSize: 11, color: s.dark }}>
            {mov.descripcion}
          </div>
        )}

        {/* Líneas */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Productos</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${s.black}` }}>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Producto</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 80 }}>Cantidad</th>
                <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 44 }}>UM</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 100 }}>Costo unit.</th>
                <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase", width: 100 }}>Costo total</th>
              </tr>
            </thead>
            <tbody>
              {mov.lineas.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                  <td style={{ padding: "5px 8px", color: s.dark }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 9.5, color: s.mid, marginRight: 5 }}>{l.producto_codigo}</span>
                    {l.producto_nombre}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.cantidad, 4)}</td>
                  <td style={{ padding: "5px 8px", color: s.mid }}>{l.um_codigo}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(l.costo_unitario)}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(l.costo_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${s.black}` }}>
                <td colSpan={4} style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, textTransform: "uppercase", fontSize: 10 }}>Costo total</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 12 }}>{fmt(mov.costo_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Partida contable */}
        {asiento && asiento.lineas.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Partida contable</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${s.black}` }}>
                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, fontSize: 9, textTransform: "uppercase", width: 110 }}>Cuenta</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, fontSize: 9, textTransform: "uppercase" }}>Descripción</th>
                  <th style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, fontSize: 9, textTransform: "uppercase", width: 110 }}>Débito</th>
                  <th style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, fontSize: 9, textTransform: "uppercase", width: 110 }}>Crédito</th>
                </tr>
              </thead>
              <tbody>
                {asiento.lineas.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "4px 8px", fontFamily: "monospace", fontSize: 9.5 }}>{l.cuenta_codigo}</td>
                    <td style={{ padding: "4px 8px", color: s.dark }}>
                      {l.cuenta_nombre && <span style={{ color: s.mid, marginRight: 4 }}>{l.cuenta_nombre}</span>}
                      {l.descripcion && <span style={{ color: s.light, fontSize: 9 }}>— {l.descripcion}</span>}
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace" }}>
                      {parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace" }}>
                      {parseFloat(l.credito) > 0 ? fmt(l.credito) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `1px solid ${s.black}` }}>
                  <td colSpan={2} style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right", fontSize: 9, textTransform: "uppercase" }}>Totales</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(totalDebito)}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(totalCredito)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Firmas */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, textAlign: "center" }}>
          {["Elaborado por", "Recibido por"].map((label) => (
            <div key={label}>
              <div style={{ height: 36 }} />
              <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 6, fontSize: 10, color: s.mid }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
