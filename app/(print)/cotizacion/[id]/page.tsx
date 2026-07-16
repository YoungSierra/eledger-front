"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Linea {
  seccion: string; descripcion: string; tipo_calculo: string;
  valor_unitario: number; base: number; minimo: number | null;
  total_venta: number; total_costo: number; moneda: string;
  condiciones_costo: string | null;
}

interface Cotizacion {
  id: string; numero: string; cliente_id: string;
  fecha: string; fecha_vigencia: string;
  tipo_operacion: string; origen: string; destino: string;
  aerolinea_id: string | null; incoterm: string | null;
  piezas: number | null; peso_kg: number | null;
  valor_mercancia: number | null; moneda_mercancia: string;
  trm: number | null; notas: string | null;
  estado: string; lineas: Linea[];
  asesor_nombre: string | null;
}

interface Tercero { razon_social: string; nit: string; ciudad: string | null; telefono: string | null; email: string | null; }
interface Aerolinea { nombre: string; codigo_iata: string; }

const SECCIONES = [
  { key: "TRANSPORTE_INTERNACIONAL", label: "Transporte Internacional" },
  { key: "GASTOS_ORIGEN",            label: "Gastos de Origen" },
  { key: "GASTOS_DESTINO",           label: "Gastos en Destino" },
  { key: "ADUANA",                   label: "Aduana" },
  { key: "TRANSPORTE_TERRESTRE",     label: "Transporte Terrestre" },
  { key: "ALMACENAMIENTO",           label: "Almacenamiento" },
  { key: "SEGURO",                   label: "Seguro" },
];

const TIPO_LABEL: Record<string, string> = {
  POR_KG: "por Kg", POR_EMBARQUE: "por embarque", PORCENTAJE: "% sobre CIF",
};

