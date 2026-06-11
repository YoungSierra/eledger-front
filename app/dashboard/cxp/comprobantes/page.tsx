"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Tercero  { id: string; nit: string; razon_social: string; }
interface Moneda   { id: string; codigo: string; es_funcional: boolean; }
interface BanCuenta {
  id: string; nombre: string; numero: string; tipo: string;
  banco_nombre: string | null;
  cuenta_contable_id: string | null;
  activo: boolean;
}
interface FacturaPendiente {
  id: string; numero: string; fecha: string;
  fecha_vencimiento: string | null;
  total: string; aplicado: string; saldo: string;
  dias_vencimiento: number | null;
}
interface AplicacionPendiente {
  id: string; factura_id: string; numero: string; fecha: string;
  fecha_vencimiento: string | null; total: string; saldo_original: string; valor: string;
}
interface Comprobante {
  id: string; numero: string; fecha: string;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  ban_cuenta_id: string | null; moneda_id: string; moneda_codigo: string;
  trm: string | null; subtotal: string; total: string; saldo: string;
  descripcion: string | null; estado: "borrador" | "contabilizado" | "anulado";
  asiento_id: string | null;
}
interface ListItem {
  id: string; numero: string; fecha: string;
  tercero_nit: string | null; tercero_nombre: string | null;
  moneda_codigo: string; total: string; saldo: string;
  estado: "borrador" | "contabilizado" | "anulado";
}
interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }
interface AplicacionForm { factura_id: string; checked: boolean; valor: string; }

// ─── Constantes ───────────────────────────────────────────────────────────────

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado:       "bg-red-50 text-red-600 border border-red-200",
};

