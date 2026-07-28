"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";
import AsientoModal, { AsientoData } from "@/components/AsientoModal";

interface Tercero { id: string; nit: string; razon_social: string; }
interface Moneda  { id: string; codigo: string; decimales: number; es_funcional: boolean; }
interface BanCuenta {
  id: string; nombre: string; numero: string; banco_nombre: string | null;
  cuenta_contable_id: string | null; cuenta_contable_codigo: string | null; activo: boolean;
}
interface Anticipo {
  id: string; numero: string; fecha: string;
  tercero_nit: string | null; tercero_nombre: string | null;
  total: string; saldo: string; estado: "borrador" | "contabilizado" | "anulado";
}
interface ListResponse { items: Anticipo[]; total: number; pagina: number; por_pagina: number; }
interface AnticipoDetalle {
  id: string; numero: string; fecha: string;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  ban_cuenta_id: string | null; moneda_id: string; descripcion: string | null;
  subtotal: string; total: string; saldo: string; estado: string;
}
interface Cruce { id: string; documento_id: string; numero: string; tipo: string; fecha: string; valor: string; estado: string; }
interface FacturaPendiente { id: string; numero: string; fecha: string; fecha_vencimiento: string | null; total: string; saldo: string; tipo: string; }

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number, d = 2) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function dec(v: string) { return parseFloat(v) || 0; }
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado:       "bg-red-50 text-red-600 border border-red-200",
};