function fmt(n: number | string | null | undefined, dec = 2) {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return num.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const [cot, setCot]           = useState<Cotizacion | null>(null);
  const [cliente, setCliente]   = useState<Tercero | null>(null);
  const [aerolinea, setAerolinea] = useState<Aerolinea | null>(null);
  const [resolvedId, setResolvedId] = useState<string>("");

  useEffect(() => { params.then(({ id }) => setResolvedId(id)); }, [params]);

  useEffect(() => {
    if (!resolvedId) return;
    apiFetch<Cotizacion>(`/operaciones/cotizaciones/${resolvedId}`).then(async (data) => {
      setCot(data);
      document.title = data.numero;
      const t = await apiFetch<Tercero>(`/terceros/${data.cliente_id}`);
      setCliente(t);
      if (data.aerolinea_id) {
        const a = await apiFetch<Aerolinea>(`/operaciones/aerolineas/${data.aerolinea_id}`);
        setAerolinea(a);
      }
    });
  }, [resolvedId]);

  if (!cot || !cliente) {
    return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;
  }

  const trm = cot.trm ?? 1;
  let grandTotalCOP = 0;
  const seccionesConLineas = SECCIONES.filter(({ key }) => cot.lineas.some((l) => l.seccion === key));

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { margin: 0; padding: 0; background: #fff; font-family: system-ui, sans-serif; }
        @page { margin: 15mm 18mm; size: A4; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Botón imprimir */}
      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir
        </button>
      </div>

      {/* Documento */}
      <div id="print-content" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 40px", fontSize: 11, color: "#1e293b", lineHeight: 1.5 }}>

        {/* Encabezado empresa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "2px solid #2563eb" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: 48, marginBottom: 8, objectFit: "contain" }} />
            <div style={{ fontSize: 10, color: "#64748b" }}>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 12 }}>UNIVERSAL CARGO COLOMBIA S.A.S</div>
              <div>NIT: 901.702.367</div>
              <div>CRA 106 # 15a - 25 mzn 24 BOD 143 · Bogotá, Colombia</div>
              <div>Tel: 314 3045776 · julian.fontecha@universalcargo.com.co</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: "#2563eb", color: "#fff", borderRadius: 8, padding: "10px 18px", display: "inline-block" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 }}>Cotización</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>{cot.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
              <div><strong>Fecha:</strong> {cot.fecha}</div>
              <div><strong>Vigencia:</strong> {cot.fecha_vigencia}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{
                  background: cot.estado === "APROBADA" ? "#dcfce7" : cot.estado === "ENVIADA" ? "#dbeafe" : "#f1f5f9",
                  color: cot.estado === "APROBADA" ? "#15803d" : cot.estado === "ENVIADA" ? "#1d4ed8" : "#475569",
                  padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                }}>{cot.estado}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info cliente + operación */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 6 }}>Cliente</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{cliente.razon_social}</div>
            <div style={{ color: "#64748b" }}>NIT: {cliente.nit}</div>
            {cliente.ciudad && <div style={{ color: "#64748b" }}>{cliente.ciudad}</div>}
            {cliente.telefono && <div style={{ color: "#64748b" }}>Tel: {cliente.telefono}</div>}
            {cliente.email && <div style={{ color: "#64748b" }}>{cliente.email}</div>}
            {cot.asesor_nombre && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0", fontSize: 10, color: "#64748b" }}>
                Asesor: <strong style={{ color: "#1e293b" }}>{cot.asesor_nombre}</strong>
              </div>
            )}
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 6 }}>Detalles de la operación</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {([
                  ["Tipo", cot.tipo_operacion],
                  ["Ruta", `${cot.origen} → ${cot.destino}`],
                  ...(aerolinea ? [["Aerolínea", `${aerolinea.codigo_iata} — ${aerolinea.nombre}`]] : []),
                  ...(cot.incoterm ? [["Incoterm", cot.incoterm]] : []),
                  ...(cot.piezas ? [["Piezas", String(cot.piezas)]] : []),
                  ...(cot.peso_kg ? [["Peso cargable", `${cot.peso_kg} Kg`]] : []),
                  ...(cot.valor_mercancia ? [["Valor mercancía", `${cot.moneda_mercancia} ${fmt(cot.valor_mercancia)}`]] : []),
                  ...(cot.trm ? [["TRM", fmt(cot.trm, 2)]] : []),
                ] as [string, string][]).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: "#64748b", paddingRight: 8, whiteSpace: "nowrap", paddingBottom: 2 }}>{k}:</td>
                    <td style={{ fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secciones */}
        {seccionesConLineas.map(({ key, label }) => {
          const filas = cot.lineas.filter((l) => l.seccion === key);
          const subtotalCOP = filas.reduce((acc, l) => acc + l.total_venta * (l.moneda === "USD" ? trm : 1), 0);
          grandTotalCOP += subtotalCOP;
          return (
            <div key={key} style={{ marginBottom: 20 }}>
              <div style={{ background: "#1e40af", color: "#fff", padding: "5px 12px", borderRadius: "6px 6px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                {label}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#eff6ff" }}>
                    <th style={{ textAlign: "left", padding: "5px 10px", fontWeight: 600, color: "#1e40af", borderBottom: "1px solid #bfdbfe" }}>Concepto</th>
                    <th style={{ textAlign: "center", padding: "5px 8px", fontWeight: 600, color: "#1e40af", borderBottom: "1px solid #bfdbfe" }}>Tipo cálculo</th>
                    <th style={{ textAlign: "right", padding: "5px 8px", fontWeight: 600, color: "#1e40af", borderBottom: "1px solid #bfdbfe" }}>Kg</th>
                    <th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 600, color: "#1e40af", borderBottom: "1px solid #bfdbfe" }}>Tarifa</th>
                    <th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 600, color: "#1e40af", borderBottom: "1px solid #bfdbfe" }}>Total</th>
                    <th style={{ textAlign: "center", padding: "5px 8px", fontWeight: 600, color: "#1e40af", borderBottom: "1px solid #bfdbfe" }}>Mon.</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((l, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ padding: "5px 10px", borderBottom: "1px solid #f1f5f9" }}>
                        <div>{l.descripcion}</div>
                        {l.minimo != null && (
                          <div style={{ color: "#94a3b8", fontSize: 9 }}>Mínimo: {l.moneda} {fmt(l.minimo)}</div>
                        )}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                        {TIPO_LABEL[l.tipo_calculo] ?? l.tipo_calculo}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                        {l.tipo_calculo === "POR_KG" ? fmt(l.base, 2) : ""}
                      </td>
                      <td style={{ padding: "5px 10px", textAlign: "right", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                        {l.tipo_calculo === "PORCENTAJE" ? `${fmt(l.valor_unitario)}%` : fmt(l.valor_unitario)}
                      </td>
                      <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>
                        {fmt(l.total_venta)}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ background: l.moneda === "USD" ? "#dcfce7" : "#dbeafe", color: l.moneda === "USD" ? "#15803d" : "#1d4ed8", padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 700 }}>
                          {l.moneda}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#eff6ff" }}>
                    <td colSpan={4} style={{ padding: "5px 10px", fontWeight: 700, color: "#1e40af", fontSize: 10 }}>Subtotal {label}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: "#1e40af" }}>COP {fmt(subtotalCOP, 0)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Total general */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, marginBottom: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #cbd5e1", width: 160, paddingTop: 4, fontSize: 9, color: "#64748b" }}>Firma autorizada</div>
          </div>
          <div style={{ background: "#1e40af", color: "#fff", borderRadius: 8, padding: "12px 24px", textAlign: "right", minWidth: 240 }}>
            <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>TOTAL APROXIMADO</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>COP {fmt(grandTotalCOP, 0)}</div>
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>+ IVA</div>
          </div>
        </div>

        {/* Notas */}
        {cot.notas && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#92400e", marginBottom: 4 }}>Notas y condiciones</div>
            <div style={{ fontSize: 10, color: "#78350f", whiteSpace: "pre-line" }}>{cot.notas}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 8, display: "flex", justifyContent: "flex-start", alignItems: "flex-end" }}>
          <div style={{ fontSize: 9, color: "#94a3b8" }}>
            <div>Documento generado por el sistema Emperador Ledger</div>
          </div>
        </div>
      </div>
    </>
  );
}
