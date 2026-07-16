"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import DraftWatermark from "../../../DraftWatermark";

const LEGAL = "It is agreed that the goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE SHIPPER'S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER'S LIMITATION OF LIABILITY. Shipper may increase such limitation of liability by declaring a higher value for carriage and paying a supplemental charge if required.";

interface Mawb {
  id: string; operacion_id: string; prefix: string | null; numero_mawb: string;
  consignee_id: string | null; shipper_account: string | null; consignee_account: string | null;
  aerolinea_id: string | null; aeropuerto_origen_id: string | null; aeropuerto_destino_id: string | null;
  vuelo: string | null; fecha_vuelo: string | null; trm: string | null;
  agent_iata_code: string | null; agent_account_no: string | null;
  tipo_pago_flete: string; tipo_pago_otros: string; moneda_flete: string;
  valor_declarado_transporte: string; valor_declarado_aduana: string;
  monto_seguro: string | null; info_manejo: string | null; clase_tarifa: string | null;
  piezas: number | null; peso_bruto_kg: string | null; peso_cargable_kg: string | null;
  tarifa_por_kg: string | null; descripcion_mercancia: string | null; dimensiones: string | null;
  flete_total: string | null; fsc: string | null; due_carrier: string | null;
  cargo_valuacion: string | null; tax: string | null;
  otros_due_agent: string | null; otros_due_carrier: string | null; total_prepaid: string | null;
  fecha_ejecucion: string | null; lugar_ejecucion: string | null;
  estado: string;
}
interface Tercero { id: string; nit: string; razon_social: string; ciudad: string | null; telefono: string | null; email: string | null; direccion: string | null; }
interface Aerolinea { id: string; codigo_iata: string; nombre: string; }
interface Aeropuerto { id: string; codigo_iata: string; nombre: string; ciudad: string; }

const S = {
  td: (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #000", verticalAlign: "top", padding: "1px 3px", ...extra,
  }),
  lbl: { fontSize: "4.5pt", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#555", lineHeight: 1.1, display: "block", marginBottom: 0 },
  val: { fontSize: "7.5pt", lineHeight: 1.25 },
  valBold: { fontSize: "8pt", fontWeight: 700, lineHeight: 1.25 },
  valSm: { fontSize: "6pt", lineHeight: 1.2, color: "#222" },
  section: { fontSize: "4.5pt", fontWeight: 700, textTransform: "uppercase" as const, color: "#555", letterSpacing: "0.06em" },
};

