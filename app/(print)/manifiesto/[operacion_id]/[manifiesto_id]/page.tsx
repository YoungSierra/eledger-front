"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface ManifiestoLinea {
  id: string; hawb_id: string;
  exportador_id: string; importador_id: string;
  piezas: number | null; peso_kg: number | null; descripcion: string | null;
}
interface Manifiesto {
  id: string; mawb_id: string; aerolinea_id: string | null;
  fecha: string; estado: string; lineas: ManifiestoLinea[];
}
interface Mawb { numero_mawb: string; prefix: string | null; }
interface Hawb { id: string; numero_hawb: string; }
interface Aerolinea { nombre: string; codigo_iata: string; }
interface Tercero { razon_social: string; }

function fmt(n: number | string | null | undefined, dec = 2) {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return (isNaN(num) ? 0 : num).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function ImprimirManifiestoPage({ params }: { params: Promise<{ operacion_id: string; manifiesto_id: string }> }) {
  const [manifiesto, setManifiesto] = useState<Manifiesto | null>(null);
  const [mawb, setMawb]             = useState<Mawb | null>(null);
  const [hawbs, setHawbs]           = useState<Record<string, Hawb>>({});
  const [aerolinea, setAerolinea]   = useState<Aerolinea | null>(null);
  const [nombres, setNombres]       = useState<Record<string, string>>({});
  const [ids, setIds]               = useState({ operacion_id: "", manifiesto_id: "" });

  useEffect(() => { params.then((p) => setIds(p)); }, [params]);

  useEffect(() => {
    if (!ids.operacion_id || !ids.manifiesto_id) return;
    (async () => {
      const m = await apiFetch<Manifiesto>(
        `/operaciones/operaciones/${ids.operacion_id}/manifiestos/${ids.manifiesto_id}`
      ).catch(() => null);
      if (!m) return;
      setManifiesto(m);

      const [mawbData, hawbList] = await Promise.all([
        apiFetch<Mawb>(`/operaciones/operaciones/${ids.operacion_id}/mawbs/${m.mawb_id}`),
        apiFetch<Hawb[]>(`/operaciones/operaciones/${ids.operacion_id}/hawbs`),
      ]);
      setMawb(mawbData);
      const hawbMap: Record<string, Hawb> = {};
      hawbList.forEach((h) => { hawbMap[h.id] = h; });
      setHawbs(hawbMap);
      const hawbNumero = hawbMap[m.lineas[0]?.hawb_id]?.numero_hawb ?? m.fecha;
      document.title = `Manifiesto - ${hawbNumero}`;

      if (m.aerolinea_id) {
        const a = await apiFetch<Aerolinea>(`/operaciones/aerolineas/${m.aerolinea_id}`).catch(() => null);
        if (a) setAerolinea(a);
      }

      // Resolver nombres de exportador/importador
      const terceroIds = new Set<string>();
      m.lineas.forEach((l) => { terceroIds.add(l.exportador_id); terceroIds.add(l.importador_id); });
      const n: Record<string, string> = {};
      await Promise.all([...terceroIds].map(async (id) => {
        const t = await apiFetch<Tercero>(`/terceros/${id}`).catch(() => null);
        if (t) n[id] = t.razon_social;
      }));
      setNombres(n);
    })();
  }, [ids]);

  if (!manifiesto || !mawb) {
    return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando...</div>;
  }

  const totalPcs  = manifiesto.lineas.reduce((a, l) => a + (l.piezas ?? 0), 0);
  const totalPeso = manifiesto.lineas.reduce((a, l) => a + parseFloat(String(l.peso_kg ?? 0)), 0);
  const mawbNumero = mawb.prefix ? `${mawb.prefix}-${mawb.numero_mawb}` : mawb.numero_mawb;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow: auto !important; height: auto !important; }
        body { margin: 0; padding: 0; background: #fff; font-family: system-ui, sans-serif; }
        @page { margin: 15mm 18mm; size: A4; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Botón imprimir */}
      <div className="no-print" style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "6px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 40px", fontSize: 11, color: "#1e293b", lineHeight: 1.5 }}>

        {/* Encabezado corporativo */}
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
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 }}>Manifiesto de carga · HAWB</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>
                {hawbs[manifiesto.lineas[0]?.hawb_id]?.numero_hawb ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Info operación */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            ["Aerolínea", aerolinea ? `${aerolinea.codigo_iata} — ${aerolinea.nombre}` : "—"],
            ["MAWB", mawbNumero],
            ["Fecha", manifiesto.fecha],
          ].map(([k, v]) => (
            <div key={k} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 3 }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tabla de líneas */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#1e40af" }}>
              {["Exportador", "Importador", "PCS", "Descripción", "Peso Kg"].map((h) => (
                <th key={h} style={{ textAlign: h === "PCS" || h === "Peso Kg" ? "right" : "left", padding: "7px 10px", color: "#fff", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifiesto.lineas.map((l, i) => (
              <tr key={l.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px" }}>{nombres[l.exportador_id] ?? "—"}</td>
                <td style={{ padding: "8px 10px" }}>{nombres[l.importador_id] ?? "—"}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{l.piezas ?? "—"}</td>
                <td style={{ padding: "8px 10px", color: "#475569" }}>{l.descripcion ?? "—"}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>{l.peso_kg != null ? fmt(l.peso_kg) : "—"}</td>
              </tr>
            ))}
            {/* Totales */}
            <tr style={{ background: "#eff6ff", borderTop: "2px solid #bfdbfe" }}>
              <td colSpan={2} style={{ padding: "8px 10px", fontWeight: 700, color: "#1e40af", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Total</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#1e40af", fontSize: 12 }}>{totalPcs}</td>
              <td />
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#1e40af", fontSize: 12 }}>{fmt(totalPeso)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 24, display: "flex", justifyContent: "flex-start" }}>
          <div style={{ fontSize: 9, color: "#94a3b8" }}>Documento generado por el sistema Emperador Ledger</div>
        </div>
      </div>
    </>
  );
}
