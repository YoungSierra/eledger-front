"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Moneda   { id: string; codigo: string; nombre: string; es_funcional: boolean; }
interface Tercero  { id: string; nit: string; razon_social: string; }
interface Cuenta   { id: string; codigo: string; nombre: string; }

interface Retencion {
  id: string; tipo: string; concepto: string;
  base: string; porcentaje: string; valor: string;
  cuenta_id: string; cuenta_codigo: string | null; cuenta_nombre: string | null;
}

interface Documento {
  id: string; numero: string;
  tipo: "FACTURA" | "RECIBO" | "NOTA_CREDITO" | "NOTA_DEBITO" | "ANTICIPO";
  fecha: string; fecha_vencimiento: string | null;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  moneda_id: string; moneda_codigo: string; trm: string | null;
  subtotal: string; total_iva: string; total_retenciones: string;
  total: string; saldo: string; descripcion: string | null;
  estado: "borrador" | "contabilizado" | "anulado";
  tarifa_iva_id: string | null; condicion_pago_id: string | null;
  asiento_id: string | null; asiento_modificado_manual: boolean;
  documento_origen_id: string | null;
  retenciones: Retencion[];
  creado_en: string; creado_por: string;
}

interface ListItem {
  id: string; numero: string;
  tipo: "FACTURA" | "RECIBO" | "NOTA_CREDITO" | "NOTA_DEBITO" | "ANTICIPO";
  fecha: string; fecha_vencimiento: string | null;
  tercero_nit: string | null; tercero_nombre: string | null;
  moneda_codigo: string; total: string; saldo: string;
  estado: "borrador" | "contabilizado" | "anulado";
  dias_vencimiento: number | null;
}

interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }

interface RetForm {
  _key: string;
  tipo: string; concepto: string;
  base: string; porcentaje: string;
  cuenta_id: string; cuenta_display: string;
}

interface RetCatalogo {
  id: string; tipo: string; nombre: string; porcentaje: string;
  aplica_venta: boolean;
  cuenta_ventas_id: string | null;
  cuenta_ventas_codigo: string | null;
  cuenta_ventas_nombre: string | null;
}

interface TarifaIva {
  id: string; nombre: string; tipo: string; porcentaje: string; activo: boolean;
}

interface CondicionPago {
  id: string; codigo: string; nombre: string; dias_vencimiento: number;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPOS = [
  { value: "FACTURA",      label: "Factura" },
  { value: "RECIBO",       label: "Recibo de caja" },
  { value: "NOTA_CREDITO", label: "Nota crédito" },
  { value: "NOTA_DEBITO",  label: "Nota débito" },
  { value: "ANTICIPO",     label: "Anticipo" },
];

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado:       "bg-red-50 text-red-600 border border-red-200",
};

