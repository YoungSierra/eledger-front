"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";
import AsientoModal, { type AsientoData } from "@/components/AsientoModal";

// ─── Interfaces ────────────────────────────────────────────────────────────

interface FacLinea {
  id: string; producto_id: string | null; producto_codigo: string | null; producto_nombre: string | null;
  descripcion: string; cantidad: string; um_codigo: string | null;
  precio_unitario: string; subtotal: string; iva_tipo: string; iva_pct: string;
  total_iva: string; total: string; valor_tercero: boolean;
}
interface Factura {
  id: string; numero: string; fecha: string;
  cliente_id: string; cliente_nit: string | null; cliente_nombre: string | null;
  moneda_id: string; moneda_codigo: string; trm: string | null;
  estado: string; cxc_documento_id: string | null;
  lineas: FacLinea[];
}
interface FacListItem {
  id: string; numero: string; fecha: string;
  cliente_nit: string | null; cliente_nombre: string | null;
  moneda_codigo: string; total: string; estado: string;
}
interface DevLineaResp {
  id: string; orden: number; factura_linea_id: string;
  producto_id: string | null; producto_codigo: string | null; producto_nombre: string | null;
  descripcion: string; cantidad: string; cantidad_facturada: string | null;
  precio_unitario: string; subtotal: string; iva_tipo: string; iva_pct: string;
  total_iva: string; total: string;
  cuenta_devolucion_id: string | null; cuenta_devolucion_codigo: string | null; cuenta_devolucion_nombre: string | null;
  es_producto: boolean;
}
interface Devolucion {
  id: string; numero: string; factura_id: string; factura_numero: string | null;
  fecha: string; motivo: string; concepto_dian: string | null;
  cliente_id: string; cliente_nit: string | null; cliente_nombre: string | null;
  moneda_id: string; moneda_codigo: string; trm: string | null;
  subtotal: string; total_iva: string; total: string;
  descripcion: string | null; estado: "borrador" | "contabilizado" | "anulado";
  asiento_id: string | null; cxc_documento_id: string | null; dian_estado: string | null;
  lineas: DevLineaResp[];
}
interface ListItem {
  id: string; numero: string; fecha: string;
  factura_id: string; factura_numero: string | null;
  cliente_nombre: string | null; moneda_codigo: string;
  subtotal: string; total_iva: string; total: string;
  estado: "borrador" | "contabilizado" | "anulado"; dian_estado: string | null; creado_en: string;
}
interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }
interface PreviewLinea {
  cuenta_codigo: string | null; cuenta_nombre: string | null;
  tercero_nombre: string | null; centro_costo: string | null; debito: string; credito: string;
}
interface Preview {
  lineas: PreviewLinea[]; total_debito: string; total_credito: string;
  cuadra: boolean; moneda_codigo: string | null; avisos: string[]; asiento_numero?: number | null;
}

// ─── Constantes / helpers ────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado:       "bg-red-50 text-red-600 border border-red-200",
};
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpSm = "w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number, decs = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: decs, maximumFractionDigits: decs });
}
function hoy() { return new Date().toISOString().slice(0, 10); }

// ─── Modal ────────────────────────────────────────────────────────────────

interface LineaForm {
  factura_linea_id: string; descripcion: string;
  producto: boolean; valor_tercero: boolean;
  cantidad_facturada: number; precio: number;
  sub_facturado: number; iva_facturado: number;
  cantidad: string;  // a devolver
}

