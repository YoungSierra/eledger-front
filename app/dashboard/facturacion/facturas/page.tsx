"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import CentroCostoTreeSelect from "@/components/CentroCostoTreeSelect";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";
import AsientoModal, { type AsientoData } from "@/components/AsientoModal";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Moneda  { id: string; codigo: string; nombre: string; decimales: number; es_funcional: boolean; }
interface Tercero { id: string; nit: string; razon_social: string; }
interface Cuenta  { id: string; codigo: string; nombre: string; }
interface CondicionPago { id: string; codigo: string; nombre: string; dias_vencimiento: number; }
interface TarifaIva {
  id: string; nombre: string; tipo: string; porcentaje: string;
  cuenta_iva_ventas_id: string | null;
  cuenta_iva_ventas_codigo: string | null;
  cuenta_iva_ventas_nombre: string | null;
}
interface RetCatalogo {
  id: string; tipo: string; nombre: string; porcentaje: string;
  aplica_venta: boolean;
  cuenta_ventas_id: string | null;
  cuenta_ventas_codigo: string | null;
  cuenta_ventas_nombre: string | null;
}
interface Producto {
  id: string; codigo: string; nombre: string; descripcion: string | null;
  um_base_id: string; um_base_codigo: string;
  cuenta_ingreso_id: string | null; cuenta_ingreso_display: string | null;
}
interface UnidadMedida { id: string; codigo: string; nombre: string; }
interface CentroCosto { id: string; codigo: string; nombre: string; padre_id: string | null; }

interface RetencionForm {
  _key: string;
  cat_id: string;
  /** Calculada por el backend desde el concepto: su base ya viene correcta y
   *  no debe recalcularse contra el subtotal propio completo. */
  auto?: boolean;
  tipo: string; concepto: string;
  base: string; porcentaje: string; valor: string;
  cuenta_id: string; cuenta_display: string;
}

interface LineaForm {
  _key: string;
  producto_id: string; producto_display: string;
  descripcion: string;
  cantidad: string; um_id: string; um_display: string;
  precio_unitario: string;
  descuento_pct: string;
  subtotal: string;
  tarifa_iva_id: string;
  iva_tipo: string; iva_pct: string; total_iva: string;
  cuenta_iva_id: string; cuenta_iva_display: string;
  total: string;
  cuenta_ingreso_id: string; cuenta_ingreso_display: string;
  centro_costo_id: string;
  cotizacion_linea_id?: string; monto_cotizacion?: string;
  valor_tercero: boolean;
  proveedor_id: string; proveedor_display: string;
}

interface LineaResp {
  id: string; orden: number;
  producto_id: string | null; producto_codigo: string | null; producto_nombre: string | null;
  descripcion: string; cantidad: string; um_id: string | null; um_codigo: string | null;
  precio_unitario: string; descuento_pct: string; subtotal: string;
  iva_tipo: string; iva_pct: string; total_iva: string;
  cuenta_iva_id: string | null; cuenta_iva_codigo: string | null;
  total: string;
  cuenta_ingreso_id: string | null; cuenta_ingreso_codigo: string | null; cuenta_ingreso_nombre: string | null;
  centro_costo_id: string | null; centro_costo_codigo: string | null;
  cotizacion_linea_id: string | null; monto_cotizacion: string | null;
  valor_tercero: boolean;
  proveedor_id: string | null; proveedor_nombre: string | null;
}

interface RetencionResp {
  id: string; tipo: string; concepto: string;
  base: string; porcentaje: string; valor: string;
  cuenta_id: string; cuenta_codigo: string | null; cuenta_nombre: string | null;
}

type PreviewAsiento = AsientoData;

interface CotFactLinea {
  linea_id: string; descripcion: string; moneda: string; pendiente: string;
  cuenta_ingreso_id: string | null; cuenta_ingreso_display: string | null;
  tarifa_iva_id: string | null; iva_pct: string;
  cuenta_iva_id: string | null; cuenta_iva_display: string | null;
  um_id: string | null; um_codigo: string | null;
  valor_tercero: boolean;
  proveedor_id: string | null; proveedor_display: string | null;
}

interface Factura {
  id: string; numero: string;
  fecha: string; fecha_vencimiento: string;
  periodo_id: string;
  cliente_id: string; cliente_nit: string | null; cliente_nombre: string | null;
  cotizacion_id: string | null; cotizacion_numero: string | null;
  moneda_id: string; moneda_codigo: string; trm: string | null;
  condicion_pago_id: string | null; condicion_pago_nombre: string | null;
  subtotal: string; total_descuentos: string; total_iva: string;
  total_retenciones: string; total: string;
  notas: string | null;
  estado: "borrador" | "contabilizada" | "anulada";
  asiento_id: string | null; cxc_documento_id: string | null;
  cufe: string | null; dian_estado: string | null; numero_dian: string | null;
  // Copia propia del documento electrónico (conservación DIAN 5 años)
  xml_key: string | null; pdf_key: string | null;
  lineas: LineaResp[]; retenciones: RetencionResp[];
}

interface ListItem {
  id: string; numero: string;
  fecha: string; fecha_vencimiento: string;
  cliente_nit: string | null; cliente_nombre: string | null;
  moneda_codigo: string; subtotal: string; total_iva: string;
  total_retenciones: string; total: string;
  estado: "borrador" | "contabilizada" | "anulada";
  dias_vencimiento: number | null;
  saldo: string | null;
  pagada: boolean;
  creado_en: string;
}

interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizada: "bg-green-50 text-green-700 border border-green-200",
  anulada:       "bg-red-50 text-red-600 border border-red-200",
};


const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpSm = "w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number, decs = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: decs, maximumFractionDigits: decs });
}
function key() { return Math.random().toString(36).slice(2); }
function hoy() { return new Date().toISOString().slice(0, 10); }

function calcLinea(l: LineaForm): LineaForm {
  const cant = parseFloat(l.cantidad) || 0;
  const precio = parseFloat(l.precio_unitario) || 0;
  const descPct = parseFloat(l.descuento_pct) || 0;
  const bruto = cant * precio;
  const desc = Math.round(bruto * descPct / 100 * 10000) / 10000;
  const sub = Math.round((bruto - desc) * 10000) / 10000;
  const pct = parseFloat(l.iva_pct) || 0;
  const iva = Math.round(sub * pct / 100 * 10000) / 10000;
  return { ...l, subtotal: String(sub), total_iva: String(iva), total: String(sub + iva) };
}

// ─── Buscadores ──────────────────────────────────────────────────────────────

