"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Moneda  { id: string; codigo: string; nombre: string; es_funcional: boolean; }
interface Tercero { id: string; nit: string; razon_social: string; }
interface Cuenta  { id: string; codigo: string; nombre: string; }

interface ConceptoRet {
  retencion_id: string;
  retencion_nombre: string | null;
  retencion_tipo: string | null;
  retencion_porcentaje: string | null;
  retencion_cuenta_compras_id: string | null;
  retencion_cuenta_compras_codigo: string | null;
  activo: boolean;
}

interface RetCatalogo {
  id: string; tipo: string; nombre: string; porcentaje: string;
  aplica_compra: boolean;
  cuenta_compras_id: string | null;
  cuenta_compras_codigo: string | null;
  cuenta_compras_nombre: string | null;
}

interface CondicionPago {
  id: string; codigo: string; nombre: string; dias_vencimiento: number;
}

interface CentroCosto {
  id: string; codigo: string; nombre: string;
}

interface Concepto {
  id: string; codigo: string; nombre: string;
  tarifa_iva_porcentaje: string | null;
  tarifa_iva_cuenta_compras_id: string | null;
  tarifa_iva_cuenta_compras_codigo: string | null;
  cuenta_gasto_id: string | null;
  cuenta_gasto_codigo: string | null;
  cuenta_gasto_nombre: string | null;
  retenciones: ConceptoRet[];
}

interface LineaRetForm {
  _key: string;
  tipo: string; descripcion: string;
  base: string; porcentaje: string; valor: string;
  cuenta_id: string; cuenta_display: string;
}

interface LineaForm {
  _key: string;
  concepto_id: string; concepto_display: string;
  cuenta_gasto_id: string;
  descripcion: string;
  subtotal: string;
  iva_pct: string;
  total_iva: string;
  total: string;
  cuenta_iva_id: string; cuenta_iva_display: string;
  centro_costo_id: string;
  retenciones: LineaRetForm[];
}

interface LineaResponse {
  id: string; orden: number; descripcion: string;
  concepto_id: string | null; concepto_nombre: string | null;
  cuenta_id: string | null; cuenta_codigo: string | null; cuenta_nombre: string | null;
  subtotal: string; iva_pct: string; total_iva: string; total: string;
  cuenta_iva_id: string | null; cuenta_iva_codigo: string | null;
  centro_costo_id: string | null;
  retenciones: {
    id: string; tipo: string; descripcion: string;
    base: string; porcentaje: string; valor: string;
    cuenta_id: string; cuenta_codigo: string | null;
  }[];
}

interface Documento {
  id: string; numero: string; tipo: string; numero_proveedor: string | null;
  fecha: string; fecha_vencimiento: string | null;
  condicion_pago_id: string | null;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  moneda_id: string; moneda_codigo: string; trm: string | null;
  subtotal: string; total_iva: string; total_retenciones: string;
  total: string; saldo: string; descripcion: string | null;
  estado: "borrador" | "contabilizado" | "anulado";
  asiento_id: string | null;
  lineas: LineaResponse[];
}

interface ListItem {
  id: string; numero: string; tipo: string; numero_proveedor: string | null;
  fecha: string; fecha_vencimiento: string | null;
  tercero_nit: string | null; tercero_nombre: string | null;
  moneda_codigo: string; total: string; saldo: string;
  estado: "borrador" | "contabilizado" | "anulado";
  dias_vencimiento: number | null;
}

interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado:       "bg-red-50 text-red-600 border border-red-200",
};

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpSm = "w-full px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function key() { return Math.random().toString(36).slice(2); }

