"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Aerolinea { id: string; codigo_iata: string; nombre: string; }
interface Aeropuerto { id: string; codigo_iata: string; nombre: string; ciudad: string; }
interface Tercero { id: string; nit: string; razon_social: string; }
interface Operacion { id: string; numero: string; }

const S = {
  td: (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #000", verticalAlign: "top", padding: "2px 4px", ...extra,
  }),
  lbl: { fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#555", lineHeight: 1.2, display: "block", marginBottom: 1 },
  valBold: { fontSize: "11px", fontWeight: 700, lineHeight: 1.3 },
  valSm: { fontSize: "9px", lineHeight: 1.3, color: "#222" },
  section: { fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, color: "#555", letterSpacing: "0.04em" },
};

const iEdit: React.CSSProperties = {
  border: "none", borderBottom: "1px solid #9ca3af", background: "transparent",
  width: "100%", fontSize: "11px", lineHeight: 1.3, padding: 0,
  outline: "none", fontFamily: "inherit", color: "#111",
};

const iAuto: React.CSSProperties = {
  border: "none", borderBottom: "1px solid #93c5fd", background: "rgba(219,234,254,0.25)",
  width: "100%", fontSize: "11px", lineHeight: 1.3, padding: 0,
  outline: "none", fontFamily: "inherit", color: "#1d4ed8", fontWeight: 700,
};

function Sel({ value, auto, onChange, children }: {
  value?: string; auto?: boolean; onChange?: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}
      style={{ ...iEdit, ...(auto ? iAuto : {}), cursor: "pointer", appearance: "none" as const }}>
      {children}
    </select>
  );
}

function TerceroField({ label, nombre, detalle }: { label: string; nombre: string; detalle: React.ReactNode }) {
  return (
    <>
      <span style={S.lbl}>{label}</span>
      <div style={{ ...S.valBold, color: "#374151" }}>{nombre}</div>
      <div style={{ ...S.valSm, color: "#6b7280" }}>{detalle}</div>
    </>
  );
}