function TerceroSearch({ display, onChange, disabled = false, tipoTercero = "CLIENTE", placeholder }: {
  display: string; onChange: (id: string, label: string) => void; disabled?: boolean;
  tipoTercero?: string | null; placeholder?: string;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setQ(display); }, [display]);

  async function buscar(val: string) {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    if (val.length < 2) { setOpts([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const filtroTipo = tipoTercero ? `&tipo_tercero=${tipoTercero}` : "";
      const r = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}${filtroTipo}&solo_activos=true`).catch(() => []);
      if (r.length > 0 && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 300) });
      }
      setOpts(r.slice(0, 10)); setOpen(r.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={e => buscar(e.target.value)} disabled={disabled}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "Buscar cliente por NIT o nombre…"} className={inp} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map(t => (
            <button key={t.id} type="button"
              onMouseDown={() => { setQ(`${t.nit} — ${t.razon_social}`); setOpen(false); onChange(t.id, `${t.nit} — ${t.razon_social}`); }}
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

function CuentaSearch({ display, onChange, disabled = false }: {
  display: string; onChange: (id: string, display: string) => void; disabled?: boolean;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Cuenta[]>([]);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setQ(display); }, [display]);

  async function buscar(val: string) {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) { setOpts([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const items = await apiFetch<Cuenta[]>(`/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true&solo_movimiento=true`).catch(() => []);
      if (items.length > 0 && ref.current) {
        const r = ref.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
      }
      setOpts(items.slice(0, 15)); setOpen(items.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={e => buscar(e.target.value)} disabled={disabled}
        onFocus={e => e.target.select()}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cuenta (cód o nombre)…" className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { setQ(`${c.codigo} ${c.nombre}`); setOpen(false); onChange(c.id, `${c.codigo} ${c.nombre}`); }}
              className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50">
              <span className="font-mono text-blue-600 mr-2">{c.codigo}</span>
              <span className="text-gray-700">{c.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductoSearch({ display, onChange, disabled = false }: {
  display: string; onChange: (p: Producto | null, display: string) => void; disabled?: boolean;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Producto[]>([]);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setQ(display); }, [display]);

  async function buscar(val: string) {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) { setOpts([]); setOpen(false); onChange(null, ""); return; }
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Producto[]>(`/inventario/productos?solo_activos=true`).catch(() => []);
      const lower = val.toLowerCase();
      const filtrados = data.filter(p =>
        p.codigo.toLowerCase().includes(lower) || p.nombre.toLowerCase().includes(lower)
      ).slice(0, 15);
      if (filtrados.length > 0 && ref.current) {
        const r = ref.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 320) });
      }
      setOpts(filtrados); setOpen(filtrados.length > 0);
    }, 200);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={e => buscar(e.target.value)} disabled={disabled}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar producto…" className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map(p => (
            <button key={p.id} type="button"
              onMouseDown={() => { setQ(`${p.codigo} — ${p.nombre}`); setOpen(false); onChange(p, `${p.codigo} — ${p.nombre}`); }}
              className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50">
              <span className="font-mono text-blue-600 mr-2">{p.codigo}</span>
              <span className="text-gray-700">{p.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  factura, monedas, condiciones, unidades, centrosCosto, tarifasIva, retCatalogo, onClose, onSaved,
}: {
  factura: Factura | null;
  monedas: Moneda[];
  condiciones: CondicionPago[];
  unidades: UnidadMedida[];
  centrosCosto: CentroCosto[];
  tarifasIva: TarifaIva[];
  retCatalogo: RetCatalogo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const soloLectura = !!factura && factura.estado !== "borrador";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewAsiento | null>(null);

  const monedaFuncional = monedas.find(m => m.es_funcional);

  const [fecha, setFecha] = useState(factura?.fecha ?? hoy());
  const [fechaVenc, setFechaVenc] = useState(factura?.fecha_vencimiento ?? hoy());
  const [clienteId, setClienteId] = useState(factura?.cliente_id ?? "");
  const [clienteDisplay, setClienteDisplay] = useState(
    factura ? `${factura.cliente_nit ?? ""} — ${factura.cliente_nombre ?? ""}` : ""
  );
  const [monedaId, setMonedaId] = useState(factura?.moneda_id ?? monedaFuncional?.id ?? "");
  const [trm, setTrm] = useState(factura?.trm ? String(factura.trm) : "");
  const [trmFaltante, setTrmFaltante] = useState(false);
  const [condicionId, setCondicionId] = useState(factura?.condicion_pago_id ?? "");
  const [notas, setNotas] = useState(factura?.notas ?? "");
  const [cotizacionId, setCotizacionId] = useState(factura?.cotizacion_id ?? "");
  const [cotizacionNumero, setCotizacionNumero] = useState(factura?.cotizacion_numero ?? "");
  // Picker "cargar desde cotización"
  const [cargarOpen, setCargarOpen] = useState(false);
  const [cotOpts, setCotOpts] = useState<{ id: string; numero: string }[]>([]);
  const [cotSelId, setCotSelId] = useState("");
  const [cotTrm, setCotTrm] = useState("0");
  const [trmDia, setTrmDia] = useState("0");
  const [cotFactLineas, setCotFactLineas] = useState<CotFactLinea[]>([]);
  const [cotMontos, setCotMontos] = useState<Record<string, { incluir: boolean; monto: string }>>({});
  const [cargarError, setCargarError] = useState("");
  const [motivo, setMotivo] = useState("");
  const [showAnular, setShowAnular] = useState(false);

  const monedaSel = monedas.find(m => m.id === monedaId);
  const esExtranjera = monedaSel && !monedaSel.es_funcional;
  const decimalesFuncional = monedas.find(m => m.es_funcional)?.decimales ?? 2;
  const decs = monedaSel?.decimales ?? decimalesFuncional;

  function aplicarCondicion(condId: string, fechaBase: string) {
    const c = condiciones.find(x => x.id === condId);
    if (c && fechaBase) {
      const d = new Date(fechaBase + "T00:00:00");
      d.setDate(d.getDate() + c.dias_vencimiento);
      setFechaVenc(d.toISOString().slice(0, 10));
    }
  }

  async function abrirCargarCotizacion() {
    if (!clienteId) { setError("Selecciona primero el cliente para cargar sus cotizaciones"); return; }
    setError(""); setCargarError(""); setCotSelId(""); setCotFactLineas([]); setCotMontos({});
    try {
      const cots = await apiFetch<{ id: string; numero: string }[]>(`/operaciones/cotizaciones?cliente_id=${clienteId}`);
      setCotOpts(cots.map(c => ({ id: c.id, numero: c.numero })));
    } catch { setCotOpts([]); }
    setCargarOpen(true);
  }

  async function seleccionarCotizacion(cotId: string) {
    setCargarError("");
    try {
      const excl = factura ? `?excluir_factura_id=${factura.id}` : "";
      const data = await apiFetch<{ trm: string; lineas: (CotFactLinea & { pendiente: string })[] }>(`/operaciones/cotizaciones/${cotId}/facturacion${excl}`);
      const pend = data.lineas.filter(l => parseFloat(l.pendiente) > 0);
      setCotFactLineas(pend);
      setCotTrm(data.trm ?? "0");
      // La factura se convierte con la TRM del DÍA (no la de la cotización).
      const hoy = await apiFetch<{ existe: boolean; tasa: string | null }>("/trm/hoy").catch(() => null);
      setTrmDia(hoy?.existe && hoy.tasa ? hoy.tasa : (data.trm ?? "0"));
      const m: Record<string, { incluir: boolean; monto: string }> = {};
      pend.forEach(l => { m[l.linea_id] = { incluir: true, monto: l.pendiente }; });
      setCotMontos(m);
      setCotSelId(cotId);
    } catch (e) { setCargarError(e instanceof Error ? e.message : "Error"); }
  }

  function aplicarCotizacion() {
    const invCod = monedaSel?.codigo || "COP";
    // Conversión con la TRM del día (decisión: en factura prevalece la TRM del día).
    const trmN = parseFloat(trmDia) || parseFloat(cotTrm) || 0;
    const conv = (v: number, from: string) => from === invCod ? v : (invCod === "USD" ? (trmN ? v / trmN : 0) : v * trmN);
    const rnd = (x: number) => Math.round(x * 10 ** decs) / 10 ** decs;
    const nuevas: LineaForm[] = cotFactLineas
      .filter(l => cotMontos[l.linea_id]?.incluir && parseFloat(cotMontos[l.linea_id]?.monto || "0") > 0)
      .map(l => {
        const native = parseFloat(cotMontos[l.linea_id].monto);
        const sub = rnd(conv(native, l.moneda));
        const esTercero = l.valor_tercero;
        const ivaPct = esTercero ? 0 : parseFloat(l.iva_pct || "0");
        const totalIva = rnd(sub * ivaPct / 100);
        return {
          _key: key(), producto_id: "", producto_display: "",
          descripcion: l.descripcion, cantidad: "1", um_id: l.um_id || "", um_display: l.um_codigo || "",
          precio_unitario: String(sub), descuento_pct: "0", subtotal: String(sub),
          tarifa_iva_id: esTercero ? "" : (l.tarifa_iva_id || ""), iva_tipo: ivaPct > 0 ? "GRAVADO" : "NINGUNO",
          iva_pct: String(ivaPct), total_iva: String(totalIva),
          cuenta_iva_id: esTercero ? "" : (l.cuenta_iva_id || ""), cuenta_iva_display: esTercero ? "" : (l.cuenta_iva_display || ""),
          total: String(sub + totalIva),
          cuenta_ingreso_id: l.cuenta_ingreso_id || "", cuenta_ingreso_display: l.cuenta_ingreso_display || "",
          centro_costo_id: "",
          cotizacion_linea_id: l.linea_id, monto_cotizacion: String(native),
          valor_tercero: esTercero,
          proveedor_id: l.proveedor_id || "", proveedor_display: l.proveedor_display || "",
        };
      });
    if (nuevas.length === 0) { setCargarError("Selecciona al menos una línea con monto"); return; }
    setLineas(nuevas);
    setCotizacionId(cotSelId);
    setCotizacionNumero(cotOpts.find(c => c.id === cotSelId)?.numero ?? "");
    setCargarOpen(false);
    sugerirRetenciones(nuevas);
  }

  /** Pide al backend las retenciones que corresponden a estas líneas según el
   *  concepto de cada una. Misma regla que al facturar desde cotización. */
  async function sugerirRetenciones(lns: LineaForm[]) {
    const payload = lns.map(l => ({
      descripcion: l.descripcion, cantidad: parseFloat(l.cantidad) || 1,
      precio_unitario: parseFloat(l.precio_unitario) || 0,
      subtotal: parseFloat(l.subtotal) || 0, total: parseFloat(l.total) || 0,
      cotizacion_linea_id: l.cotizacion_linea_id || null,
      valor_tercero: l.valor_tercero,
    }));
    try {
      const res = await apiFetch<RetencionResp[]>("/facturacion/facturas/retenciones-sugeridas",
        { method: "POST", body: JSON.stringify(payload) });
      if (res.length) setRetenciones(res.map(r => ({ ...retFromResp(r), auto: true })));
    } catch { /* si falla, el usuario las captura a mano como antes */ }
  }

  function lineaFromResp(l: LineaResp): LineaForm {
    return {
      _key: key(),
      producto_id: l.producto_id ?? "",
      producto_display: l.producto_id ? `${l.producto_codigo ?? ""} — ${l.producto_nombre ?? ""}` : "",
      descripcion: l.descripcion,
      cantidad: l.cantidad, um_id: l.um_id ?? "", um_display: l.um_codigo ?? "",
      precio_unitario: l.precio_unitario, descuento_pct: l.descuento_pct,
      subtotal: l.subtotal,
      tarifa_iva_id: parseFloat(l.iva_pct) > 0
        ? (tarifasIva.find(t => parseFloat(t.porcentaje) === parseFloat(l.iva_pct))?.id ?? "")
        : "",
      iva_tipo: l.iva_tipo, iva_pct: l.iva_pct, total_iva: l.total_iva,
      cuenta_iva_id: l.cuenta_iva_id ?? "", cuenta_iva_display: l.cuenta_iva_codigo ?? "",
      total: l.total,
      cuenta_ingreso_id: l.cuenta_ingreso_id ?? "",
      cuenta_ingreso_display: l.cuenta_ingreso_codigo ? `${l.cuenta_ingreso_codigo} ${l.cuenta_ingreso_nombre ?? ""}` : "",
      centro_costo_id: l.centro_costo_id ?? "",
      cotizacion_linea_id: l.cotizacion_linea_id ?? undefined,
      monto_cotizacion: l.monto_cotizacion ?? undefined,
      valor_tercero: l.valor_tercero ?? false,
      proveedor_id: l.proveedor_id ?? "",
      proveedor_display: l.proveedor_id ? (l.proveedor_nombre ?? "") : "",
    };
  }

  function lineaVacia(): LineaForm {
    return {
      _key: key(), producto_id: "", producto_display: "",
      descripcion: "", cantidad: "1", um_id: "", um_display: "",
      precio_unitario: "", descuento_pct: "0",
      subtotal: "0", tarifa_iva_id: "", iva_tipo: "NINGUNO", iva_pct: "0", total_iva: "0",
      cuenta_iva_id: "", cuenta_iva_display: "",
      total: "0", cuenta_ingreso_id: "", cuenta_ingreso_display: "",
      centro_costo_id: "",
      valor_tercero: false, proveedor_id: "", proveedor_display: "",
    };
  }

  const [lineas, setLineas] = useState<LineaForm[]>(
    factura ? factura.lineas.map(lineaFromResp) : [lineaVacia()]
  );

  // Si las tarifas de IVA cargan después de abrir el modal, restaura el select
  // de las líneas ya cargadas emparejando por porcentaje.
  useEffect(() => {
    if (!tarifasIva.length) return;
    setLineas(prev => prev.map(l => {
      if (l.tarifa_iva_id || parseFloat(l.iva_pct) <= 0) return l;
      const t = tarifasIva.find(x => parseFloat(x.porcentaje) === parseFloat(l.iva_pct));
      return t ? { ...l, tarifa_iva_id: t.id } : l;
    }));
  }, [tarifasIva]);

  function retFromResp(r: RetencionResp): RetencionForm {
    return {
      _key: key(), cat_id: "", tipo: r.tipo, concepto: r.concepto,
      base: r.base, porcentaje: r.porcentaje, valor: r.valor,
      cuenta_id: r.cuenta_id,
      cuenta_display: r.cuenta_codigo ? `${r.cuenta_codigo} ${r.cuenta_nombre ?? ""}` : "",
    };
  }

  const [retenciones, setRetenciones] = useState<RetencionForm[]>(
    factura ? factura.retenciones.map(retFromResp) : []
  );

  const subtotal = lineas.reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);
  const subtotalPropio = lineas.filter(l => !l.valor_tercero).reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);
  const subtotalTercero = lineas.filter(l => l.valor_tercero).reduce((s, l) => s + (parseFloat(l.subtotal) || 0), 0);
  const totalIva = lineas.reduce((s, l) => s + (parseFloat(l.total_iva) || 0), 0);
  const totalRet = retenciones.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  const total = subtotal + totalIva - totalRet;

  // La base de retención es solo el ingreso propio; los valores para terceros no
  // retienen. Las AUTOMÁTICAS se saltan: su base la calculó el backend por
  // concepto y puede ser un subconjunto (p. ej. 1% solo sobre transporte).
  useEffect(() => {
    if (retenciones.length === 0 || soloLectura) return;
    setRetenciones(prev => prev.map(r => {
      if (r.auto) return r;
      const val = Math.round(subtotalPropio * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000;
      return { ...r, base: String(subtotalPropio), valor: String(val) };
    }));
  }, [subtotalPropio]);

  function updateLinea(idx: number, changes: Partial<LineaForm>) {
    setLineas(prev => prev.map((l, i) => i !== idx ? l : calcLinea({ ...l, ...changes })));
  }

  function seleccionarProducto(idx: number, p: Producto | null, display: string) {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      return calcLinea({
        ...l,
        producto_id: p?.id ?? "", producto_display: display,
        descripcion: p ? (p.descripcion?.trim() || p.nombre) : l.descripcion,
        um_id: p?.um_base_id ?? "", um_display: p?.um_base_codigo ?? "",
        cuenta_ingreso_id: p?.cuenta_ingreso_id ?? "",
        cuenta_ingreso_display: p?.cuenta_ingreso_display ?? "",
      });
    }));
  }

  function seleccionarTarifaIva(idx: number, tarifaId: string) {
    const t = tarifasIva.find(x => x.id === tarifaId);
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (!t) return calcLinea({ ...l, tarifa_iva_id: "", iva_tipo: "NINGUNO", iva_pct: "0", cuenta_iva_id: "", cuenta_iva_display: "" });
      return calcLinea({
        ...l,
        tarifa_iva_id: t.id,
        iva_tipo: t.tipo,
        iva_pct: t.porcentaje,
        cuenta_iva_id: t.cuenta_iva_ventas_id ?? "",
        cuenta_iva_display: t.cuenta_iva_ventas_codigo
          ? `${t.cuenta_iva_ventas_codigo} — ${t.cuenta_iva_ventas_nombre ?? ""}`
          : "",
      });
    }));
  }

  function seleccionarRetCatalogo(idx: number, catId: string) {
    const cat = retCatalogo.find(c => c.id === catId);
    if (!cat) return;
    setRetenciones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const base = parseFloat(r.base) || subtotal;
      const valor = Math.round(base * parseFloat(cat.porcentaje) / 100 * 10000) / 10000;
      return {
        ...r, cat_id: cat.id, tipo: cat.tipo, concepto: cat.nombre,
        porcentaje: cat.porcentaje, valor: String(valor),
        cuenta_id: cat.cuenta_ventas_id ?? "",
        cuenta_display: cat.cuenta_ventas_codigo
          ? `${cat.cuenta_ventas_codigo} — ${cat.cuenta_ventas_nombre ?? ""}`
          : "",
      };
    }));
  }

  function setBaseRetencion(idx: number, base: string) {
    setRetenciones(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const val = Math.round((parseFloat(base) || 0) * (parseFloat(r.porcentaje) || 0) / 100 * 10000) / 10000;
      return { ...r, base, valor: String(val) };
    }));
  }

  function buildPayload() {
    return {
      fecha, fecha_vencimiento: fechaVenc,
      cliente_id: clienteId,
      cotizacion_id: cotizacionId || null,
      moneda_id: monedaId,
      trm: esExtranjera && trm ? trm : null,
      condicion_pago_id: condicionId || null,
      notas: notas || null,
      lineas: lineas.map(l => ({
        producto_id: l.producto_id || null,
        descripcion: l.descripcion, cantidad: l.cantidad,
        um_id: l.um_id || null, precio_unitario: l.precio_unitario,
        descuento_pct: l.descuento_pct, descuento_valor: "0",
        subtotal: l.subtotal, iva_tipo: l.iva_tipo,
        iva_pct: l.iva_pct, total_iva: l.total_iva,
        cuenta_iva_id: l.cuenta_iva_id || null,
        total: l.total,
        cuenta_ingreso_id: l.cuenta_ingreso_id || null,
        centro_costo_id: l.centro_costo_id || null,
        cotizacion_linea_id: l.cotizacion_linea_id || null,
        monto_cotizacion: l.monto_cotizacion || null,
        valor_tercero: l.valor_tercero,
        proveedor_id: l.valor_tercero ? (l.proveedor_id || null) : null,
      })),
      retenciones: retenciones.map(r => ({
        tipo: r.tipo, concepto: r.concepto,
        base: r.base, porcentaje: r.porcentaje, valor: r.valor,
        cuenta_id: r.cuenta_id,
      })),
    };
  }

  function validarTerceros(): string | null {
    const sinProv = lineas.find(l => l.valor_tercero && !l.proveedor_id);
    if (sinProv) return `La línea "${sinProv.descripcion || "(sin descripción)"}" es valor para tercero: indica el proveedor.`;
    return null;
  }

  async function verAsiento() {
    setPreviewLoading(true); setError("");
    try {
      let p: PreviewAsiento;
      if (soloLectura && factura) {
        p = await apiFetch<PreviewAsiento>(`/facturacion/facturas/${factura.id}/asiento`);
      } else {
        p = await apiFetch<PreviewAsiento>("/facturacion/facturas/preview-asiento", {
          method: "POST", body: JSON.stringify(buildPayload()),
        });
      }
      setPreview(p);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al obtener el asiento"); }
    finally { setPreviewLoading(false); }
  }

  async function guardar() {
    if (!clienteId) { setError("Selecciona un cliente"); return; }
    if (!lineas.length) { setError("Agrega al menos una línea"); return; }
    const errTer = validarTerceros();
    if (errTer) { setError(errTer); return; }
    setSaving(true); setError("");
    try {
      if (factura) {
        await apiFetch(`/facturacion/facturas/${factura.id}`, { method: "PUT", body: JSON.stringify(buildPayload()) });
      } else {
        await apiFetch(`/facturacion/facturas`, { method: "POST", body: JSON.stringify(buildPayload()) });
      }
      onSaved();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function contabilizar() {
    if (!clienteId) { setError("Selecciona un cliente"); return; }
    if (!lineas.length) { setError("Agrega al menos una línea"); return; }
    const errTer = validarTerceros();
    if (errTer) { setError(errTer); return; }
    setSaving(true); setError("");
    try {
      let id: string;
      if (!factura) {
        const nueva = await apiFetch<Factura>(`/facturacion/facturas`, { method: "POST", body: JSON.stringify(buildPayload()) });
        await apiFetch(`/facturacion/facturas/${nueva.id}/contabilizar`, { method: "POST" });
        id = nueva.id;
      } else {
        await apiFetch(`/facturacion/facturas/${factura.id}`, { method: "PUT", body: JSON.stringify(buildPayload()) });
        await apiFetch(`/facturacion/facturas/${factura.id}/contabilizar`, { method: "POST" });
        id = factura.id;
      }
      onSaved();
      window.open(`/factura/${id}`, "_blank");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function anular() {
    if (!motivo.trim()) { setError("Ingresa el motivo de anulación"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch(`/facturacion/facturas/${factura!.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) });
      onSaved();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  const [transmitiendo, setTransmitiendo] = useState(false);
  const [dianMsg, setDianMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  async function transmitirDian() {
    if (!factura) return;
    setTransmitiendo(true); setError(""); setDianMsg(null);
    try {
      const r = await apiFetch<{ ok: boolean; dian_estado: string; cufe: string | null; numero_dian: string | null; archivado: boolean; mensaje: string; errores: string[]; avisos: string[] }>(
        `/facturacion/facturas/${factura.id}/transmitir`, { method: "POST" });
      const detalle = [r.mensaje, ...(r.errores ?? [])].filter(Boolean).join(" · ");
      const archivo = r.ok && !r.archivado && (r.avisos ?? []).length
        ? " · ⚠ No se pudo archivar el XML/PDF: " + r.avisos.join(" · ")
        : "";
      setDianMsg({ ok: r.ok, texto: `DIAN: ${r.dian_estado}${detalle ? " — " + detalle : ""}${r.cufe ? " (CUFE " + r.cufe.slice(0, 12) + "…)" : ""}${archivo}` });
      setArchivado(r.archivado);
    } catch (e) { setDianMsg({ ok: false, texto: e instanceof Error ? e.message : "Error al transmitir" }); }
    finally { setTransmitiendo(false); }
  }

  // Copia propia del documento electrónico: la DIAN obliga a conservarlo 5 años y
  // el PTH solo lo mantiene mientras el paquete esté vigente.
  const [archivado, setArchivado] = useState(false);
  async function descargarDian(tipo: "xml" | "pdf") {
    if (!factura) return;
    try {
      const r = await apiFetch<{ url?: string; directo?: boolean }>(`/facturacion/facturas/${factura.id}/dian/${tipo}`);
      if (r?.url) window.open(r.url, "_blank", "noopener");
    } catch (e) { setDianMsg({ ok: false, texto: e instanceof Error ? e.message : `No se pudo descargar el ${tipo.toUpperCase()}` }); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "min(1140px, 96vw)", maxHeight: "92vh" }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[14px] font-bold text-gray-800">
              {soloLectura ? "Factura de venta" : factura ? "Editar factura" : "Nueva factura de venta"}
            </h2>
            {factura && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] font-mono text-gray-500">{factura.numero}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[factura.estado]}`}>
                  {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 gap-4">

          {/* Cabecera */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="col-span-2">
              <label className={lbl}>Cliente *</label>
              <TerceroSearch display={clienteDisplay} disabled={soloLectura}
                onChange={(id, d) => { setClienteId(id); setClienteDisplay(d); }} />
            </div>
            <div>
              <label className={lbl}>Condición de pago</label>
              <select value={condicionId} disabled={soloLectura} className={inp}
                onChange={e => {
                  setCondicionId(e.target.value);
                  if (e.target.value) aplicarCondicion(e.target.value, fecha);
                }}>
                <option value="">Fecha manual</option>
                {condiciones.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.dias_vencimiento}d)</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Fecha *</label>
              <input type="date" value={fecha} disabled={soloLectura} className={inp}
                onChange={e => {
                  setFecha(e.target.value);
                  if (condicionId) aplicarCondicion(condicionId, e.target.value);
                  else if (fechaVenc && fechaVenc < e.target.value) setFechaVenc("");
                }} />
            </div>
            <div>
              <label className={lbl}>Fecha vencimiento *</label>
              <input type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)}
                disabled={soloLectura} className={inp} />
            </div>
            <div>
              <label className={lbl}>Moneda</label>
              <select value={monedaId} disabled={soloLectura} className={inp}
                onChange={async e => {
                  const nueva = e.target.value;
                  setMonedaId(nueva);
                  const seleccionada = monedas.find(m => m.id === nueva);
                  if (seleccionada && !seleccionada.es_funcional) {
                    const data = await apiFetch<{ existe: boolean; tasa: string | null }>("/trm/hoy").catch(() => null);
                    if (data?.existe && data.tasa) { if (!trm) setTrm(parseFloat(data.tasa).toFixed(decimalesFuncional)); setTrmFaltante(false); }
                    else setTrmFaltante(true);
                  } else {
                    setTrmFaltante(false);
                  }
                }}>
                {monedas.map(m => <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>)}
              </select>
            </div>
            {esExtranjera && (
              <div>
                <label className={lbl}>TRM</label>
                <MontoInput value={trm} onChange={v => setTrm(v)} decimales={decimalesFuncional} disabled={soloLectura} className={inp} />
              </div>
            )}
            <div className={esExtranjera ? "col-span-2" : "col-span-3"}>
              <label className={lbl}>Notas</label>
              <input value={notas} onChange={e => setNotas(e.target.value)} disabled={soloLectura}
                placeholder="Notas u observaciones…" className={inp} />
            </div>
          </div>

          {trmFaltante && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p className="text-[11px] text-amber-700">
                No hay TRM registrada para hoy. No es posible facturar en moneda extranjera hasta que el administrador la registre. Puedes cambiar a COP o volver más tarde.
              </p>
            </div>
          )}

          {/* Líneas */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Líneas{cotizacionNumero && <span className="ml-2 text-[10px] text-emerald-700 font-semibold normal-case">· Cotización {cotizacionNumero}</span>}
              </span>
              {!soloLectura && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={abrirCargarCotizacion}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold">
                    Cargar desde cotización
                  </button>
                  {!cotizacionId && (
                    <button type="button" onClick={() => setLineas(p => [...p, lineaVacia()])}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                      + Agregar línea
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-56">
              <table className="w-full min-w-[680px] text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-[10px] uppercase tracking-wide">
                    {cotizacionId ? (
                      <th className="px-2 py-2 text-center" colSpan={2} style={{ width: "44%" }}>Concepto</th>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-center" style={{ width: "20%" }}>Producto</th>
                        <th className="px-2 py-2 text-center" style={{ width: "24%" }}>Descripción</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-center w-20">Cantidad</th>
                    <th className="px-2 py-2 text-center w-16">UM</th>
                    <th className="px-2 py-2 text-center w-28">Precio unit.</th>
                    <th className="px-2 py-2 text-center w-14">Desc %</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, idx) => (
                    <Fragment key={l._key}>
                      {/* Fila 1 — comercial */}
                      <tr className="border-t border-gray-200 align-middle">
                        {cotizacionId ? (
                          <td colSpan={2} className="px-2 pt-2 pb-0.5">
                            {soloLectura
                              ? <span className="text-gray-800">{l.descripcion}</span>
                              : <input value={l.descripcion} onChange={e => updateLinea(idx, { descripcion: e.target.value })}
                                  placeholder="Concepto…" className={inpSm} />
                            }
                          </td>
                        ) : (
                          <>
                            <td className="px-2 pt-2 pb-0.5">
                              {soloLectura
                                ? <span className="text-blue-600 font-mono text-[10px]">{l.producto_display || "—"}</span>
                                : <ProductoSearch display={l.producto_display} onChange={(p, d) => seleccionarProducto(idx, p, d)} />
                              }
                            </td>
                            <td className="px-2 pt-2 pb-0.5">
                              {soloLectura
                                ? <span className="text-gray-800">{l.descripcion}</span>
                                : <input value={l.descripcion} onChange={e => updateLinea(idx, { descripcion: e.target.value })}
                                    placeholder="Descripción…" className={inpSm} />
                              }
                            </td>
                          </>
                        )}
                        <td className="px-2 pt-2 pb-0.5">
                          {soloLectura
                            ? <span className="block text-right">{fmt(l.cantidad, 4)}</span>
                            : <MontoInput value={l.cantidad} onChange={v => updateLinea(idx, { cantidad: v })} decimales={4} className={`${inpSm} text-right`} />
                          }
                        </td>
                        <td className="px-2 pt-2 pb-0.5">
                          {soloLectura
                            ? <span>{l.um_display}</span>
                            : <select value={l.um_id} onChange={e => { const um = unidades.find(u => u.id === e.target.value); updateLinea(idx, { um_id: e.target.value, um_display: um?.codigo ?? "" }); }} className={inpSm}>
                                <option value="">—</option>
                                {unidades.map(u => <option key={u.id} value={u.id}>{u.codigo}</option>)}
                              </select>
                          }
                        </td>
                        <td className="px-2 pt-2 pb-0.5">
                          {soloLectura
                            ? <span className="block text-right">{fmt(l.precio_unitario, decs)}</span>
                            : <MontoInput value={l.precio_unitario} onChange={v => updateLinea(idx, { precio_unitario: v })} decimales={decs} className={`${inpSm} text-right`} />
                          }
                        </td>
                        <td className="px-2 pt-2 pb-0.5">
                          {soloLectura
                            ? <span className="block text-right">{l.descuento_pct}%</span>
                            : <MontoInput value={l.descuento_pct} onChange={v => updateLinea(idx, { descuento_pct: v })} decimales={2} className={`${inpSm} text-right`} />
                          }
                        </td>
                      </tr>

                      {/* Fila 2 — IVA | C.Costo | Sub | Total IVA | Total | ✕ */}
                      <tr className={((!soloLectura && !l.producto_id && l.descripcion.trim()) || (soloLectura && l.cuenta_ingreso_id)) ? "" : "border-b border-gray-100"}>
                        {/* IVA */}
                        <td className="px-2 pt-0.5 pb-2">
                          {soloLectura
                            ? <span className="text-[10px] text-gray-400">{l.valor_tercero ? "Tercero (sin IVA)" : (l.iva_tipo === "NINGUNO" ? "Sin IVA" : `IVA ${l.iva_tipo.replace("GRAVADO_", "")}%`)}</span>
                            : l.valor_tercero
                              ? <span className="text-[10px] text-amber-600">Sin IVA · valor para tercero</span>
                              : <select value={l.tarifa_iva_id} onChange={e => seleccionarTarifaIva(idx, e.target.value)} className={inpSm}>
                                  <option value="">Sin IVA</option>
                                  {tarifasIva.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.porcentaje}%)</option>)}
                                </select>
                          }
                          {!soloLectura && !l.valor_tercero && parseFloat(l.total_iva) > 0 && !l.cuenta_iva_id && (
                            <div className="mt-1">
                              <span className={lbl + " text-amber-600"}>Cta. IVA *</span>
                              <CuentaSearch display={l.cuenta_iva_display} onChange={(id, d) => updateLinea(idx, { cuenta_iva_id: id, cuenta_iva_display: d })} />
                            </div>
                          )}
                        </td>
                        {/* C. Costo */}
                        <td className="px-2 pt-0.5 pb-2">
                          {soloLectura
                            ? <span className="text-[10px] text-gray-400">{centrosCosto.find(c => c.id === l.centro_costo_id)?.codigo ?? "—"}</span>
                            : <CentroCostoTreeSelect centros={centrosCosto} value={l.centro_costo_id}
                                onChange={(id) => updateLinea(idx, { centro_costo_id: id })}
                                placeholder="Sin C. Costo" />
                          }
                        </td>
                        {/* Subtotal */}
                        <td className="px-2 pt-0.5 pb-2 text-right text-gray-500 font-mono">{fmt(l.subtotal, decs)}</td>
                        {/* Total IVA */}
                        <td className="px-2 pt-0.5 pb-2 text-right text-gray-400 font-mono">{fmt(l.total_iva, decs)}</td>
                        {/* Total línea */}
                        <td className="px-2 pt-0.5 pb-2 text-right font-bold text-gray-900 font-mono">{fmt(l.total, decs)}</td>
                        {/* Eliminar */}
                        <td className="px-2 pt-0.5 pb-2 text-center">
                          {!soloLectura && lineas.length > 1 && (
                            <button type="button" onClick={() => setLineas(p => p.filter((_, i) => i !== idx))}
                              className="text-red-300 hover:text-red-500">✕</button>
                          )}
                        </td>
                      </tr>

                      {/* Fila 3 — Cuenta de ingresos / valores tercero (ancha) */}
                      {((!soloLectura && !l.producto_id && l.descripcion.trim()) || (soloLectura && (l.cuenta_ingreso_id || l.valor_tercero))) && (
                        <tr className="border-b border-gray-100">
                          <td colSpan={6} className="px-2 pb-2">
                            {/* Check valor tercero */}
                            {!soloLectura && (
                              <label className="flex items-center gap-2 mb-1.5 cursor-pointer w-fit">
                                <input type="checkbox" checked={l.valor_tercero}
                                  onChange={e => updateLinea(idx, e.target.checked
                                    ? { valor_tercero: true, tarifa_iva_id: "", iva_tipo: "NINGUNO", iva_pct: "0", cuenta_iva_id: "", cuenta_iva_display: "" }
                                    : { valor_tercero: false })} />
                                <span className="text-[11px] text-gray-600 font-medium">Valor recibido para tercero</span>
                              </label>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">
                                {l.valor_tercero ? "Cta. valores tercero" : "Cta. Ingresos"}
                                {!soloLectura && !l.cuenta_ingreso_id && <span className="text-amber-600"> *</span>}
                              </span>
                              <div className="flex-1 max-w-md">
                                {soloLectura
                                  ? <span className="text-[11px] text-gray-600">{l.cuenta_ingreso_display || "—"}</span>
                                  : <CuentaSearch display={l.cuenta_ingreso_display} onChange={(id, d) => updateLinea(idx, { cuenta_ingreso_id: id, cuenta_ingreso_display: d })} />}
                              </div>
                            </div>
                            {/* Proveedor (obligatorio si es tercero) */}
                            {l.valor_tercero && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 shrink-0">
                                  Proveedor{!soloLectura && !l.proveedor_id && <span className="text-amber-600"> *</span>}
                                </span>
                                <div className="flex-1 max-w-md">
                                  {soloLectura
                                    ? <span className="text-[11px] text-gray-600">{l.proveedor_display || "—"}</span>
                                    : <TerceroSearch display={l.proveedor_display} tipoTercero={null}
                                        placeholder="Tercero al que se traslada (aduana, bodega)…"
                                        onChange={(id, d) => updateLinea(idx, { proveedor_id: id, proveedor_display: d })} />}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Retenciones */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Retenciones del cliente</span>
              {!soloLectura && (
                <button type="button"
                  onClick={() => setRetenciones(p => [...p, {
                    _key: key(), cat_id: "", tipo: "", concepto: "",
                    base: String(subtotal > 0 ? subtotal : ""), porcentaje: "0", valor: "0",
                    cuenta_id: "", cuenta_display: "",
                  }])}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                  + Agregar retención
                </button>
              )}
            </div>
            {retenciones.length === 0
              ? <p className="text-[10px] text-gray-400 italic">Sin retenciones</p>
              : <div className="overflow-y-auto max-h-40 border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {retenciones.map((r, idx) => (
                    <div key={r._key} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                      {/* Concepto */}
                      <div className="w-1/2 shrink-0">
                        {soloLectura
                          ? <span className="font-medium text-gray-700">{r.concepto}</span>
                          : <select value={r.cat_id} onChange={e => seleccionarRetCatalogo(idx, e.target.value)}
                              className={inpSm}>
                              <option value="">{r.concepto || "— Retención —"}</option>
                              {retCatalogo.filter(c => c.aplica_venta).map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.porcentaje}%)</option>
                              ))}
                            </select>
                        }
                      </div>
                      {/* Base */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-gray-400">Base</span>
                        {soloLectura
                          ? <span className="font-mono text-gray-700">{fmt(r.base, decs)}</span>
                          : <MontoInput value={r.base} onChange={v => setBaseRetencion(idx, v)} decimales={decs}
                              className="w-28 px-2 py-1 border border-gray-200 rounded text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        }
                      </div>
                      {/* Pct = Valor */}
                      <div className="flex items-center gap-1 shrink-0 text-gray-500">
                        <span>{r.porcentaje}%</span>
                        <span>=</span>
                        <span className="font-semibold text-gray-800 font-mono">{fmt(r.valor, decs)}</span>
                      </div>
                      {/* Cuenta */}
                      <div className="shrink-0 text-[10px]">
                        {r.cuenta_display
                          ? <span className="text-gray-400">{r.cuenta_display.split(" ")[0]}</span>
                          : r.cat_id && <span className="text-amber-500">⚠ Sin cuenta</span>
                        }
                      </div>
                      {/* Eliminar */}
                      {!soloLectura && (
                        <button type="button" onClick={() => setRetenciones(p => p.filter((_, i) => i !== idx))}
                          className="text-gray-300 hover:text-red-400 shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Totales */}
          <div className="flex justify-end shrink-0">
            <div className="w-64 space-y-1 text-[12px]">
              {subtotalTercero > 0 ? (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Ingresos propios</span><span className="font-mono">{fmt(subtotalPropio, decs)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Pagos por terceros</span><span className="font-mono">{fmt(subtotalTercero, decs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 border-t border-gray-100 pt-1">
                    <span>Subtotal</span><span className="font-mono">{fmt(subtotal, decs)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span className="font-mono">{fmt(subtotal, decs)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>IVA</span><span className="font-mono">{fmt(totalIva, decs)}</span>
              </div>
              {totalRet > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Retenciones</span><span className="font-mono">({fmt(totalRet, decs)})</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-[13px] border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Total</span><span className="font-mono">{fmt(total, decs)}</span>
              </div>
            </div>
          </div>

          {showAnular && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50/40">
              <label className={lbl}>Motivo de anulación *</label>
              <input value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Describe el motivo…" className={inp} />
            </div>
          )}

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {dianMsg && (
            <p className={`text-[12px] rounded-lg px-3 py-2 ${dianMsg.ok ? "text-green-700 bg-green-50 border border-green-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
              {dianMsg.texto}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex gap-2">
            {factura?.estado === "contabilizada" && !showAnular && (
              <button onClick={() => setShowAnular(true)}
                className="px-3 py-1.5 text-[12px] font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                Anular
              </button>
            )}
            {showAnular && (
              <button onClick={anular} disabled={saving}
                className="px-3 py-1.5 text-[12px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {saving ? "Anulando…" : "Confirmar anulación"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {factura?.estado === "contabilizada" && !showAnular && (
              <a href={`/factura/${factura.id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </a>
            )}
            {factura?.estado === "contabilizada" && !showAnular && (
              <button onClick={transmitirDian} disabled={transmitiendo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
                {transmitiendo ? "Transmitiendo…" : "Transmitir a DIAN"}
              </button>
            )}
            {(archivado || factura?.xml_key || factura?.pdf_key) && !showAnular && (
              <>
                <button onClick={() => descargarDian("xml")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  title="XML firmado archivado por nosotros (conservación DIAN 5 años)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/></svg>
                  XML
                </button>
                <button onClick={() => descargarDian("pdf")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  title="PDF de la representación gráfica archivado por nosotros">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/></svg>
                  PDF
                </button>
              </>
            )}
            <button onClick={onClose}
              className="px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-white transition-colors">
              {soloLectura ? "Cerrar" : "Cancelar"}
            </button>
            <button onClick={verAsiento} disabled={previewLoading || !clienteId || !lineas.length}
              className="px-3 py-1.5 text-[12px] font-medium border border-gray-300 text-blue-700 rounded-lg hover:bg-white disabled:opacity-40 transition-colors">
              {previewLoading ? "Calculando…" : "Ver asiento"}
            </button>
            {!soloLectura && (
              <>
                <button onClick={guardar} disabled={saving || trmFaltante}
                  className="px-3 py-1.5 text-[12px] font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-white disabled:opacity-50 transition-colors">
                  {saving ? "Guardando…" : "Guardar borrador"}
                </button>
                <button onClick={contabilizar} disabled={saving || trmFaltante}
                  className="px-3 py-1.5 text-[12px] font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? "Procesando…" : "Guardar y contabilizar"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal: preview del asiento contable — componente compartido, para que
          la doble columna de moneda no haya que mantenerla en dos sitios. */}
      {preview && (
        <AsientoModal data={preview} real={soloLectura} onClose={() => setPreview(null)} />
      )}

      {/* Picker: cargar desde cotización (filtrado por el cliente de la factura) */}
      {cargarOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Cargar desde cotización</h3>
            <p className="text-[11px] text-gray-400 mb-3">Cotizaciones del cliente seleccionado. Elige una y los conceptos a facturar.</p>
            <div className="mb-3">
              <label className={lbl}>Cotización</label>
              <select value={cotSelId} onChange={e => e.target.value && seleccionarCotizacion(e.target.value)} className={inp}>
                <option value="">Selecciona una cotización…</option>
                {cotOpts.map(c => <option key={c.id} value={c.id}>{c.numero}</option>)}
              </select>
            </div>
            {cotSelId && (
              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
                {cotFactLineas.length === 0 ? (
                  <p className="text-[12px] text-gray-400 text-center py-6">No hay conceptos pendientes por facturar.</p>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left text-[9px] uppercase text-gray-500">
                        <th className="px-2 py-1.5 w-8 text-center">
                          <input type="checkbox" title="Marcar/desmarcar todo"
                            checked={cotFactLineas.length > 0 && cotFactLineas.every(l => cotMontos[l.linea_id]?.incluir)}
                            onChange={e => { const v = e.target.checked; setCotMontos(p => { const n = { ...p }; cotFactLineas.forEach(l => { n[l.linea_id] = { ...n[l.linea_id], incluir: v }; }); return n; }); }}
                            className="accent-blue-600" />
                        </th>
                        <th className="px-2 py-1.5">Concepto</th>
                        <th className="px-2 py-1.5 text-right">Pendiente</th>
                        <th className="px-2 py-1.5 text-right w-44">Monto a facturar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotFactLineas.map(l => (
                        <tr key={l.linea_id} className="border-t border-gray-50">
                          <td className="px-2 py-1.5">
                            <input type="checkbox" checked={cotMontos[l.linea_id]?.incluir ?? false}
                              onChange={e => setCotMontos(p => ({ ...p, [l.linea_id]: { ...p[l.linea_id], incluir: e.target.checked } }))}
                              className="accent-blue-600" />
                          </td>
                          <td className="px-2 py-1.5 text-gray-700">
                            {l.descripcion}
                            {!l.cuenta_ingreso_id && <span className="ml-1 text-[9px] text-amber-600">(concepto sin cuenta de ingreso)</span>}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-500">{l.moneda} {parseFloat(l.pendiente).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right">
                            <MontoInput value={cotMontos[l.linea_id]?.monto ?? ""} decimales={2}
                              onChange={v => setCotMontos(p => ({ ...p, [l.linea_id]: { ...p[l.linea_id], monto: v } }))}
                              className="w-40 px-2 py-1 border border-gray-200 rounded text-[11px] text-right" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {cargarError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mt-3">{cargarError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setCargarOpen(false)}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button type="button" onClick={aplicarCotizacion} disabled={!cotSelId || cotFactLineas.length === 0}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                Cargar líneas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FacturasPage() {
  const title = usePageTitle();

  const [lista, setLista] = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);
  const { orden, alternar } = useOrden<
    "numero" | "fecha" | "vencimiento" | "cliente" | "moneda" | "subtotal" | "iva" | "total" | "estado"
  >("fecha", "desc");

  const [fEstado, setFEstado] = useState("");
  const [fDesde, setFDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [fHasta, setFHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [fClienteId, setFClienteId] = useState("");
  const [fClienteDisplay, setFClienteDisplay] = useState("");

  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [condiciones, setCondiciones] = useState<CondicionPago[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
  const [tarifasIva, setTarifasIva] = useState<TarifaIva[]>([]);
  const [retCatalogo, setRetCatalogo] = useState<RetCatalogo[]>([]);

  const [modo, setModo] = useState<"cerrado" | "crear" | "editar" | "ver">("cerrado");
  const [activa, setActiva] = useState<Factura | null>(null);

  const cargar = useCallback(async (pag = pagina) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) });
      if (fEstado) p.set("estado", fEstado);
      if (fDesde)  p.set("fecha_desde", fDesde);
      if (fHasta)  p.set("fecha_hasta", fHasta);
      if (fClienteId) p.set("cliente_id", fClienteId);
      const data = await apiFetch<ListResponse>(`/facturacion/facturas?${p}`);
      setLista(data.items);
      setTotalItems(data.total);
    } finally { setLoading(false); }
  }, [pagina, fEstado, fDesde, fHasta, fClienteId]);

  useEffect(() => { cargar(pagina); }, [pagina]);

  useEffect(() => {
    apiFetch<Moneda[]>("/maestros/monedas").then(setMonedas).catch(() => {});
    apiFetch<CondicionPago[]>("/maestros/condiciones-pago?solo_activas=true").then(setCondiciones).catch(() => {});
    apiFetch<UnidadMedida[]>("/inventario/unidades-medida?solo_activos=true").then(setUnidades).catch(() => {});
    apiFetch<CentroCosto[]>("/centros-costo?plano=true").then(setCentrosCosto).catch(() => {});
    apiFetch<TarifaIva[]>("/maestros/tarifas-iva?solo_activas=true").then(setTarifasIva).catch(() => {});
    apiFetch<RetCatalogo[]>("/maestros/retenciones?solo_activas=true").then(d => setRetCatalogo(d.filter(c => c.aplica_venta))).catch(() => {});
  }, []);

  // Al llegar con ?factura=<id> (p. ej. desde "Facturar" en operaciones), abre esa factura en edición.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("factura");
    if (!id) return;
    apiFetch<Factura>(`/facturacion/facturas/${id}`)
      .then((d) => { setActiva(d); setModo(d.estado === "borrador" ? "editar" : "ver"); })
      .catch(() => {});
  }, []);

  async function abrirEditar(item: ListItem) {
    const data = await apiFetch<Factura>(`/facturacion/facturas/${item.id}`);
    setActiva(data); setModo("editar");
  }
  async function abrirVer(item: ListItem) {
    const data = await apiFetch<Factura>(`/facturacion/facturas/${item.id}`);
    setActiva(data); setModo("ver");
  }
  function cerrar() { setModo("cerrado"); setActiva(null); }

  // El backend pagina; se ordena la página cargada antes de pintarla.
  const ordenada = ordenarFilas(lista, orden, {
    numero:      (d) => d.numero,
    fecha:       (d) => `${d.fecha} ${d.creado_en}`,
    vencimiento: (d) => d.fecha_vencimiento,
    cliente:     (d) => d.cliente_nombre,
    moneda:      (d) => d.moneda_codigo,
    subtotal:    (d) => Number(d.subtotal),
    iva:         (d) => Number(d.total_iva),
    total:       (d) => Number(d.total),
    estado:      (d) => d.estado,
  });

  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Facturas de venta a clientes</p>
        </div>
        <button onClick={() => { setActiva(null); setModo("crear"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva factura
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={e => setFEstado(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="contabilizada">Contabilizada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="w-52">
          <label className={lbl}>Cliente</label>
          {fClienteId ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-gray-50">
              <span className="truncate flex-1">{fClienteDisplay}</span>
              <button onClick={() => { setFClienteId(""); setFClienteDisplay(""); }} className="text-gray-400 hover:text-red-500">✕</button>
            </div>
          ) : (
            <TerceroSearch display="" onChange={(id, label) => { setFClienteId(id); setFClienteDisplay(label); }} />
          )}
        </div>
        <button onClick={() => { setPagina(1); cargar(1); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Buscar
        </button>
        {(fEstado || fDesde || fHasta) && (
          <button onClick={() => { setFEstado(""); setFDesde(""); setFHasta(""); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline pb-0.5">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                <Th campo="numero"      orden={orden} alternar={alternar} className="whitespace-nowrap">Número</Th>
                <Th campo="fecha"       orden={orden} alternar={alternar} className="whitespace-nowrap">Fecha</Th>
                <Th campo="vencimiento" orden={orden} alternar={alternar} className="whitespace-nowrap">Vencimiento</Th>
                <Th campo="cliente"     orden={orden} alternar={alternar} className="whitespace-nowrap">Cliente</Th>
                <Th campo="moneda"      orden={orden} alternar={alternar} className="whitespace-nowrap">Moneda</Th>
                <Th campo="subtotal"    orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Subtotal</Th>
                <Th campo="iva"         orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">IVA</Th>
                <Th campo="total"       orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Total</Th>
                <Th campo="estado"      orden={orden} alternar={alternar} className="whitespace-nowrap">Estado</Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin facturas registradas</td></tr>
              ) : ordenada.map(d => {
                const vencida  = d.dias_vencimiento !== null && d.dias_vencimiento < 0;
                const porVencer = d.dias_vencimiento !== null && d.dias_vencimiento >= 0 && d.dias_vencimiento <= 5;
                return (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-2.5">
                      <button onClick={() => d.estado === "borrador" ? abrirEditar(d) : abrirVer(d)}
                        className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                        {d.numero}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{d.fecha}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {d.pagada ? (
                        <span className="text-[11px] font-medium text-green-600">
                          {d.fecha_vencimiento}
                          <span className="ml-1 text-[10px]">(pagada)</span>
                        </span>
                      ) : (
                        <span className={`text-[11px] font-medium ${vencida ? "text-red-600" : porVencer ? "text-amber-600" : "text-gray-500"}`}>
                          {d.fecha_vencimiento}
                          {d.dias_vencimiento !== null && (
                            <span className="ml-1 text-[10px]">
                              {vencida ? `(${Math.abs(d.dias_vencimiento)}d venc.)` : `(${d.dias_vencimiento}d)`}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px]">
                      <div className="font-medium text-gray-800 truncate">{d.cliente_nombre ?? "—"}</div>
                      <div className="text-[10px] font-mono text-gray-400">{d.cliente_nit ?? ""}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded ${
                        d.moneda_codigo === "COP" ? "text-gray-500 bg-gray-100" : "text-indigo-700 bg-indigo-50"
                      }`}>
                        {d.moneda_codigo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-600">{fmt(d.subtotal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500">{fmt(d.total_iva)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{fmt(d.total)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[d.estado]}`}>
                        {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.estado === "borrador" ? (
                        <button onClick={() => abrirEditar(d)} title="Editar"
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      ) : (
                        <button onClick={() => abrirVer(d)} title="Ver"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
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
            <button onClick={() => setPagina(1)} disabled={pagina === 1}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pagina} / {totalPags}</span>
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPags)} disabled={pagina === totalPags}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modo !== "cerrado" && (
        <Modal
          factura={activa}
          monedas={monedas}
          condiciones={condiciones}
          unidades={unidades}
          centrosCosto={centrosCosto}
          tarifasIva={tarifasIva}
          retCatalogo={retCatalogo}
          onClose={cerrar}
          onSaved={() => { cerrar(); cargar(1); setPagina(1); }}
        />
      )}
    </div>
  );
}
