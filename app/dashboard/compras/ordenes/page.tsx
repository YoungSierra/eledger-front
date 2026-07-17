"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import CentroCostoTreeSelect from "@/components/CentroCostoTreeSelect";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Tercero    { id: string; nit: string; razon_social: string; }
interface Moneda     { id: string; codigo: string; nombre: string; es_funcional: boolean; }
interface Producto   { id: string; codigo: string; nombre: string; um_base_id: string; um_base_codigo: string; maneja_inventario: boolean; }
interface Um         { id: string; codigo: string; nombre: string; }
interface TarifaIva   { id: string; nombre: string; tipo: string; porcentaje: string; }
interface CentroCosto { id: string; codigo: string; nombre: string; padre_id: string | null; }

interface LineaForm {
  _key: string;
  producto_id: string; producto_display: string;
  maneja_inventario: boolean;
  cantidad: string; um_id: string; um_display: string;
  precio_unitario: string;
  descuento_pct: string;
  subtotal: string;
  tarifa_iva_id: string; iva_pct: string; total_iva: string; total: string;
  centro_costo_id: string; centro_costo_display: string;
}

interface LineaResp {
  id: string;
  producto_id: string; producto_codigo: string | null; producto_nombre: string | null;
  maneja_inventario: boolean;
  cantidad: string; um_id: string; um_codigo: string | null;
  precio_unitario: string; descuento_pct: string; subtotal: string;
  iva_pct: string; total_iva: string; total: string;
  cantidad_recibida: string; pendiente: string;
}

interface Oc {
  id: string; numero: string;
  fecha: string; fecha_entrega_esperada: string | null;
  proveedor_id: string; proveedor_nit: string | null; proveedor_nombre: string | null;
  moneda_id: string; moneda_codigo: string | null; trm: string | null;
  subtotal: string; total_iva: string; total: string;
  notas: string | null; estado: string;
  lineas: LineaResp[];
}

interface ListItem {
  id: string; numero: string; fecha: string;
  proveedor_nit: string | null; proveedor_nombre: string | null;
  moneda_codigo: string | null;
  subtotal: string; total_iva: string; total: string;
  estado: string; recepciones_count: number;
}

interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  borrador:        "bg-amber-50 text-amber-700 border border-amber-200",
  aprobada:        "bg-blue-50 text-blue-700 border border-blue-200",
  en_proceso:      "bg-indigo-50 text-indigo-700 border border-indigo-200",
  recibida_total:  "bg-green-50 text-green-700 border border-green-200",
  anulada:         "bg-red-50 text-red-600 border border-red-200",
};
const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", aprobada: "Aprobada", en_proceso: "En proceso",
  recibida_total: "Recibida", anulada: "Anulada",
};

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpSm = "w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function calcLinea(l: LineaForm): LineaForm {
  const cant = parseFloat(l.cantidad) || 0;
  const precio = parseFloat(l.precio_unitario) || 0;
  const desc = parseFloat(l.descuento_pct) || 0;
  const iva = parseFloat(l.iva_pct) || 0;
  const base = cant * precio;
  const sub = base - base * (desc / 100);
  const tiva = sub * (iva / 100);
  return { ...l, subtotal: sub.toFixed(4), total_iva: tiva.toFixed(4), total: (sub + tiva).toFixed(4) };
}
function nuevaLinea(): LineaForm {
  return { _key: crypto.randomUUID(), producto_id: "", producto_display: "", maneja_inventario: true, cantidad: "1", um_id: "", um_display: "", precio_unitario: "0", descuento_pct: "0", subtotal: "0", tarifa_iva_id: "", iva_pct: "0", total_iva: "0", total: "0", centro_costo_id: "", centro_costo_display: "" };
}

// ─── Buscadores ───────────────────────────────────────────────────────────────

