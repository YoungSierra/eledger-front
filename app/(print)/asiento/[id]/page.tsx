"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface LineaResponse {
  id: string; orden: number;
  cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string;
  debito: string; credito: string;
  debito_funcional: string; credito_funcional: string;
  tercero_id: string | null; tercero_nit: string | null; tercero_nombre: string | null;
  centro_costo_id: string | null; centro_costo_nombre: string | null;
  descripcion: string | null;
}

interface Asiento {
  id: string; numero: number; documento_numero: string | null;
  tipo_documento_codigo: string; tipo_documento_nombre: string;
  fecha: string; descripcion: string; estado: "borrador" | "publicado";
  moneda_id: string; moneda_codigo: string; trm: string | null;
  asiento_origen_id: string | null;
  total_debito: string; total_credito: string;
  lineas: LineaResponse[];
  creado_en: string; creado_por: string;
}

interface Empresa {
  razon_social: string; nit: string; digito_verif: string | null;
  direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null;
}

interface Usuario {
  nombre: string; apellido: string; email: string;
}

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImprimirAsientoPage({ params }: { params: Promise<{ id: string }> }) {
  const [asiento, setAsiento] = useState<Asiento | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [elaborador, setElaborador] = useState<Usuario | null>(null);
  const [resolvedId, setResolvedId] = useState("");

  useEffect(() => { params.then(({ id }) => setResolvedId(id)); }, [params]);

  useEffect(() => {
    if (!resolvedId) return;
    apiFetch<Asiento>(`/asientos/${resolvedId}`).then((a) => {
      setAsiento(a);
      document.title = a.documento_numero ?? String(a.numero);
      apiFetch<Usuario>(`/usuarios/${a.creado_por}`).catch(() => null).then((u) => { if (u) setElaborador(u); });
    });
    apiFetch<Empresa>("/empresa").catch(() => null).then((e) => { if (e) setEmpresa(e); });
  }, [resolvedId]);

  if (!asiento) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const esFuncional = !asiento.trm;
  const totalD = parseFloat(asiento.total_debito);
  const totalC = parseFloat(asiento.total_credito);

  const s = {
    black:  "#000",
    dark:   "#222",
    mid:    "#555",
    light:  "#888",
    border: "#bbb",
    thick:  "#000",
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; }
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
          Imprimir / Guardar PDF
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
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 140, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>
                {asiento.tipo_documento_nombre}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>
                {asiento.documento_numero ?? `#${asiento.numero}`}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              <div><strong>Fecha:</strong> {asiento.fecha}</div>
              <div><strong>N° interno:</strong> {asiento.numero}</div>
              {!esFuncional && asiento.trm && <div><strong>TRM:</strong> {fmt(asiento.trm)}</div>}
              <div style={{ marginTop: 4 }}>
                <span style={{ border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                  {asiento.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Descripción ── */}
        <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Descripción</div>
          <div style={{ fontWeight: 500, fontSize: 12 }}>{asiento.descripcion}</div>
          {!esFuncional && (
            <div style={{ marginTop: 4, fontSize: 10, color: s.mid }}>
              Moneda: <strong>{asiento.moneda_codigo}</strong>
            </div>
          )}
        </div>

        {/* ── Tabla de líneas ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 4 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Cuenta</th>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Nombre cuenta</th>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Tercero</th>
              <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Centro costo</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Débito</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Crédito</th>
            </tr>
          </thead>
          <tbody>
            {asiento.lineas.map((l) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                <td style={{ padding: "6px 8px", fontFamily: "monospace", fontWeight: 600 }}>{l.cuenta_codigo}</td>
                <td style={{ padding: "6px 8px" }}>{l.cuenta_nombre}</td>
                <td style={{ padding: "6px 8px", color: s.mid }}>
                  {l.tercero_nit ?? "—"}
                </td>
                <td style={{ padding: "6px 8px", color: s.mid }}>{l.centro_costo_nombre ?? "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                  {parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                  {parseFloat(l.credito) > 0 ? fmt(l.credito) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${s.thick}`, fontWeight: 700 }}>
              <td colSpan={4} style={{ padding: "6px 8px" }}></td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{fmt(totalD)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>{fmt(totalC)}</td>
            </tr>
            {!esFuncional && (
              <tr style={{ borderTop: `1px solid ${s.border}`, fontSize: 10, color: s.mid }}>
                <td colSpan={4} style={{ padding: "4px 8px", textAlign: "right" }}>Equivalente funcional (COP)</td>
                <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                  {fmt(asiento.lineas.reduce((sum, l) => sum + parseFloat(l.debito_funcional), 0))}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                  {fmt(asiento.lineas.reduce((sum, l) => sum + parseFloat(l.credito_funcional), 0))}
                </td>
              </tr>
            )}
          </tfoot>
        </table>

        {/* ── Glosas ── */}
        {asiento.lineas.some((l) => l.descripcion) && (
          <div style={{ marginTop: 16, fontSize: 10, color: s.mid }}>
            <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 9, color: s.light, marginBottom: 6 }}>Glosas</div>
            {asiento.lineas.filter((l) => l.descripcion).map((l) => (
              <div key={l.id} style={{ marginBottom: 2 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 600, marginRight: 6 }}>{l.cuenta_codigo}</span>
                {l.descripcion}
              </div>
            ))}
          </div>
        )}

        {/* ── Pie ── */}
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
          {asiento.documento_numero && ` · ${asiento.documento_numero}`}
        </div>
      </div>
    </>
  );
}