// Búsqueda tercero
function BusquedaTercero({ label, display, onSelect }: {
  label: string; display: string; onSelect: (id: string, nombre: string, detalle: string) => void;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<{ id: string; label: string; detalle: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQ(display); }, [display]);

  async function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpts([]); setOpen(false); return; }
    setTimeout(async () => {
      const data = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}`);
      const mapped = data.map((t) => ({ id: t.id, label: t.razon_social, detalle: `NIT ${t.nit}` }));
      setOpts(mapped); setOpen(mapped.length > 0);
    }, 300);
  }

  return (
    <div style={{ position: "relative" }}>
      <span style={S.lbl}>{label}</span>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar por NIT o nombre..." style={iEdit} />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 160, overflowY: "auto" }}>
          {opts.map((op) => (
            <button key={op.id} type="button" onMouseDown={() => { setQ(op.label); setOpen(false); onSelect(op.id, op.label, op.detalle); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#374151", background: "none", border: "none", cursor: "pointer" }}>
              <div style={{ fontWeight: 600 }}>{op.label}</div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>{op.detalle}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MawbForm({ operacionId, mawbId }: { operacionId: string; mawbId: string | null }) {
  const router = useRouter();
  const isNuevo = mawbId === null;

  const [aerolineas, setAerolineas] = useState<Aerolinea[]>([]);
  const [aeropuertos, setAeropuertos] = useState<Aeropuerto[]>([]);
  const [operacion, setOperacion] = useState<Operacion | null>(null);

  // Consignee
  const [consigneeId, setConsigneeId] = useState("");
  const [consigneeNombre, setConsigneeNombre] = useState("");
  const [consigneeDetalle, setConsigneeDetalle] = useState("");

  // Campos del formulario
  const [prefix, setPrefix] = useState("230");
  const [sequential, setSeq] = useState("");
  const [consigneeAccount, setConsigneeAccount] = useState("");
  const [shipperAccount, setShipperAccount] = useState("");
  const [aerolineaId, setAerolineaId] = useState("");
  const [aeropuertoOrigenId, setAerOpId] = useState("");
  const [aeropuertoDestinoId, setAerDestId] = useState("");
  const [vuelo, setVuelo] = useState("");
  const [fechaVuelo, setFechaVuelo] = useState("");
  const [trm, setTrm] = useState("");
  const [agentIata, setAgentIata] = useState("");
  const [agentAccount, setAgentAccount] = useState("");
  const [tipoPagoFlete, setTipoPagoFlete] = useState<"PPD"|"COLL">("PPD");
  const [tipoPagoOtros, setTipoPagoOtros] = useState<"PPD"|"COLL">("PPD");
  const [monedaFlete, setMonedaFlete] = useState("USD");
  const [valDecTransporte, setValDecTransporte] = useState("NVD");
  const [valDecAduana, setValDecAduana] = useState("NVD");
  const [montoSeguro, setMontoSeguro] = useState("");
  const [infoManejo, setInfoManejo] = useState("ATTACHED ENVELOPED DOCUMENTS");
  const [claseTarifa, setClaseTarifa] = useState("RCP");
  const [piezas, setPiezas] = useState("");
  const [pesoBruto, setPesoBruto] = useState("");
  const [pesoCargable, setPesoCargable] = useState("");
  const [tarifaPorKg, setTarifaPorKg] = useState("");
  const [descripcion, setDescripcion] = useState("AS PER CARGO CONSOLIDATED");
  const [dimensiones, setDimensiones] = useState("");
  const [fleteTotal, setFleteTotal] = useState("");
  const [fsc, setFsc] = useState("");
  const [dueCarrier, setDueCarrier] = useState("");
  const [cargoValuacion, setCargoValuacion] = useState("");
  const [tax, setTax] = useState("");
  const [otrosDueAgent, setOtrosDueAgent] = useState("");
  const [otrosDueCarrier, setOtrosDueCarrier] = useState("");
  const [totalPrepaidVal, setTotalPrepaidVal] = useState("");
  const [fechaEjecucion, setFechaEjecucion] = useState("");
  const [lugarEjecucion, setLugarEjecucion] = useState("BOGOTA - COLOMBIA");
  const [estado, setEstado] = useState<"BORRADOR"|"EMITIDA"|"ANULADA">("BORRADOR");
  const [emitidoPor, setEmitidoPor] = useState<string|null>(null);
  const [emitidoEn, setEmitidoEn]   = useState<string|null>(null);
  const [anuladoPor, setAnuladoPor] = useState<string|null>(null);
  const [anuladoEn, setAnuladoEn]   = useState<string|null>(null);
  const [anuladoMotivo, setAnuladoMotivo] = useState<string|null>(null);
  const [emitirOpen, setEmitirOpen] = useState(false);
  const [anularOpen, setAnularOpen] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mawbFull = `${prefix}-${sequential}`;

  // Total Charge: calculado si hay tarifa y peso, si no usa fleteTotal
  const tarNum = parseFloat(tarifaPorKg) || 0;
  const pesNum = parseFloat(pesoCargable) || 0;
  const fleteCalc = tarNum > 0 && pesNum > 0 ? (tarNum * pesNum).toFixed(2) : fleteTotal;

  const aerolineaInfo = aerolineas.find((a) => a.id === aerolineaId);
  const aerOrigenInfo = aeropuertos.find((a) => a.id === aeropuertoOrigenId);
  const aerDestinoInfo = aeropuertos.find((a) => a.id === aeropuertoDestinoId);

  useEffect(() => {
    apiFetch<Aerolinea[]>("/operaciones/aerolineas?solo_activas=true").then(setAerolineas).catch(() => {});
    apiFetch<Aeropuerto[]>("/operaciones/aeropuertos?solo_activos=true").then(setAeropuertos).catch(() => {});
    apiFetch<Operacion>(`/operaciones/operaciones/${operacionId}`).then(setOperacion).catch(() => {});

    if (!isNuevo) {
      apiFetch<Record<string, unknown>>(`/operaciones/operaciones/${operacionId}/mawbs/${mawbId}`)
        .then((data) => {
          setPrefix((data.prefix as string) ?? "230");
          setSeq((data.numero_mawb as string)?.split("-")[1] ?? (data.numero_mawb as string) ?? "");
          const cid = (data.consignee_id as string) ?? "";
          setConsigneeId(cid);
          if (cid) apiFetch<Tercero>(`/terceros/${cid}`).then((t) => { setConsigneeNombre(t.razon_social); setConsigneeDetalle(`NIT ${t.nit}`); }).catch(() => {});
          setConsigneeAccount((data.consignee_account as string) ?? "");
          setShipperAccount((data.shipper_account as string) ?? "");
          setAerolineaId((data.aerolinea_id as string) ?? "");
          setAerOpId((data.aeropuerto_origen_id as string) ?? "");
          setAerDestId((data.aeropuerto_destino_id as string) ?? "");
          setVuelo((data.vuelo as string) ?? "");
          setFechaVuelo((data.fecha_vuelo as string) ?? "");
          setTrm(data.trm ? String(data.trm) : "");
          setAgentIata((data.agent_iata_code as string) ?? "");
          setAgentAccount((data.agent_account_no as string) ?? "");
          setTipoPagoFlete(((data.tipo_pago_flete as string) ?? "PPD") as "PPD"|"COLL");
          setTipoPagoOtros(((data.tipo_pago_otros as string) ?? "PPD") as "PPD"|"COLL");
          setMonedaFlete((data.moneda_flete as string) ?? "USD");
          setValDecTransporte((data.valor_declarado_transporte as string) ?? "NVD");
          setValDecAduana((data.valor_declarado_aduana as string) ?? "NVD");
          setMontoSeguro((data.monto_seguro as string) ?? "");
          setInfoManejo((data.info_manejo as string) ?? "ATTACHED ENVELOPED DOCUMENTS");
          setClaseTarifa((data.clase_tarifa as string) ?? "RCP");
          setPiezas(data.piezas ? String(data.piezas) : "");
          setPesoBruto(data.peso_bruto_kg ? String(data.peso_bruto_kg) : "");
          setPesoCargable(data.peso_cargable_kg ? String(data.peso_cargable_kg) : "");
          setTarifaPorKg(data.tarifa_por_kg ? String(data.tarifa_por_kg) : "");
          setDescripcion((data.descripcion_mercancia as string) ?? "AS PER CARGO CONSOLIDATED");
          setDimensiones((data.dimensiones as string) ?? "");
          setFleteTotal(data.flete_total ? String(data.flete_total) : "");
          setFsc(data.fsc ? String(data.fsc) : "");
          setDueCarrier(data.due_carrier ? String(data.due_carrier) : "");
          setCargoValuacion((data.cargo_valuacion as string) ?? "");
          setTax((data.tax as string) ?? "");
          setOtrosDueAgent(data.otros_due_agent ? String(data.otros_due_agent) : "");
          setOtrosDueCarrier(data.otros_due_carrier ? String(data.otros_due_carrier) : "");
          setTotalPrepaidVal(data.total_prepaid ? String(data.total_prepaid) : "");
          setFechaEjecucion((data.fecha_ejecucion as string) ?? "");
          setLugarEjecucion((data.lugar_ejecucion as string) || "BOGOTA - COLOMBIA");
          setEstado((data.estado as "BORRADOR"|"EMITIDA"|"ANULADA") ?? "BORRADOR");
          setEmitidoPor((data.emitido_por_nombre as string) ?? null);
          setEmitidoEn((data.emitido_en as string) ?? null);
          setAnuladoPor((data.anulado_por_nombre as string) ?? null);
          setAnuladoEn((data.anulado_en as string) ?? null);
          setAnuladoMotivo((data.anulado_motivo as string) ?? null);
        }).catch(() => {});
    }
  }, [operacionId, mawbId, isNuevo]);

  const editable = estado === "BORRADOR";

  async function guardar() {
    if (!sequential.trim()) { setError("Ingresa el número secuencial del MAWB"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        prefix: prefix || null,
        numero_mawb: mawbFull,
        consignee_id: consigneeId || null,
        shipper_account: shipperAccount || null,
        consignee_account: consigneeAccount || null,
        aerolinea_id: aerolineaId || null,
        aeropuerto_origen_id: aeropuertoOrigenId || null,
        aeropuerto_destino_id: aeropuertoDestinoId || null,
        vuelo: vuelo || null,
        fecha_vuelo: fechaVuelo || null,
        trm: trm ? parseFloat(trm) : null,
        agent_iata_code: agentIata || null,
        agent_account_no: agentAccount || null,
        tipo_pago_flete: tipoPagoFlete,
        tipo_pago_otros: tipoPagoOtros,
        moneda_flete: monedaFlete,
        valor_declarado_transporte: valDecTransporte,
        valor_declarado_aduana: valDecAduana,
        monto_seguro: montoSeguro || null,
        info_manejo: infoManejo || null,
        clase_tarifa: claseTarifa || null,
        piezas: piezas ? parseInt(piezas) : null,
        peso_bruto_kg: pesoBruto ? parseFloat(pesoBruto) : null,
        peso_cargable_kg: pesoCargable ? parseFloat(pesoCargable) : null,
        tarifa_por_kg: tarifaPorKg ? parseFloat(tarifaPorKg) : null,
        descripcion_mercancia: descripcion || null,
        dimensiones: dimensiones || null,
        flete_total: fleteCalc ? parseFloat(fleteCalc) : null,
        fsc: fsc ? parseFloat(fsc) : null,
        due_carrier: dueCarrier ? parseFloat(dueCarrier) : null,
        cargo_valuacion: cargoValuacion || null,
        tax: tax || null,
        otros_due_agent: otrosDueAgent ? parseFloat(otrosDueAgent) : null,
        otros_due_carrier: otrosDueCarrier ? parseFloat(otrosDueCarrier) : null,
        total_prepaid: totalPrepaidVal ? parseFloat(totalPrepaidVal) : null,
        fecha_ejecucion: fechaEjecucion || null,
        lugar_ejecucion: lugarEjecucion || null,
      };
      if (isNuevo) {
        await apiFetch(`/operaciones/operaciones/${operacionId}/mawbs`, { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/operaciones/operaciones/${operacionId}/mawbs/${mawbId}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      router.push(`/dashboard/operaciones/operaciones/${operacionId}?tab=mawb`);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function emitir() {
    setSaving(true); setError("");
    try {
      const d = await apiFetch<Record<string, unknown>>(`/operaciones/operaciones/${operacionId}/mawbs/${mawbId}/emitir`, { method: "POST" });
      setEstado("EMITIDA");
      setEmitidoPor((d.emitido_por_nombre as string) ?? null);
      setEmitidoEn((d.emitido_en as string) ?? null);
      setEmitirOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al emitir"); }
    finally { setSaving(false); }
  }

  async function anular() {
    if (!motivoAnular.trim()) { setError("Indica el motivo de anulación"); return; }
    setSaving(true); setError("");
    try {
      const d = await apiFetch<Record<string, unknown>>(`/operaciones/operaciones/${operacionId}/mawbs/${mawbId}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivoAnular }) });
      setEstado("ANULADA");
      setAnuladoPor((d.anulado_por_nombre as string) ?? null);
      setAnuladoEn((d.anulado_en as string) ?? null);
      setAnuladoMotivo(motivoAnular);
      setAnularOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al anular"); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", marginBottom: 12 }}>
        <div>
          <button onClick={() => router.push(`/dashboard/operaciones/operaciones/${operacionId}?tab=mawb`)}
            style={{ fontSize: 12, color: "#2563eb", fontWeight: 600, background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 6, padding: "3px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>←</span> {operacion?.numero ?? "Operación"} · MAWB
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
              {isNuevo ? "Nuevo MAWB" : `MAWB ${mawbFull}`}
            </span>
            {!isNuevo && (
              <span style={{ padding: "2px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                background: estado === "EMITIDA" ? "#dcfce7" : estado === "ANULADA" ? "#fee2e2" : "#f1f5f9",
                color: estado === "EMITIDA" ? "#15803d" : estado === "ANULADA" ? "#b91c1c" : "#475569" }}>
                {estado}
              </span>
            )}
          </div>
          {!isNuevo && estado === "EMITIDA" && emitidoPor && (
            <div style={{ fontSize: 10, color: "#15803d" }}>Emitido por {emitidoPor}{emitidoEn ? ` · ${emitidoEn.slice(0, 10)}` : ""}</div>
          )}
          {!isNuevo && estado === "ANULADA" && (
            <div style={{ fontSize: 10, color: "#b91c1c" }}>Anulado{anuladoPor ? ` por ${anuladoPor}` : ""}{anuladoEn ? ` · ${anuladoEn.slice(0, 10)}` : ""}{anuladoMotivo ? ` — ${anuladoMotivo}` : ""}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {error && <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>}
          {editable && (
            <button onClick={guardar} disabled={saving}
              style={{ padding: "4px 14px", background: saving ? "#64748b" : "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          )}
          {!isNuevo && (
            <button onClick={() => window.open(`/mawb/${operacionId}/${mawbId}`, "_blank")}
              style={{ padding: "4px 12px", background: "#111", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>
              Imprimir ↗
            </button>
          )}
          {!isNuevo && estado !== "ANULADA" && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen((o) => !o)} disabled={saving} title="Más acciones"
                style={{ padding: "4px 8px", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 15, lineHeight: 1, cursor: "pointer" }}>
                ⋮
              </button>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{ position: "absolute", right: 0, top: "115%", zIndex: 41, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 150, overflow: "hidden" }}>
                    {estado === "BORRADOR" && (
                      <button onClick={() => { setMenuOpen(false); setError(""); setEmitirOpen(true); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#15803d", background: "none", border: "none", cursor: "pointer" }}>
                        Emitir
                      </button>
                    )}
                    <button onClick={() => { setMenuOpen(false); setError(""); setMotivoAnular(""); setAnularOpen(true); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, color: "#b91c1c", background: "none", border: "none", borderTop: estado === "BORRADOR" ? "1px solid #f1f5f9" : "none", cursor: "pointer" }}>
                      Anular
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal emitir */}
      {emitirOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 22, width: 340, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>Emitir MAWB</div>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>¿Confirmas la emisión de <b>{mawbFull}</b>? Quedará registrado tu usuario y la fecha. Una vez emitido no se puede editar.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEmitirOpen(false)} style={{ padding: "5px 14px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={emitir} disabled={saving} style={{ padding: "5px 16px", background: "#15803d", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{saving ? "Emitiendo..." : "Emitir"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal anular */}
      {anularOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 22, width: 360, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>Anular MAWB</div>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>Indica el motivo de la anulación de <b>{mawbFull}</b>. Quedará registrado tu usuario y la fecha.</p>
            <textarea value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} rows={3} placeholder="Motivo…"
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, padding: 8, marginBottom: 12, resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setAnularOpen(false)} style={{ padding: "5px 14px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, background: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={anular} disabled={saving} style={{ padding: "5px 16px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{saving ? "Anulando..." : "Anular"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TABLA AWB */}
      <div style={{ padding: "0 8px 24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            {Array.from({ length: 20 }, (_, i) => <col key={i} style={{ width: "5%" }} />)}
          </colgroup>
          <tbody>

            {/* ── Fila 1: MAWB número ─────────────────────────────────── */}
            <tr>
              <td colSpan={1} style={S.td({ borderRight: "none" })}>
                <span style={S.lbl}>Prefix *</span>
                <input value={prefix} onChange={(e) => editable && setPrefix(e.target.value)}
                  readOnly={!editable} style={{ ...iEdit, fontSize: "16px", fontWeight: 700 }} />
              </td>
              <td colSpan={4} style={S.td({ borderLeft: "none", borderRight: "2px solid #000" })}>
                <span style={S.lbl}>Master AWB Number — asignado por la aerolínea *</span>
                <input value={sequential} onChange={(e) => editable && setSeq(e.target.value)}
                  readOnly={!editable} placeholder="Número secuencial"
                  style={{ ...iEdit, fontSize: "16px", fontWeight: 700 }} />
              </td>
              <td colSpan={7} style={{ border: "1px solid #000", borderLeft: "none" }} />
              <td colSpan={8} style={S.td({ textAlign: "right", borderLeft: "2px solid #000", background: "#1e3a8a", padding: "2px 4px" })}>
                <span style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, color: "#bfdbfe", textAlign: "right", display: "block" }}>
                  Master Air Waybill
                </span>
                <div style={{ color: "#fff", fontSize: "16px", fontWeight: 800, lineHeight: 1.2, textAlign: "right" }}>
                  {mawbFull || "—"}
                </div>
              </td>
            </tr>

            {/* ── Fila 2: Shipper (fijo) + Legal ──────────────────────── */}
            <tr>
              <td colSpan={11} style={S.td({ minHeight: 56, background: "#f9fafb" })}>
                <TerceroField label="Shipper's Name and Address — Siempre Universal Cargo"
                  nombre="UNIVERSAL CARGO COLOMBIA SAS"
                  detalle={<>NIT: 901.702.367 · CRA 106 # 15a - 25 mzn 24 BOD 145<br />julian.fontecha@universalcargo.com.co · TEL: 314 3045776 · BOGOTA-COLOMBIA</>}
                />
                <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>Dato fijo</div>
              </td>
              <td colSpan={3} style={S.td({ background: "#f9fafb" })}>
                <span style={S.lbl}>Shipper's Acct. #</span>
                <input value={shipperAccount} onChange={(e) => editable && setShipperAccount(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="—" />
              </td>
              <td colSpan={6} rowSpan={3} style={S.td({ background: "#fafafa", fontSize: "9px", color: "#9ca3af", lineHeight: 1.4 })}>
                <div style={{ fontWeight: 800, fontSize: "10px", textAlign: "center", color: "#374151", marginBottom: 2 }}>Not Negotiable</div>
                <div style={{ fontWeight: 700, textAlign: "center", color: "#374151", marginBottom: 4 }}>Air Waybill · Issued by</div>
                <div>Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.</div>
              </td>
            </tr>

            {/* ── Fila 3: Consignee (agente destino) ──────────────────── */}
            <tr>
              <td colSpan={11} style={S.td({ minHeight: 56 })}>
                <BusquedaTercero label="Consignee's Name and Address — Agente destino *"
                  display={consigneeNombre}
                  onSelect={(id, nombre, detalle) => { setConsigneeId(id); setConsigneeNombre(nombre); setConsigneeDetalle(detalle); }} />
                {consigneeNombre && <div style={S.valSm}>{consigneeDetalle}</div>}
              </td>
              <td colSpan={3} style={S.td()}>
                <span style={S.lbl}>Consignee's Acct. #</span>
                <input value={consigneeAccount} onChange={(e) => editable && setConsigneeAccount(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="—" />
              </td>
            </tr>

            {/* ── Fila 4: Issuing Agent (fijo) ─────────────────────────── */}
            <tr>
              <td colSpan={14} style={S.td({ background: "#f9fafb" })}>
                <TerceroField label="Issuing Carrier's Agent Name and City"
                  nombre="UNIVERSAL CARGO COLOMBIA S.A.S"
                  detalle={<>NIT: 901.702.367 · CRA 106 # 15a - 25 mzn 24 BOD 143<br />julian.fontecha@universalcargo.com.co · TEL: 314 3045776 · BOGOTA-COLOMBIA</>}
                />
              </td>
              <td colSpan={6} style={S.td({ background: "#fafafa" })} />
            </tr>

            {/* ── Fila 5: Agent IATA / TRM ─────────────────────────────── */}
            <tr>
              <td colSpan={4} style={S.td()}>
                <span style={S.lbl}>Agent's IATA Code</span>
                <input value={agentIata} onChange={(e) => editable && setAgentIata(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="—" />
              </td>
              <td colSpan={4} style={S.td()}>
                <span style={S.lbl}>Account No.</span>
                <input value={agentAccount} onChange={(e) => editable && setAgentAccount(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="—" />
              </td>
              <td colSpan={12} style={S.td()}>
                <span style={S.lbl}>Accounting Information — TRM</span>
                <input value={trm} onChange={(e) => editable && setTrm(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="3.974,37" />
              </td>
            </tr>

            {/* ── Fila 6: Airport of Departure label ──────────────────── */}
            <tr>
              <td colSpan={20} style={S.td({ padding: "1px 4px", background: "#f0f4ff" })}>
                <span style={S.lbl}>Airport of Departure (Addr. of First Carrier) and Requested Routing</span>
              </td>
            </tr>

            {/* ── Fila 7: Routing ──────────────────────────────────────── */}
            <tr>
              <td colSpan={5} style={S.td()}>
                <span style={S.lbl}>Airport of Departure</span>
                <Sel value={aeropuertoOrigenId} onChange={editable ? setAerOpId : undefined}>
                  <option value="">— Seleccionar —</option>
                  {aeropuertos.map((a) => <option key={a.id} value={a.id}>{a.codigo_iata} — {a.ciudad}</option>)}
                </Sel>
                {aerOrigenInfo && <div style={S.valSm}>{aerOrigenInfo.nombre}</div>}
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}>
                <span style={S.lbl}>To</span>
                <div style={{ ...S.valBold, fontSize: "12px", color: "#1d4ed8" }}>
                  {aerDestinoInfo?.codigo_iata ?? "—"}
                </div>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <span style={S.lbl}>By First Carrier</span>
                <Sel value={aerolineaId} onChange={editable ? setAerolineaId : undefined}>
                  <option value="">—</option>
                  {aerolineas.map((a) => <option key={a.id} value={a.id}>{a.codigo_iata} — {a.nombre}</option>)}
                </Sel>
                {aerolineaInfo && <div style={S.valSm}>{aerolineaInfo.nombre}</div>}
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}>
                <span style={S.lbl}>Currency</span>
                <Sel value={monedaFlete} onChange={editable ? setMonedaFlete : undefined}>
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                </Sel>
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>CHGS</span></td>
              <td colSpan={1} style={S.td()}>
                <span style={S.lbl}>WT/VAL</span>
                <div style={{ display: "flex", gap: 4, fontSize: "9px" }}>
                  <label><input type="radio" checked={tipoPagoFlete === "PPD"} onChange={() => editable && setTipoPagoFlete("PPD")} /> PPD</label>
                  <label><input type="radio" checked={tipoPagoFlete === "COLL"} onChange={() => editable && setTipoPagoFlete("COLL")} /> COLL</label>
                </div>
              </td>
              <td colSpan={1} style={S.td()}>
                <span style={S.lbl}>Other</span>
                <div style={{ display: "flex", gap: 4, fontSize: "9px" }}>
                  <label><input type="radio" checked={tipoPagoOtros === "PPD"} onChange={() => editable && setTipoPagoOtros("PPD")} /> PPD</label>
                  <label><input type="radio" checked={tipoPagoOtros === "COLL"} onChange={() => editable && setTipoPagoOtros("COLL")} /> COLL</label>
                </div>
              </td>
              <td colSpan={2} style={S.td()}>
                <span style={S.lbl}>Declared Value for Carriage</span>
                <input value={valDecTransporte} onChange={(e) => editable && setValDecTransporte(e.target.value)}
                  readOnly={!editable} style={iEdit} />
              </td>
              <td colSpan={2} style={S.td()}>
                <span style={S.lbl}>Declared Value for Customs</span>
                <input value={valDecAduana} onChange={(e) => editable && setValDecAduana(e.target.value)}
                  readOnly={!editable} style={iEdit} />
              </td>
            </tr>

            {/* ── Fila 8: Destino / Vuelo ──────────────────────────────── */}
            <tr>
              <td colSpan={6} style={S.td()}>
                <span style={S.lbl}>Airport of Destination</span>
                <Sel value={aeropuertoDestinoId} onChange={editable ? setAerDestId : undefined}>
                  <option value="">— Seleccionar —</option>
                  {aeropuertos.map((a) => <option key={a.id} value={a.id}>{a.codigo_iata} — {a.ciudad}</option>)}
                </Sel>
                {aerDestinoInfo && <div style={S.valSm}>{aerDestinoInfo.nombre}</div>}
              </td>
              <td colSpan={3} style={S.td()}>
                <span style={S.lbl}>Flight / Date</span>
                <div style={{ display: "flex", gap: 3 }}>
                  <input value={vuelo} onChange={(e) => editable && setVuelo(e.target.value)}
                    readOnly={!editable} placeholder="CM 470" style={{ ...iEdit, width: "45%" }} />
                  <input type="date" value={fechaVuelo} onChange={(e) => editable && setFechaVuelo(e.target.value)}
                    readOnly={!editable} style={{ ...iEdit, width: "55%" }} />
                </div>
              </td>
              <td colSpan={3} style={S.td()}><span style={S.lbl}>For Carrier Use Only</span></td>
              <td colSpan={3} style={S.td()}><span style={S.lbl}>Flight / Date</span></td>
              <td colSpan={5} style={S.td()}>
                <span style={S.lbl}>Amount of Insurance</span>
                <input value={montoSeguro} onChange={(e) => editable && setMontoSeguro(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="Blank o monto USD" />
              </td>
            </tr>

            {/* ── Fila 9: Handling ─────────────────────────────────────── */}
            <tr>
              <td colSpan={20} style={S.td()}>
                <span style={S.lbl}>Handling Information</span>
                <input value={infoManejo} onChange={(e) => editable && setInfoManejo(e.target.value)}
                  readOnly={!editable} style={{ ...iEdit, fontWeight: 700, fontSize: "12px" }} />
              </td>
            </tr>

            {/* ── Fila 10: Header cargo ────────────────────────────────── */}
            <tr style={{ background: "#f0f4ff" }}>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>No. Pzs<br />RCP</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Gross<br />Weight</span></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.section}>kg</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Rate Class</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Chargeable<br />Weight</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Rate / kg</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Total<br />Charge</span></td>
              <td colSpan={7} style={S.td()}><span style={S.section}>Nature and Quantity of Goods (incl. Dimensions)</span></td>
            </tr>

            {/* ── Fila 11: Datos cargo ─────────────────────────────────── */}
            <tr style={{ minHeight: 44 }}>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input value={piezas} onChange={(e) => editable && setPiezas(e.target.value)}
                  readOnly={!editable} style={{ ...iAuto, textAlign: "center", fontSize: "14px", fontWeight: 700 }} />
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input value={pesoBruto} onChange={(e) => editable && setPesoBruto(e.target.value)}
                  readOnly={!editable} placeholder="kg bruto" style={{ ...iEdit, textAlign: "center", fontSize: "13px", fontWeight: 700 }} />
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>KG</span>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <Sel value={claseTarifa} onChange={editable ? setClaseTarifa : undefined}>
                  <option value="RCP">RCP</option>
                  <option value="Q">Q</option>
                  <option value="M">M</option>
                  <option value="N">N</option>
                </Sel>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input value={pesoCargable} onChange={(e) => editable && setPesoCargable(e.target.value)}
                  readOnly={!editable} style={{ ...iAuto, textAlign: "center", fontSize: "14px", fontWeight: 700 }} />
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input value={tarifaPorKg} onChange={(e) => editable && setTarifaPorKg(e.target.value)}
                  readOnly={!editable} placeholder="1,65" style={{ ...iEdit, textAlign: "center", fontWeight: 700 }} />
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb" }}>
                  {fleteCalc ? Number(fleteCalc).toLocaleString("es-CO", { minimumFractionDigits: 2 }) : "—"}
                </div>
                <div style={{ fontSize: 9, color: "#93c5fd" }}>calculado</div>
              </td>
              <td colSpan={7} style={S.td()}>
                <input value={descripcion} onChange={(e) => editable && setDescripcion(e.target.value)}
                  readOnly={!editable} style={{ ...iEdit, fontWeight: 700, fontSize: "12px" }} />
                <input value={dimensiones} onChange={(e) => editable && setDimensiones(e.target.value)}
                  readOnly={!editable} placeholder="Dim: 40*30*30 = 12" style={{ ...iEdit, marginTop: 2 }} />
              </td>
            </tr>

            {/* ── Fila 12: Totales cargo ───────────────────────────────── */}
            <tr style={{ background: "#f8fafc" }}>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>{piezas || "—"}</div></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>{pesoBruto || "—"}</div></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><div style={S.valBold}>KG</div></td>
              <td colSpan={2} style={S.td()} /><td colSpan={2} style={S.td()} /><td colSpan={2} style={S.td()} />
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb" }}>
                  {fleteCalc ? Number(fleteCalc).toLocaleString("es-CO", { minimumFractionDigits: 2 }) : "—"}
                </div>
              </td>
              <td colSpan={7} style={S.td()} />
            </tr>

            {/* ── Cargos header ────────────────────────────────────────── */}
            <tr style={{ background: "#f0f4ff" }}>
              <td colSpan={4} style={S.td({ textAlign: "center" })}><span style={S.section}>Prepaid</span></td>
              <td colSpan={8} style={S.td()}><span style={S.section}>Weight Charge</span></td>
              <td colSpan={4} style={S.td({ textAlign: "center" })}><span style={S.section}>Collect</span></td>
              <td colSpan={4} style={S.td()}><span style={S.section}>Other Charges</span></td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td({ textAlign: "center" })}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb" }}>
                  {fleteCalc ? Number(fleteCalc).toLocaleString("es-CO", { minimumFractionDigits: 2 }) : "—"}
                </div>
              </td>
              <td colSpan={8} style={S.td()}><input style={iEdit} placeholder="—" /></td>
              <td colSpan={4} style={S.td()} />
              <td colSpan={4} style={S.td()}>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 2 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#555", whiteSpace: "nowrap" as const }}>F.S:</span>
                    <input value={fsc} onChange={(e) => editable && setFsc(e.target.value)}
                      readOnly={!editable} placeholder="FSC USD" style={iEdit} />
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#555", whiteSpace: "nowrap" as const }}>Due carrier:</span>
                    <input value={dueCarrier} onChange={(e) => editable && setDueCarrier(e.target.value)}
                      readOnly={!editable} placeholder="25,00" style={iEdit} />
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td()} />
              <td colSpan={8} style={S.td()}>
                <span style={S.lbl}>Valuation Charge</span>
                <input value={cargoValuacion} onChange={(e) => editable && setCargoValuacion(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="—" />
              </td>
              <td colSpan={4} style={S.td()} />
              <td colSpan={4} style={S.td({ fontSize: "9px", color: "#777", lineHeight: 1.4 })}>
                We certify that we know the exporter as a serious and responsible entity
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td()}>
                <span style={S.lbl}>Total Other Charges Due Agent</span>
                <input value={otrosDueAgent} onChange={(e) => editable && setOtrosDueAgent(e.target.value)}
                  readOnly={!editable} type="number" step="0.01" placeholder="0.00"
                  style={{ ...iEdit, textAlign: "right", fontWeight: 700, color: "#2563eb" }} />
              </td>
              <td colSpan={8} style={S.td()}>
                <span style={S.lbl}>Tax</span>
                <input value={tax} onChange={(e) => editable && setTax(e.target.value)}
                  readOnly={!editable} style={iEdit} placeholder="—" />
              </td>
              <td colSpan={4} style={S.td()} />
              <td colSpan={4} rowSpan={2} style={S.td({ fontSize: "9px", color: "#aaa", lineHeight: 1.5 })}>
                Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described.
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td()}>
                <span style={S.lbl}>Total Other Charges Due Carrier</span>
                <input value={otrosDueCarrier} onChange={(e) => editable && setOtrosDueCarrier(e.target.value)}
                  readOnly={!editable} type="number" step="0.01" placeholder="0.00"
                  style={{ ...iEdit, textAlign: "right", fontWeight: 700, color: "#2563eb" }} />
              </td>
              <td colSpan={8} style={S.td()} />
              <td colSpan={4} style={S.td({ fontSize: 9, color: "#aaa", verticalAlign: "bottom" })}>Signature of Shipper or his Agent</td>
            </tr>

            {/* ── Total Prepaid ────────────────────────────────────────── */}
            <tr>
              <td colSpan={4} style={S.td()}>
                <span style={S.lbl}>Total Prepaid</span>
                <input value={totalPrepaidVal} onChange={(e) => editable && setTotalPrepaidVal(e.target.value)}
                  readOnly={!editable} type="number" step="0.01" placeholder="0.00"
                  style={{ ...iEdit, textAlign: "right", fontSize: 14, fontWeight: 700, color: "#2563eb" }} />
              </td>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Collect</span></td>
              <td colSpan={12} style={S.td()} />
            </tr>

            {/* ── Execution ────────────────────────────────────────────── */}
            <tr>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>Currency Conversion Rates</span></td>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>CC Charges in Dest. Currency</span></td>
              <td colSpan={12} style={S.td({ background: "#f9fafb" })}>
                <span style={S.lbl}>Executed on (date) / at (place)</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="date" value={fechaEjecucion} onChange={(e) => editable && setFechaEjecucion(e.target.value)}
                    readOnly={!editable} style={{ ...iEdit, width: "auto", flex: "0 0 130px" }} />
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>—</span>
                  <input value={lugarEjecucion} onChange={(e) => editable && setLugarEjecucion(e.target.value)}
                    readOnly={!editable} style={{ ...iEdit, flex: 1 }} placeholder="Ciudad de emisión" />
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={10} style={S.td()}><span style={S.lbl}>Charges at Destination</span></td>
              <td colSpan={10} style={S.td()}><span style={S.lbl}>Total Collect Charges</span></td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