function TerceroSearch({ display, onChange }: { display: string; onChange: (id: string, d: string) => void }) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setQ(display); }, [display]);

  function buscar(v: string) {
    setQ(v);
    if (!v.trim()) { setOpts([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(v)}&solo_activos=true&tipo_tercero=PROVEEDOR`).catch(() => []);
      if (data.length > 0 && ref.current) {
        const r = ref.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
      }
      setOpts(data.slice(0, 10));
      setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar por NIT o nombre…" className={inp} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-44 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((t) => (
            <button key={t.id} type="button"
              onMouseDown={() => { const d = `${t.nit} — ${t.razon_social}`; setQ(d); setOpen(false); onChange(t.id, d); }}
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

function ProductoSearch({ display, onChange }: { display: string; onChange: (p: Producto) => void }) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setQ(display); }, [display]);

  const buscar = useCallback((v: string) => {
    setQ(v);
    if (v.length < 2) { setOpts([]); setOpen(false); return; }
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + window.scrollY + 2, left: r.left + window.scrollX, width: r.width });
    apiFetch(`/inventario/productos?q=${encodeURIComponent(v)}&limit=10&activo=true`).then((d: any) => {
      setOpts(d.items ?? d);
      setOpen(true);
    }).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar producto…" className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-44 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 280) }}>
          {opts.map((p) => (
            <button key={p.id} type="button"
              onMouseDown={() => { setQ(`${p.codigo} — ${p.nombre}`); setOpen(false); onChange(p); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{p.codigo}</span>
              <span className="text-[11px] text-gray-700">{p.nombre}</span>
              {!p.maneja_inventario && <span className="ml-2 text-[10px] text-purple-500">[servicio]</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OrdenesCompraPage() {
  const title = usePageTitle();
  const [lista, setLista] = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 20;
  const [loading, setLoading] = useState(true);
  const [fEstado, setFEstado] = useState("");
  // El backend lista por fecha descendente — ese es el orden inicial.
  const { orden, alternar } = useOrden<
    "numero" | "fecha" | "proveedor" | "subtotal" | "iva" | "total" | "estado" | "recepciones"
  >("fecha", "desc", () => setPagina(1));

  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [monedaFuncId, setMonedaFuncId] = useState("");
  const [unidades, setUnidades] = useState<Um[]>([]);
  const [tarifasIva, setTarifasIva] = useState<TarifaIva[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);

  const [modo, setModo] = useState<"crear" | "editar" | "ver" | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [activo, setActivo] = useState<Oc | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{ titulo: string; descripcion: string; variante: "blue" | "red"; accion: () => void } | null>(null);
  const [puedeAutorizar, setPuedeAutorizar] = useState(false);
  const [puedeEliminar, setPuedeEliminar]   = useState(false);

  // Formulario
  const [fFecha, setFFecha] = useState(hoyLocal());
  const [fFechaEntrega, setFFechaEntrega] = useState("");
  const [fProveedorId, setFProveedorId] = useState("");
  const [fProveedorDisplay, setFProveedorDisplay] = useState("");
  const [fMonedaId, setFMonedaId] = useState("");
  const [fTrm, setFTrm] = useState("");
  const [fNotas, setFNotas] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()]);

  // El backend pagina; se ordena la página cargada antes de pintarla.
  const ordenada = ordenarFilas(lista, orden, {
    numero:      (oc) => oc.numero,
    fecha:       (oc) => oc.fecha,
    proveedor:   (oc) => oc.proveedor_nombre,
    subtotal:    (oc) => Number(oc.subtotal),
    iva:         (oc) => Number(oc.total_iva),
    total:       (oc) => Number(oc.total),
    estado:      (oc) => ESTADO_LABEL[oc.estado] ?? oc.estado,
    recepciones: (oc) => oc.recepciones_count,
  });

  const totalPaginas = Math.max(1, Math.ceil(totalItems / porPagina));
  const esExtranjera = monedas.find((m) => m.id === fMonedaId)?.es_funcional === false;

  // ── Carga de lista ──────────────────────────────────────────────────────────
  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), por_pagina: String(porPagina) });
      if (fEstado) params.set("estado", fEstado);
      const d: ListResponse = await apiFetch(`/compras/ordenes?${params}`);
      setLista(d.items);
      setTotalItems(d.total);
    } finally {
      setLoading(false);
    }
  }, [pagina, fEstado]);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  useEffect(() => {
    apiFetch("/maestros/monedas").then((d: any) => {
      const arr: Moneda[] = d.items ?? d;
      setMonedas(arr);
      const func = arr.find((m) => m.es_funcional);
      if (func) { setMonedaFuncId(func.id); setFMonedaId(func.id); }
    }).catch(() => {});
    apiFetch("/inventario/unidades-medida").then((d: any) => setUnidades(d.items ?? d)).catch(() => {});
    apiFetch("/maestros/tarifas-iva?solo_activas=true").then((d: any) => setTarifasIva(d.items ?? d)).catch(() => {});
    apiFetch("/centros-costo?plano=true").then((d: any) => setCentrosCosto(d.items ?? d)).catch(() => {});
    apiFetch<{ permisos: string[] }>("/auth/me").then((u) => {
      setPuedeAutorizar(u.permisos.includes("compras:autorizar"));
      setPuedeEliminar(u.permisos.includes("compras:eliminar"));
    }).catch(() => {});
  }, []);

  // ── Apertura modal ──────────────────────────────────────────────────────────
  function abrirCrear() {
    setActivo(null);
    setFFecha(hoyLocal());
    setFFechaEntrega("");
    setFProveedorId(""); setFProveedorDisplay("");
    setFMonedaId(monedaFuncId); setFTrm(""); setFNotas("");
    setLineas([nuevaLinea()]);
    setError("");
    setModo("crear");
  }

  async function abrirVer(id: string) {
    const d: Oc = await apiFetch(`/compras/ordenes/${id}`);
    setActivo(d);
    setError("");
    setModo("ver");
  }

  async function abrirEditarDesdeId(id: string) {
    const d: Oc = await apiFetch(`/compras/ordenes/${id}`);
    abrirEditar(d);
  }

  function abrirEditar(oc: Oc) {
    setActivo(oc);
    setEditandoId(oc.id);
    setFFecha(oc.fecha);
    setFFechaEntrega(oc.fecha_entrega_esperada ?? "");
    setFProveedorId(oc.proveedor_id);
    setFProveedorDisplay(oc.proveedor_nit && oc.proveedor_nombre ? `${oc.proveedor_nit} — ${oc.proveedor_nombre}` : oc.proveedor_nombre ?? "");
    setFMonedaId(oc.moneda_id);
    setFTrm(oc.trm ?? "");
    setFNotas(oc.notas ?? "");
    setLineas(oc.lineas.map((l) => {
      const tarifa = tarifasIva.find((t) => parseFloat(t.porcentaje) === parseFloat(l.iva_pct));
      return calcLinea({
        _key: crypto.randomUUID(),
        producto_id: l.producto_id,
        producto_display: `${l.producto_codigo ?? ""} — ${l.producto_nombre ?? ""}`,
        maneja_inventario: l.maneja_inventario,
        cantidad: l.cantidad,
        um_id: l.um_id,
        um_display: l.um_codigo ?? "",
        precio_unitario: l.precio_unitario,
        descuento_pct: l.descuento_pct,
        subtotal: l.subtotal,
        tarifa_iva_id: tarifa?.id ?? "",
        iva_pct: l.iva_pct,
        total_iva: l.total_iva,
        total: l.total,
        centro_costo_id: l.centro_costo_id ?? "",
        centro_costo_display: l.centro_costo_codigo && l.centro_costo_nombre
          ? `${l.centro_costo_codigo} — ${l.centro_costo_nombre}` : "",
      });
    }));
    setError("");
    setModo("editar");
  }

  function cerrar() { setModo(null); setActivo(null); setEditandoId(null); setSaving(false); setError(""); }

  // ── Líneas ──────────────────────────────────────────────────────────────────
  function setLinea(key: string, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l) => l._key === key ? calcLinea({ ...l, ...patch }) : l));
  }
  function seleccionarTarifaIva(key: string, tarifaId: string) {
    const t = tarifasIva.find((x) => x.id === tarifaId);
    setLineas((prev) => prev.map((l) => {
      if (l._key !== key) return l;
      if (!t) return calcLinea({ ...l, tarifa_iva_id: "", iva_pct: "0" });
      return calcLinea({ ...l, tarifa_iva_id: t.id, iva_pct: t.porcentaje });
    }));
  }
  function onProducto(key: string, p: Producto) {
    setLinea(key, {
      producto_id: p.id,
      producto_display: `${p.codigo} — ${p.nombre}`,
      maneja_inventario: p.maneja_inventario,
      um_id: p.um_base_id,
      um_display: p.um_base_codigo,
    });
  }

  // ── Totales ─────────────────────────────────────────────────────────────────
  const totBruto  = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0), 0);
  const totSub    = lineas.reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);
  const totDesc   = totBruto - totSub;
  const totIva    = lineas.reduce((s, l) => s + (parseFloat(l.total_iva) || 0), 0);
  const totTotal  = totSub + totIva;

  // ── Guardar OC ──────────────────────────────────────────────────────────────
  async function guardar() {
    if (!fProveedorId) { setError("Seleccione un proveedor"); return; }
    if (!fMonedaId) { setError("Seleccione una moneda"); return; }
    const lineasValidas = lineas.filter((l) => l.producto_id && parseFloat(l.cantidad) > 0);
    if (!lineasValidas.length) { setError("Agregue al menos una línea con producto y cantidad"); return; }

    setSaving(true); setError("");
    try {
      const body = {
        fecha: fFecha,
        fecha_entrega_esperada: fFechaEntrega || null,
        proveedor_id: fProveedorId,
        moneda_id: fMonedaId,
        trm: esExtranjera && fTrm ? parseFloat(fTrm) : null,
        notas: fNotas || null,
        lineas: lineasValidas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: parseFloat(l.cantidad),
          um_id: l.um_id,
          precio_unitario: parseFloat(l.precio_unitario) || 0,
          descuento_pct: parseFloat(l.descuento_pct) || 0,
          iva_pct: parseFloat(l.iva_pct) || 0,
          tarifa_iva_id: l.tarifa_iva_id || null,
          centro_costo_id: l.centro_costo_id || null,
        })),
      };
      if (editandoId) {
        await apiFetch(`/compras/ordenes/${editandoId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/compras/ordenes", { method: "POST", body: JSON.stringify(body) });
      }
      cerrar();
      cargarLista();
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function guardarYAprobar() {
    if (!fProveedorId) { setError("Seleccione un proveedor"); return; }
    if (!fMonedaId) { setError("Seleccione una moneda"); return; }
    const lineasValidas = lineas.filter((l) => l.producto_id && parseFloat(l.cantidad) > 0);
    if (!lineasValidas.length) { setError("Agregue al menos una línea con producto y cantidad"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        fecha: fFecha,
        fecha_entrega_esperada: fFechaEntrega || null,
        proveedor_id: fProveedorId,
        moneda_id: fMonedaId,
        trm: esExtranjera && fTrm ? parseFloat(fTrm) : null,
        notas: fNotas || null,
        lineas: lineasValidas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: parseFloat(l.cantidad),
          um_id: l.um_id,
          precio_unitario: parseFloat(l.precio_unitario) || 0,
          descuento_pct: parseFloat(l.descuento_pct) || 0,
          iva_pct: parseFloat(l.iva_pct) || 0,
          tarifa_iva_id: l.tarifa_iva_id || null,
          centro_costo_id: l.centro_costo_id || null,
        })),
      };
      let oc: Oc;
      if (editandoId) {
        oc = await apiFetch(`/compras/ordenes/${editandoId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        oc = await apiFetch("/compras/ordenes", { method: "POST", body: JSON.stringify(body) });
      }
      await apiFetch(`/compras/ordenes/${oc.id}/aprobar`, { method: "POST" });
      cerrar();
      cargarLista();
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // ── Aprobar / Anular ─────────────────────────────────────────────────────────
  function aprobar(id: string) {
    setConfirm({
      titulo: "Aprobar orden de compra",
      descripcion: "Una vez aprobada la OC ya no podrá editarse. ¿Deseas continuar?",
      variante: "blue",
      accion: async () => {
        try {
          await apiFetch(`/compras/ordenes/${id}/aprobar`, { method: "POST" });
          if (activo?.id === id) { const d: Oc = await apiFetch(`/compras/ordenes/${id}`); setActivo(d); }
          cargarLista();
        } catch (e: any) { alert(e.message ?? "Error"); }
      },
    });
  }

  function anular(id: string) {
    setConfirm({
      titulo: "Anular orden de compra",
      descripcion: "Esta acción anulará la OC y no se puede deshacer. ¿Deseas continuar?",
      variante: "red",
      accion: async () => {
        try {
          await apiFetch(`/compras/ordenes/${id}/anular`, { method: "POST" });
          if (activo?.id === id) { const d: Oc = await apiFetch(`/compras/ordenes/${id}`); setActivo(d); }
          cargarLista();
        } catch (e: any) { alert(e.message ?? "Error"); }
      },
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-[12px] font-medium hover:bg-blue-700">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva OC
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(1); }}
          className="text-[12px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-700">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr className="text-[10px] font-bold uppercase text-gray-400">
              <Th campo="numero"      orden={orden} alternar={alternar} className="w-28">Número</Th>
              <Th campo="fecha"       orden={orden} alternar={alternar} className="w-24">Fecha</Th>
              <Th campo="proveedor"   orden={orden} alternar={alternar} className="w-52">Proveedor</Th>
              <Th campo="subtotal"    orden={orden} alternar={alternar} align="right" className="w-32">Subtotal</Th>
              <Th campo="iva"         orden={orden} alternar={alternar} align="right" className="w-28">IVA</Th>
              <Th campo="total"       orden={orden} alternar={alternar} align="right" className="w-32">Total</Th>
              <Th campo="estado"      orden={orden} alternar={alternar} align="center" className="w-28">Estado</Th>
              <Th campo="recepciones" orden={orden} alternar={alternar} align="center" className="w-24">Recepciones</Th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Cargando…</td></tr>
            ) : ordenada.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Sin órdenes de compra</td></tr>
            ) : ordenada.map((oc) => (
              <tr key={oc.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold whitespace-nowrap">{oc.numero}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{oc.fecha}</td>
                <td className="px-4 py-2.5 w-52 max-w-[208px]">
                  <div className="font-medium text-gray-800 truncate">{oc.proveedor_nombre}</div>
                  <div className="text-gray-400 text-[11px]">{oc.proveedor_nit}</div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-600">{fmt(oc.subtotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-400">{parseFloat(oc.total_iva) > 0 ? fmt(oc.total_iva) : "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold">
                  <span className="text-[10px] text-gray-400 mr-1">{oc.moneda_codigo}</span>
                  {fmt(oc.total)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[oc.estado] ?? ""}`}>
                    {ESTADO_LABEL[oc.estado] ?? oc.estado}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center text-gray-500">{oc.recepciones_count}</td>
                <td className="px-2 py-2.5">
                  <button onClick={() => abrirVer(oc.id)} title="Ver"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-gray-200 bg-white flex-shrink-0 text-[12px] text-gray-500">
        <span>{Math.min((pagina - 1) * porPagina + 1, totalItems)}–{Math.min(pagina * porPagina, totalItems)} de {totalItems}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina(1)} disabled={pagina === 1} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">«</button>
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹</button>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">›</button>
          <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">»</button>
        </div>
      </div>

      {/* ─── Modal crear / editar ───────────────────────────────────────────────── */}
      {(modo === "crear" || modo === "editar") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[960px] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-[14px] font-semibold text-gray-800">
                {modo === "editar" ? `Editar OC — ${activo?.numero ?? ""}` : "Nueva orden de compra"}
              </h2>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Encabezado */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Fecha *</label>
                  <input type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Entrega esperada</label>
                  <input type="date" value={fFechaEntrega} onChange={(e) => setFFechaEntrega(e.target.value)} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Moneda *</label>
                  <select value={fMonedaId} onChange={(e) => { setFMonedaId(e.target.value); setFTrm(""); }} className={inp}>
                    {monedas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                  </select>
                </div>
                {esExtranjera && (
                  <div className="col-span-2">
                    <label className={lbl}>TRM</label>
                    <MontoInput value={fTrm} onChange={setFTrm} decimales={2} placeholder="4234.50" className={inp} />
                  </div>
                )}
                <div className={esExtranjera ? "col-span-4" : "col-span-6"}>
                  <label className={lbl}>Proveedor *</label>
                  <TerceroSearch display={fProveedorDisplay}
                    onChange={(id, d) => { setFProveedorId(id); setFProveedorDisplay(d); }} />
                </div>
                <div className="col-span-12">
                  <label className={lbl}>Notas</label>
                  <textarea value={fNotas} onChange={(e) => setFNotas(e.target.value)} rows={2} className={inp} />
                </div>
              </div>

              {/* Líneas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Líneas</p>
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
                        <th className="px-2 py-1.5 text-left" style={{ width: "25%" }}>Producto</th>
                        <th className="px-2 py-1.5 text-right w-16">Cant.</th>
                        <th className="px-2 py-1.5 text-left w-14">UM</th>
                        <th className="px-2 py-1.5 text-right w-28">Precio unit.</th>
                        <th className="px-2 py-1.5 text-right w-16">Desc %</th>
                        <th className="px-2 py-1.5 text-right w-24">Subtotal</th>
                        <th className="px-2 py-1.5 text-right w-24">Total</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((l) => (
                        <Fragment key={l._key}>
                          {/* Fila 1 — comercial */}
                          <tr className="border-t border-gray-200 align-middle bg-white">
                            <td className="px-2 pt-2 pb-0.5">
                              <ProductoSearch display={l.producto_display} onChange={(p) => onProducto(l._key, p)} />
                              {l.producto_id && !l.maneja_inventario && (
                                <span className="text-[10px] text-purple-500">Servicio</span>
                              )}
                            </td>
                            <td className="px-2 pt-2 pb-0.5">
                              <MontoInput value={l.cantidad} onChange={(v) => setLinea(l._key, { cantidad: v })}
                                decimales={4} className={inpSm + " text-right"} />
                            </td>
                            <td className="px-2 pt-2 pb-0.5">
                              <select value={l.um_id} onChange={(e) => {
                                const um = unidades.find((u) => u.id === e.target.value);
                                setLinea(l._key, { um_id: e.target.value, um_display: um?.codigo ?? "" });
                              }} className={inpSm}>
                                <option value="">—</option>
                                {unidades.map((u) => <option key={u.id} value={u.id}>{u.codigo}</option>)}
                              </select>
                            </td>
                            <td className="px-2 pt-2 pb-0.5">
                              <MontoInput value={l.precio_unitario} onChange={(v) => setLinea(l._key, { precio_unitario: v })}
                                decimales={2} className={inpSm + " text-right"} />
                            </td>
                            <td className="px-2 pt-2 pb-0.5">
                              <MontoInput value={l.descuento_pct} onChange={(v) => setLinea(l._key, { descuento_pct: v })}
                                decimales={2} className={inpSm + " text-right"} />
                            </td>
                            <td className="px-2 pt-2 pb-0.5 text-right font-mono text-red-400 text-[10px]">
                              {parseFloat(l.descuento_pct) > 0
                                ? `-${fmt((parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0) * (parseFloat(l.descuento_pct) || 0) / 100)}`
                                : null}
                            </td>
                            <td className="px-0 pt-0 pb-0" />
                            <td className="px-0 pt-0 pb-0" />
                          </tr>

                          {/* Fila 2 — IVA | C.Costo | Subtotal | Total | ✕ */}
                          <tr className="border-b border-gray-100 bg-white">
                            {/* IVA selector */}
                            <td className="px-2 pt-0.5 pb-2">
                              <select value={l.tarifa_iva_id}
                                onChange={(e) => seleccionarTarifaIva(l._key, e.target.value)}
                                className={inpSm}>
                                <option value="">Sin IVA</option>
                                {tarifasIva.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.porcentaje}%)</option>)}
                              </select>
                            </td>
                            {/* IVA $ */}
                            <td className="px-2 pt-0.5 pb-2 text-right font-mono text-gray-400 text-[10px]">
                              {parseFloat(l.total_iva) > 0 ? fmt(l.total_iva) : "—"}
                            </td>
                            {/* C. Costo (spans UM + Precio + Desc%) */}
                            <td colSpan={3} className="px-2 pt-0.5 pb-2">
                              <CentroCostoTreeSelect centros={centrosCosto} value={l.centro_costo_id}
                                onChange={(id) => setLinea(l._key, { centro_costo_id: id, centro_costo_display: centrosCosto.find(c => c.id === id)?.codigo ?? "" })}
                                placeholder="Sin centro de costo" />
                            </td>
                            {/* Subtotal */}
                            <td className="px-2 pt-0.5 pb-2 text-right font-mono text-gray-600">
                              {fmt(l.subtotal)}
                            </td>
                            {/* Total */}
                            <td className="px-2 pt-0.5 pb-2 text-right font-mono font-semibold text-gray-800">
                              {fmt(l.total)}
                            </td>
                            {/* Eliminar */}
                            <td className="px-1 pt-0.5 pb-2 text-center">
                              <button type="button" onClick={() => setLineas((p) => p.filter((x) => x._key !== l._key))}
                                className="text-gray-300 hover:text-red-400">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotales */}
                <div className="flex justify-end mt-2">
                  <table className="text-[12px] border-collapse">
                    <tbody>
                      {totDesc > 0 && (
                        <>
                          <tr>
                            <td className="pr-6 py-0.5 text-gray-400 text-right">Bruto</td>
                            <td className="pl-4 py-0.5 text-right font-mono text-gray-400 min-w-[110px]">{fmt(totBruto)}</td>
                          </tr>
                          <tr>
                            <td className="pr-6 py-0.5 text-red-400 text-right">Descuento</td>
                            <td className="pl-4 py-0.5 text-right font-mono text-red-400">-{fmt(totDesc)}</td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <td className="pr-6 py-0.5 text-gray-500 text-right">Subtotal</td>
                        <td className="pl-4 py-0.5 text-right font-mono text-gray-700 min-w-[110px]">{fmt(totSub)}</td>
                      </tr>
                      <tr>
                        <td className="pr-6 py-0.5 text-gray-500 text-right">IVA</td>
                        <td className="pl-4 py-0.5 text-right font-mono text-gray-500">{fmt(totIva)}</td>
                      </tr>
                      <tr className="border-t border-gray-300">
                        <td className="pr-6 pt-1 text-gray-800 font-bold text-right uppercase text-[11px]">Total</td>
                        <td className="pl-4 pt-1 text-right font-mono font-bold text-gray-800 text-[13px]">{fmt(totTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {error && <p className="text-[12px] text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-2 px-6 py-4 border-t border-gray-200">
              <div />
              <div className="flex gap-2">
                <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cancelar</button>
                <button onClick={guardar} disabled={saving}
                  className="px-4 py-2 text-[12px] border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">
                  {saving ? "Guardando…" : modo === "editar" ? "Guardar cambios" : "Guardar OC"}
                </button>
                {puedeAutorizar && (
                  <button onClick={guardarYAprobar} disabled={saving}
                    className="px-4 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Procesando…" : "Guardar y aprobar"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ver ──────────────────────────────────────────────────────────── */}
      {modo === "ver" && activo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[1100px] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-[14px] font-semibold text-gray-800">{activo.numero}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[activo.estado] ?? ""}`}>
                  {ESTADO_LABEL[activo.estado] ?? activo.estado}
                </span>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-4 gap-4 text-[12px]">
                <div><span className={lbl}>Proveedor</span><p className="text-gray-800">{activo.proveedor_nombre} <span className="text-gray-400">({activo.proveedor_nit})</span></p></div>
                <div><span className={lbl}>Fecha</span><p className="text-gray-800">{activo.fecha}</p></div>
                <div><span className={lbl}>Entrega esperada</span><p className="text-gray-800">{activo.fecha_entrega_esperada ?? "—"}</p></div>
                <div><span className={lbl}>Moneda</span><p className="text-gray-800">{activo.moneda_codigo}{activo.trm ? ` · TRM ${fmt(activo.trm)}` : ""}</p></div>
                {activo.notas && <div className="col-span-4"><span className={lbl}>Notas</span><p className="text-gray-700">{activo.notas}</p></div>}
              </div>

              {/* Líneas */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[680px] text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                      <th className="px-3 py-1.5 text-left" style={{ width: "26%" }}>Producto</th>
                      <th className="px-3 py-1.5 text-right w-16">Cant.</th>
                      <th className="px-3 py-1.5 text-left w-12">UM</th>
                      <th className="px-3 py-1.5 text-right w-24">Precio unit.</th>
                      <th className="px-3 py-1.5 text-right w-14">Desc %</th>
                      <th className="px-3 py-1.5 text-right w-24">Subtotal</th>
                      <th className="px-3 py-1.5 text-right w-24">Total</th>
                      <th className="px-3 py-1.5 text-right w-20">Recibido</th>
                      <th className="px-3 py-1.5 text-right w-20">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activo.lineas.map((l) => (
                      <Fragment key={l.id}>
                        {/* Fila 1 — comercial */}
                        <tr className="border-t border-gray-200 bg-white align-middle">
                          <td className="px-3 pt-2 pb-0.5">
                            <span className="font-mono text-blue-600 mr-1 text-[10px]">{l.producto_codigo}</span>
                            <span className="text-gray-800">{l.producto_nombre}</span>
                            {!l.maneja_inventario && <span className="ml-1 text-[10px] text-purple-500">[servicio]</span>}
                          </td>
                          <td className="px-3 pt-2 pb-0.5 text-right font-mono">{fmt(l.cantidad, 4)}</td>
                          <td className="px-3 pt-2 pb-0.5 text-gray-500">{l.um_codigo}</td>
                          <td className="px-3 pt-2 pb-0.5 text-right font-mono">{fmt(l.precio_unitario)}</td>
                          <td className="px-3 pt-2 pb-0.5 text-right font-mono text-gray-500">
                            {parseFloat(l.descuento_pct) > 0 ? `${fmt(l.descuento_pct)}%` : "—"}
                          </td>
                          <td className="px-0 pt-0 pb-0" />
                          <td className="px-0 pt-0 pb-0" />
                          <td className="px-0 pt-0 pb-0" />
                          <td className="px-0 pt-0 pb-0" />
                        </tr>
                        {/* Fila 2 — IVA | C.Costo | Subtotal | Total | Recibido | Pendiente */}
                        <tr className="border-b border-gray-100 bg-white">
                          <td className="px-3 pt-0.5 pb-2 text-[10px] text-gray-400">
                            {parseFloat(l.iva_pct) > 0
                              ? <span>IVA {fmt(l.iva_pct, 0)}% <span className="font-mono ml-1">{fmt(l.total_iva)}</span></span>
                              : <span className="text-gray-300">Sin IVA</span>}
                          </td>
                          <td colSpan={4} className="px-3 pt-0.5 pb-2 text-[10px] text-gray-400">
                            {l.centro_costo_codigo
                              ? <span><span className="font-mono">{l.centro_costo_codigo}</span>{l.centro_costo_nombre ? ` — ${l.centro_costo_nombre}` : ""}</span>
                              : <span className="text-gray-300">Sin centro de costo</span>}
                          </td>
                          <td className="px-3 pt-0.5 pb-2 text-right font-mono text-gray-500">{fmt(l.subtotal)}</td>
                          <td className="px-3 pt-0.5 pb-2 text-right font-mono font-semibold text-gray-800">{fmt(l.total)}</td>
                          <td className="px-3 pt-0.5 pb-2 text-right font-mono text-green-600">{fmt(l.cantidad_recibida, 4)}</td>
                          <td className="px-3 pt-0.5 pb-2 text-right font-mono text-amber-600">{fmt(l.pendiente, 4)}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Subtotales */}
                {(() => {
                  const verBruto = activo.lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0), 0);
                  const verDesc = verBruto - (parseFloat(activo.subtotal) || 0);
                  return (
                    <div className="flex justify-end mt-2">
                      <table className="text-[12px] border-collapse">
                        <tbody>
                          {verDesc > 0.001 && (
                            <>
                              <tr>
                                <td className="pr-6 py-0.5 text-gray-400 text-right">Bruto</td>
                                <td className="pl-4 py-0.5 text-right font-mono text-gray-400 min-w-[110px]">{fmt(verBruto)}</td>
                              </tr>
                              <tr>
                                <td className="pr-6 py-0.5 text-red-400 text-right">Descuento</td>
                                <td className="pl-4 py-0.5 text-right font-mono text-red-400">-{fmt(verDesc)}</td>
                              </tr>
                            </>
                          )}
                          <tr>
                            <td className="pr-6 py-0.5 text-gray-500 text-right">Subtotal</td>
                            <td className="pl-4 py-0.5 text-right font-mono text-gray-700 min-w-[110px]">{fmt(activo.subtotal)}</td>
                          </tr>
                          <tr>
                            <td className="pr-6 py-0.5 text-gray-500 text-right">IVA</td>
                            <td className="pl-4 py-0.5 text-right font-mono text-gray-500">{fmt(activo.total_iva)}</td>
                          </tr>
                          <tr className="border-t border-gray-300">
                            <td className="pr-6 pt-1 text-gray-800 font-bold text-right uppercase text-[11px]">Total</td>
                            <td className="pl-4 pt-1 text-right font-mono font-bold text-gray-800 text-[13px]">{fmt(activo.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-between gap-2 px-6 py-4 border-t border-gray-200">
              <div className="flex gap-2">
                {activo.estado === "borrador" && puedeEliminar && (
                  <button onClick={() => anular(activo.id)}
                    className="px-3 py-1.5 text-[12px] text-red-600 border border-red-200 rounded-md hover:bg-red-50">
                    Anular
                  </button>
                )}
                {activo.estado === "aprobada" && puedeEliminar && (
                  <button onClick={() => anular(activo.id)}
                    className="px-3 py-1.5 text-[12px] text-red-600 border border-red-200 rounded-md hover:bg-red-50">
                    Anular
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {["aprobada", "en_proceso", "recibida_total"].includes(activo.estado) && (
                  <button onClick={() => window.open(`/oc/${activo.id}`, "_blank")}
                    className="px-3 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                    Imprimir
                  </button>
                )}
                {activo.estado === "borrador" && (
                  <button onClick={() => abrirEditar(activo)}
                    className="px-3 py-1.5 text-[12px] text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Editar
                  </button>
                )}
                {activo.estado === "borrador" && puedeAutorizar && (
                  <button onClick={() => aprobar(activo.id)}
                    className="px-4 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Aprobar OC
                  </button>
                )}
                <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 ${confirm.variante === "red" ? "bg-red-100" : "bg-blue-100"}`}>
              {confirm.variante === "red" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 11 12 14 22 4"/></svg>
              )}
            </div>
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">{confirm.titulo}</h3>
            <p className="text-[12px] text-gray-500 mb-5">{confirm.descripcion}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => { const fn = confirm.accion; setConfirm(null); fn(); }}
                className={`flex-1 py-2 text-[12px] font-medium text-white rounded-lg ${confirm.variante === "red" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