function fmt(n: string | number | null | undefined, dec = 2) {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (!num && num !== 0) return "—";
  return num.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function MawbDoc({
  mawb, consignee, aerolinea, aerOrigen, aerDestino, originalNum,
}: {
  mawb: Mawb; consignee: Tercero | null; aerolinea: Aerolinea | null;
  aerOrigen: Aeropuerto | null; aerDestino: Aeropuerto | null; originalNum: number;
}) {
  const prefix = mawb.prefix ?? "";
  const seq = mawb.numero_mawb.includes("-") ? mawb.numero_mawb.split("-").slice(1).join("-") : mawb.numero_mawb;
  const mawbFull = mawb.numero_mawb;

  const tarNum = parseFloat(mawb.tarifa_por_kg ?? "0") || 0;
  const pesNum = parseFloat(mawb.peso_cargable_kg ?? "0") || 0;
  const fleteCalc = tarNum > 0 && pesNum > 0 ? (tarNum * pesNum).toFixed(2) : (mawb.flete_total ?? null);

  const fechaTexto = mawb.fecha_ejecucion ?? new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  const lugarTexto = mawb.lugar_ejecucion ?? "BOGOTA - COLOMBIA";

  return (
    <>
    <DraftWatermark estado={mawb.estado} />
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup>
        {Array.from({ length: 20 }, (_, i) => <col key={i} style={{ width: "5%" }} />)}
      </colgroup>
      <tbody>

        {/* FILA 1: MAWB número */}
        <tr>
          <td colSpan={1} style={S.td({ borderRight: "none", paddingBottom: 3 })}>
            <span style={S.lbl}>Prefix</span>
            <span style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1 }}>{prefix}</span>
          </td>
          <td colSpan={4} style={S.td({ borderLeft: "none", borderRight: "2px solid #000", paddingBottom: 3 })}>
            <span style={S.lbl}>Master AWB Number</span>
            <span style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1 }}>{seq}</span>
          </td>
          <td colSpan={7} style={{ border: "1px solid #000", borderLeft: "none" }} />
          <td colSpan={8} style={S.td({ textAlign: "right", borderLeft: "2px solid #000", background: "#f8fafc" })}>
            <span style={{ ...S.lbl, textAlign: "right" }}>Master Air Waybill</span>
            <span style={{ fontSize: "20pt", fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1 }}>{mawbFull}</span>
          </td>
        </tr>

        {/* FILA 2: Shipper (siempre Universal Cargo) + Legal */}
        <tr>
          <td colSpan={12} style={S.td({ minHeight: 48, background: "#f9fafb" })}>
            <span style={S.lbl}>Shipper&apos;s Name and Address</span>
            <div style={S.valBold}>UNIVERSAL CARGO COLOMBIA SAS</div>
            <div style={S.valSm}>NIT: 901.702.367</div>
            <div style={S.valSm}>CRA 106 # 15a - 25 mzn 24 BOD 145</div>
            <div style={S.valSm}>julian.fontecha@universalcargo.com.co · TEL: 314 3045776</div>
            <div style={S.valSm}>BOGOTA - COLOMBIA</div>
          </td>
          <td colSpan={2} style={S.td({ background: "#f9fafb" })}>
            <span style={S.lbl}>Shipper&apos;s<br />Account #</span>
            {mawb.shipper_account && <div style={S.val}>{mawb.shipper_account}</div>}
          </td>
          <td colSpan={6} rowSpan={3} style={S.td({ background: "#fafafa" })}>
            <div style={{ fontWeight: 800, fontSize: "10pt", textAlign: "center", marginBottom: 1 }}>Not Negotiable</div>
            <div style={{ fontWeight: 700, fontSize: "8.5pt", textAlign: "center", marginBottom: 1 }}>Air Waybill</div>
            <div style={{ fontSize: "6pt", textAlign: "center", color: "#666", marginBottom: 4 }}>Issued by</div>
            <div style={{ fontSize: "4.5pt", color: "#777", lineHeight: 1.4, marginBottom: 4 }}>
              Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.
            </div>
            <div style={{ fontSize: "4pt", color: "#999", lineHeight: 1.5 }}>{LEGAL}</div>
          </td>
        </tr>

        {/* FILA 3: Consignee */}
        <tr>
          <td colSpan={12} style={S.td({ minHeight: 48 })}>
            <span style={S.lbl}>Consignee&apos;s Name and Address</span>
            {consignee ? (
              <>
                <div style={S.valBold}>{consignee.razon_social}</div>
                <div style={S.valSm}>NIT: {consignee.nit}</div>
                {consignee.direccion && <div style={S.valSm}>{consignee.direccion}</div>}
                {consignee.email && <div style={S.valSm}>{consignee.email}</div>}
                {consignee.telefono && <div style={S.valSm}>Tel: {consignee.telefono}</div>}
                {consignee.ciudad && <div style={S.valSm}>{consignee.ciudad}</div>}
              </>
            ) : <div style={S.valSm}>—</div>}
          </td>
          <td colSpan={2} style={S.td()}>
            <span style={S.lbl}>Consignee&apos;s<br />Account #</span>
            {mawb.consignee_account && <div style={S.val}>{mawb.consignee_account}</div>}
          </td>
        </tr>

        {/* FILA 4: Issuing Agent (siempre Universal Cargo) */}
        <tr>
          <td colSpan={14} style={S.td({ background: "#f9fafb" })}>
            <span style={S.lbl}>Issuing Carrier&apos;s Agent Name and City</span>
            <div style={S.valBold}>UNIVERSAL CARGO COLOMBIA S.A.S</div>
            <div style={S.valSm}>NIT: 901.702.367 · CRA 106 # 15a - 25 mzn 24 BOD 143</div>
            <div style={S.valSm}>julian.fontecha@universalcargo.com.co · TEL: 314 3045776 · BOGOTA - COLOMBIA</div>
          </td>
          <td colSpan={6} style={S.td({ background: "#fafafa" })} />
        </tr>

        {/* FILA 5: Agent IATA / Account / TRM */}
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Agent&apos;s IATA Code</span>
            <div style={S.val}>{mawb.agent_iata_code ?? "—"}</div>
          </td>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Account No.</span>
            <div style={S.val}>{mawb.agent_account_no ?? "—"}</div>
          </td>
          <td colSpan={12} style={S.td()}>
            <span style={S.lbl}>Accounting Information</span>
            {mawb.trm && <div style={{ ...S.valBold, fontSize: "9pt" }}>TRM: {fmt(mawb.trm, 2)}</div>}
          </td>
        </tr>

        {/* FILA 6: Airport of Departure label */}
        <tr>
          <td colSpan={20} style={S.td({ padding: "1px 4px", background: "#f0f4ff" })}>
            <span style={S.lbl}>Airport of Departure (Addr. of First Carrier) and Requested Routing</span>
          </td>
        </tr>

        {/* FILA 7: Routing */}
        <tr>
          <td colSpan={5} style={S.td()}>
            {aerOrigen ? (
              <>
                <div style={S.valSm}>{aerOrigen.nombre}</div>
                <div style={{ ...S.valSm, fontWeight: 700 }}>{aerOrigen.ciudad}</div>
              </>
            ) : <div style={S.valSm}>—</div>}
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>To</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>{aerDestino?.codigo_iata ?? "—"}</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>By First Carrier</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>{aerolinea?.codigo_iata ?? "—"}</div>
            {aerolinea && <div style={{ fontSize: "5pt", color: "#555" }}>{aerolinea.nombre}</div>}
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>Currency</span>
            <div style={S.valBold}>{mawb.moneda_flete}</div>
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>CHGS</span>
          </td>
          <td colSpan={1} style={S.td()}>
            <span style={S.lbl}>WT/VAL</span>
            <div style={{ fontSize: "7pt" }}>PPD {mawb.tipo_pago_flete === "PPD" ? <strong>[X]</strong> : "[ ]"}</div>
            <div style={{ fontSize: "7pt" }}>COLL {mawb.tipo_pago_flete === "COLL" ? <strong>[X]</strong> : "[ ]"}</div>
          </td>
          <td colSpan={1} style={S.td()}>
            <span style={S.lbl}>Other</span>
            <div style={{ fontSize: "7pt" }}>PPD {mawb.tipo_pago_otros === "PPD" ? <strong>[X]</strong> : "[ ]"}</div>
            <div style={{ fontSize: "7pt" }}>COLL {mawb.tipo_pago_otros === "COLL" ? <strong>[X]</strong> : "[ ]"}</div>
          </td>
          <td colSpan={2} style={S.td()}>
            <span style={S.lbl}>Declared Value for Carriage</span>
            <div style={S.val}>{mawb.valor_declarado_transporte}</div>
          </td>
          <td colSpan={2} style={S.td()}>
            <span style={S.lbl}>Declared Value for Customs</span>
            <div style={S.val}>{mawb.valor_declarado_aduana}</div>
          </td>
        </tr>

        {/* FILA 8: Destino / Vuelo / Insurance */}
        <tr>
          <td colSpan={6} style={S.td()}>
            <span style={S.lbl}>Airport of Destination</span>
            {aerDestino ? (
              <>
                <div style={S.val}>{aerDestino.nombre}</div>
                <div style={S.valSm}>{aerDestino.ciudad}</div>
              </>
            ) : <div style={S.val}>—</div>}
          </td>
          <td colSpan={3} style={S.td()}>
            <span style={S.lbl}>Flight / Date</span>
            {(mawb.vuelo || mawb.fecha_vuelo) && (
              <div style={S.valBold}>
                {mawb.vuelo ?? ""}{mawb.vuelo && mawb.fecha_vuelo ? " / " : ""}{mawb.fecha_vuelo ?? ""}
              </div>
            )}
          </td>
          <td colSpan={3} style={S.td()}><span style={S.lbl}>For Carrier Use Only</span></td>
          <td colSpan={3} style={S.td()}><span style={S.lbl}>Flight / Date</span></td>
          <td colSpan={5} style={S.td()}>
            <span style={S.lbl}>Amount of Insurance</span>
            {mawb.monto_seguro ? (
              <div style={S.val}>{mawb.monto_seguro}</div>
            ) : (
              <div style={{ fontSize: "5pt", color: "#999", lineHeight: 1.3 }}>INSURANCE – if carrier offers insurance, indicate amount.</div>
            )}
          </td>
        </tr>

        {/* FILA 9: Handling */}
        <tr>
          <td colSpan={20} style={S.td({ background: "#f8fafc" })}>
            <span style={S.lbl}>Handling Information</span>
            <div style={{ ...S.valBold, fontSize: "7.5pt" }}>{mawb.info_manejo ?? "—"}</div>
          </td>
        </tr>

        {/* FILA 10: Header tabla cargo */}
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

        {/* FILA 11: Datos cargo */}
        <tr style={{ height: 38 }}>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>{mawb.piezas ?? "—"}</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>{fmt(mawb.peso_bruto_kg, 0)}</div>
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "9pt", fontWeight: 700 }}>KG</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "9pt", fontWeight: 700 }}>{mawb.clase_tarifa ?? "RCP"}</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>{fmt(mawb.peso_cargable_kg, 0)}</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={S.valBold}>{fmt(mawb.tarifa_por_kg)}</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={S.valBold}>{fmt(fleteCalc)}</div>
          </td>
          <td colSpan={7} style={S.td()}>
            <div style={S.valBold}>{mawb.descripcion_mercancia ?? "—"}</div>
            {mawb.dimensiones && <div style={{ ...S.valSm, marginTop: 3 }}>Dim: {mawb.dimensiones}</div>}
          </td>
        </tr>

        {/* FILA 12: Totales cargo */}
        <tr style={{ background: "#f8fafc" }}>
          <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>{mawb.piezas ?? "—"}</div></td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>{fmt(mawb.peso_bruto_kg, 0)}</div></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><div style={S.valBold}>KG</div></td>
          <td colSpan={2} style={S.td()} />
          <td colSpan={2} style={S.td()} />
          <td colSpan={2} style={S.td()} />
          <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>{fmt(fleteCalc)}</div></td>
          <td colSpan={7} style={S.td()} />
        </tr>

        {/* Cargos header */}
        <tr style={{ background: "#f0f4ff" }}>
          <td colSpan={4} style={S.td({ textAlign: "center" })}><span style={S.section}>Prepaid</span></td>
          <td colSpan={8} style={S.td()}><span style={S.section}>Weight Charge</span></td>
          <td colSpan={4} style={S.td({ textAlign: "center" })}><span style={S.section}>Collect</span></td>
          <td colSpan={4} style={S.td()}><span style={S.section}>Other Charges</span></td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td({ textAlign: "center" })}><div style={S.valBold}>{fmt(fleteCalc)}</div></td>
          <td colSpan={8} style={S.td()} />
          <td colSpan={4} style={S.td()} />
          <td colSpan={4} style={S.td()}>
            {mawb.fsc && <div style={S.val}>F.S {mawb.moneda_flete} {fmt(mawb.fsc)}</div>}
            {mawb.due_carrier && <div style={S.val}>DUE CARRIER {fmt(mawb.due_carrier)}</div>}
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td()} />
          <td colSpan={8} style={S.td()}>
            <span style={S.lbl}>Valuation Charge</span>
            {mawb.cargo_valuacion && <div style={S.val}>{mawb.cargo_valuacion}</div>}
          </td>
          <td colSpan={4} style={S.td()} />
          <td colSpan={4} style={S.td({ fontSize: "5.5pt", color: "#777", lineHeight: 1.3 })}>
            We certify that we know the exporter as a serious and responsible entity
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Total Other Charges Due Agent</span>
            {mawb.otros_due_agent && <div style={S.valBold}>{fmt(mawb.otros_due_agent)}</div>}
          </td>
          <td colSpan={8} style={S.td()}>
            <span style={S.lbl}>Tax</span>
            {mawb.tax && <div style={S.val}>{mawb.tax}</div>}
          </td>
          <td colSpan={4} style={S.td()} />
          <td colSpan={4} rowSpan={2} style={S.td({ fontSize: "4.5pt", color: "#999", lineHeight: 1.5 })}>
            Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Total Other Charges Due Carrier</span>
            {mawb.otros_due_carrier && <div style={S.valBold}>{fmt(mawb.otros_due_carrier)}</div>}
          </td>
          <td colSpan={8} style={S.td()} />
          <td colSpan={4} style={S.td({ fontSize: "5.5pt", color: "#999", verticalAlign: "bottom" })}>
            Signature of Shipper or his Agent
          </td>
        </tr>

        {/* Total Prepaid / Collect */}
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Total Prepaid</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>{mawb.total_prepaid ? fmt(mawb.total_prepaid) : "—"}</div>
          </td>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Collect</span></td>
          <td colSpan={12} style={S.td()} />
        </tr>

        {/* Currency / Execution */}
        <tr>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>Currency Conversion Rates</span></td>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>CC Charges in Dest. Currency</span></td>
          <td colSpan={12} style={S.td({ background: "#f8fafc" })}>
            <span style={S.lbl}>Executed on (date) / at (place) / Signature of issuing Carrier or its Agent</span>
            <div style={S.valBold}>{fechaTexto} — {lugarTexto}</div>
          </td>
        </tr>
        <tr>
          <td colSpan={10} style={S.td()}><span style={S.lbl}>Charges at Destination</span></td>
          <td colSpan={10} style={S.td()}><span style={S.lbl}>Total Collect Charges</span></td>
        </tr>

        {/* ORIGINAL N */}
        <tr>
          <td colSpan={20} style={{ border: "none", textAlign: "center", paddingTop: 4 }}>
            <span style={{ fontSize: "9pt", fontWeight: 800, color: "#333", letterSpacing: "0.1em" }}>
              ORIGINAL {originalNum}
            </span>
          </td>
        </tr>

      </tbody>
    </table>
    </>
  );
}

