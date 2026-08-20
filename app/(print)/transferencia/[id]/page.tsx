"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Transferencia {
  id: string; numero: string; fecha: string;
  cuenta_origen_id: string; cuenta_origen_nombre: string | null;
  cuenta_destino_id: string; cuenta_destino_nombre: string | null;
  valor: string; descripcion: string | null; estado: string;
  asiento_id: string | null;
}

interface BanCuenta {
  id: string; nombre: string; numero: string;
  banco_nombre: string | null; moneda_codigo: string | null;
  cuenta_contable_codigo: string | null;
}

interface LineaAsiento {
  id: string; cuenta_codigo: string; cuenta_nombre: string;
  tercero_nit: string | null; centro_costo_nombre: string | null;
  debito: string; credito: string;
}
interface Asiento {
  id: string; numero: number; fecha: string;
  total_debito: string; total_credito: string;
  lineas: LineaAsiento[];
}

interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImprimirTransferenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const [doc, setDoc]         = useState<Transferencia | null>(null);
  const [cuentas, setCuentas] = useState<BanCuenta[]>([]);
  const [asiento, setAsiento] = useState<Asiento | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [id, setId]           = useState("");

  useEffect(() => { params.then(({ id }) => setId(id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    apiFetch<Transferencia>(`/bancos/transferencias/${id}`).then((t) => {
      setDoc(t);
      document.title = t.numero;
      if (t.asiento_id) {
        apiFetch<Asiento>(`/asientos/${t.asiento_id}`).catch(() => null).then((a) => { if (a) setAsiento(a); });
      }
    });
    apiFetch<BanCuenta[]>("/bancos/cuentas").catch(() => []).then(setCuentas);
    apiFetch<Empresa>("/empresa").catch(() => null).then((e) => { if (e) setEmpresa(e); });
  }, [id]);

  if (!doc) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const s = { black: "#000", dark: "#222", mid: "#555", light: "#888", border: "#bbb", thick: "#000" };
  const origen  = cuentas.find(c => c.id === doc.cuenta_origen_id);
  const destino = cuentas.find(c => c.id === doc.cuenta_destino_id);

  const bloqueCuenta = (titulo: string, nombre: string | null, c?: BanCuenta) => (
    <div style={{ flex: "1 1 50%", border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontWeight: 600, fontSize: 12 }}>{c?.banco_nombre ?? nombre ?? "—"}</div>
      {c && <div style={{ fontSize: 10, color: s.mid }}>{c.nombre} · Nº {c.numero}</div>}
      {c?.cuenta_contable_codigo && <div style={{ fontSize: 10, color: s.mid, fontFamily: "monospace" }}>{c.cuenta_contable_codigo}</div>}
    </div>
  );

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
              <div>NIT: {empresa ? `${empresa.nit}${empresa.digito_verif ? `-${empresa.digito_verif}` : ""}` : ""}</div>
              {empresa?.direccion && <div>{empresa.direccion}{empresa.ciudad ? ` · ${empresa.ciudad}` : ""}</div>}
              {empresa?.telefono && <div>Tel: {empresa.telefono}{empresa.email ? ` · ${empresa.email}` : ""}</div>}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 180, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>Transferencia entre cuentas</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{doc.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              <div><strong>Fecha:</strong> {doc.fecha}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                  {doc.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cuentas ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {bloqueCuenta("Cuenta origen (sale)", doc.cuenta_origen_nombre, origen)}
          {bloqueCuenta("Cuenta destino (entra)", doc.cuenta_destino_nombre, destino)}
        </div>

        {doc.descripcion && (
          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Concepto</div>
            <div style={{ fontWeight: 500, fontSize: 12 }}>{doc.descripcion}</div>
          </div>
        )}

        {/* ── Valor ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <table style={{ fontSize: 11, borderCollapse: "collapse", minWidth: 280 }}>
            <tbody>
              <tr style={{ borderTop: `2px solid ${s.thick}` }}>
                <td style={{ padding: "6px 12px 3px 0", fontWeight: 700, textAlign: "right", textTransform: "uppercase", fontSize: 12 }}>
                  Valor transferido{origen?.moneda_codigo ? ` (${origen.moneda_codigo})` : ""}
                </td>
                <td style={{ padding: "6px 0 3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 14, minWidth: 120 }}>{fmt(doc.valor)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Asiento contable ── */}
        {asiento && asiento.lineas.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ borderTop: `2px solid ${s.thick}`, paddingTop: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.mid }}>Asiento contable</div>
              <div style={{ fontSize: 10, color: s.light }}>N° interno {asiento.numero}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 4 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Cuenta</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Nombre</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Débito</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Crédito</th>
                </tr>
              </thead>
              <tbody>
                {asiento.lineas.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", fontWeight: 600 }}>{l.cuenta_codigo}</td>
                    <td style={{ padding: "5px 8px" }}>{l.cuenta_nombre}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{parseFloat(l.credito) > 0 ? fmt(l.credito) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${s.thick}`, fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: "6px 8px" }}></td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{fmt(asiento.total_debito)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{fmt(asiento.total_credito)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Firmas ── */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${s.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, textAlign: "center" }}>
          {["Elaborado por", "Revisado por", "Aprobado por"].map((label) => (
            <div key={label}>
              <div style={{ height: 40 }} />
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