function calcLinea(l: LineaForm) {
  const sub = parseFloat(l.subtotal) || 0;
  const iva = Math.round(sub * (parseFloat(l.iva_pct) || 0) / 100 * 10000) / 10000;
  const ret = l.retenciones.reduce((s, r) => s + Math.round((parseFloat(r.base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000, 0);
  return { iva, ret, total: sub + iva };
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TerceroSearch({ display, onChange }: { display: string; onChange: (id: string, display: string) => void }) {
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
        placeholder="Buscar por NIT o nombre…" className={inp} />
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

function CuentaSearch({ display, placeholder, onChange }: { display: string; placeholder?: string; onChange: (id: string, display: string) => void }) {
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
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
      }
      setOpts(data.slice(0, 10)); setOpen(data.length > 0);
    }, 250);
  }
  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "Cuenta…"} className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-44 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { setQ(c.codigo); setOpen(false); onChange(c.id, c.codigo); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50">
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

export default function FacturasProveedorPage() {
  const title = usePageTitle();
  const [lista, setLista] = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(true);
  const { orden, alternar } = useOrden<
    "numero" | "numeroProveedor" | "fecha" | "vencimiento" | "proveedor" | "total" | "saldo" | "estado"
  >("fecha", "desc", () => setPagina(1));

  // Filtros
  const [fEstado, setFEstado] = useState("");
  const [fDesde, setFDesde]   = useState("");
  const [fHasta, setFHasta]   = useState("");
  const [fPendientes, setFPendientes] = useState(false);

  // Catálogos
  const [monedas, setMonedas]     = useState<Moneda[]>([]);
  const [monedaFuncId, setMonedaFuncId] = useState("");
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [retCatalogo, setRetCatalogo]         = useState<RetCatalogo[]>([]);
  const [condicionesPago, setCondicionesPago] = useState<CondicionPago[]>([]);
  const [fCondicionPagoId, setFCondicionPagoId] = useState("");
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);

  // Selector de retenciones
  const [retMenuLineaKey, setRetMenuLineaKey] = useState<string | null>(null);
  const [retBusqueda, setRetBusqueda]         = useState("");

  // Modal
  const [modo, setModo]     = useState<"crear" | "ver" | null>(null);
  const [activo, setActivo] = useState<Documento | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [modalAnular, setModalAnular]   = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [modalImprimir, setModalImprimir] = useState(false);
  const [idImprimir, setIdImprimir]       = useState("");

  // Form header
  function hoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const hoy = hoyLocal();
  const [fFecha, setFFecha]           = useState(hoy);
  const [fVencimiento, setFVencimiento] = useState("");
  const [fNumProv, setFNumProv]       = useState("");
  const [fTerceroId, setFTerceroId]   = useState("");
  const [fTerceroDisplay, setFTerceroDisplay] = useState("");
  const [fMonedaId, setFMonedaId]     = useState("");
  const [fTrm, setFTrm]               = useState("");
  const [fDescripcion, setFDescripcion] = useState("");

  // Líneas
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch<Moneda[]>("/maestros/monedas").then((data) => {
      setMonedas(data);
      const func = data.find((m) => m.es_funcional);
      if (func) { setMonedaFuncId(func.id); setFMonedaId(func.id); }
    }).catch(() => {});
    apiFetch<Concepto[]>("/conceptos/cxp?solo_activos=true")
      .then(setConceptos).catch(() => {});
    apiFetch<RetCatalogo[]>("/maestros/retenciones?solo_activas=true")
      .then((data) => setRetCatalogo(data.filter((r) => r.aplica_compra)))
      .catch(() => {});
    apiFetch<CondicionPago[]>("/maestros/condiciones-pago?solo_activas=true")
      .then(setCondicionesPago).catch(() => {});
    apiFetch<CentroCosto[]>("/centros-costo?solo_activos=true")
      .then(setCentrosCosto).catch(() => {});
  }, []);

  // ── Listar ─────────────────────────────────────────────────────────────────

  const cargar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina), tipo: "FACTURA" });
      if (fEstado)     p.set("estado", fEstado);
      if (fDesde)      p.set("fecha_desde", fDesde);
      if (fHasta)      p.set("fecha_hasta", fHasta);
      if (fPendientes) p.set("solo_pendientes", "true");
      const res = await apiFetch<ListResponse>(`/cxp?${p}`);
      setLista(res.items); setTotalItems(res.total);
    } finally { setLoading(false); }
  }, [fEstado, fDesde, fHasta, fPendientes]);

  useEffect(() => { setPagina(1); cargar(1); }, [fEstado, fDesde, fHasta, fPendientes]);
  useEffect(() => { cargar(pagina); }, [pagina]);

  // ── Gestión de líneas ──────────────────────────────────────────────────────

  function nuevaLinea(): LineaForm {
    return {
      _key: key(), concepto_id: "", concepto_display: "", cuenta_gasto_id: "",
      descripcion: "", subtotal: "", iva_pct: "0", total_iva: "0", total: "0",
      cuenta_iva_id: "", cuenta_iva_display: "", centro_costo_id: "", retenciones: [],
    };
  }

  function seleccionarConcepto(lineaKey: string, c: Concepto) {
    setLineas((prev) => prev.map((l) => {
      if (l._key !== lineaKey) return l;
      const iva_pct = c.tarifa_iva_porcentaje ? String(c.tarifa_iva_porcentaje) : "0";
      const sub = parseFloat(l.subtotal) || 0;
      const total_iva = Math.round(sub * (parseFloat(iva_pct) || 0) / 100 * 10000) / 10000;
      const rets: LineaRetForm[] = c.retenciones
        .filter((r) => r.activo)
        .map((r) => ({
          _key: key(),
          tipo: r.retencion_tipo ?? "RETEFUENTE",
          descripcion: r.retencion_nombre ?? "",
          base: l.subtotal,
          porcentaje: r.retencion_porcentaje ?? "0",
          valor: String(Math.round(sub * (parseFloat(r.retencion_porcentaje ?? "0") || 0) / 100 * 10000) / 10000),
          cuenta_id: r.retencion_cuenta_compras_id ?? "",
          cuenta_display: r.retencion_cuenta_compras_codigo ?? "",
        }));
      return {
        ...l,
        concepto_id: c.id, concepto_display: `${c.codigo} — ${c.nombre}`,
        cuenta_gasto_id: c.cuenta_gasto_id ?? "",
        iva_pct, total_iva: String(total_iva),
        total: String(sub + total_iva),
        // cuenta IVA viene de la tarifa configurada en el concepto
        cuenta_iva_id: c.tarifa_iva_cuenta_compras_id ?? "",
        cuenta_iva_display: c.tarifa_iva_cuenta_compras_codigo ?? "",
        retenciones: rets,
      };
    }));
  }

  function updLinea(k: string, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l) => {
      if (l._key !== k) return l;
      const updated = { ...l, ...patch };
      // Recalcular cuando cambia subtotal o iva_pct
      if ("subtotal" in patch || "iva_pct" in patch) {
        const sub = parseFloat(updated.subtotal) || 0;
        const iva = Math.round(sub * (parseFloat(updated.iva_pct) || 0) / 100 * 10000) / 10000;
        updated.total_iva = String(iva);
        updated.total = String(sub + iva);
        // Actualizar bases de retenciones
        updated.retenciones = updated.retenciones.map((r) => ({
          ...r,
          base: updated.subtotal,
          valor: String(Math.round(sub * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000),
        }));
      }
      return updated;
    }));
  }

  function delLinea(k: string) { setLineas((p) => p.filter((l) => l._key !== k)); }

  function updRet(lineaKey: string, retKey: string, patch: Partial<LineaRetForm>) {
    setLineas((prev) => prev.map((l) => {
      if (l._key !== lineaKey) return l;
      return {
        ...l,
        retenciones: l.retenciones.map((r) => r._key === retKey ? { ...r, ...patch } : r),
      };
    }));
  }

  function delRet(lineaKey: string, retKey: string) {
    setLineas((prev) => prev.map((l) => {
      if (l._key !== lineaKey) return l;
      return { ...l, retenciones: l.retenciones.filter((r) => r._key !== retKey) };
    }));
  }

  function addRetManual(lineaKey: string) {
    const linea = lineas.find((l) => l._key === lineaKey);
    setLineas((prev) => prev.map((l) => {
      if (l._key !== lineaKey) return l;
      return {
        ...l,
        retenciones: [...l.retenciones, {
          _key: key(), tipo: "RETEFUENTE", descripcion: "",
          base: linea?.subtotal ?? "", porcentaje: "", valor: "",
          cuenta_id: "", cuenta_display: "",
        }],
      };
    }));
    setRetMenuLineaKey(null); setRetBusqueda("");
  }

  function addRetFromCatalog(lineaKey: string, r: RetCatalogo) {
    const linea = lineas.find((l) => l._key === lineaKey);
    const sub = parseFloat(linea?.subtotal ?? "0") || 0;
    const valor = Math.round(sub * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000;
    setLineas((prev) => prev.map((l) => {
      if (l._key !== lineaKey) return l;
      return {
        ...l,
        retenciones: [...l.retenciones, {
          _key: key(),
          tipo: r.tipo,
          descripcion: r.nombre,
          base: linea?.subtotal ?? "",
          porcentaje: r.porcentaje,
          valor: String(valor),
          cuenta_id: r.cuenta_compras_id ?? "",
          cuenta_display: r.cuenta_compras_codigo
            ? `${r.cuenta_compras_codigo} — ${r.cuenta_compras_nombre ?? ""}`
            : "",
        }],
      };
    }));
    setRetMenuLineaKey(null); setRetBusqueda("");
  }

  // ── Totales ────────────────────────────────────────────────────────────────

  const totalSubtotal = lineas.reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);
  const totalIva      = lineas.reduce((s, l) => s + (parseFloat(l.total_iva) || 0), 0);
  const totalRet      = lineas.reduce((s, l) => s + l.retenciones.reduce(
    (rs, r) => rs + Math.round((parseFloat(r.base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000, 0
  ), 0);
  const totalDoc = totalSubtotal + totalIva - totalRet;

  // ── Abrir / cerrar modal ───────────────────────────────────────────────────

  function aplicarCondicionPago(condicionId: string, fecha: string) {
    const c = condicionesPago.find((x) => x.id === condicionId);
    if (c && fecha) {
      const d = new Date(fecha + "T00:00:00");
      d.setDate(d.getDate() + c.dias_vencimiento);
      setFVencimiento(d.toISOString().slice(0, 10));
    }
  }

  function abrirCrear() {
    setEditandoId(null); setActivo(null);
    setFFecha(hoy); setFVencimiento(""); setFNumProv(""); setFDescripcion("");
    setFCondicionPagoId("");
    setFTerceroId(""); setFTerceroDisplay(""); setFMonedaId(monedaFuncId); setFTrm("");
    setLineas([nuevaLinea()]);
    setError(""); setModo("crear");
  }

  async function abrirEditar(item: ListItem) {
    const doc = await apiFetch<Documento>(`/cxp/${item.id}`).catch(() => null);
    if (!doc) return;
    setEditandoId(doc.id);
    setFCondicionPagoId(doc.condicion_pago_id ?? "");
    setFFecha(doc.fecha);
    setFVencimiento(doc.fecha_vencimiento ?? "");
    setFNumProv(doc.numero_proveedor ?? "");
    setFDescripcion(doc.descripcion ?? "");
    setFTerceroId(doc.tercero_id);
    setFTerceroDisplay(doc.tercero_nit && doc.tercero_nombre ? `${doc.tercero_nit} — ${doc.tercero_nombre}` : "");
    setFMonedaId(doc.moneda_id);
    setFTrm(doc.trm ?? "");
    const lineasForm: LineaForm[] = doc.lineas.map((l) => ({
      _key: key(),
      concepto_id: l.concepto_id ?? "",
      concepto_display: l.concepto_nombre ?? "",
      cuenta_gasto_id: l.cuenta_id ?? "",
      descripcion: l.descripcion,
      subtotal: l.subtotal,
      iva_pct: l.iva_pct,
      total_iva: l.total_iva,
      total: l.total,
      cuenta_iva_id: l.cuenta_iva_id ?? "",
      cuenta_iva_display: l.cuenta_iva_codigo ?? "",
      centro_costo_id: l.centro_costo_id ?? "",
      retenciones: l.retenciones.map((r) => ({
        _key: key(),
        tipo: r.tipo, descripcion: r.descripcion,
        base: r.base, porcentaje: r.porcentaje,
        valor: r.valor,
        cuenta_id: r.cuenta_id, cuenta_display: r.cuenta_codigo ?? "",
      })),
    }));
    setLineas(lineasForm);
    setError(""); setModo("crear");
  }

  async function abrirVer(item: ListItem) {
    const doc = await apiFetch<Documento>(`/cxp/${item.id}`).catch(() => null);
    if (!doc) return;
    setActivo(doc); setError(""); setModo("ver");
  }

  function cerrar() {
    setModo(null); setActivo(null); setEditandoId(null);
    setError(""); setModalAnular(false); setMotivoAnular("");
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  function buildPayload() {
    return {
      tipo: "FACTURA",
      numero_proveedor: fNumProv.trim() || null,
      fecha: fFecha,
      fecha_vencimiento: fVencimiento || null,
      condicion_pago_id: fCondicionPagoId || null,
      tercero_id: fTerceroId,
      moneda_id: fMonedaId,
      trm: fMonedaId !== monedaFuncId && fTrm ? parseFloat(fTrm) : null,
      descripcion: fDescripcion.trim() || null,
      lineas: lineas.map((l, i) => ({
        orden: i + 1,
        descripcion: l.descripcion,
        concepto_id: l.concepto_id || null,
        cuenta_id: l.concepto_id ? null : (l.cuenta_gasto_id || null),
        subtotal: parseFloat(l.subtotal) || 0,
        iva_pct: parseFloat(l.iva_pct) || 0,
        total_iva: parseFloat(l.total_iva) || 0,
        total: parseFloat(l.total) || 0,
        cuenta_iva_id: l.cuenta_iva_id || null,
        centro_costo_id: l.centro_costo_id || null,
        iva_tipo: parseFloat(l.iva_pct) > 0 ? "GRAVADO_19" : "NINGUNO",
        retenciones: l.retenciones.map((r) => ({
          tipo: r.tipo, descripcion: r.descripcion,
          base: parseFloat(r.base) || 0,
          porcentaje: parseFloat(r.porcentaje) || 0,
          valor: Math.round((parseFloat(r.base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000,
          cuenta_id: r.cuenta_id || null,
        })),
      })),
    };
  }

  async function guardar(contabilizar = false) {
    if (!fTerceroId) { setError("Selecciona el proveedor"); return; }
    if (!fVencimiento) { setError("La fecha de vencimiento es obligatoria"); return; }
    if (fVencimiento < fFecha) { setError("La fecha de vencimiento no puede ser anterior a la fecha del documento"); return; }
    if (lineas.length === 0) { setError("Agrega al menos una línea"); return; }
    for (const l of lineas) {
      if (!l.concepto_id && !l.cuenta_gasto_id) { setError("Cada línea debe tener concepto o cuenta"); return; }
      if (!l.subtotal || parseFloat(l.subtotal) <= 0) { setError("El subtotal de cada línea debe ser mayor que cero"); return; }
      if (parseFloat(l.total_iva) > 0 && !l.cuenta_iva_id) { setError("Indica la cuenta de IVA para líneas con IVA"); return; }
    }

    setSaving(true); setError("");
    try {
      const payload = buildPayload();
      const doc = editandoId
        ? await apiFetch<Documento>(`/cxp/${editandoId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch<Documento>("/cxp", { method: "POST", body: JSON.stringify(payload) });

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

  async function contabilizarDoc() {
    if (!activo) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/cxp/${activo.id}/contabilizar`, { method: "POST" });
      const docId = activo.id;
      cerrar(); cargar(1); setPagina(1);
      setIdImprimir(docId); setModalImprimir(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
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

  // El backend pagina; se ordena la página cargada antes de pintarla.
  const ordenada = ordenarFilas(lista, orden, {
    numero:          (d) => d.numero,
    numeroProveedor: (d) => d.numero_proveedor,
    fecha:           (d) => d.fecha,
    vencimiento:     (d) => d.fecha_vencimiento,
    proveedor:       (d) => d.tercero_nombre,
    total:           (d) => Number(d.total),
    saldo:           (d) => Number(d.saldo),
    estado:          (d) => d.estado,
  });

  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));
  const esExtranjera = fMonedaId && fMonedaId !== monedaFuncId;

  return (
    <div className="h-full flex flex-col">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Facturas de compra a proveedores</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva factura
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
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
        {(fEstado || fDesde || fHasta || fPendientes) && (
          <button onClick={() => { setFEstado(""); setFDesde(""); setFHasta(""); setFPendientes(false); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline pb-0.5">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                <Th campo="numero"          orden={orden} alternar={alternar} className="whitespace-nowrap">Número</Th>
                <Th campo="numeroProveedor" orden={orden} alternar={alternar} className="whitespace-nowrap">Nº proveedor</Th>
                <Th campo="fecha"           orden={orden} alternar={alternar} className="whitespace-nowrap">Fecha</Th>
                <Th campo="vencimiento"     orden={orden} alternar={alternar} className="whitespace-nowrap">Vencimiento</Th>
                <Th campo="proveedor"       orden={orden} alternar={alternar} className="whitespace-nowrap">Proveedor</Th>
                <Th campo="total"           orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Total</Th>
                <Th campo="saldo"           orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Saldo</Th>
                <Th campo="estado"          orden={orden} alternar={alternar} className="whitespace-nowrap">Estado</Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : ordenada.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin facturas registradas</td></tr>
              ) : ordenada.map((d) => {
                const vencida = d.dias_vencimiento !== null && d.dias_vencimiento < 0;
                const porVencer = d.dias_vencimiento !== null && d.dias_vencimiento >= 0 && d.dias_vencimiento <= 5;
                return (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">{d.numero}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-500 text-[11px]">{d.numero_proveedor ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {d.fecha_vencimiento ? (
                        <span className={`text-[11px] font-medium ${vencida ? "text-red-600" : porVencer ? "text-amber-600" : "text-gray-500"}`}>
                          {d.fecha_vencimiento}
                          {d.dias_vencimiento !== null && (
                            <span className="ml-1 text-[10px]">{vencida ? `(${Math.abs(d.dias_vencimiento)}d venc.)` : `(${d.dias_vencimiento}d)`}</span>
                          )}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px]">
                      <div className="text-[12px] font-medium text-gray-800 truncate">{d.tercero_nombre}</div>
                      <div className="text-[10px] font-mono text-gray-400">{d.tercero_nit}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(d.total)}</td>
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
                      {d.estado === "borrador" ? (
                        <button onClick={() => abrirEditar(d)} title="Editar"
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      ) : (
                        <button onClick={() => abrirVer(d)} title="Ver"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* ── Modal crear / editar ─────────────────────────────────────────────── */}
      {modo === "crear" && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "min(960px, 96vw)", height: "min(90vh, 820px)" }}>

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-[14px] font-semibold text-gray-800">
                {editandoId ? "Editar factura de proveedor" : "Nueva factura de proveedor"}
              </h2>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {/* Encabezado */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-3">Encabezado</p>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className={lbl}>Fecha *</label>
                    <input type="date" value={fFecha} onChange={(e) => {
                      const nueva = e.target.value;
                      setFFecha(nueva);
                      if (fCondicionPagoId) {
                        aplicarCondicionPago(fCondicionPagoId, nueva);
                      } else if (fVencimiento && fVencimiento < nueva) {
                        setFVencimiento("");
                      }
                    }} className={inp} />
                  </div>
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
                  <div>
                    <label className={lbl}>Vencimiento *</label>
                    <input type="date" value={fVencimiento} onChange={(e) => { setFVencimiento(e.target.value); setFCondicionPagoId(""); }} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Nº factura proveedor</label>
                    <input value={fNumProv} onChange={(e) => setFNumProv(e.target.value)} placeholder="Ej. FV-2024-001" className={inp} />
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
                  <div className={esExtranjera ? "col-span-4" : "col-span-5"}>
                    <label className={lbl}>Proveedor *</label>
                    <TerceroSearch display={fTerceroDisplay}
                      onChange={(id, display) => { setFTerceroId(id); setFTerceroDisplay(display); }} />
                  </div>
                  <div className="col-span-5">
                    <label className={lbl}>Descripción</label>
                    <input value={fDescripcion} onChange={(e) => setFDescripcion(e.target.value)} placeholder="Concepto general de la factura…" className={inp} />
                  </div>
                </div>
              </div>

              {/* Líneas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Líneas de causación</p>
                  <button type="button" onClick={() => setLineas((p) => [...p, nuevaLinea()])}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Agregar línea
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[680px] text-[11px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                        <th className="px-2 py-1.5 text-left w-44">Concepto</th>
                        <th className="px-2 py-1.5 text-left w-40">Descripción</th>
                        <th className="px-2 py-1.5 text-right w-28">Subtotal</th>
                        <th className="px-2 py-1.5 text-right w-20">IVA %</th>
                        <th className="px-2 py-1.5 text-right w-24">IVA $</th>
                        <th className="px-2 py-1.5 text-right w-28">Total línea</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineas.map((l) => (
                        <Fragment key={l._key}>
                          <tr className="bg-white">
                            <td className="px-1 py-1">
                              <select
                                value={l.concepto_id}
                                onChange={(e) => {
                                  const c = conceptos.find((x) => x.id === e.target.value);
                                  if (c) seleccionarConcepto(l._key, c);
                                  else updLinea(l._key, { concepto_id: "", concepto_display: "", cuenta_gasto_id: "" });
                                }}
                                className={inpSm}
                              >
                                <option value="">Seleccionar…</option>
                                {conceptos.map((c) => (
                                  <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1 py-1 align-top">
                              <textarea value={l.descripcion} onChange={(e) => updLinea(l._key, { descripcion: e.target.value })}
                                placeholder="Descripción…" rows={2}
                                className={`${inpSm} resize-none leading-tight`} />
                            </td>
                            <td className="px-1 py-1">
                              <MontoInput value={l.subtotal} onChange={(v) => updLinea(l._key, { subtotal: v })}
                                decimales={2} className={`${inpSm} text-right`} />
                            </td>
                            <td className="px-1 py-1">
                              <MontoInput value={l.iva_pct} onChange={(v) => updLinea(l._key, { iva_pct: v })}
                                decimales={2} placeholder="0" className={`${inpSm} text-right`} />
                            </td>
                            <td className="px-1 py-1 text-right font-mono text-gray-600 pr-2">{fmt(parseFloat(l.total_iva) || 0)}</td>
                            <td className="px-1 py-1 text-right font-mono font-semibold text-gray-800 pr-2">{fmt(parseFloat(l.total) || 0)}</td>
                            <td className="px-1 py-1 text-center">
                              <button type="button" onClick={() => delLinea(l._key)} className="p-1 text-gray-300 hover:text-red-500">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </td>
                          </tr>

                          {/* IVA cuenta si hay IVA */}
                          {parseFloat(l.iva_pct) > 0 && (
                            <tr key={`${l._key}-iva`} className="bg-blue-50/40">
                              <td className="px-2 py-1 text-[10px] text-blue-500 font-semibold" colSpan={2}>
                                → Cuenta IVA descontable *
                              </td>
                              <td className="px-1 py-1" colSpan={4}>
                                <CuentaSearch display={l.cuenta_iva_display} placeholder="Cuenta IVA descontable…"
                                  onChange={(id, display) => updLinea(l._key, { cuenta_iva_id: id, cuenta_iva_display: display })} />
                              </td>
                              <td />
                            </tr>
                          )}

                          {/* Centro de costo */}
                          {centrosCosto.length > 0 && (
                            <tr className="bg-green-50/30">
                              <td className="px-2 py-1 text-[10px] text-green-600 font-semibold" colSpan={2}>
                                → Centro de costo (opcional)
                              </td>
                              <td className="px-1 py-1" colSpan={4}>
                                <select value={l.centro_costo_id}
                                  onChange={(e) => updLinea(l._key, { centro_costo_id: e.target.value })}
                                  className={inpSm}>
                                  <option value="">Sin centro de costo</option>
                                  {centrosCosto.map((c) => (
                                    <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                                  ))}
                                </select>
                              </td>
                              <td />
                            </tr>
                          )}

                          {/* Retenciones de la línea */}
                          {l.retenciones.map((r) => (
                            <tr key={r._key} className="bg-purple-50/30">
                              <td className="px-2 py-1 text-[10px] text-purple-500 font-semibold">
                                → {r.tipo || "RETEFUENTE"}
                              </td>
                              <td className="px-1 py-1">
                                <input value={r.descripcion} onChange={(e) => updRet(l._key, r._key, { descripcion: e.target.value })}
                                  placeholder="Descripción retención…" className={inpSm} />
                              </td>
                              <td className="px-1 py-1">
                                <MontoInput value={r.base} onChange={(v) => updRet(l._key, r._key, { base: v })}
                                  decimales={2} className={`${inpSm} text-right`} />
                              </td>
                              <td className="px-1 py-1">
                                <MontoInput value={r.porcentaje} onChange={(v) => updRet(l._key, r._key, { porcentaje: v })}
                                  decimales={2} placeholder="0" className={`${inpSm} text-right`} />
                              </td>
                              <td className="px-1 py-1" colSpan={1}>
                                <CuentaSearch display={r.cuenta_display} placeholder="Cuenta retención…"
                                  onChange={(id, display) => updRet(l._key, r._key, { cuenta_id: id, cuenta_display: display })} />
                              </td>
                              <td className="px-2 py-1 text-right font-mono text-purple-700 font-semibold">
                                {fmt(Math.round((parseFloat(r.base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000)}
                              </td>
                              <td className="px-1 py-1 text-center">
                                <button type="button" onClick={() => delRet(l._key, r._key)} className="p-1 text-gray-300 hover:text-red-500">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}

                          {/* Botón agregar retención */}
                          <tr className="bg-gray-50/50">
                            <td colSpan={7} className="px-2 py-1">
                              <button type="button" onClick={() => { setRetMenuLineaKey(l._key); setRetBusqueda(""); }}
                                className="text-[10px] text-purple-500 hover:text-purple-700 font-medium">
                                + Agregar retención a esta línea
                              </button>
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  {lineas.length === 0 && (
                    <p className="text-center py-4 text-[12px] text-gray-400">Sin líneas. Haz clic en "Agregar línea".</p>
                  )}
                </div>
              </div>

              {/* Resumen */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-end gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Subtotal</p>
                  <p className="text-[13px] font-mono text-gray-700">{fmt(totalSubtotal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">IVA</p>
                  <p className="text-[13px] font-mono text-gray-700">{fmt(totalIva)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Retenciones</p>
                  <p className="text-[13px] font-mono text-purple-700">{fmt(totalRet)}</p>
                </div>
                <div className="text-right border-l border-gray-200 pl-8">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total a pagar</p>
                  <p className="text-[16px] font-bold font-mono text-gray-900">{fmt(totalDoc)}</p>
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
                {saving ? "Procesando..." : "Guardar y contabilizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ver ──────────────────────────────────────────────────────── */}
      {modo === "ver" && activo && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "min(820px, 95vw)", height: "min(88vh, 780px)" }}>

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-bold text-gray-800 font-mono">{activo.numero}</h2>
                  {activo.numero_proveedor && (
                    <span className="text-[11px] text-gray-400">· Prov: {activo.numero_proveedor}</span>
                  )}
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
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Proveedor</p>
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

              {/* Líneas */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Líneas</p>
                <table className="w-full text-[11px] border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                      {["Concepto/Cuenta", "Descripción", "Subtotal", "IVA", "Total"].map((h) => (
                        <th key={h} className={`px-2 py-1.5 ${["Subtotal","IVA","Total"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activo.lineas.map((l) => (
                      <Fragment key={l.id}>
                        <tr>
                          <td className="px-2 py-1.5 text-blue-700 font-mono text-[10px]">
                            {l.concepto_nombre ?? l.cuenta_codigo}
                            {l.centro_costo_id && (
                              <span className="ml-1 text-green-600 font-semibold">
                                {centrosCosto.find((c) => c.id === l.centro_costo_id)?.codigo}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-gray-600">{l.descripcion}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{fmt(l.subtotal)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-500">{fmt(l.total_iva)}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">{fmt(l.total)}</td>
                        </tr>
                        {l.retenciones.map((r) => (
                          <tr key={r.id} className="bg-purple-50/40">
                            <td className="px-2 py-1 text-[10px] text-purple-600 font-semibold pl-4">↳ {r.tipo}</td>
                            <td className="px-2 py-1 text-[10px] text-gray-500">{r.descripcion}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-500">{fmt(r.base)}</td>
                            <td className="px-2 py-1 text-right text-[10px] text-gray-500">{r.porcentaje}%</td>
                            <td className="px-2 py-1 text-right font-mono text-purple-700 font-semibold text-[10px]">({fmt(r.valor)})</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Subtotal", activo.subtotal],
                  ["IVA", activo.total_iva],
                  ["Retenciones", activo.total_retenciones],
                  ["Total", activo.total],
                ].map(([label, val]) => (
                  <div key={label} className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                    <p className={`text-[13px] font-mono font-semibold ${label === "Retenciones" ? "text-purple-700" : "text-gray-800"}`}>
                      {label === "Retenciones" ? `(${fmt(String(val))})` : fmt(String(val))}
                    </p>
                  </div>
                ))}
              </div>

              {activo.estado === "contabilizado" && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <span className="text-[12px] text-blue-700 font-medium">Saldo pendiente de pago</span>
                  <span className="text-[18px] font-bold font-mono text-blue-800">{fmt(activo.saldo)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
              <button onClick={cerrar} className="px-5 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white">Cerrar</button>
              {activo.estado === "borrador" && (
                <button onClick={contabilizarDoc} disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                  {saving ? "Procesando..." : "Contabilizar"}
                </button>
              )}
              {activo.estado === "contabilizado" && (
                <button onClick={() => window.open(`/factura-proveedor/${activo.id}`, "_blank")}
                  className="px-4 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 text-[12px] font-medium rounded-lg">
                  Imprimir
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
            <h3 className="text-[14px] font-semibold text-gray-800 mb-3">Anular factura</h3>
            <div className="mb-4">
              <label className={lbl}>Motivo *</label>
              <input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Motivo de anulación…" className={inp} autoFocus />
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
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Factura contabilizada</h3>
            <p className="text-[12px] text-gray-500 mb-5">¿Deseas imprimir o guardar como PDF?</p>
            <div className="flex gap-2">
              <button onClick={() => setModalImprimir(false)}
                className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Ahora no
              </button>
              <button onClick={() => { window.open(`/factura-proveedor/${idImprimir}`, "_blank"); setModalImprimir(false); }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selector de retenciones */}
      {retMenuLineaKey && (
        <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: "70vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="text-[13px] font-semibold text-gray-800">Seleccionar retención</h3>
              <button onClick={() => { setRetMenuLineaKey(null); setRetBusqueda(""); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
              <input autoFocus value={retBusqueda} onChange={(e) => setRetBusqueda(e.target.value)}
                placeholder="Buscar por nombre o tipo…"
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
                    onClick={() => addRetFromCatalog(retMenuLineaKey, r)}
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
                    {r.cuenta_compras_codigo && (
                      <p className="text-[10px] text-gray-400 mt-0.5 ml-0.5">{r.cuenta_compras_codigo} — {r.cuenta_compras_nombre}</p>
                    )}
                  </button>
                ));
              })()}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => addRetManual(retMenuLineaKey)}
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