const TIPO_BADGE: Record<string, string> = {
  FACTURA:      "bg-blue-50 text-blue-700",
  RECIBO:       "bg-green-50 text-green-700",
  NOTA_CREDITO: "bg-purple-50 text-purple-700",
  NOTA_DEBITO:  "bg-orange-50 text-orange-700",
  ANTICIPO:     "bg-cyan-50 text-cyan-700",
};

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpSm = "w-full px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function keyRet() { return Math.random().toString(36).slice(2); }

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function TerceroSearch({ display, onChange }: {
  display: string; onChange: (id: string, display: string, nit: string) => void;
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
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
      }
      setOpts(data.slice(0, 10)); setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar por NIT o nombre…" className={inp} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((t) => (
            <button key={t.id} type="button"
              onMouseDown={() => { setQ(`${t.nit} — ${t.razon_social}`); setOpen(false); onChange(t.id, `${t.nit} — ${t.razon_social}`, t.nit); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{t.nit}</span>
              <span className="text-[11px] text-gray-700">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CuentaSearch({ display, onChange }: {
  display: string; onChange: (id: string, display: string) => void;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Cuenta[]>([]);
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
      const data = await apiFetch<Cuenta[]>(`/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true&solo_movimiento=true`).catch(() => []);
      if (data.length > 0 && ref.current) {
        const r = ref.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
      }
      setOpts(data.slice(0, 10)); setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Cuenta de retención…" className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-44 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { setQ(c.codigo); setOpen(false); onChange(c.id, c.codigo); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{c.codigo}</span>
              <span className="text-[11px] text-gray-700">{c.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CarteraPage() {
  const title = usePageTitle();
  const [lista, setLista]   = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fTipo, setFTipo]             = useState("");
  const [fEstado, setFEstado]         = useState("");
  const [fDesde, setFDesde]           = useState("");
  const [fHasta, setFHasta]           = useState("");
  const [fPendientes, setFPendientes] = useState(false);

  // Catálogos
  const [monedas, setMonedas]         = useState<Moneda[]>([]);
  const [monedaFuncId, setMonedaFuncId] = useState("");

  // Modal
  const [modo, setModo]     = useState<"crear" | "ver" | null>(null);
  const [activo, setActivo] = useState<Documento | null>(null);
  const [modalAnular, setModalAnular] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [modalAplicar, setModalAplicar] = useState(false);

  // Form
  const hoy = new Date().toISOString().slice(0, 10);
  const [fTipoDoc, setFTipoDoc]           = useState<string>("FACTURA");
  const [fNumero, setFNumero]             = useState("");
  const [fFecha, setFFecha]               = useState(hoy);
  const [fVencimiento, setFVencimiento]   = useState("");
  const [fTerceroId, setFTerceroId]       = useState("");
  const [fTerceroDisplay, setFTerceroDisplay] = useState("");
  const [fMonedaId, setFMonedaId]         = useState("");
  const [fTrm, setFTrm]                   = useState("");
  const [fSubtotal, setFSubtotal]         = useState("");
  const [fIvaPct, setFIvaPct]             = useState("0");
  const [fDescripcion, setFDescripcion]   = useState("");
  const [retenciones, setRetenciones]     = useState<RetForm[]>([]);
  const [retCatalogo, setRetCatalogo]     = useState<RetCatalogo[]>([]);
  const [tarifasIva, setTarifasIva]       = useState<TarifaIva[]>([]);
  const [fTarifaIvaId, setFTarifaIvaId]   = useState("");
  const [condicionesPago, setCondicionesPago] = useState<CondicionPago[]>([]);
  const [fCondicionPagoId, setFCondicionPagoId] = useState("");
  const [retMenuAbierto, setRetMenuAbierto] = useState(false);
  const [retBusqueda, setRetBusqueda]       = useState("");

  // Aplicar
  const [apFacturaId, setApFacturaId]     = useState("");
  const [apValor, setApValor]             = useState("");
  const [apFecha, setApFecha]             = useState(hoy);
  const [facturasPendientes, setFacturasPendientes] = useState<ListItem[]>([]);

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch<Moneda[]>("/maestros/monedas").then((data) => {
      setMonedas(data);
      const func = data.find((m) => m.es_funcional);
      if (func) { setMonedaFuncId(func.id); setFMonedaId(func.id); }
    }).catch(() => {});
    apiFetch<RetCatalogo[]>("/maestros/retenciones?solo_activas=true")
      .then((data) => setRetCatalogo(data.filter((r) => r.aplica_venta)))
      .catch(() => {});
    apiFetch<TarifaIva[]>("/maestros/tarifas-iva?solo_activas=true")
      .then(setTarifasIva).catch(() => {});
    apiFetch<CondicionPago[]>("/maestros/condiciones-pago?solo_activas=true")
      .then(setCondicionesPago).catch(() => {});
  }, []);

  // ── Listar ─────────────────────────────────────────────────────────────────

  const cargar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) });
      if (fTipo)       p.set("tipo", fTipo);
      if (fEstado)     p.set("estado", fEstado);
      if (fDesde)      p.set("fecha_desde", fDesde);
      if (fHasta)      p.set("fecha_hasta", fHasta);
      if (fPendientes) p.set("solo_pendientes", "true");
      const res = await apiFetch<ListResponse>(`/cxc?${p}`);
      setLista(res.items); setTotalItems(res.total);
    } finally { setLoading(false); }
  }, [fTipo, fEstado, fDesde, fHasta, fPendientes]);

  useEffect(() => { setPagina(1); cargar(1); }, [fTipo, fEstado, fDesde, fHasta, fPendientes]);
  useEffect(() => { cargar(pagina); }, [pagina]);

  // ── Abrir modal ────────────────────────────────────────────────────────────

  function abrirCrear() {
    setFTipoDoc("FACTURA"); setFNumero(""); setFFecha(hoy); setFVencimiento("");
    setFCondicionPagoId("");
    setFTerceroId(""); setFTerceroDisplay(""); setFMonedaId(monedaFuncId); setFTrm("");
    setFSubtotal(""); setFIvaPct("0"); setFTarifaIvaId(""); setFDescripcion("");
    setRetenciones([]);
    setError(""); setModo("crear");
  }

  async function abrirVer(item: ListItem) {
    const doc = await apiFetch<Documento>(`/cxc/${item.id}`).catch(() => null);
    if (!doc) return;
    setActivo(doc); setError(""); setModo("ver");
    if (doc.estado === "contabilizado" && doc.saldo > 0) {
      const res = await apiFetch<ListResponse>(`/cxc?tipo=FACTURA&estado=contabilizado&solo_pendientes=true&por_pagina=100`).catch(() => null);
      setFacturasPendientes(res?.items.filter((f) => f.id !== doc.id && f.tercero_nit === doc.tercero_nit) ?? []);
    }
  }

  function cerrar() { setModo(null); setActivo(null); setEditandoId(null); setError(""); setModalAnular(false); setModalAplicar(false); }

  async function abrirEditar(item: ListItem) {
    const doc = await apiFetch<Documento>(`/cxc/${item.id}`).catch(() => null);
    if (!doc) return;
    setEditandoId(doc.id);
    setFTipoDoc(doc.tipo);
    setFNumero(doc.numero);
    setFFecha(doc.fecha);
    setFVencimiento(doc.fecha_vencimiento ?? "");
    setFTerceroId(doc.tercero_id);
    setFTerceroDisplay(doc.tercero_nit && doc.tercero_nombre ? `${doc.tercero_nit} — ${doc.tercero_nombre}` : (doc.tercero_nombre ?? ""));
    setFMonedaId(doc.moneda_id);
    setFTrm(doc.trm ? String(doc.trm) : "");
    setFSubtotal(String(doc.subtotal));
    setFTarifaIvaId(doc.tarifa_iva_id ?? "");
    setFCondicionPagoId(doc.condicion_pago_id ?? "");
    setFDescripcion(doc.descripcion ?? "");
    setRetenciones(doc.retenciones.map((r) => ({
      _key: keyRet(), tipo: r.tipo, concepto: r.concepto,
      base: String(r.base), porcentaje: String(r.porcentaje),
      cuenta_id: r.cuenta_id, cuenta_display: r.cuenta_codigo ?? "",
    })));
    setError(""); setModo("crear");
  }

  // ── Cálculos ───────────────────────────────────────────────────────────────

  function aplicarCondicionPago(condicionId: string, fecha: string) {
    const c = condicionesPago.find((x) => x.id === condicionId);
    if (c && fecha) {
      const d = new Date(fecha + "T00:00:00");
      d.setDate(d.getDate() + c.dias_vencimiento);
      setFVencimiento(d.toISOString().slice(0, 10));
    }
  }

  const subtotal    = parseFloat(fSubtotal) || 0;
  const ivaTarifa   = tarifasIva.find((t) => t.id === fTarifaIvaId);
  const ivaPct      = ivaTarifa ? parseFloat(ivaTarifa.porcentaje) : 0;
  const totalIva    = Math.round(subtotal * ivaPct / 100 * 10000) / 10000;
  const totalRet    = retenciones.reduce((s, r) => s + (parseFloat(r.base) * parseFloat(r.porcentaje) / 100 || 0), 0);
  const total       = subtotal + totalIva - totalRet;

  // ── Retenciones ────────────────────────────────────────────────────────────

  function addRet() {
    setRetenciones((p) => [...p, { _key: keyRet(), tipo: "RETEFUENTE", concepto: "", base: fSubtotal, porcentaje: "", cuenta_id: "", cuenta_display: "" }]);
    setRetMenuAbierto(false);
  }
  function addRetFromCatalog(r: RetCatalogo) {
    const display = r.cuenta_ventas_id
      ? `${r.cuenta_ventas_codigo} — ${r.cuenta_ventas_nombre}`
      : "";
    setRetenciones((p) => [...p, {
      _key: keyRet(), tipo: r.tipo, concepto: r.nombre,
      base: fSubtotal, porcentaje: r.porcentaje,
      cuenta_id: r.cuenta_ventas_id ?? "", cuenta_display: display,
    }]);
    setRetMenuAbierto(false);
  }
  function updRet(key: string, patch: Partial<RetForm>) {
    setRetenciones((p) => p.map((r) => r._key === key ? { ...r, ...patch } : r));
  }
  function delRet(key: string) { setRetenciones((p) => p.filter((r) => r._key !== key)); }

  // ── Guardar ────────────────────────────────────────────────────────────────

  async function guardar(contabilizarAlGuardar = false) {
    if (!fNumero.trim()) { setError("El número del documento es obligatorio"); return; }
    if (!fTerceroId) { setError("Selecciona el tercero"); return; }
    if (!fSubtotal || subtotal <= 0) { setError("El valor debe ser mayor que cero"); return; }
    if ((fTipoDoc === "FACTURA" || fTipoDoc === "NOTA_DEBITO") && !fVencimiento) { setError("La fecha de vencimiento es obligatoria"); return; }
    if (fVencimiento && fVencimiento < fFecha) { setError("La fecha de vencimiento no puede ser anterior a la fecha del documento"); return; }

    const retsBody = retenciones.map((r) => ({
      tipo: r.tipo, concepto: r.concepto,
      base: parseFloat(r.base) || 0,
      porcentaje: parseFloat(r.porcentaje) || 0,
      valor: Math.round((parseFloat(r.base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000,
      cuenta_id: r.cuenta_id,
    }));

    const cuerpoComun = {
      fecha: fFecha,
      fecha_vencimiento: fVencimiento || null,
      tercero_id: fTerceroId,
      moneda_id: fMonedaId,
      trm: fMonedaId !== monedaFuncId && fTrm ? parseFloat(fTrm) : null,
      subtotal: subtotal,
      total_iva: totalIva,
      total_retenciones: parseFloat(totalRet.toFixed(4)),
      descripcion: fDescripcion.trim() || null,
      retenciones: retsBody,
      tarifa_iva_id: fTarifaIvaId || null,
      condicion_pago_id: fCondicionPagoId || null,
    };

    setSaving(true); setError("");
    try {
      const doc = editandoId
        ? await apiFetch<Documento>(`/cxc/${editandoId}`, { method: "PUT", body: JSON.stringify(cuerpoComun) })
        : await apiFetch<Documento>("/cxc", { method: "POST", body: JSON.stringify({ tipo: fTipoDoc, numero: fNumero.trim(), ...cuerpoComun }) });
      if (contabilizarAlGuardar) {
        await apiFetch(`/cxc/${doc.id}/contabilizar`, { method: "POST" });
      }
      cerrar(); cargar(1); setPagina(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function contabilizar() {
    if (!activo) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/cxc/${activo.id}/contabilizar`, { method: "POST" });
      cerrar(); cargar(1); setPagina(1);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function anular() {
    if (!motivoAnular.trim()) { setError("El motivo es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch(`/cxc/${activo!.id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivoAnular }) });
      cerrar(); cargar(1); setPagina(1);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function aplicar() {
    if (!apFacturaId) { setError("Selecciona la factura a saldar"); return; }
    if (!apValor || parseFloat(apValor) <= 0) { setError("Ingresa el valor a aplicar"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch("/cxc/aplicar", {
        method: "POST",
        body: JSON.stringify({ documento_credito_id: activo!.id, documento_debito_id: apFacturaId, valor: parseFloat(apValor), fecha: apFecha }),
      });
      setModalAplicar(false); cerrar(); cargar(1); setPagina(1);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));
  const necesitaVencimiento = fTipoDoc === "FACTURA" || fTipoDoc === "NOTA_DEBITO";
  const esExtranjera = fMonedaId && fMonedaId !== monedaFuncId;

  return (
    <div className="h-full flex flex-col">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Documentos de cuentas por cobrar</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo documento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Tipo</label>
          <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="contabilizado">Contabilizado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer pb-0.5">
          <input type="checkbox" checked={fPendientes} onChange={(e) => setFPendientes(e.target.checked)} className="rounded" />
          Solo con saldo pendiente
        </label>
        {(fTipo || fEstado || fDesde || fHasta || fPendientes) && (
          <button onClick={() => { setFTipo(""); setFEstado(""); setFDesde(""); setFHasta(""); setFPendientes(false); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline pb-0.5">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                {["Número", "Tipo", "Fecha", "Vencimiento", "Tercero", "Total", "Aplicado", "Saldo", "Estado", ""].map((h) => (
                  <th key={h} className={`${["Total","Aplicado","Saldo"].includes(h) ? "text-right" : "text-left"} px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin documentos registrados</td></tr>
              ) : lista.map((d) => {
                const vencida = d.dias_vencimiento !== null && d.dias_vencimiento < 0;
                const porVencer = d.dias_vencimiento !== null && d.dias_vencimiento >= 0 && d.dias_vencimiento <= 5;
                return (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">{d.numero}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TIPO_BADGE[d.tipo]}`}>
                        {TIPOS.find((t) => t.value === d.tipo)?.label ?? d.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {d.fecha_vencimiento ? (
                        <span className={`text-[11px] font-medium ${vencida ? "text-red-600" : porVencer ? "text-amber-600" : "text-gray-500"}`}>
                          {d.fecha_vencimiento}
                          {d.dias_vencimiento !== null && (
                            <span className="ml-1 text-[10px]">
                              {vencida ? `(${Math.abs(d.dias_vencimiento)}d venc.)` : `(${d.dias_vencimiento}d)`}
                            </span>
                          )}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px]">
                      <div className="text-[12px] font-medium text-gray-800 truncate">{d.tercero_nombre}</div>
                      <div className="text-[10px] font-mono text-gray-400">{d.tercero_nit}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(d.total)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-400 whitespace-nowrap">
                      {parseFloat(d.total) - parseFloat(d.saldo) > 0 ? fmt(parseFloat(d.total) - parseFloat(d.saldo)) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                      <span className={parseFloat(d.saldo) > 0 && d.estado === "contabilizado" ? "text-blue-700 font-semibold" : "text-gray-500"}>
                        {fmt(d.saldo)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[d.estado]}`}>
                        {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.tipo === "FACTURA" && (
                        d.estado === "borrador" ? (
                          <button onClick={() => abrirEditar(d)} title="Editar"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        ) : (
                          <button onClick={() => abrirVer(d)} title="Ver"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
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

      {/* ── Modal crear ────────────────────────────────────────────────────── */}
      {modo === "crear" && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "min(820px, 95vw)", height: "min(88vh, 800px)" }}>

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-[14px] font-semibold text-gray-800">{editandoId ? "Editar documento CxC" : "Nuevo documento CxC"}</h2>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {/* Encabezado */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-3">Encabezado</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Número *</label>
                    <input value={fNumero} onChange={(e) => setFNumero(e.target.value)}
                      placeholder="Número del documento original" disabled={!!editandoId} className={`${inp} disabled:bg-gray-50 disabled:text-gray-400`} />
                  </div>
                  <div>
                    <label className={lbl}>Fecha *</label>
                    <input type="date" value={fFecha} onChange={(e) => {
                      setFFecha(e.target.value);
                      if (fCondicionPagoId) aplicarCondicionPago(fCondicionPagoId, e.target.value);
                    }} className={inp} />
                  </div>
                  {necesitaVencimiento && (
                    <div>
                      <label className={lbl}>Condición de pago</label>
                      <select value={fCondicionPagoId} onChange={(e) => {
                        setFCondicionPagoId(e.target.value);
                        if (e.target.value) aplicarCondicionPago(e.target.value, fFecha);
                      }} className={inp}>
                        <option value="">Fecha manual</option>
                        {condicionesPago.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre} ({c.dias_vencimiento}d)</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {necesitaVencimiento && (
                    <div>
                      <label className={lbl}>Fecha vencimiento *</label>
                      <input type="date" value={fVencimiento} onChange={(e) => { setFVencimiento(e.target.value); setFCondicionPagoId(""); }} className={inp} />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className={lbl}>Tercero *</label>
                    <TerceroSearch display={fTerceroDisplay}
                      onChange={(id, display) => { setFTerceroId(id); setFTerceroDisplay(display); }} />
                  </div>
                  <div>
                    <label className={lbl}>Moneda</label>
                    <select value={fMonedaId} onChange={(e) => { setFMonedaId(e.target.value); setFTrm(""); }} className={inp}>
                      {monedas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                    </select>
                  </div>
                  {esExtranjera && (
                    <div>
                      <label className={lbl}>TRM *</label>
                      <input type="number" step="0.01" value={fTrm} onChange={(e) => setFTrm(e.target.value)} placeholder="4234.50" className={inp} />
                    </div>
                  )}
                  <div className="col-span-3">
                    <label className={lbl}>Descripción</label>
                    <input value={fDescripcion} onChange={(e) => setFDescripcion(e.target.value)} placeholder="Concepto del documento…" className={inp} />
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-3">Valores</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Valor factura *</label>
                    <input type="number" step="0.01" min="0" value={fSubtotal}
                      onChange={(e) => { setFSubtotal(e.target.value); setRetenciones((r) => r.map((x) => ({ ...x, base: e.target.value }))); }}
                      className={`${inp} text-right`} />
                  </div>
                  <div>
                    <label className={lbl}>Tarifa IVA</label>
                    <select value={fTarifaIvaId} onChange={(e) => setFTarifaIvaId(e.target.value)} className={inp}>
                      <option value="">Sin IVA</option>
                      {tarifasIva.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre} ({t.porcentaje}%)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Total IVA</label>
                    <div className="px-2.5 py-1.5 border border-gray-100 rounded-md text-[12px] text-gray-500 bg-gray-50 text-right">{fmt(totalIva)}</div>
                  </div>
                </div>
              </div>

              {/* Retenciones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Retenciones</p>
                  <button type="button" onClick={() => setRetMenuAbierto(true)}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Agregar retención
                  </button>
                </div>
                {retenciones.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                          <th className="px-2 py-1.5 text-left w-28">Tipo</th>
                          <th className="px-2 py-1.5 text-left">Concepto</th>
                          <th className="px-2 py-1.5 text-right w-24">Base</th>
                          <th className="px-2 py-1.5 text-right w-16">%</th>
                          <th className="px-2 py-1.5 text-right w-24">Valor</th>
                          <th className="px-2 py-1.5 text-left w-28">Cuenta</th>
                          <th className="w-7" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {retenciones.map((r) => {
                          const val = Math.round((parseFloat(r.base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000;
                          return (
                            <tr key={r._key}>
                              <td className="px-1 py-1">
                                <select value={r.tipo} onChange={(e) => updRet(r._key, { tipo: e.target.value })} className={inpSm}>
                                  <option value="RETEFUENTE">RETEFUENTE</option>
                                  <option value="RETEICA">RETEICA</option>
                                  <option value="RETEIVA">RETEIVA</option>
                                </select>
                              </td>
                              <td className="px-1 py-1"><input value={r.concepto} onChange={(e) => updRet(r._key, { concepto: e.target.value })} placeholder="Descripción…" className={inpSm} /></td>
                              <td className="px-1 py-1"><input type="number" value={r.base} onChange={(e) => updRet(r._key, { base: e.target.value })} className={`${inpSm} text-right`} /></td>
                              <td className="px-1 py-1"><input type="number" step="0.01" value={r.porcentaje} onChange={(e) => updRet(r._key, { porcentaje: e.target.value })} className={`${inpSm} text-right`} /></td>
                              <td className="px-1 py-1 text-right text-[11px] font-mono text-gray-600 pr-2">{fmt(val)}</td>
                              <td className="px-1 py-1"><CuentaSearch display={r.cuenta_display} onChange={(id, display) => updRet(r._key, { cuenta_id: id, cuenta_display: display })} /></td>
                              <td className="px-1 py-1 text-center">
                                <button type="button" onClick={() => delRet(r._key)} className="p-1 text-gray-300 hover:text-red-500">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Resumen totales */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-end gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Subtotal</p>
                  <p className="text-[13px] font-mono text-gray-700">{fmt(subtotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">IVA</p>
                  <p className="text-[13px] font-mono text-gray-700">{fmt(totalIva)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Retenciones</p>
                  <p className="text-[13px] font-mono text-gray-700">{fmt(totalRet)}</p>
                </div>
                <div className="text-right border-l border-gray-200 pl-8">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total a cobrar</p>
                  <p className="text-[16px] font-bold font-mono text-gray-900">{fmt(total)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
              <button onClick={cerrar} className="px-5 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white">Cancelar</button>
              <button onClick={() => guardar(false)} disabled={saving}
                className="flex-1 py-2 border border-blue-300 text-blue-600 bg-white hover:bg-blue-50 text-[12px] font-medium rounded-lg disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar borrador"}
              </button>
              <button onClick={() => guardar(true)} disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Procesando..." : "Guardar y activar en cartera"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ver ──────────────────────────────────────────────────────── */}
      {modo === "ver" && activo && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "min(700px, 95vw)", height: "min(88vh, 720px)" }}>

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${TIPO_BADGE[activo.tipo]}`}>
                    {TIPOS.find((t) => t.value === activo.tipo)?.label}
                  </span>
                  <h2 className="text-[14px] font-bold text-gray-800 font-mono">{activo.numero}</h2>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[activo.estado]}`}>
                    {activo.estado.charAt(0).toUpperCase() + activo.estado.slice(1)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{activo.fecha}{activo.fecha_vencimiento ? ` · Vence: ${activo.fecha_vencimiento}` : ""}</p>
              </div>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Tercero</p>
                  <p className="text-[12px] font-mono text-blue-600">{activo.tercero_nit}</p>
                  <p className="text-[12px] text-gray-700">{activo.tercero_nombre}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Moneda</p>
                  <p className="text-[12px] text-gray-700">{activo.moneda_codigo}{activo.trm ? ` · TRM ${fmt(activo.trm)}` : ""}</p>
                </div>
                {activo.descripcion && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Descripción</p>
                    <p className="text-[12px] text-gray-700">{activo.descripcion}</p>
                  </div>
                )}
              </div>

              {/* Valores */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Subtotal", activo.subtotal],
                  ["IVA", activo.total_iva],
                  ["Retenciones", activo.total_retenciones],
                  ["Total", activo.total],
                ].map(([label, val]) => (
                  <div key={label} className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                    <p className="text-[13px] font-mono font-semibold text-gray-800">{fmt(String(val))}</p>
                  </div>
                ))}
              </div>

              {/* Saldo */}
              {activo.estado === "contabilizado" && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <span className="text-[12px] text-blue-700 font-medium">Saldo pendiente de cobro</span>
                  <span className="text-[18px] font-bold font-mono text-blue-800">{fmt(activo.saldo)}</span>
                </div>
              )}

              {/* Retenciones */}
              {activo.retenciones.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Retenciones</p>
                  <table className="w-full text-[11px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Tipo", "Concepto", "Base", "%", "Valor", "Cuenta"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left text-[10px] font-bold uppercase text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activo.retenciones.map((r) => (
                        <tr key={r.id}>
                          <td className="px-2 py-1.5 font-semibold text-purple-700">{r.tipo}</td>
                          <td className="px-2 py-1.5 text-gray-600">{r.concepto}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmt(r.base)}</td>
                          <td className="px-2 py-1.5 text-right">{r.porcentaje}%</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(r.valor)}</td>
                          <td className="px-2 py-1.5 font-mono text-blue-600">{r.cuenta_codigo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
              <button onClick={cerrar} className="px-5 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white">Cerrar</button>
              {activo.estado === "borrador" && (
                <button onClick={contabilizar} disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                  {saving ? "Procesando..." : "Activar en cartera"}
                </button>
              )}
              {activo.estado === "contabilizado" && parseFloat(activo.saldo) > 0 && ["NOTA_CREDITO", "ANTICIPO", "RECIBO"].includes(activo.tipo) && (
                <button onClick={() => { setApFacturaId(""); setApValor(activo.saldo); setApFecha(hoy); setError(""); setModalAplicar(true); }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium rounded-lg">
                  Cruzar con factura
                </button>
              )}
              {activo.estado !== "anulado" && (
                <button onClick={() => { setMotivoAnular(""); setError(""); setModalAnular(true); }}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-[12px] font-medium rounded-lg">
                  Anular
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal anular */}
      {modalAnular && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-3">Anular documento</h3>
            <div className="mb-4">
              <label className={lbl}>Motivo *</label>
              <input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Motivo de anulación…" className={inp} autoFocus />
            </div>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setModalAnular(false)} className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={anular} disabled={saving} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Anulando..." : "Confirmar anulación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aplicar pago */}
      {modalAplicar && activo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Cruzar con factura</h3>
            <p className="text-[12px] text-gray-500 mb-4">Saldo disponible del documento: <strong>{fmt(activo.saldo)}</strong></p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Factura a saldar *</label>
                <select value={apFacturaId} onChange={(e) => setApFacturaId(e.target.value)} className={inp}>
                  <option value="">Seleccionar factura…</option>
                  {facturasPendientes.map((f) => (
                    <option key={f.id} value={f.id}>{f.numero} — saldo {fmt(f.saldo)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Valor a aplicar *</label>
                <input type="number" step="0.01" value={apValor} onChange={(e) => setApValor(e.target.value)} className={`${inp} text-right`} />
              </div>
              <div>
                <label className={lbl}>Fecha de aplicación</label>
                <input type="date" value={apFecha} onChange={(e) => setApFecha(e.target.value)} className={inp} />
              </div>
            </div>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setModalAplicar(false)} className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={aplicar} disabled={saving} className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Aplicando..." : "Confirmar aplicación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selector de retenciones */}
      {retMenuAbierto && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: "70vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="text-[13px] font-semibold text-gray-800">Seleccionar retención</h3>
              <button onClick={() => { setRetMenuAbierto(false); setRetBusqueda(""); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
              <input autoFocus value={retBusqueda} onChange={(e) => setRetBusqueda(e.target.value)}
                placeholder="Buscar por nombre o tipo..."
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {(() => {
                const q = retBusqueda.toLowerCase();
                const filtrados = retCatalogo.filter((r) =>
                  !q || r.nombre.toLowerCase().includes(q) || r.tipo.toLowerCase().includes(q)
                );
                if (filtrados.length === 0)
                  return <p className="px-4 py-6 text-center text-[12px] text-gray-400">Sin resultados</p>;
                return filtrados.map((r) => (
                  <button key={r.id} type="button"
                    onClick={() => { addRetFromCatalog(r); setRetBusqueda(""); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        r.tipo === "RETEFUENTE" ? "bg-blue-100 text-blue-700" :
                        r.tipo === "RETEICA"    ? "bg-violet-100 text-violet-700" :
                                                  "bg-amber-100 text-amber-700"
                      }`}>{r.tipo}</span>
                      <span className="text-[12px] text-gray-800 flex-1">{r.nombre}</span>
                      <span className="text-[12px] font-mono font-semibold text-gray-600">{r.porcentaje}%</span>
                    </div>
                    {r.cuenta_ventas_codigo && (
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-0.5">{r.cuenta_ventas_codigo} — {r.cuenta_ventas_nombre}</p>
                    )}
                  </button>
                ));
              })()}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => { addRet(); setRetBusqueda(""); }}
                className="w-full py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                + Ingresar manualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
