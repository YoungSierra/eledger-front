"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Retencion {
  id: string; tipo: string; concepto: string;
  base: string; porcentaje: string; valor: string;
  cuenta_codigo: string | null; cuenta_nombre: string | null;
}

interface Recibo {
  id: string; numero: string; fecha: string;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  moneda_codigo: string; trm: string | null;
  subtotal: string; total_retenciones: string; total: string;
  descripcion: string | null; estado: string;
  ban_cuenta_id: string | null;
  asiento_id: string | null;
  retenciones: Retencion[];
  creado_por: string;
}

interface AplicacionItem {
  id: string; factura_id: string; numero: string; fecha: string;
  fecha_vencimiento: string | null; total: string; saldo_original: string; valor: string;
}

interface LineaAsiento {
  id: string; cuenta_codigo: string; cuenta_nombre: string;
  tercero_nit: string | null; tercero_nombre: string | null;
  centro_costo_nombre: string | null;
  debito: string; credito: string;
  debito_funcional: string; credito_funcional: string;
}

interface Asiento {
  id: string; numero: number; fecha: string;
  total_debito: string; total_credito: string;
  moneda_codigo: string; trm: string | null;
  lineas: LineaAsiento[];
}

interface BanCuenta { nombre: string; numero: string; banco_nombre: string | null; }
interface Empresa { razon_social: string; nit: string; digito_verif: string | null; direccion: string | null; ciudad: string | null; telefono: string | null; email: string | null; }
interface Usuario { nombre: string; apellido: string; }

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImprimirReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const [recibo, setRecibo]         = useState<Recibo | null>(null);
  const [apps, setApps]             = useState<AplicacionItem[]>([]);
  const [asiento, setAsiento]       = useState<Asiento | null>(null);
  const [banCuenta, setBanCuenta]   = useState<BanCuenta | null>(null);
  const [empresa, setEmpresa]       = useState<Empresa | null>(null);
  const [elaborador, setElaborador] = useState<Usuario | null>(null);
  const [id, setId]                 = useState("");

  useEffect(() => { params.then(({ id }) => setId(id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch<Recibo>(`/cxc/${id}`),
      apiFetch<AplicacionItem[]>(`/cxc/${id}/aplicaciones-pendientes`),
      apiFetch<Empresa>("/empresa").catch(() => null),
    ]).then(([rec, aplicaciones, emp]) => {
      setRecibo(rec);
      setApps(aplicaciones);
      if (emp) setEmpresa(emp);
      document.title = rec.numero;
      apiFetch<Usuario>(`/usuarios/${rec.creado_por}`).catch(() => null).then(u => { if (u) setElaborador(u); });
      if (rec.ban_cuenta_id) {
        apiFetch<(BanCuenta & { id: string })[]>("/bancos/cuentas").catch(() => []).then(cuentas => {
          const c = cuentas.find(x => x.id === rec.ban_cuenta_id);
          if (c) setBanCuenta(c);
        });
      }
      if (rec.asiento_id) {
        apiFetch<Asiento>(`/asientos/${rec.asiento_id}`).catch(() => null).then(a => { if (a) setAsiento(a); });
      }
    });
  }, [id]);

  if (!recibo) return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;

  const esFuncional = !recibo.trm;
  const totalD = asiento ? parseFloat(asiento.total_debito) : 0;
  const totalC = asiento ? parseFloat(asiento.total_credito) : 0;

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
            <div style={{ border: `2px solid ${s.thick}`, borderRadius: 8, padding: "10px 18px", display: "inline-block", minWidth: 160, textAlign: "right" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: s.mid }}>Recibo de Caja</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: "monospace", color: s.black }}>{recibo.numero}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: s.mid }}>
              <div><strong>Fecha:</strong> {recibo.fecha}</div>
              {!esFuncional && recibo.trm && <div><strong>TRM:</strong> {fmt(recibo.trm)}</div>}
              <div style={{ marginTop: 4 }}>
                <span style={{ border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: s.dark }}>
                  {recibo.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Datos del recibo ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Cliente</div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{recibo.tercero_nombre ?? "—"}</div>
            {recibo.tercero_nit && <div style={{ fontSize: 10, color: s.mid }}>NIT / CC: {recibo.tercero_nit}</div>}
          </div>
          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Cuenta bancaria</div>
            {banCuenta ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 11 }}>{banCuenta.nombre}</div>
                <div style={{ fontSize: 10, color: s.mid }}>
                  {banCuenta.banco_nombre && <span>{banCuenta.banco_nombre} · </span>}
                  {banCuenta.numero}
                </div>
              </>
            ) : <div style={{ color: s.light }}>—</div>}
          </div>
        </div>

        {recibo.descripcion && (
          <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 4 }}>Concepto</div>
            <div style={{ fontWeight: 500, fontSize: 12 }}>{recibo.descripcion}</div>
          </div>
        )}

        {/* ── Facturas aplicadas ── */}
        {apps.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.light, marginBottom: 8 }}>Facturas aplicadas</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
                  <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Factura</th>
                  <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Fecha</th>
                  <th style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Vence</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Total factura</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Aplicado</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", fontWeight: 600 }}>{a.numero}</td>
                    <td style={{ padding: "5px 8px", color: s.mid }}>{a.fecha}</td>
                    <td style={{ padding: "5px 8px", color: s.mid }}>{a.fecha_vencimiento ?? "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>{fmt(a.total)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(a.valor)}</td>
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
                <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>Valor recibido</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 600, minWidth: 120 }}>{fmt(recibo.subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: "3px 12px 3px 0", color: s.mid, textAlign: "right" }}>Total retenciones</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontFamily: "monospace", color: s.mid }}>{fmt(recibo.total_retenciones)}</td>
              </tr>
              <tr style={{ borderTop: `2px solid ${s.thick}` }}>
                <td style={{ padding: "6px 12px 3px 0", fontWeight: 700, textAlign: "right", textTransform: "uppercase", fontSize: 12 }}>Total</td>
                <td style={{ padding: "6px 0 3px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 14 }}>{fmt(recibo.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Asiento contable ── */}
        {asiento && (
          <div style={{ marginTop: 8 }}>
            <div style={{ borderTop: `2px solid ${s.thick}`, paddingTop: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: s.mid }}>Asiento contable</div>
              <div style={{ fontSize: 10, color: s.light }}>N° interno {asiento.numero} · {asiento.fecha}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, marginBottom: 4 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${s.thick}` }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Cuenta</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Nombre</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Tercero</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>C. Costo</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Débito</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>Crédito</th>
                </tr>
              </thead>
              <tbody>
                {asiento.lineas.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", fontWeight: 600 }}>{l.cuenta_codigo}</td>
                    <td style={{ padding: "5px 8px" }}>{l.cuenta_nombre}</td>
                    <td style={{ padding: "5px 8px", color: s.mid }}>
                      {l.tercero_nit ?? "—"}
                    </td>
                    <td style={{ padding: "5px 8px", color: s.mid }}>{l.centro_costo_nombre ?? "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>
                      {parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "monospace" }}>
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
          {" · "}{recibo.numero}
        </div>
      </div>
    </>
  );
}
