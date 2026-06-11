"use client";

// MOCK — Formulario HAWB en layout idéntico al documento impreso
// Misma tabla, mismas proporciones — inputs dentro de las celdas

import { useState } from "react";

const LEGAL = "It is agreed that the goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE SHIPPER'S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER'S LIMITATION OF LIABILITY.";

// ── Estilos base ────────────────────────────────────────────────────────────

const S = {
  td: (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #000", verticalAlign: "top", padding: "2px 4px", ...extra,
  }),
  lbl: { fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#555", lineHeight: 1.2, display: "block", marginBottom: 1 },
  val: { fontSize: "11px", lineHeight: 1.3 },
  valBold: { fontSize: "11px", fontWeight: 700, lineHeight: 1.3 },
  valSm: { fontSize: "9px", lineHeight: 1.3, color: "#222" },
  section: { fontSize: "8px", fontWeight: 700, textTransform: "uppercase" as const, color: "#555", letterSpacing: "0.04em" },
};

// Input editable dentro de celda
const iEdit: React.CSSProperties = {
  border: "none", borderBottom: "1px solid #9ca3af", background: "transparent",
  width: "100%", fontSize: "11px", lineHeight: 1.3, padding: 0,
  outline: "none", fontFamily: "inherit", color: "#111",
};

// Input heredado de cotización (azul, solo lectura)
const iAuto: React.CSSProperties = {
  border: "none", borderBottom: "1px solid #93c5fd",
  background: "rgba(219,234,254,0.25)", width: "100%",
  fontSize: "11px", lineHeight: 1.3, padding: 0,
  outline: "none", fontFamily: "inherit", color: "#1d4ed8", fontWeight: 700,
};

// Select dentro de celda
function Sel({ value, auto, children }: { value?: string; auto?: boolean; children: React.ReactNode }) {
  return (
    <select defaultValue={value}
      style={{ ...iEdit, ...(auto ? iAuto : {}), cursor: "pointer", appearance: "none" as const }}>
      {children}
    </select>
  );
}

// Campo con label de sección
function F({ label, value, auto, placeholder, multiline, rows }: {
  label?: string; value?: string; auto?: boolean; placeholder?: string; multiline?: boolean; rows?: number;
}) {
  return (
    <>
      {label && <span style={S.lbl}>{label}</span>}
      {multiline
        ? <textarea defaultValue={value} placeholder={placeholder} rows={rows ?? 2}
            style={{ ...iEdit, ...(auto ? iAuto : {}), resize: "none", display: "block" }} />
        : <input defaultValue={value} placeholder={placeholder} readOnly={auto}
            style={{ ...iEdit, ...(auto ? iAuto : {}) }} />
      }
    </>
  );
}

// Bloque tercero con búsqueda + datos del registro
function TerceroField({ label, nombre, detalle }: { label: string; nombre: string; detalle: React.ReactNode }) {
  return (
    <>
      <span style={S.lbl}>{label}</span>
      <input defaultValue={nombre} placeholder="Buscar por NIT o nombre..."
        style={{ ...iEdit, fontWeight: 700, fontSize: "8pt", marginBottom: 1 }} />
      <div style={{ ...S.valSm, color: "#374151" }}>{detalle}</div>
    </>
  );
}

