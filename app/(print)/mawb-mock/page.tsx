"use client";

import { useState } from "react";

const LEGAL = "It is agreed that the goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE SHIPPER'S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER'S LIMITATION OF LIABILITY. Shipper may increase such limitation of liability by declaring a higher value for carriage and paying a supplemental charge if required.";

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

function MawbDoc({ originalNum }: { originalNum: number }) {
  return (
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

        {/* â”€â”€ FILA 1: MAWB nÃºmero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={1} style={S.td({ borderRight: "none", paddingBottom: 3 })}>
            <span style={S.lbl}>Prefix</span>
            <span style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1 }}>230</span>
          </td>
          <td colSpan={4} style={S.td({ borderLeft: "none", borderRight: "2px solid #000", paddingBottom: 3 })}>
            <span style={S.lbl}>Master AWB Number</span>
            <span style={{ fontSize: "18pt", fontWeight: 700, lineHeight: 1 }}>66458383</span>
          </td>
          <td colSpan={7} style={{ border: "1px solid #000", borderLeft: "none" }} />
          <td colSpan={8} style={S.td({ textAlign: "right", borderLeft: "2px solid #000", background: "#f8fafc" })}>
            <span style={{ ...S.lbl, textAlign: "right" }}>Master Air Waybill</span>
            <span style={{ fontSize: "20pt", fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1 }}>230-66458383</span>
          </td>
        </tr>

        {/* â”€â”€ FILA 2: Shipper (SIEMPRE Universal Cargo) + Legal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={12} style={S.td({ minHeight: 48, background: "#f9fafb" })}>
            <span style={S.lbl}>Shipper's Name and Address</span>
            <div style={S.valBold}>UNIVERSAL CARGO COLOMBIA SAS</div>
            <div style={S.valSm}>NIT: 901.702.367</div>
            <div style={S.valSm}>CRA 106 # 15a - 25 mzn 24 BOD 145</div>
            <div style={S.valSm}>julian.fontecha@universalcargo.com.co Â· TEL: 314 3045776</div>
            <div style={S.valSm}>BOGOTA-COLOMBIA</div>
          </td>
          <td colSpan={2} style={S.td({ background: "#f9fafb" })}>
            <span style={S.lbl}>Shipper's<br />Account #</span>
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

        {/* â”€â”€ FILA 3: Consignee (agente destino) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={12} style={S.td({ minHeight: 48 })}>
            <span style={S.lbl}>Consignee's Name and Address</span>
            <div style={S.valBold}>TALATRANS WORLDWIDE EL SALVADOR SA DE CV</div>
            <div style={S.valSm}>NIT 0614-141014-102-1 Â· Postal Code: 1101</div>
            <div style={S.valSm}>ALAMEDA FRANKLIN DELANO ROOSEVELT, EDIF. MAPFRE 3er NIVEL</div>
            <div style={S.valSm}>SAN SALVADOR - EL SALVADOR</div>
          </td>
          <td colSpan={2} style={S.td()}>
            <span style={S.lbl}>Consignee's<br />Account #</span>
          </td>
        </tr>

        {/* â”€â”€ FILA 4: Issuing Agent (Universal Cargo tambiÃ©n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={14} style={S.td({ background: "#f9fafb" })}>
            <span style={S.lbl}>Issuing Carrier's Agent Name and City</span>
            <div style={S.valBold}>UNIVERSAL CARGO COLOMBIA S.A.S</div>
            <div style={S.valSm}>NIT: 901.702.367 Â· CRA 106 # 15a - 25 mzn 24 BOD 143</div>
            <div style={S.valSm}>julian.fontecha@universalcargo.com.co Â· TEL: 314 3045776 Â· BOGOTA-COLOMBIA</div>
          </td>
          <td colSpan={6} style={S.td({ background: "#fafafa" })} />
        </tr>

        {/* â”€â”€ FILA 5: Agent IATA / Account / TRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Agent's IATA Code</span>
          </td>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Account No.</span>
          </td>
          <td colSpan={12} style={S.td()}>
            <span style={S.lbl}>Accounting Information</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>TRM: 3.974,37</div>
          </td>
        </tr>

        {/* â”€â”€ FILA 6: Airport of Departure label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={20} style={S.td({ padding: "1px 4px", background: "#f0f4ff" })}>
            <span style={S.lbl}>Airport of Departure (Addr. of First Carrier) and Requested Routing</span>
          </td>
        </tr>

        {/* â”€â”€ FILA 7: Routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={5} style={S.td()}>
            <div style={S.valSm}>EL DORADO</div>
            <div style={{ ...S.valSm, fontWeight: 700 }}>BOGOTA - COLOMBIA</div>
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>To</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>SAL</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>By First Carrier</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>COPA</div>
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>to</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><span style={S.lbl}>by</span></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>Currency</span>
            <div style={S.valBold}>USD</div>
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <span style={S.lbl}>CHGS</span>
          </td>
          <td colSpan={1} style={S.td()}>
            <span style={S.lbl}>WT/VAL</span>
            <div style={{ fontSize: "7pt" }}>PPD <strong>[X]</strong></div>
            <div style={{ fontSize: "7pt" }}>COLL</div>
          </td>
          <td colSpan={1} style={S.td()}>
            <span style={S.lbl}>Other</span>
            <div style={{ fontSize: "7pt" }}>PPD <strong>[X]</strong></div>
            <div style={{ fontSize: "7pt" }}>COLL</div>
          </td>
          <td colSpan={2} style={S.td()}>
            <span style={S.lbl}>Declared Value for Carriage</span>
            <div style={S.val}>NVD</div>
          </td>
          <td colSpan={2} style={S.td()}>
            <span style={S.lbl}>Declared Value for Customs</span>
            <div style={S.val}>NVD</div>
          </td>
        </tr>

        {/* â”€â”€ FILA 8: Destino / Vuelo / Insurance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={6} style={S.td()}>
            <span style={S.lbl}>Airport of Destination</span>
            <div style={S.val}>Aeropuerto Internacional del Salvador</div>
          </td>
          <td colSpan={3} style={S.td()}>
            <span style={S.lbl}>Flight / Date</span>
            <div style={S.valBold}>CM 470 / 07-JUL-25</div>
          </td>
          <td colSpan={3} style={S.td()}>
            <span style={S.lbl}>For Carrier Use Only</span>
          </td>
          <td colSpan={3} style={S.td()}>
            <span style={S.lbl}>Flight / Date</span>
          </td>
          <td colSpan={5} style={S.td()}>
            <span style={S.lbl}>Amount of Insurance</span>
            <div style={{ fontSize: "5pt", color: "#999", lineHeight: 1.3 }}>INSURANCE â€“ if carrier offers insurance, indicate amount.</div>
          </td>
        </tr>

        {/* â”€â”€ FILA 9: Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={20} style={S.td({ background: "#f8fafc" })}>
            <span style={S.lbl}>Handling Information</span>
            <div style={{ ...S.valBold, fontSize: "7.5pt" }}>ATTACHED ENVELOPED DOCUMENTS</div>
          </td>
        </tr>

        {/* â”€â”€ FILA 10: Header tabla cargo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

        {/* â”€â”€ FILA 11: Datos cargo â€” MAWB usa valores reales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr style={{ height: 38 }}>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>12</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>181</div>
          </td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "9pt", fontWeight: 700 }}>KG</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "9pt", fontWeight: 700 }}>RCP</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={{ fontSize: "11pt", fontWeight: 700 }}>181</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={S.valBold}>1,65</div>
          </td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}>
            <div style={S.valBold}>298,65</div>
          </td>
          <td colSpan={7} style={S.td()}>
            <div style={S.valBold}>AS PER CARGO CONSOLIDATED</div>
            <div style={{ ...S.valSm, marginTop: 3 }}>Dim: 40*30*30 = 12</div>
          </td>
        </tr>

        {/* â”€â”€ FILA 12: Totales cargo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr style={{ background: "#f8fafc" }}>
          <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>12</div></td>
          <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>181</div></td>
          <td colSpan={1} style={S.td({ textAlign: "center" })}><div style={S.valBold}>KG</div></td>
          <td colSpan={2} style={S.td()} />
          <td colSpan={2} style={S.td()} />
          <td colSpan={2} style={S.td()} />
          <td colSpan={2} style={S.td({ textAlign: "center" })}><div style={S.valBold}>298,65</div></td>
          <td colSpan={7} style={S.td()} />
        </tr>

        {/* â”€â”€ Cargos header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr style={{ background: "#f0f4ff" }}>
          <td colSpan={4} style={S.td({ textAlign: "center" })}><span style={S.section}>Prepaid</span></td>
          <td colSpan={8} style={S.td()}><span style={S.section}>Weight Charge</span></td>
          <td colSpan={4} style={S.td({ textAlign: "center" })}><span style={S.section}>Collect</span></td>
          <td colSpan={4} style={S.td()}><span style={S.section}>Other Charges</span></td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td({ textAlign: "center" })}><div style={S.valBold}>298,65</div></td>
          <td colSpan={8} style={S.td()} />
          <td colSpan={4} style={S.td()} />
          <td colSpan={4} style={S.td()}>
            <div style={S.val}>F.S USD 45,25</div>
            <div style={S.val}>DUE CARRIER 25,00</div>
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td()} />
          <td colSpan={8} style={S.td()}><span style={S.lbl}>Valuation Charge</span></td>
          <td colSpan={4} style={S.td()} />
          <td colSpan={4} style={S.td({ fontSize: "5.5pt", color: "#777", lineHeight: 1.3 })}>
            We certify that we know the exporter as a serious and responsible entity
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Other Charges Due Agent</span></td>
          <td colSpan={8} style={S.td()}><span style={S.lbl}>Tax</span></td>
          <td colSpan={4} style={S.td()} />
          <td colSpan={4} rowSpan={2} style={S.td({ fontSize: "4.5pt", color: "#999", lineHeight: 1.5 })}>
            Shipper certifies that the particulars on the face hereof are correct and that insofar as
            any part of the consignment contains dangerous goods, such part is properly described by
            name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Total Other Charges Due Carrier</span>
            <div style={S.valBold}>70,25</div>
          </td>
          <td colSpan={8} style={S.td()} />
          <td colSpan={4} style={S.td({ fontSize: "5.5pt", color: "#999", verticalAlign: "bottom" })}>
            Signature of Shipper or his Agent
          </td>
        </tr>

        {/* â”€â”€ Total Prepaid / Collect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={4} style={S.td()}>
            <span style={S.lbl}>Total Prepaid</span>
            <div style={{ ...S.valBold, fontSize: "9pt" }}>368,90</div>
          </td>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>Total Collect</span></td>
          <td colSpan={12} style={S.td()} />
        </tr>

        {/* â”€â”€ Currency / Execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>Currency Conversion Rates</span></td>
          <td colSpan={4} style={S.td()}><span style={S.lbl}>CC Charges in Dest. Currency</span></td>
          <td colSpan={12} style={S.td({ background: "#f8fafc" })}>
            <span style={S.lbl}>Executed on (date) / at (place) / Signature of issuing Carrier or its Agent</span>
            <div style={S.valBold}>07/07/2025 â€” BOGOTA - COLOMBIA</div>
          </td>
        </tr>
        <tr>
          <td colSpan={10} style={S.td()}><span style={S.lbl}>Charges at Destination</span></td>
          <td colSpan={10} style={S.td()}><span style={S.lbl}>Total Collect Charges</span></td>
        </tr>

        {/* â”€â”€ ORIGINAL N centrado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <tr>
          <td colSpan={20} style={{ border: "none", textAlign: "center", paddingTop: 4 }}>
            <span style={{ fontSize: "9pt", fontWeight: 800, color: "#333", letterSpacing: "0.1em" }}>
              ORIGINAL {originalNum}
            </span>
          </td>
        </tr>

      </tbody>
    </table>
  );
}

export default function MawbPrint() {
  const [copias, setCopias] = useState(3);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; font-family: Arial, Helvetica, sans-serif; }
        @page { size: A4 landscape; margin: 6mm 7mm; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .mawb-copy { page-break-after: always; }
          .mawb-copy:last-child { page-break-after: avoid; }
        }
        table { border-collapse: collapse; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>
            <strong>MAWB Mock</strong> Â· 230-66458383 Â· A4 Landscape
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "#475569" }}>Originales a imprimir:</label>
            <select value={copias} onChange={(e) => setCopias(Number(e.target.value))}
              style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={() => window.print()}
          style={{ padding: "5px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Imprimir
        </button>
      </div>

      {/* Copias */}
      <div style={{ background: "#e5e7eb", minHeight: "100vh", padding: "20px 0" }}>
        {Array.from({ length: copias }, (_, i) => (
          <div key={i} className="mawb-copy"
            style={{ width: 1050, margin: "0 auto 20px", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", padding: "10px" }}>
            <MawbDoc originalNum={i + 1} />
          </div>
        ))}
      </div>
    </>
  );
}