function fmt(v: string | number, d = 2) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function dec(v: string) { return parseFloat(v) || 0; }
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TerceroSearch({ display, onChange, disabled = false }: {
  display: string; onChange: (id: string, label: string) => void; disabled?: boolean;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setQ(display); }, [display]);
  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpts([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}&solo_activos=true`).catch(() => []);
      if (data.length > 0 && ref.current) {
        const r = ref.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
      }
      setOpts(data.slice(0, 10)); setOpen(data.length > 0);
    }, 250);
  }
  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Buscar proveedor…" className={`${inp} disabled:bg-gray-50`} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((t) => (
            <button key={t.id} type="button"
              onMouseDown={() => { setQ(`${t.nit} — ${t.razon_social}`); setOpen(false); onChange(t.id, `${t.nit} — ${t.razon_social}`); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{t.nit}</span>
              <span className="text-[11px] text-gray-700">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ComprobantesPage() {
  const title = usePageTitle();
  const searchParams = useSearchParams();
  const [lista, setLista]       = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina]     = useState(1);
  const porPagina = 50;
  const [loading, setLoading]   = useState(true);

  // Filtros
  const [fEstado, setFEstado] = useState("");
  const [fDesde, setFDesde]   = useState("");
  const [fHasta, setFHasta]   = useState("");

  // Catálogos
  const [monedas, setMonedas]     = useState<Moneda[]>([]);
  const [monedaFuncId, setMonedaFuncId] = useState("");
  const [cuentasBancarias, setCuentasBancarias] = useState<BanCuenta[]>([]);

  // Modal
  const [modalOpen, setModalOpen]   = useState(false);
  const [activo, setActivo]         = useState<Comprobante | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [soloLectura, setSoloLectura] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [modalAnular, setModalAnular]   = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [modalImprimir, setModalImprimir] = useState(false);
  const [idImprimir, setIdImprimir]       = useState("");

  // Form
  const hoy = hoyLocal();
  const [fFecha, setFFecha]           = useState(hoy);
  const [fTerceroId, setFTerceroId]   = useState("");
  const [fTerceroDisplay, setFTerceroDisplay] = useState("");
  const [fBanCuentaId, setFBanCuentaId] = useState("");
  const [fMonedaId, setFMonedaId]     = useState("");
  const [fTrm, setFTrm]               = useState("");
  const [fValorPagado, setFValorPagado] = useState("");
  const [fDescripcion, setFDescripcion] = useState("");

  // Facturas pendientes y aplicaciones
  const [facturasPend, setFacturasPend]   = useState<FacturaPendiente[]>([]);
  const [aplicaciones, setAplicaciones]   = useState<AplicacionForm[]>([]);
  const [cargandoFacs, setCargandoFacs]   = useState(false);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch<Moneda[]>("/maestros/monedas").then((data) => {
      setMonedas(data);
      const func = data.find((m) => m.es_funcional);
      if (func) { setMonedaFuncId(func.id); setFMonedaId(func.id); }
    }).catch(() => {});
    apiFetch<BanCuenta[]>("/bancos/cuentas").then((data) =>
      setCuentasBancarias(data.filter((c) => c.activo && c.cuenta_contable_id))
    ).catch(() => {});

    const tid = searchParams.get("tercero_id");
    const tdisplay = searchParams.get("tercero_display");
    if (tid) {
      abrirCrear({ id: tid, display: tdisplay || "" });
      window.history.replaceState(null, "", "/dashboard/cxp/comprobantes");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listar ─────────────────────────────────────────────────────────────────
  const cargar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina), tipo: "COMPROBANTE" });
      if (fEstado) p.set("estado", fEstado);
      if (fDesde)  p.set("fecha_desde", fDesde);
      if (fHasta)  p.set("fecha_hasta", fHasta);
      const res = await apiFetch<ListResponse>(`/cxp?${p}`);
      setLista(res.items); setTotalItems(res.total);
    } finally { setLoading(false); }
  }, [fEstado, fDesde, fHasta]);

  useEffect(() => { setPagina(1); cargar(1); }, [fEstado, fDesde, fHasta]);
  useEffect(() => { cargar(pagina); }, [pagina]);

  // ── Manejo facturas ────────────────────────────────────────────────────────

  function toggleCheck(idx: number, checked: boolean) {
    const fac = facturasPend[idx];
    setAplicaciones((prev) => {
      const next = [...prev];
      if (checked) {
        const yaEscrito = dec(next[idx].valor);
        if (yaEscrito > 0) {
          // Ya tiene valor → solo marca el check
          next[idx] = { ...next[idx], checked: true };
        } else {
          // Sin valor → auto-calcula con lo que queda disponible
          const yaAplicado = prev.reduce((s, a, i) => i === idx ? s : s + dec(a.valor), 0);
          const disp = valorPagado - yaAplicado;
          const aplicar = Math.min(Math.max(0, disp), dec(fac.saldo));
          next[idx] = { ...next[idx], checked: true, valor: aplicar > 0 ? String(Math.round(aplicar * 10000) / 10000) : "" };
        }
      } else {
        next[idx] = { ...next[idx], checked: false, valor: "" };
      }
      return next;
    });
  }

  function setValorAplicacion(idx: number, val: string, saldoMax: number) {
    const limitado = dec(val) > saldoMax ? String(saldoMax) : val;
    setAplicaciones((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], valor: limitado };
      return next;
    });
  }

  // ── Cargar facturas pendientes ─────────────────────────────────────────────
  async function cargarFacturasPend(terceroId: string, excluirId?: string) {
    if (!terceroId) { setFacturasPend([]); setAplicaciones([]); return; }
    setCargandoFacs(true);
    try {
      const q = new URLSearchParams({ tercero_id: terceroId });
      if (excluirId) q.set("excluir_comprobante_id", excluirId);
      const facs = await apiFetch<FacturaPendiente[]>(`/cxp/facturas-pendientes?${q}`);
      setFacturasPend(facs);
      setAplicaciones(facs.map((f) => ({ factura_id: f.id, checked: false, valor: "" })));
    } finally { setCargandoFacs(false); }
  }

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const valorPagado   = dec(fValorPagado);
  const totalAplicado = aplicaciones
    .filter((a) => a.checked || dec(a.valor) > 0)
    .reduce((s, a) => s + dec(a.valor), 0);
  const disponible    = valorPagado - totalAplicado;
  const cuadra        = valorPagado > 0 && Math.abs(disponible) < 0.01;

  // ── Abrir modal ────────────────────────────────────────────────────────────
  function abrirCrear(prefill?: { id: string; display: string }) {
    setEditandoId(null); setActivo(null); setSoloLectura(false);
    setFFecha(hoy); setFTerceroId(prefill?.id || ""); setFTerceroDisplay(prefill?.display || "");
    setFBanCuentaId(""); setFMonedaId(monedaFuncId); setFTrm("");
    setFValorPagado(""); setFDescripcion("");
    setFacturasPend([]); setAplicaciones([]);
    setError(""); setModalOpen(true);
    if (prefill?.id) cargarFacturasPend(prefill.id);
  }

  async function abrirDetalle(item: ListItem) {
    const esBorrador = item.estado === "borrador";
    setSoloLectura(!esBorrador);
    setLoadingDetalle(true);
    setEditandoId(item.id);
    setError("");
    setModalOpen(true);

    const [doc, apps] = await Promise.all([
      apiFetch<Comprobante>(`/cxp/${item.id}`).catch(() => null),
      apiFetch<AplicacionPendiente[]>(`/cxp/${item.id}/aplicaciones`).catch(() => []),
    ]);
    if (!doc) { setLoadingDetalle(false); return; }

    setActivo(doc);
    setFFecha(doc.fecha);
    setFTerceroId(doc.tercero_id);
    setFTerceroDisplay(doc.tercero_nit && doc.tercero_nombre ? `${doc.tercero_nit} — ${doc.tercero_nombre}` : "");
    setFBanCuentaId(doc.ban_cuenta_id ?? "");
    setFMonedaId(doc.moneda_id);
    setFTrm(doc.trm ?? "");
    setFValorPagado(doc.subtotal);
    setFDescripcion(doc.descripcion ?? "");

    let todasLasFacs: FacturaPendiente[];
    if (!esBorrador) {
      todasLasFacs = apps.map((ap) => ({
        id: ap.factura_id, numero: ap.numero, fecha: ap.fecha,
        fecha_vencimiento: ap.fecha_vencimiento,
        total: ap.total, aplicado: ap.valor, saldo: ap.saldo_original, dias_vencimiento: null,
      }));
    } else {
      const facs = await apiFetch<FacturaPendiente[]>(`/cxp/facturas-pendientes?tercero_id=${doc.tercero_id}&excluir_comprobante_id=${doc.id}`).catch(() => []);
      const facturasEnComprobante = apps.map((ap) => ap.factura_id);
      todasLasFacs = [
        ...apps.map((ap) => ({
          id: ap.factura_id, numero: ap.numero, fecha: ap.fecha,
          fecha_vencimiento: ap.fecha_vencimiento,
          total: ap.total, aplicado: "0", saldo: ap.saldo_original, dias_vencimiento: null,
        })),
        ...facs.filter((f) => !facturasEnComprobante.includes(f.id)),
      ];
    }
    setFacturasPend(todasLasFacs);
    setAplicaciones(todasLasFacs.map((f) => {
      const ap = apps.find((a) => a.factura_id === f.id);
      return { factura_id: f.id, checked: !!ap, valor: ap ? ap.valor : "" };
    }));
    setLoadingDetalle(false);
  }

  function cerrar() {
    setModalOpen(false); setActivo(null); setEditandoId(null);
    setSoloLectura(false);
    setError(""); setModalAnular(false); setMotivoAnular("");
  }

  // ── Guardar ────────────────────────────────────────────────────────────────
  async function guardar(contabilizar = false) {
    if (!fTerceroId) { setError("Selecciona el proveedor"); return; }
    if (!fBanCuentaId) { setError("Selecciona la cuenta bancaria"); return; }
    if (!fValorPagado || valorPagado <= 0) { setError("El valor pagado debe ser mayor que cero"); return; }
    const apls = aplicaciones.filter((a) => a.checked || dec(a.valor) > 0);
    if (apls.length === 0) { setError("Selecciona al menos una factura a pagar"); return; }
    if (!cuadra) { setError(`Quedan $${fmt(disponible)} sin aplicar`); return; }

    const payload = {
      fecha: fFecha,
      tercero_id: fTerceroId,
      ban_cuenta_id: fBanCuentaId,
      moneda_id: fMonedaId,
      trm: fMonedaId !== monedaFuncId && fTrm ? parseFloat(fTrm) : null,
      valor_pagado: valorPagado,
      descripcion: fDescripcion.trim() || null,
      aplicaciones: apls.filter((a) => dec(a.valor) > 0).map((a) => ({ factura_id: a.factura_id, valor: dec(a.valor) })),
    };

    setSaving(true); setError("");
    try {
      const doc = editandoId
        ? await apiFetch<Comprobante>(`/cxp/${editandoId}/comprobante`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch<Comprobante>("/cxp/comprobante", { method: "POST", body: JSON.stringify(payload) });
      if (contabilizar) {
        await apiFetch(`/cxp/${doc.id}/contabilizar`, { method: "POST" });
        cerrar(); cargar(1); setPagina(1);
        setIdImprimir(doc.id); setModalImprimir(true);
      } else {
        cerrar(); cargar(1); setPagina(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }



  async function anular() {
    if (!motivoAnular.trim()) { setError("El motivo es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch(`/cxp/${activo!.id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivoAnular }) });
      cerrar(); cargar(1); setPagina(1);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));
  const esExtranjera = fMonedaId && fMonedaId !== monedaFuncId;

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Pagos a proveedores</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo comprobante
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Estado</label>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="contabilizado">Contabilizado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Desde</label>
          <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Hasta</label>
          <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        {(fEstado || fDesde || fHasta) && (
          <button onClick={() => { setFEstado(""); setFDesde(""); setFHasta(""); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline pb-0.5">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                {["Número","Fecha","Proveedor","Total pagado","Estado",""].map((h) => (
                  <th key={h} className={`${["Total pagado"].includes(h) ? "text-right" : "text-left"} px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin comprobantes registrados</td></tr>
              ) : lista.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">{d.numero}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{d.tercero_nombre}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{d.tercero_nit}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(d.total)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[d.estado]}`}>
                      {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {d.estado === "borrador" ? (
                      <button onClick={() => abrirDetalle(d)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    ) : (
                      <button onClick={() => abrirDetalle(d)} title="Ver"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {totalItems === 0 ? "0" : `${(pagina-1)*porPagina+1}–${Math.min(pagina*porPagina,totalItems)}`} de {totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={pagina===1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina((p) => Math.max(1,p-1))} disabled={pagina===1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pagina} / {totalPags}</span>
            <button onClick={() => setPagina((p) => Math.min(totalPags,p+1))} disabled={pagina===totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPags)} disabled={pagina===totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* ── Modal único (crear / editar / ver) ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxWidth: 1140, width: "95vw", maxHeight: "92vh", height: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    {soloLectura ? "Comprobante de pago" : editandoId ? "Editar comprobante" : "Nuevo comprobante de pago"}
                  </h2>
                  {soloLectura && activo && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[activo.estado]}`}>
                      {activo.estado.charAt(0).toUpperCase() + activo.estado.slice(1)}
                    </span>
                  )}
                </div>
                {soloLectura && activo && (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{activo.numero}</p>
                )}
              </div>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {loadingDetalle ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[12px] text-gray-400">Cargando...</p>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Panel izquierdo — datos del pago */}
                <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

                    <div>
                      <label className={lbl}>Fecha</label>
                      <input type="date" value={fFecha} disabled={soloLectura}
                        onChange={(e) => setFFecha(e.target.value)}
                        className={`${inp} disabled:bg-gray-50 disabled:text-gray-600`} />
                    </div>

                    <div>
                      <label className={lbl}>Proveedor</label>
                      <TerceroSearch display={fTerceroDisplay} disabled={soloLectura || !!editandoId}
                        onChange={(id, label) => { setFTerceroId(id); setFTerceroDisplay(label); cargarFacturasPend(id); }} />
                    </div>

                    <div>
                      <label className={lbl}>Cuenta bancaria</label>
                      <select value={fBanCuentaId} disabled={soloLectura}
                        onChange={(e) => setFBanCuentaId(e.target.value)}
                        className={`${inp} disabled:bg-gray-50 disabled:text-gray-600`}>
                        <option value="">Seleccionar…</option>
                        {cuentasBancarias.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre} — {c.numero}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={lbl}>Moneda</label>
                      <select value={fMonedaId} disabled={soloLectura}
                        onChange={(e) => { setFMonedaId(e.target.value); setFTrm(""); }}
                        className={`${inp} disabled:bg-gray-50 disabled:text-gray-600`}>
                        {monedas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                      </select>
                    </div>

                    {esExtranjera && (
                      <div>
                        <label className={lbl}>TRM</label>
                        <input type="number" step="0.01" value={fTrm} disabled={soloLectura}
                          onChange={(e) => setFTrm(e.target.value)}
                          className={`${inp} disabled:bg-gray-50 disabled:text-gray-600`} />
                      </div>
                    )}

                    <div>
                      <label className={lbl}>Valor pagado</label>
                      <MontoInput value={fValorPagado} onChange={setFValorPagado} decimales={2}
                        disabled={soloLectura}
                        className={`${inp} text-right font-mono disabled:bg-gray-50 disabled:text-gray-600`} />
                    </div>

                    <div>
                      <label className={lbl}>Descripción</label>
                      <input value={fDescripcion} disabled={soloLectura}
                        onChange={(e) => setFDescripcion(e.target.value)}
                        placeholder="Concepto del pago…"
                        className={`${inp} disabled:bg-gray-50 disabled:text-gray-600`} />
                    </div>

                    {/* Resumen numérico — solo en edición */}
                    {!soloLectura && (
                      <div className="pt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-gray-500">
                          <span>Valor pagado</span>
                          <span className="font-medium font-mono">{fmt(valorPagado)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Aplicado</span>
                          <span className="font-medium font-mono">{fmt(totalAplicado)}</span>
                        </div>
                        <div className={`flex justify-between pt-1.5 border-t font-bold text-[12px] ${cuadra ? "text-green-700" : disponible < 0 ? "text-red-600" : "text-blue-700"}`}>
                          <span>Disponible</span>
                          <span className="font-mono">{fmt(disponible)}</span>
                        </div>
                        {disponible < 0 && <p className="text-[10px] text-red-500">Aplicado supera el total pagado</p>}
                        {cuadra && <p className="text-[10px] text-green-600 font-medium">✓ Listo para guardar</p>}
                      </div>
                    )}

                    {/* Total en solo lectura */}
                    {soloLectura && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold uppercase text-gray-500">Total pagado</span>
                          <span className="text-[16px] font-bold font-mono text-blue-700">{fmt(fValorPagado || "0")}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer izquierdo — botones */}
                  <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                    {soloLectura ? (
                      <>
                        {activo?.estado === "contabilizado" && (
                          <button onClick={() => window.open(`/comprobante-pago/${activo.id}`, "_blank")}
                            className="w-full py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-[12px] font-medium rounded-lg flex items-center justify-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            Imprimir
                          </button>
                        )}
                        {activo?.estado !== "anulado" && (
                          <button onClick={() => { setMotivoAnular(""); setError(""); setModalAnular(true); }}
                            className="w-full py-2 border border-red-200 text-red-600 bg-white hover:bg-red-50 text-[12px] font-medium rounded-lg">
                            Anular
                          </button>
                        )}
                        <button onClick={cerrar} className="w-full py-1.5 text-[11px] text-gray-500 hover:text-gray-700">Cerrar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => guardar(false)} disabled={saving || !cuadra}
                          className="w-full py-2 border border-blue-300 text-blue-600 bg-white hover:bg-blue-50 text-[12px] font-medium rounded-lg disabled:opacity-50">
                          {saving ? "Guardando..." : "Guardar borrador"}
                        </button>
                        <button onClick={() => guardar(true)} disabled={saving || !cuadra}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg disabled:opacity-50">
                          {saving ? "Procesando..." : "Guardar y contabilizar"}
                        </button>
                        <button onClick={cerrar} className="w-full py-1.5 text-[11px] text-gray-500 hover:text-gray-700">Cancelar</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Panel derecho — facturas */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                    <p className="text-[12px] font-semibold text-gray-700">
                      {soloLectura ? "Facturas pagadas" : "Facturas pendientes del proveedor"}
                    </p>
                    {!soloLectura && <p className="text-[11px] text-gray-400 mt-0.5">Selecciona las que va a cubrir este pago</p>}
                  </div>
                  <div className="flex-1 overflow-auto">
                    {cargandoFacs ? (
                      <p className="text-center py-10 text-[12px] text-gray-400">Cargando...</p>
                    ) : !fTerceroId ? (
                      <p className="text-center py-10 text-[12px] text-gray-400">Selecciona un proveedor</p>
                    ) : facturasPend.length === 0 ? (
                      <p className="text-center py-10 text-[12px] text-gray-400">
                        {soloLectura ? "Sin facturas aplicadas" : "Sin facturas pendientes"}
                      </p>
                    ) : (
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">Factura</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">Vence</th>
                            <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400">Total factura</th>
                            <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              {soloLectura ? "Pagado" : "Aplicado"}
                            </th>
                            {!soloLectura && <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400">Saldo</th>}
                            {!soloLectura && <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400 w-32">Aplicar</th>}
                            {!soloLectura && <th className="w-8"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {facturasPend.map((f, idx) => {
                            const ap = aplicaciones[idx];
                            if (!ap) return null;
                            const vencida = f.dias_vencimiento !== null && f.dias_vencimiento < 0;
                            return (
                              <tr key={f.id} className={`transition-colors ${(ap.checked || dec(ap.valor) > 0) ? "bg-blue-50/40" : "hover:bg-gray-50/60"}`}>
                                <td className="px-3 py-2.5">
                                  <p className="font-mono font-semibold text-blue-600 text-[11px]">{f.numero}</p>
                                  <p className="text-[10px] text-gray-400">{f.fecha}</p>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  {f.fecha_vencimiento ? (
                                    <span className={`text-[11px] ${vencida ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                                      {f.fecha_vencimiento}
                                      {vencida && <p className="text-[10px]">{Math.abs(f.dias_vencimiento ?? 0)}d venc.</p>}
                                    </span>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-gray-500 text-[11px]">{fmt(f.total)}</td>
                                <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                                  {soloLectura
                                    ? <span className="font-semibold text-gray-800">{fmt(ap.valor)}</span>
                                    : <span className="text-gray-400">{dec(f.aplicado) > 0 ? fmt(f.aplicado) : "—"}</span>
                                  }
                                </td>
                                {!soloLectura && (
                                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{fmt(f.saldo)}</td>
                                )}
                                {!soloLectura && (
                                  <td className="px-3 py-2.5 text-right">
                                    <MontoInput value={ap.valor}
                                      onChange={(v) => setValorAplicacion(idx, v, dec(f.saldo))}
                                      decimales={2} disabled={ap.checked}
                                      placeholder={fmt(f.saldo)}
                                      className={`w-28 px-2 py-1 border rounded text-[11px] text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                        ap.checked ? "border-blue-200 bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-200 bg-white"
                                      }`} />
                                  </td>
                                )}
                                {!soloLectura && (
                                  <td className="px-3 py-2.5 text-center">
                                    <input type="checkbox" checked={ap.checked}
                                      onChange={(e) => toggleCheck(idx, e.target.checked)}
                                      className="w-3.5 h-3.5 rounded accent-blue-600" />
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal anular */}
      {modalAnular && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-3">Anular comprobante</h3>
            <div className="mb-4">
              <label className={lbl}>Motivo *</label>
              <input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Motivo…" className={inp} autoFocus />
            </div>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setModalAnular(false)} className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={anular} disabled={saving} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Anulando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal imprimir */}
      {modalImprimir && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            </div>
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Comprobante contabilizado</h3>
            <p className="text-[12px] text-gray-500 mb-5">¿Deseas imprimir o guardar como PDF?</p>
            <div className="flex gap-2">
              <button onClick={() => setModalImprimir(false)} className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Ahora no</button>
              <button onClick={() => { window.open(`/comprobante-pago/${idImprimir}`, "_blank"); setModalImprimir(false); }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