export default function HawbMockForm() {
  const [saving, setSaving] = useState(false);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Nuevo HAWB</div>
          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>
            <span style={{ color: "#3b82f6" }}>■</span> Azul = heredado de cotización &nbsp;|&nbsp; Negro = captura manual
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ padding: "4px 12px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "#fff" }}>
            Cancelar
          </button>
          <button onClick={() => setSaving(true)}
            style={{ padding: "4px 14px", background: saving ? "#64748b" : "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Guardando..." : "Guardar HAWB"}
          </button>
          <button style={{ padding: "4px 12px", background: "#111", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Imprimir ↗
          </button>
        </div>
      </div>

      {/* TABLA — mismo grid que el impreso */}
      <div style={{ padding: "0 8px 24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
            <col style={{ width: "5%" }}/><col style={{ width: "5%" }}/>
          </colgroup>
          <tbody>

            {/* ── FILA 1: MAWB ref + HAWB número ─────────────────────── */}
            <tr>
              <td colSpan={1} style={S.td({ borderRight: "none" })}>
                <span style={S.lbl}>Prefix</span>
                <div style={{ fontSize: "18pt", fontWeight: 700, color: "#1d4ed8", lineHeight: 1 }}>230</div>
                <div style={{ fontSize: "5pt", color: "#93c5fd" }}>Del MAWB</div>
              </td>
              <td colSpan={4} style={S.td({ borderLeft: "none", borderRight: "2px solid #000" })}>
                <span style={S.lbl}>Master AWB Number</span>
                <div style={{ fontSize: "18pt", fontWeight: 700, color: "#1d4ed8", lineHeight: 1 }}>66458383</div>
                <div style={{ fontSize: "5pt", color: "#93c5fd" }}>Del MAWB</div>
              </td>
              <td colSpan={4} style={S.td({ borderLeft: "none" })}>
                <span style={S.lbl}>MAWB vinculado *</span>
                <Sel value="230-66458383" auto>
                  <option>230-66458383 — COPA / SAL</option>
                  <option>— Seleccionar —</option>
                </Sel>
              </td>
              <td colSpan={3} style={{ border: "1px solid #000", borderLeft: "none" }} />
              <td colSpan={8} style={S.td({ textAlign: "right", borderLeft: "2px solid #000", background: "#1e3a8a", padding: "2px 4px" })}>
                <span style={{ ...S.lbl, color: "#bfdbfe", textAlign: "right" }}>House Air Waybill</span>
                <input defaultValue="UCCEA2025050" placeholder="UCCEA2025XXX"
                  style={{ background: "transparent", border: "none", borderBottom: "1px solid #60a5fa", color: "#fff", fontSize: "18pt", fontWeight: 800, width: "100%", textAlign: "right", outline: "none", fontFamily: "inherit", lineHeight: 1 }} />
              </td>
            </tr>

            {/* ── FILA 2: Shipper + Legal ──────────────────────────────── */}
            <tr>
              <td colSpan={12} style={S.td({ minHeight: 52 })}>
                <TerceroField label="Shipper's Name and Address *"
                  nombre="CENTAK ANDINA SAS"
                  detalle={<>NIT 830090909-5<br />AV CL 24 95 - 12 BODEGA 14<br />servicioalcliente@centakandina.com · Tel: (601) 4284451<br />BOGOTA - COLOMBIA</>}
                />
              </td>
              <td colSpan={2} style={S.td()}>
                <F label="Shipper's Account #" placeholder="—" />
              </td>
              <td colSpan={6} rowSpan={3} style={S.td({ background: "#fafafa" })}>
                <div style={{ fontWeight: 800, fontSize: "10pt", textAlign: "center", marginBottom: 1 }}>Not Negotiable</div>
                <div style={{ fontWeight: 700, fontSize: "8pt", textAlign: "center", marginBottom: 1 }}>Air Waybill · Issued by</div>
                <div style={{ fontSize: "4.5pt", color: "#777", lineHeight: 1.4, marginBottom: 3 }}>
                  Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.
                </div>
                <div style={{ fontSize: "3.8pt", color: "#aaa", lineHeight: 1.5 }}>{LEGAL}</div>
              </td>
            </tr>

            {/* ── FILA 3: Consignee ────────────────────────────────────── */}
            <tr>
              <td colSpan={12} style={S.td({ minHeight: 52 })}>
                <TerceroField label="Consignee's Name and Address *"
                  nombre="MATRICERIA INDUSTRIAL ROXY, S.A. DE C.V."
                  detalle={<>TAX 0614-271176-001-9 · Postal Code: 1101<br />CARR. TRONCAL DEL NORTE KM. 7 1/2, CIUDAD DELGADO<br />Phone: +503 2298-1081<br />SAN SALVADOR - EL SALVADOR</>}
                />
              </td>
              <td colSpan={2} style={S.td()}>
                <F label="Consignee's Account #" placeholder="—" />
              </td>
            </tr>

            {/* ── FILA 4: Issuing Agent (fijo) ─────────────────────────── */}
            <tr>
              <td colSpan={14} style={S.td({ background: "#f9fafb" })}>
                <span style={S.lbl}>Issuing Carrier's Agent Name and City</span>
                <div style={{ ...S.valBold }}>UNIVERSAL CARGO COLOMBIA S.A.S</div>
                <div style={S.valSm}>NIT: 901.702.367 · CRA 106 # 15a - 25 mzn 24 BOD 143</div>
                <div style={S.valSm}>julian.fontecha@universalcargo.com.co · TEL: 314 3045776 · BOGOTA-COLOMBIA</div>
              </td>
              <td colSpan={6} style={S.td({ background: "#fafafa" })} />
            </tr>

            {/* ── FILA 5: Agent IATA / Account / Accounting Info (TRM) ─── */}
            <tr>
              <td colSpan={4} style={S.td()}>
                <F label="Agent's IATA Code" placeholder="—" />
              </td>
              <td colSpan={4} style={S.td()}>
                <F label="Account No." placeholder="—" />
              </td>
              <td colSpan={12} style={S.td()}>
                <span style={S.lbl}>Accounting Information — TRM</span>
                <input defaultValue="3.974,37" style={{ ...iAuto, fontSize: "9pt" }} />
              </td>
            </tr>

            {/* ── FILA 6: Airport of Departure label ──────────────────── */}
            <tr>
              <td colSpan={20} style={S.td({ padding: "1px 4px", background: "#f0f4ff" })}>
                <span style={S.lbl}>Airport of Departure (Addr. of First Carrier) and Requested Routing</span>
              </td>
            </tr>

            {/* ── FILA 7: Routing ──────────────────────────────────────── */}
            <tr>
              <td colSpan={5} style={S.td()}>
                <span style={S.lbl}>Airport of Departure ⚠</span>
                <Sel value="BOG">
                  <option value="BOG">BOG — EL DORADO BOGOTA</option>
                  <option value="MDE">MDE — MEDELLÍN RIONEGRO</option>
                  <option value="CLO">CLO — CALI ALFONSO BONILLA</option>
                </Sel>
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}>
                <span style={S.lbl}>To</span>
                <input defaultValue="SAL" style={{ ...iAuto, textAlign: "center", fontSize: "9pt" }} />
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <span style={S.lbl}>By First Carrier</span>
                <input defaultValue="COPA" style={{ ...iAuto, textAlign: "center", fontSize: "9pt" }} />
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span><input style={iEdit} /></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span><input style={iEdit} /></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span><input style={iEdit} /></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span><input style={iEdit} /></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}>
                <span style={S.lbl}>Currency</span>
                <input defaultValue="USD" style={{ ...iAuto, textAlign: "center" }} />
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>CHGS</span></td>
              <td colSpan={1} style={S.td()}>
                <span style={S.lbl}>WT/VAL</span>
                <div style={{ display: "flex", gap: 4, fontSize: "7pt" }}>
                  <label><input type="radio" name="wt" defaultChecked /> PPD</label>
                  <label><input type="radio" name="wt" /> COLL</label>
                </div>
              </td>
              <td colSpan={1} style={S.td()}>
                <span style={S.lbl}>Other</span>
                <div style={{ display: "flex", gap: 4, fontSize: "7pt" }}>
                  <label><input type="radio" name="oth" defaultChecked /> PPD</label>
                  <label><input type="radio" name="oth" /> COLL</label>
                </div>
              </td>
              <td colSpan={2} style={S.td()}>
                <F label="Declared Value for Carriage" value="NVD" placeholder="NVD o monto" />
              </td>
              <td colSpan={2} style={S.td()}>
                <F label="Declared Value for Customs" value="NVD" placeholder="NVD o monto" />
              </td>
            </tr>

            {/* ── FILA 8: Destino / Vuelo / Insurance ─────────────────── */}
            <tr>
              <td colSpan={6} style={S.td()}>
                <span style={S.lbl}>Airport of Destination ⚠</span>
                <Sel value="SAL">
                  <option value="SAL">SAL — Aeropuerto Internacional del Salvador</option>
                  <option value="GUA">GUA — Ciudad de Guatemala</option>
                  <option value="MIA">MIA — Miami International</option>
                </Sel>
              </td>
              <td colSpan={3} style={S.td()}>
                <span style={S.lbl}>Flight / Date</span>
                <div style={{ display: "flex", gap: 3 }}>
                  <input defaultValue="CM 470" placeholder="Vuelo" style={{ ...iEdit, width: "50%" }} />
                  <input defaultValue="07-JUL-25" placeholder="Fecha" style={{ ...iEdit, width: "50%" }} />
                </div>
              </td>
              <td colSpan={3} style={S.td()}><span style={S.lbl}>For Carrier Use Only</span></td>
              <td colSpan={3} style={S.td()}><span style={S.lbl}>Flight / Date</span></td>
              <td colSpan={5} style={S.td()}>
                <F label="Amount of Insurance" placeholder="Blank o monto USD" />
                <div style={{ fontSize: "5pt", color: "#aaa", lineHeight: 1.3 }}>INSURANCE – if carrier offers insurance.</div>
              </td>
            </tr>

            {/* ── FILA 9: Handling ─────────────────────────────────────── */}
            <tr>
              <td colSpan={20} style={S.td()}>
                <span style={S.lbl}>Handling Information</span>
                <input defaultValue="ATTACHED ENVELOPED DOCUMENTS" placeholder="Instrucciones de manejo..."
                  style={{ ...iEdit, fontWeight: 700, fontSize: "8pt" }} />
              </td>
            </tr>

            {/* ── FILA 10: Header tabla cargo ──────────────────────────── */}
            <tr style={{ background: "#f0f4ff" }}>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>No. of<br />Pieces<br />RCP</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Gross<br />Weight</span></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.section}>kg<br />lb</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <span style={S.section}>Rate<br />Class</span>
                <span style={{ fontSize: "4.5pt", color: "#888", display: "block" }}>Commodity<br />Item No.</span>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Chargeable<br />Weight</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Rate</span></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><span style={S.section}>Total<br />Charge</span></td>
              <td colSpan={7} style={S.td()}><span style={S.section}>Nature and Quantity of Goods (incl. Dimensions or Volume)</span></td>
            </tr>

            {/* ── FILA 11: Datos cargo ─────────────────────────────────── */}
            <tr style={{ height: 42 }}>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input defaultValue="12" style={{ ...iAuto, textAlign: "center", fontSize: "11pt", fontWeight: 700 }} />
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input defaultValue="181" placeholder="kg" style={{ ...iEdit, textAlign: "center", fontSize: "11pt", fontWeight: 700 }} />
                <div style={{ fontSize: "5pt", color: "#aaa", textAlign: "center" }}>bruto</div>
              </td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}>
                <div style={{ fontSize: "9pt", fontWeight: 700 }}>KG</div>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <Sel value="RCP">
                  <option value="RCP">RCP</option>
                  <option value="Q">Q</option>
                  <option value="M">M</option>
                  <option value="N">N</option>
                  <option value="C">C</option>
                </Sel>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input defaultValue="181" style={{ ...iAuto, textAlign: "center", fontSize: "11pt", fontWeight: 700 }} />
                <div style={{ fontSize: "5pt", color: "#93c5fd", textAlign: "center" }}>cargable</div>
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input defaultValue="AS AGREED" placeholder="AS AGREED o tarifa" style={iEdit} />
              </td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}>
                <input defaultValue="AS AGREED" style={{ ...iEdit, fontWeight: 700 }} />
              </td>
              <td colSpan={7} style={S.td()}>
                <div style={{ fontSize: "6.5pt", color: "#555", marginBottom: 1 }}>SAID TO CONTAIN:</div>
                <input defaultValue="MATERIAL PARA SELLADO DE ENVASE" placeholder="Descripción de la carga..."
                  style={{ ...iEdit, fontWeight: 700, fontSize: "8pt" }} />
                <input defaultValue="DIM: 40*30*30 = 12" placeholder="Dimensiones..."
                  style={{ ...iEdit, marginTop: 2 }} />
              </td>
            </tr>

            {/* ── FILA 12: Totales cargo ───────────────────────────────── */}
            <tr style={{ background: "#f8fafc" }}>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>12</div></td>
              <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>181</div></td>
              <td colSpan={1} style={S.td({ textAlign: "center" })}><div style={S.valBold}>KG</div></td>
              <td colSpan={2} style={S.td()} />
              <td colSpan={2} style={S.td()} />
              <td colSpan={2} style={S.td()} />
              <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>AS AGREED</div></td>
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
                <input defaultValue="AS AGREED" placeholder="Monto prepago" style={{ ...iEdit, textAlign: "center", fontWeight: 700 }} />
              </td>
              <td colSpan={8} style={S.td()}><input style={iEdit} placeholder="—" /></td>
              <td colSpan={4} style={S.td()} />
              <td colSpan={4} style={S.td()}>
                <textarea defaultValue={"FSC: USD 45,25"} rows={2}
                  style={{ ...iEdit, resize: "none", display: "block" }}
                  placeholder={"FSC: USD 45.25\nOtros cargos..."} />
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td()} />
              <td colSpan={8} style={S.td()}>
                <span style={S.lbl}>Valuation Charge</span>
                <input style={iEdit} placeholder="—" />
              </td>
              <td colSpan={4} style={S.td()} />
              <td colSpan={4} style={S.td({ fontSize: "5pt", color: "#777", lineHeight: 1.4 })}>
                We certify that we know the exporter as a serious and responsible entity
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Other Charges Due Agent</span><div style={{ color: "#2563eb", fontSize: "7pt", fontWeight: 700 }}>Calculado</div></td>
              <td colSpan={8} style={S.td()}><span style={S.lbl}>Tax</span><input style={iEdit} placeholder="—" /></td>
              <td colSpan={4} style={S.td()} />
              <td colSpan={4} rowSpan={2} style={S.td({ fontSize: "4pt", color: "#aaa", lineHeight: 1.5 })}>
                Shipper certifies that the particulars on the face hereof are correct and that insofar as
                any part of the consignment contains dangerous goods, such part is properly described by
                name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Other Charges Due Carrier</span><div style={{ color: "#2563eb", fontSize: "7pt", fontWeight: 700 }}>Calculado</div></td>
              <td colSpan={8} style={S.td()} />
              <td colSpan={4} style={S.td({ fontSize: "5pt", color: "#aaa", verticalAlign: "bottom" })}>Signature of Shipper or his Agent</td>
            </tr>

            {/* ── Total Prepaid / Collect ──────────────────────────────── */}
            <tr>
              <td colSpan={4} style={S.td()}>
                <span style={S.lbl}>Total Prepaid</span>
                <div style={{ color: "#2563eb", fontSize: "10pt", fontWeight: 700 }}>Calculado</div>
              </td>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Collect</span></td>
              <td colSpan={12} style={S.td()} />
            </tr>

            {/* ── Currency / Execution ─────────────────────────────────── */}
            <tr>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>Currency Conversion Rates</span></td>
              <td colSpan={4} style={S.td()}><span style={S.lbl}>CC Charges in Dest. Currency</span></td>
              <td colSpan={12} style={S.td({ background: "#f9fafb" })}>
                <span style={S.lbl}>Executed on (date) / at (place)</span>
                <div style={{ ...S.valBold }}>
                  {new Date().toLocaleDateString("es-CO")} — BOGOTA - COLOMBIA
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