function TerceroSearch({ display, onChange, disabled }: { display: string; onChange: (id: string, label: string) => void; disabled?: boolean }) {
  const [q, setQ] = useState(display);
  const [results, setResults] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { setQ(display); }, [display]);
  async function buscar(val: string) {
    if (disabled) return;
    setQ(val);
    if (val.length < 2) { setResults([]); setOpen(false); return; }
    try {
      const r = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}&tipo_tercero=PROVEEDOR&solo_activos=true`);
      setResults(r); setOpen(true);
    } catch { setResults([]); }
  }
  return (
    <div className="relative">
      <input value={q} onChange={e => buscar(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar proveedor por nombre o NIT…" disabled={disabled} className={inp} />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(t => (
            <button key={t.id} onMouseDown={() => { onChange(t.id, `${t.nit} — ${t.razon_social}`); setOpen(false); setQ(`${t.nit} — ${t.razon_social}`); }}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50">
              <span className="font-medium text-gray-700">{t.nit}</span>
              <span className="text-gray-500 ml-2">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnticiposCxpPage() {
  usePageTitle();

  const [rows, setRows]       = useState<Anticipo[]>([]);
  const [total, setTotal]     = useState(0);
  const [pagina, setPagina]   = useState(1);
  const POR_PAGINA = 50;
  const [fDesde, setFDesde]   = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [fHasta, setFHasta]   = useState(hoyLocal);
  const { orden, alternar }   = useOrden<"numero" | "fecha" | "tercero" | "total" | "estado">("fecha", "desc");

  const [monedas, setMonedas]     = useState<Moneda[]>([]);
  const [cuentasBan, setCuentasBan] = useState<BanCuenta[]>([]);

  const [modalOpen, setModalOpen]       = useState(false);
  const [docId, setDocId]               = useState<string | null>(null);
  const [docNumero, setDocNumero]       = useState("");
  const [docEstado, setDocEstado]       = useState("");
  const [soloLectura, setSoloLectura]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [cruces, setCruces]             = useState<Cruce[]>([]);
  const [preview, setPreview]           = useState<AsientoData | null>(null);
  const [previewReal, setPreviewReal]   = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Formulario
  const [fecha, setFecha]         = useState(hoyLocal);
  const [terceroId, setTerceroId] = useState("");
  const [terceroDisplay, setTerceroDisplay] = useState("");
  const [banCuentaId, setBanCuentaId] = useState("");
  const [monedaId, setMonedaId]   = useState("");
  const [valorInput, setValorInput] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Cruce con factura
  const [modalCruce, setModalCruce] = useState(false);
  const [facturas, setFacturas]     = useState<FacturaPendiente[]>([]);
  const [cruceFacId, setCruceFacId] = useState("");
  const [cruceValor, setCruceValor] = useState("");
  const [saldoActual, setSaldoActual] = useState("0");

  const decimales = monedas.find(m => m.es_funcional)?.decimales ?? 2;
  const valor = dec(valorInput);

  const cargar = useCallback(async (p = 1) => {
    try {
      const qs = new URLSearchParams({ tipo: "ANTICIPO", pagina: String(p), por_pagina: String(POR_PAGINA) });
      if (fDesde) qs.set("fecha_desde", fDesde);
      if (fHasta) qs.set("fecha_hasta", fHasta);
      const r = await apiFetch<ListResponse>(`/cxp?${qs}`);
      setRows(r.items); setTotal(r.total); setPagina(p);
    } catch {}
  }, [fDesde, fHasta]);

  useEffect(() => {
    cargar(1);
    apiFetch<Moneda[]>("/maestros/monedas?solo_activas=true").then(setMonedas).catch(() => {});
    apiFetch<BanCuenta[]>("/bancos/cuentas?solo_activas=true").then(d => setCuentasBan(d.filter(c => c.activo))).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => { const f = monedas.find(m => m.es_funcional); if (f && !monedaId) setMonedaId(f.id); }, [monedas]); // eslint-disable-line

  function abrirNuevo() {
    setDocId(null); setDocNumero(""); setDocEstado(""); setSoloLectura(false);
    setFecha(hoyLocal()); setTerceroId(""); setTerceroDisplay("");
    setBanCuentaId(""); setMonedaId(monedas.find(m => m.es_funcional)?.id || "");
    setValorInput(""); setDescripcion(""); setCruces([]); setError(""); setModalOpen(true);
  }

  async function abrirDetalle(a: Anticipo) {
    setDocId(a.id); setDocNumero(a.numero); setDocEstado(a.estado);
    setSoloLectura(a.estado !== "borrador"); setError(""); setModalOpen(true);
    try {
      const d = await apiFetch<AnticipoDetalle>(`/cxp/${a.id}`);
      setFecha(d.fecha); setTerceroId(d.tercero_id);
      setTerceroDisplay(`${d.tercero_nit || ""} — ${d.tercero_nombre || ""}`);
      setBanCuentaId(d.ban_cuenta_id || ""); setMonedaId(d.moneda_id);
      setValorInput(d.subtotal); setDescripcion(d.descripcion || "");
      setSaldoActual(d.saldo);
      apiFetch<Cruce[]>(`/cxp/${a.id}/cruces`).then(setCruces).catch(() => setCruces([]));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al cargar"); }
  }

  function cerrar() { if (!saving) setModalOpen(false); }

  function payload() {
    return {
      tipo: "ANTICIPO", fecha, tercero_id: terceroId, moneda_id: monedaId,
      ban_cuenta_id: banCuentaId, valor, descripcion: descripcion || null, lineas: [],
    };
  }

  async function guardarInterno(): Promise<string | null> {
    if (!terceroId) { setError("Selecciona un proveedor"); return null; }
    if (!banCuentaId) { setError("Selecciona la cuenta bancaria"); return null; }
    if (valor <= 0) { setError("Ingresa el valor del anticipo"); return null; }
    if (docId) { await apiFetch(`/cxp/${docId}`, { method: "PUT", body: JSON.stringify(payload()) }); return docId; }
    const n = await apiFetch<{ id: string }>("/cxp", { method: "POST", body: JSON.stringify(payload()) });
    return n.id;
  }

  async function guardar(contabilizar: boolean) {
    setSaving(true); setError("");
    try {
      const id = await guardarInterno();
      if (!id) return;
      if (contabilizar) await apiFetch(`/cxp/${id}/contabilizar`, { method: "POST" });
      setModalOpen(false); cargar(pagina);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function verAsiento() {
    setPreviewLoading(true); setError("");
    try {
      let d: AsientoData;
      if (soloLectura && docId) { d = await apiFetch<AsientoData>(`/cxp/${docId}/asiento`); setPreviewReal(true); }
      else { d = await apiFetch<AsientoData>("/cxp/preview-asiento", { method: "POST", body: JSON.stringify(payload()) }); setPreviewReal(false); }
      setPreview(d);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al obtener el asiento"); }
    finally { setPreviewLoading(false); }
  }

  async function anular() {
    const motivo = window.prompt("Motivo de anulación:");
    if (!motivo || !motivo.trim()) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/cxp/${docId}/anular`, { method: "POST", body: JSON.stringify({ motivo }) });
      setModalOpen(false); cargar(pagina);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al anular"); }
    finally { setSaving(false); }
  }

  // ── Cruce con factura ──
  async function abrirCruce() {
    setError("");
    try {
      const facs = await apiFetch<FacturaPendiente[]>(`/cxp/facturas-pendientes?tercero_id=${terceroId}`);
      setFacturas(facs); setCruceFacId(""); setCruceValor(""); setModalCruce(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al cargar facturas"); }
  }
  async function aplicarCruce() {
    const fac = facturas.find(f => f.id === cruceFacId);
    if (!fac || dec(cruceValor) <= 0) { setError("Selecciona factura y valor"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch("/cxp/aplicar", {
        method: "POST",
        body: JSON.stringify({ documento_credito_id: docId, documento_debito_id: cruceFacId, valor: dec(cruceValor), fecha: hoyLocal() }),
      });
      setModalCruce(false); setModalOpen(false); cargar(pagina);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al aplicar"); }
    finally { setSaving(false); }
  }

  const ordenada = ordenarFilas(rows, orden, {
    numero: r => r.numero, fecha: r => r.fecha, tercero: r => r.tercero_nombre,
    total: r => Number(r.total), estado: r => r.estado,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">Anticipos a proveedores</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Pagos por adelantado a proveedores, para cruzar luego con sus facturas</p>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo anticipo
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" />
        </div>
        <button onClick={() => cargar(1)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">Buscar</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <Th campo="numero" orden={orden} alternar={alternar}>Número</Th>
              <Th campo="fecha" orden={orden} alternar={alternar}>Fecha</Th>
              <Th campo="tercero" orden={orden} alternar={alternar}>Proveedor</Th>
              <Th campo="total" orden={orden} alternar={alternar} align="right">Valor</Th>
              <Th campo="total" orden={orden} alternar={alternar} align="right">Saldo</Th>
              <Th campo="estado" orden={orden} alternar={alternar}>Estado</Th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordenada.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin anticipos registrados</td></tr>
            )}
            {ordenada.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5">
                  <button onClick={() => abrirDetalle(r)} className="font-mono text-[11px] text-blue-700 hover:text-blue-900 hover:underline">{r.numero}</button>
                </td>
                <td className="px-3 py-2.5 text-gray-600">{r.fecha}</td>
                <td className="px-3 py-2.5">
                  <p className="text-gray-800 font-medium truncate max-w-[220px]">{r.tercero_nombre}</p>
                  <p className="text-gray-400 text-[10px]">{r.tercero_nit}</p>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-800">${fmt(r.total, decimales)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">${fmt(r.saldo, decimales)}</td>
                <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[r.estado]}`}>{r.estado}</span></td>
                <td className="px-3 py-2.5 text-right">
                  {r.estado === "borrador" ? (
                    <button onClick={() => abrirDetalle(r)} title="Editar"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Editar
                    </button>
                  ) : (
                    <button onClick={() => abrirDetalle(r)} title="Ver"
                      className="inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > POR_PAGINA && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">{total} registros</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(total / POR_PAGINA) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => cargar(p)} className={`w-7 h-7 rounded text-[11px] ${p === pagina ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo / detalle */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full flex flex-col" style={{ maxWidth: 640, maxHeight: "92vh" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-gray-800">{docId ? (soloLectura ? "Anticipo a proveedor" : "Editar anticipo") : "Nuevo anticipo a proveedor"}</h2>
                  {soloLectura && docEstado && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[docEstado] ?? ""}`}>{docEstado}</span>}
                </div>
                {soloLectura && docNumero && <p className="text-[11px] text-gray-400 font-mono mt-0.5">{docNumero}</p>}
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto space-y-4">
              <div>
                <label className={lbl}>Proveedor</label>
                <TerceroSearch display={terceroDisplay} disabled={soloLectura} onChange={(id, l) => { setTerceroId(id); setTerceroDisplay(l); }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={soloLectura} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Moneda</label>
                  <select value={monedaId} onChange={e => setMonedaId(e.target.value)} disabled={soloLectura} className={inp}>
                    {monedas.map(m => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Cuenta bancaria (salida)</label>
                <select value={banCuentaId} onChange={e => setBanCuentaId(e.target.value)} disabled={soloLectura} className={inp}>
                  <option value="">— Seleccionar —</option>
                  {cuentasBan.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.nombre} ({c.numero}){c.cuenta_contable_codigo ? ` · ${c.cuenta_contable_codigo}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Valor del anticipo</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium">$</span>
                  <MontoInput value={valorInput} onChange={setValorInput} decimales={decimales} disabled={soloLectura}
                    className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] font-semibold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className={lbl}>Descripción</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value)} disabled={soloLectura} placeholder="Ej. Anticipo compra materiales" className={inp} />
              </div>

              {soloLectura && (
                <div className="flex justify-between text-[12px] pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Saldo disponible del anticipo</span>
                  <span className="font-semibold text-gray-800">${fmt(saldoActual, decimales)}</span>
                </div>
              )}

              {cruces.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Aplicado a facturas</p>
                  <table className="w-full text-[11px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead><tr className="bg-gray-50 border-b border-gray-200">
                      {["Documento", "Fecha", "Valor"].map(h => <th key={h} className={`px-2 py-1.5 text-[10px] font-bold uppercase text-gray-400 ${h === "Valor" ? "text-right" : "text-left"}`}>{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {cruces.map(c => (
                        <tr key={c.id}>
                          <td className="px-2 py-1.5 font-mono text-blue-600">{c.numero}</td>
                          <td className="px-2 py-1.5 text-gray-500">{c.fecha}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(c.valor, decimales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 flex-wrap">
              {error && <p className="w-full text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</p>}
              <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white">{soloLectura ? "Cerrar" : "Cancelar"}</button>
              <button onClick={verAsiento} disabled={previewLoading || !terceroId || !banCuentaId || valor <= 0}
                className="px-4 py-2 text-[12px] font-medium border border-gray-300 text-blue-700 rounded-lg hover:bg-white disabled:opacity-40">
                {previewLoading ? "Cargando…" : "Ver asiento"}
              </button>
              {!soloLectura && (
                <>
                  <button onClick={() => guardar(false)} disabled={saving} className="flex-1 py-2 border border-blue-300 text-blue-600 bg-white hover:bg-blue-50 text-[12px] font-medium rounded-lg disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar borrador"}
                  </button>
                  <button onClick={() => guardar(true)} disabled={saving} className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                    {saving ? "Procesando..." : "Guardar y contabilizar"}
                  </button>
                </>
              )}
              {soloLectura && docEstado === "contabilizado" && parseFloat(saldoActual) > 0 && (
                <button onClick={abrirCruce} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium rounded-lg">Cruzar con factura</button>
              )}
              {soloLectura && docEstado !== "anulado" && (
                <button onClick={anular} disabled={saving} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-[12px] font-medium rounded-lg">Anular</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal cruce */}
      {modalCruce && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-800">Cruzar anticipo con factura</h3>
            <div>
              <label className={lbl}>Factura / nota débito del proveedor</label>
              <select value={cruceFacId} onChange={e => { setCruceFacId(e.target.value); const f = facturas.find(x => x.id === e.target.value); setCruceValor(f ? String(Math.min(dec(f.saldo), dec(saldoActual))) : ""); }} className={inp}>
                <option value="">— Seleccionar —</option>
                {facturas.map(f => <option key={f.id} value={f.id}>{f.numero} · saldo ${fmt(f.saldo, decimales)}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Valor a aplicar</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">$</span>
                <MontoInput value={cruceValor} onChange={setCruceValor} decimales={decimales} max={Math.min(dec(saldoActual), dec(facturas.find(f => f.id === cruceFacId)?.saldo || "0") || dec(saldoActual))}
                  className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-md text-[12px]" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Saldo del anticipo: ${fmt(saldoActual, decimales)}</p>
            </div>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalCruce(false)} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={aplicarCruce} disabled={saving || !cruceFacId} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">{saving ? "Aplicando…" : "Aplicar"}</button>
            </div>
          </div>
        </div>
      )}

      {preview && <AsientoModal data={preview} real={previewReal} onClose={() => setPreview(null)} />}
    </div>
  );
}