function Modal({ devolucion, onClose, onSaved }: {
  devolucion: Devolucion | null; onClose: () => void; onSaved: () => void;
}) {
  const soloLectura = !!devolucion && devolucion.estado !== "borrador";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAnular, setShowAnular] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");

  const [factura, setFactura] = useState<Factura | null>(null);
  const [fecha, setFecha] = useState(devolucion?.fecha ?? hoy());
  const [motivo, setMotivo] = useState(devolucion?.motivo ?? "");
  const [conceptoDian, setConceptoDian] = useState(devolucion?.concepto_dian ?? "");
  const [descripcion, setDescripcion] = useState(devolucion?.descripcion ?? "");
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const decs = 2;

  // Picker de factura (solo al crear)
  const [facPicker, setFacPicker] = useState<FacListItem[]>([]);
  const [facQ, setFacQ] = useState("");

  useEffect(() => {
    if (devolucion) {
      // Cargar la factura de origen para conocer cantidades facturadas.
      apiFetch<Factura>(`/facturacion/facturas/${devolucion.factura_id}`).then((f) => {
        setFactura(f);
        const map = new Map(devolucion.lineas.map((d) => [d.factura_linea_id, d]));
        setLineas(f.lineas.filter((l) => !l.valor_tercero).map((l) => {
          const d = map.get(l.id);
          return {
            factura_linea_id: l.id, descripcion: l.descripcion,
            producto: !!l.producto_id, valor_tercero: l.valor_tercero,
            cantidad_facturada: parseFloat(l.cantidad) || 0, precio: parseFloat(l.precio_unitario) || 0,
            sub_facturado: parseFloat(l.subtotal) || 0, iva_facturado: parseFloat(l.total_iva) || 0,
            cantidad: d ? d.cantidad : "0",
          };
        }));
      }).catch(() => {});
    } else {
      apiFetch<ListResponse | { items: FacListItem[] }>(`/facturacion/facturas?estado=contabilizada&por_pagina=100`)
        .then((r) => setFacPicker((r as { items: FacListItem[] }).items ?? [])).catch(() => {});
    }
  }, [devolucion]);

  async function elegirFactura(id: string) {
    setError("");
    try {
      const f = await apiFetch<Factura>(`/facturacion/facturas/${id}`);
      setFactura(f);
      setLineas(f.lineas.filter((l) => !l.valor_tercero).map((l) => ({
        factura_linea_id: l.id, descripcion: l.descripcion,
        producto: !!l.producto_id, valor_tercero: l.valor_tercero,
        cantidad_facturada: parseFloat(l.cantidad) || 0, precio: parseFloat(l.precio_unitario) || 0,
        sub_facturado: parseFloat(l.subtotal) || 0, iva_facturado: parseFloat(l.total_iva) || 0,
        cantidad: "0",
      })));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al cargar la factura"); }
  }

  function calcLinea(l: LineaForm) {
    const cant = parseFloat(l.cantidad) || 0;
    const frac = l.cantidad_facturada > 0 ? cant / l.cantidad_facturada : 0;
    const sub = Math.round(l.sub_facturado * frac * 100) / 100;
    const iva = Math.round(l.iva_facturado * frac * 100) / 100;
    return { sub, iva, total: sub + iva };
  }
  const totales = lineas.reduce((acc, l) => {
    const c = calcLinea(l);
    return { sub: acc.sub + c.sub, iva: acc.iva + c.iva, total: acc.total + c.total };
  }, { sub: 0, iva: 0, total: 0 });

  const lineasConCant = lineas.filter((l) => (parseFloat(l.cantidad) || 0) > 0);

  function buildPayload() {
    return {
      factura_id: factura!.id, fecha, motivo,
      concepto_dian: conceptoDian || null, descripcion: descripcion || null,
      lineas: lineasConCant.map((l) => ({ factura_linea_id: l.factura_linea_id, cantidad: l.cantidad })),
    };
  }

  function validar(): string | null {
    if (!factura) return "Selecciona la factura a devolver";
    if (!motivo.trim()) return "Indica el motivo de la devolución";
    if (lineasConCant.length === 0) return "Indica al menos una línea con cantidad a devolver";
    for (const l of lineasConCant) {
      if ((parseFloat(l.cantidad) || 0) - l.cantidad_facturada > 0.0001)
        return `La cantidad a devolver de "${l.descripcion}" excede lo facturado (${l.cantidad_facturada}).`;
    }
    return null;
  }

  async function verAsiento() {
    if (!factura) return;
    if (!soloLectura) {
      const err = validar();
      if (err) { setError(err); return; }
    }
    setPreviewLoading(true); setError("");
    try {
      let p: Preview;
      if (soloLectura && devolucion) {
        p = await apiFetch<Preview>(`/facturacion/devoluciones/${devolucion.id}/asiento`);
      } else {
        p = await apiFetch<Preview>(`/facturacion/devoluciones/preview-asiento`, {
          method: "POST", body: JSON.stringify(buildPayload()),
        });
      }
      setPreview(p);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al obtener el asiento"); }
    finally { setPreviewLoading(false); }
  }

  async function guardar(contabilizar: boolean) {
    const err = validar();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    try {
      let id: string;
      if (devolucion) {
        await apiFetch(`/facturacion/devoluciones/${devolucion.id}`, { method: "PUT", body: JSON.stringify(buildPayload()) });
        id = devolucion.id;
      } else {
        const nueva = await apiFetch<Devolucion>(`/facturacion/devoluciones`, { method: "POST", body: JSON.stringify(buildPayload()) });
        id = nueva.id;
      }
      if (contabilizar) {
        const c = await apiFetch<Devolucion>(`/facturacion/devoluciones/${id}/contabilizar`, { method: "POST" });
        onSaved();
        if (c.cxc_documento_id) window.open(`/cxc-documento/${c.cxc_documento_id}`, "_blank");
      } else {
        onSaved();
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function anular() {
    if (!motivoAnular.trim()) { setError("Ingresa el motivo de anulación"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch(`/facturacion/devoluciones/${devolucion!.id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivoAnular }) });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  const facPickerFiltrado = facPicker.filter((f) =>
    !facQ.trim() || f.numero.toLowerCase().includes(facQ.toLowerCase()) || (f.cliente_nombre ?? "").toLowerCase().includes(facQ.toLowerCase())
  ).slice(0, 30);

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: "min(980px, 96vw)", maxHeight: "92vh" }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[14px] font-bold text-gray-800">
              {soloLectura ? "Devolución en ventas" : devolucion ? "Editar devolución" : "Nueva devolución"}
            </h2>
            {devolucion && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] font-mono text-gray-500">{devolucion.numero}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[devolucion.estado]}`}>
                  {devolucion.estado.charAt(0).toUpperCase() + devolucion.estado.slice(1)}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Selección de factura (crear) */}
          {!devolucion && !factura && (
            <div>
              <label className={lbl}>Factura a devolver *</label>
              <input value={facQ} onChange={(e) => setFacQ(e.target.value)}
                placeholder="Filtrar por número o cliente…" className={inp} />
              <div className="mt-2 border border-gray-200 rounded-xl overflow-y-auto max-h-72 divide-y divide-gray-50">
                {facPickerFiltrado.length === 0
                  ? <p className="text-[12px] text-gray-400 text-center py-6">No hay facturas contabilizadas</p>
                  : facPickerFiltrado.map((f) => (
                    <button key={f.id} type="button" onClick={() => elegirFactura(f.id)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between">
                      <span>
                        <span className="font-mono font-semibold text-blue-600 text-[12px] mr-2">{f.numero}</span>
                        <span className="text-[12px] text-gray-700">{f.cliente_nombre ?? "—"}</span>
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">{f.moneda_codigo} {fmt(f.total)}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {factura && (
            <>
              {/* Cabecera */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Factura</label>
                  <div className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-[12px]">
                    <span className="font-mono font-semibold text-blue-600 mr-2">{factura.numero}</span>
                    <span className="text-gray-600">{factura.cliente_nombre}</span>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Fecha *</label>
                  <input type="date" value={fecha} disabled={soloLectura} onChange={(e) => setFecha(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Concepto DIAN</label>
                  <input value={conceptoDian} disabled={soloLectura} onChange={(e) => setConceptoDian(e.target.value)}
                    placeholder="Ej: 2" maxLength={5} className={inp} />
                </div>
                <div className="col-span-3">
                  <label className={lbl}>Motivo *</label>
                  <input value={motivo} disabled={soloLectura} onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo de la devolución…" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Moneda</label>
                  <div className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-[12px] text-gray-600">{factura.moneda_codigo}</div>
                </div>
              </div>

              {/* Líneas */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Líneas a devolver</span>
                <div className="mt-2 border border-gray-200 rounded-xl overflow-y-auto max-h-72">
                  <table className="w-full min-w-[640px] text-[11px]">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="text-gray-500 font-semibold text-[10px] uppercase tracking-wide border-b border-gray-100">
                        <th className="px-2 py-2 text-left">Concepto / producto</th>
                        <th className="px-2 py-2 text-right w-24">Facturado</th>
                        <th className="px-2 py-2 text-right w-28">A devolver</th>
                        <th className="px-2 py-2 text-right w-28">Subtotal</th>
                        <th className="px-2 py-2 text-right w-24">IVA</th>
                        <th className="px-2 py-2 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lineas.length === 0 ? (
                        <tr><td colSpan={6} className="px-2 py-6 text-center text-gray-400">La factura no tiene líneas devolvibles</td></tr>
                      ) : lineas.map((l, idx) => {
                        const c = calcLinea(l);
                        return (
                          <tr key={l.factura_linea_id}>
                            <td className="px-2 py-1.5 text-gray-700">
                              {l.descripcion}
                              <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${l.producto ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                                {l.producto ? "Producto" : "Concepto"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(l.cantidad_facturada, 4)}</td>
                            <td className="px-2 py-1.5 text-right">
                              {soloLectura
                                ? <span className="font-mono text-gray-800">{fmt(l.cantidad, 4)}</span>
                                : <MontoInput value={l.cantidad} decimales={4}
                                    onChange={(v) => setLineas((prev) => prev.map((x, i) => i === idx ? { ...x, cantidad: v } : x))}
                                    className={`${inpSm} text-right`} />
                              }
                            </td>
                            <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(c.sub, decs)}</td>
                            <td className="px-2 py-1.5 text-right font-mono text-gray-400">{fmt(c.iva, decs)}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900">{fmt(c.total, decs)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!soloLectura && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Las líneas de producto reingresan a inventario; las de concepto solo generan la nota crédito. Los valores para terceros no se devuelven por aquí.
                  </p>
                )}
              </div>

              {/* Descripción + totales */}
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <label className={lbl}>Observaciones</label>
                  <input value={descripcion} disabled={soloLectura} onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Notas internas…" className={inp} />
                </div>
                <div className="w-56 space-y-1 text-[12px] shrink-0">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono">{fmt(totales.sub, decs)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>IVA</span><span className="font-mono">{fmt(totales.iva, decs)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 text-[13px] border-t border-gray-200 pt-1.5 mt-1"><span>Total NC</span><span className="font-mono">{fmt(totales.total, decs)}</span></div>
                </div>
              </div>
            </>
          )}

          {showAnular && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50/40">
              <label className={lbl}>Motivo de anulación *</label>
              <input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Describe el motivo…" className={inp} />
            </div>
          )}

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex gap-2">
            {devolucion?.estado === "contabilizado" && !showAnular && (
              <button onClick={() => setShowAnular(true)}
                className="px-3 py-1.5 text-[12px] font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Anular</button>
            )}
            {showAnular && (
              <button onClick={anular} disabled={saving}
                className="px-3 py-1.5 text-[12px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? "Anulando…" : "Confirmar anulación"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {devolucion?.estado === "contabilizado" && devolucion.cxc_documento_id && !showAnular && (
              <a href={`/cxc-documento/${devolucion.cxc_documento_id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </a>
            )}
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-white">
              {soloLectura ? "Cerrar" : "Cancelar"}
            </button>
            {factura && (
              <button onClick={verAsiento} disabled={previewLoading}
                className="px-3 py-1.5 text-[12px] font-medium border border-gray-300 text-blue-700 rounded-lg hover:bg-white disabled:opacity-40">
                {previewLoading ? "Calculando…" : "Ver asiento"}
              </button>
            )}
            {!soloLectura && factura && (
              <>
                <button onClick={() => guardar(false)} disabled={saving}
                  className="px-3 py-1.5 text-[12px] font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-white disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar borrador"}
                </button>
                <button onClick={() => guardar(true)} disabled={saving}
                  className="px-3 py-1.5 text-[12px] font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Procesando…" : "Guardar y contabilizar"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview del asiento — componente compartido, para que la doble columna
          de moneda no haya que mantenerla en varios sitios. */}
      {preview && (
        <AsientoModal data={preview} real={!!preview.asiento_numero} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function DevolucionesPage() {
  const title = usePageTitle();
  const [lista, setLista] = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);
  const [fEstado, setFEstado] = useState("");
  const [modo, setModo] = useState<"cerrado" | "crear" | "ver">("cerrado");
  const [activa, setActiva] = useState<Devolucion | null>(null);
  const { orden, alternar } = useOrden<"numero" | "fecha" | "factura" | "cliente" | "total" | "estado">("fecha", "desc");

  const cargar = useCallback(async (pag = pagina) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) });
      if (fEstado) p.set("estado", fEstado);
      const data = await apiFetch<ListResponse>(`/facturacion/devoluciones?${p}`);
      setLista(data.items); setTotalItems(data.total);
    } finally { setLoading(false); }
  }, [pagina, fEstado]);

  useEffect(() => { cargar(pagina); }, [pagina, fEstado]);

  async function abrir(item: ListItem) {
    const d = await apiFetch<Devolucion>(`/facturacion/devoluciones/${item.id}`);
    setActiva(d); setModo("ver");
  }
  function cerrar() { setModo("cerrado"); setActiva(null); }

  const ordenada = ordenarFilas(lista, orden, {
    numero:  (d) => d.numero,
    fecha:   (d) => `${d.fecha} ${d.creado_en}`,
    factura: (d) => d.factura_numero ?? "",
    cliente: (d) => d.cliente_nombre,
    total:   (d) => Number(d.total),
    estado:  (d) => d.estado,
  });
  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Devoluciones de ventas — nota crédito sobre una factura</p>
        </div>
        <button onClick={() => { setActiva(null); setModo("crear"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva devolución
        </button>
      </div>

      <div className="flex items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(1); }}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="contabilizado">Contabilizado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                <Th campo="numero"  orden={orden} alternar={alternar} className="whitespace-nowrap">Número</Th>
                <Th campo="fecha"   orden={orden} alternar={alternar} className="whitespace-nowrap">Fecha</Th>
                <Th campo="factura" orden={orden} alternar={alternar} className="whitespace-nowrap">Factura</Th>
                <Th campo="cliente" orden={orden} alternar={alternar} className="whitespace-nowrap">Cliente</Th>
                <Th campo="total"   orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Total</Th>
                <Th campo="estado"  orden={orden} alternar={alternar} className="whitespace-nowrap">Estado</Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin devoluciones registradas</td></tr>
              ) : ordenada.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5">
                    <button onClick={() => abrir(d)} className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline">{d.numero}</button>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-600">{d.factura_numero ?? "—"}</td>
                  <td className="px-3 py-2.5 max-w-[200px]"><div className="font-medium text-gray-800 truncate">{d.cliente_nombre ?? "—"}</div></td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{d.moneda_codigo} {fmt(d.total)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[d.estado]}`}>
                      {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => abrir(d)} title="Ver"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {totalItems === 0 ? "0" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, totalItems)}`} de {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={pagina === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pagina} / {totalPags}</span>
            <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPags)} disabled={pagina === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {modo !== "cerrado" && (
        <Modal devolucion={activa} onClose={cerrar} onSaved={() => { cerrar(); cargar(1); setPagina(1); }} />
      )}
    </div>
  );
}
