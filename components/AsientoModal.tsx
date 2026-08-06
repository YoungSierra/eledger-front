"use client";

export interface AsientoLinea {
  cuenta_codigo: string | null; cuenta_nombre: string | null;
  tercero_nombre: string | null; centro_costo: string | null;
  debito: string; credito: string;
  /** Lo que realmente suma en los libros. Solo llega si el documento está en moneda extranjera. */
  debito_funcional?: string | null; credito_funcional?: string | null;
}
export interface AsientoData {
  lineas: AsientoLinea[];
  total_debito: string; total_credito: string;
  cuadra: boolean; moneda_codigo: string | null; avisos: string[];
  asiento_numero?: number | null;
  moneda_funcional_codigo?: string | null;
  trm?: string | null;
  total_debito_funcional?: string | null;
  total_credito_funcional?: string | null;
}

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Modal reutilizable para "Ver asiento": muestra la previsualización (borrador)
 * o el asiento real contabilizado según `real`.
 *
 * Con documentos en moneda extranjera se muestran CUATRO columnas: el par en la
 * moneda del documento y el par en moneda funcional. Solo el segundo es el que
 * suma en los libros, así que va resaltado y es el que lleva el rótulo.
 */
export default function AsientoModal({ data, real = false, onClose }: {
  data: AsientoData; real?: boolean; onClose: () => void;
}) {
  const dobleMoneda = !!data.moneda_funcional_codigo && data.moneda_funcional_codigo !== data.moneda_codigo;
  const colSpanTotales = 2;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl shadow-xl flex flex-col"
        style={{ resize: "both", overflow: "hidden", width: "min(95vw, 80rem)", height: "min(85vh, 34rem)", minWidth: "min(80rem, 95vw)", minHeight: "26rem", maxWidth: "97vw", maxHeight: "95vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] font-semibold text-gray-800">{real ? "Asiento contabilizado" : "Previsualización del asiento"}</h3>
            {data.asiento_numero != null && (
              <span className="text-[12px] font-mono font-semibold text-gray-500">N.º {data.asiento_numero}</span>
            )}
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${data.cuadra ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {data.cuadra ? "Cuadra ✓" : "Descuadra"}
            </span>
            {dobleMoneda && data.trm && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                TRM {fmt(data.trm)}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {data.avisos.length > 0 && (
            <div className="mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700 space-y-1">
              {data.avisos.map((a, i) => <p key={i}>⚠ {a}</p>)}
            </div>
          )}
          <table className="w-full text-[13px]">
            <thead>
              {dobleMoneda && (
                <tr className="text-[10px] uppercase tracking-wide text-gray-400">
                  <th colSpan={colSpanTotales} />
                  <th className="text-center px-3 pt-1" colSpan={2}>{data.moneda_codigo} · documento</th>
                  <th className="text-center px-3 pt-1 text-indigo-600 font-bold" colSpan={2}>
                    {data.moneda_funcional_codigo} · contabilidad
                  </th>
                </tr>
              )}
              <tr className="border-b border-gray-200 text-gray-500 text-[11px] uppercase">
                <th className="text-left px-3 py-2">Cuenta</th>
                <th className="text-left px-3 py-2">Tercero / C. Costo</th>
                <th className="text-right px-3 py-2">Débito</th>
                <th className="text-right px-3 py-2">Crédito</th>
                {dobleMoneda && <th className="text-right px-3 py-2 text-indigo-600">Débito</th>}
                {dobleMoneda && <th className="text-right px-3 py-2 text-indigo-600">Crédito</th>}
              </tr>
            </thead>
            <tbody>
              {data.lineas.map((l, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-3 py-2">
                    <span className="font-mono text-blue-600 mr-2">{l.cuenta_codigo ?? "—"}</span>
                    <span className="text-gray-700">{l.cuenta_nombre}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {l.tercero_nombre}{l.centro_costo ? ` · ${l.centro_costo}` : ""}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${dobleMoneda ? "text-gray-400" : "text-gray-800"}`}>
                    {parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${dobleMoneda ? "text-gray-400" : "text-gray-800"}`}>
                    {parseFloat(l.credito) > 0 ? fmt(l.credito) : ""}
                  </td>
                  {dobleMoneda && (
                    <td className="px-3 py-2 text-right font-mono text-gray-800 font-medium">
                      {parseFloat(l.debito_funcional ?? "0") > 0 ? fmt(l.debito_funcional!) : ""}
                    </td>
                  )}
                  {dobleMoneda && (
                    <td className="px-3 py-2 text-right font-mono text-gray-800 font-medium">
                      {parseFloat(l.credito_funcional ?? "0") > 0 ? fmt(l.credito_funcional!) : ""}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold text-gray-900 text-[14px]">
                <td className="px-3 py-2.5" colSpan={colSpanTotales}>
                  Totales{dobleMoneda ? "" : ` (${data.moneda_codigo})`}
                </td>
                <td className={`px-3 py-2.5 text-right font-mono ${dobleMoneda ? "text-gray-400 font-medium" : ""}`}>{fmt(data.total_debito)}</td>
                <td className={`px-3 py-2.5 text-right font-mono ${dobleMoneda ? "text-gray-400 font-medium" : ""}`}>{fmt(data.total_credito)}</td>
                {dobleMoneda && (
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(data.total_debito_funcional ?? "0")}</td>
                )}
                {dobleMoneda && (
                  <td className="px-3 py-2.5 text-right font-mono">{fmt(data.total_credito_funcional ?? "0")}</td>
                )}
              </tr>
            </tfoot>
          </table>
          <p className="text-[11px] text-gray-400 mt-4">
            {dobleMoneda
              ? `A los libros va la columna en ${data.moneda_funcional_codigo}. La columna en ${data.moneda_codigo} queda como referencia del valor original del documento.`
              : real
                ? "Partidas realmente asentadas en contabilidad."
                : "Vista previa según lo que hay en pantalla. Aún no se ha contabilizado."}
          </p>
        </div>
      </div>
    </div>
  );
}