export default function MawbPrintPage({ params }: { params: Promise<{ operacion_id: string; mawb_id: string }> }) {
  const [mawb, setMawb] = useState<Mawb | null>(null);
  const [consignee, setConsignee] = useState<Tercero | null>(null);
  const [aerolinea, setAerolinea] = useState<Aerolinea | null>(null);
  const [aerOrigen, setAerOrigen] = useState<Aeropuerto | null>(null);
  const [aerDestino, setAerDestino] = useState<Aeropuerto | null>(null);
  const [copias, setCopias] = useState(3);
  const [ids, setIds] = useState<{ operacion_id: string; mawb_id: string } | null>(null);

  useEffect(() => { params.then(setIds); }, [params]);

  useEffect(() => {
    if (!ids) return;
    apiFetch<Mawb>(`/operaciones/operaciones/${ids.operacion_id}/mawbs/${ids.mawb_id}`)
      .then(async (data) => {
        setMawb(data);
        document.title = data.numero_mawb;
        const fetches: Promise<void>[] = [];
        if (data.consignee_id) fetches.push(apiFetch<Tercero>(`/terceros/${data.consignee_id}`).then(setConsignee).catch(() => {}));
        if (data.aerolinea_id) fetches.push(apiFetch<Aerolinea>(`/operaciones/aerolineas/${data.aerolinea_id}`).then(setAerolinea).catch(() => {}));
        if (data.aeropuerto_origen_id) fetches.push(apiFetch<Aeropuerto>(`/operaciones/aeropuertos/${data.aeropuerto_origen_id}`).then(setAerOrigen).catch(() => {}));
        if (data.aeropuerto_destino_id) fetches.push(apiFetch<Aeropuerto>(`/operaciones/aeropuertos/${data.aeropuerto_destino_id}`).then(setAerDestino).catch(() => {}));
        await Promise.all(fetches);
      }).catch(() => {});
  }, [ids]);

  if (!mawb) {
    return <div style={{ padding: 40, color: "#999", fontSize: 13 }}>Cargando MAWB...</div>;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow: auto !important; height: auto !important; background: #fff; font-family: Arial, Helvetica, sans-serif; }
        @page { size: A4 landscape; margin: 6mm 7mm; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .mawb-copy { page-break-after: always; }
          .mawb-copy:last-child { page-break-after: avoid; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>
            <strong>MAWB</strong> · {mawb.numero_mawb} · A4 Landscape
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "#475569" }}>Originales:</label>
            <select value={copias} onChange={(e) => setCopias(Number(e.target.value))}
              style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => window.print()}
          style={{ padding: "5px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir
        </button>
      </div>

      <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: "20px 0" }}>
        {Array.from({ length: copias }, (_, i) => (
          <div key={i} className="mawb-copy"
            style={{ width: 1050, margin: "0 auto 20px", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", padding: "10px" }}>
            <MawbDoc
              mawb={mawb} consignee={consignee} aerolinea={aerolinea}
              aerOrigen={aerOrigen} aerDestino={aerDestino} originalNum={i + 1}
            />
          </div>
        ))}
      </div>
    </>
  );
}
