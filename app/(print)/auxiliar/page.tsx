"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Linea { fecha: string; numero: number; descripcion: string; debito: string; credito: string; saldo: string; }
interface SeccionTercero { tercero_nit: string; tercero_nombre: string; saldo_inicial: string; lineas: Linea[]; totales: { debito: string; credito: string; saldo_final: string }; }
interface CuentaAux { cuenta_codigo: string; cuenta_nombre: string; terceros: SeccionTercero[]; }
interface Auxiliar { fecha_desde: string; fecha_hasta: string; cuenta_desde: string; cuenta_hasta: string; cuentas: CuentaAux[]; }
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; }

function fmt(v: string | number) {
  const n = parseFloat(String(v));
  if (!n) return "";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtS(v: string | number) {
  const n = parseFloat(String(v));
  if (n === 0) return "â€”";
  const a = Math.abs(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${a})` : a;
}

const td: React.CSSProperties  = { padding: "2px 6px", borderBottom: "1px solid #e5e7eb", fontSize: 8.5, color: "#1e293b" };
const tdR: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "monospace" };
const th: React.CSSProperties  = { padding: "4px 6px", fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, background: "#f1f5f9", borderBottom: "2px solid #cbd5e1", color: "#475569" };
const thR: React.CSSProperties = { ...th, textAlign: "right" };

function AuxiliarContent() {
  const params     = useSearchParams();
  const cDesde     = params.get("cuenta_desde") ?? "";
  const cHasta     = params.get("cuenta_hasta") ?? "";
  const fechaDesde = params.get("fecha_desde") ?? "";
  const fechaHasta = params.get("fecha_hasta") ?? "";
  const terceroId  = params.get("tercero_id") ?? "";

  const [data,    setData]    = useState<Auxiliar | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    if (!fechaDesde || !fechaHasta) return;
    const p = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
    if (cDesde) p.set("cuenta_desde", cDesde);
    if (cHasta) p.set("cuenta_hasta", cHasta);
    if (terceroId) p.set("tercero_id", terceroId);
    apiFetch<Auxiliar>(`/reportes/auxiliar?${p}`).then(setData);
    apiFetch<Empresa>("/empresa").catch(() => null).then(e => { if (e) setEmpresa(e); });
  }, [cDesde, cHasta, fechaDesde, fechaHasta, terceroId]);

  useEffect(() => { if (data) document.title = `Auxiliar por Tercero ${data.fecha_desde} ${data.fecha_hasta}`; }, [data]);

  if (!data) return <div style={{ padding: 40, color: "#999" }}>Cargando...</div>;

  const hoy = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const nit = empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : "";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; }
        body { background: #fff; font-family: system-ui, sans-serif; color: #1e293b; }
        @page { margin: 12mm 15mm; size: A4 landscape; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
      `}</style>
      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()} style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Imprimir</button>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 28px", fontSize: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ height: 36, marginBottom: 4, objectFit: "contain" }} />
            <div style={{ fontWeight: 700, fontSize: 11 }}>{empresa?.razon_social ?? ""}</div>
            {nit && <div style={{ color: "#64748b" }}>NIT: {nit}</div>}
            {empresa?.direccion && <div style={{ color: "#64748b" }}>{empresa.direccion}{empresa.ciudad ? ` Â· ${empresa.ciudad}` : ""}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ border: "2px solid #1e293b", borderRadius: 7, padding: "10px 20px", display: "inline-block" }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#64748b" }}>Auxiliar por Tercero</div>
            </div>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 9 }}>
              <div><strong>PerÃ­odo:</strong> {data.fecha_desde} â€” {data.fecha_hasta}</div>
              <div><strong>Cuentas:</strong> {data.cuenta_desde} â€” {data.cuenta_hasta}</div>
              <div><strong>Generado:</strong> {hoy}</div>
            </div>
          </div>
        </div>

        {data.cuentas.map(cuenta => (
          <div key={cuenta.cuenta_codigo} style={{ marginBottom: 24 }}>
            <div style={{ background: "#1e293b", color: "#fff", padding: "5px 10px", borderRadius: "6px 6px 0 0", display: "flex", gap: 12 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>{cuenta.cuenta_codigo}</span>
              <span style={{ fontWeight: 600, fontSize: 10 }}>{cuenta.cuenta_nombre}</span>
            </div>

            {cuenta.terceros.map((sec, si) => (
              <div key={si}>
                <div style={{ background: "#2563eb", color: "#fff", padding: "3px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    {sec.tercero_nit && <span style={{ fontFamily: "monospace", fontSize: 8.5, color: "#bfdbfe", marginRight: 6 }}>{sec.tercero_nit} Â·</span>}
                    <span style={{ fontWeight: 700, fontSize: 9.5 }}>{sec.tercero_nombre}</span>
                  </span>
                  <span style={{ fontSize: 8.5 }}>Saldo inicial: <strong>{fmtS(sec.saldo_inicial)}</strong></span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left", width: 72 }}>Fecha</th>
                      <th style={{ ...th, textAlign: "left", width: 65 }}>NÂ° Asiento</th>
                      <th style={{ ...th, textAlign: "left" }}>DescripciÃ³n</th>
                      <th style={{ ...thR, width: 90 }}>DÃ©bito</th>
                      <th style={{ ...thR, width: 90 }}>CrÃ©dito</th>
                      <th style={{ ...thR, width: 90 }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.lineas.map((ln, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                        <td style={td}>{ln.fecha}</td>
                        <td style={{ ...td, fontFamily: "monospace", textAlign: "center" }}>{ln.numero}</td>
                        <td style={td}>{ln.descripcion}</td>
                        <td style={tdR}>{fmt(ln.debito)}</td>
                        <td style={tdR}>{fmt(ln.credito)}</td>
                        <td style={{ ...tdR, fontWeight: 600 }}>{fmtS(ln.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #94a3b8", background: "#f1f5f9" }}>
                      <td colSpan={3} style={{ ...td, fontWeight: 700, fontSize: 8, textTransform: "uppercase" }}>Totales</td>
                      <td style={{ ...tdR, fontWeight: 700 }}>{fmt(sec.totales.debito)}</td>
                      <td style={{ ...tdR, fontWeight: 700 }}>{fmt(sec.totales.credito)}</td>
                      <td style={{ ...tdR, fontWeight: 700, color: "#1d4ed8" }}>{fmtS(sec.totales.saldo_final)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #d1d5db", display: "flex", justifyContent: "space-between", fontSize: 8, color: "#94a3b8" }}>
          <span>Documento generado por el sistema Emperador Ledger</span>
        </div>
      </div>
    </>
  );
}

export default function ImprimirAuxiliarPage() {
  return <Suspense fallback={<div style={{ padding: 40, color: "#999" }}>Cargando...</div>}><AuxiliarContent /></Suspense>;
}

