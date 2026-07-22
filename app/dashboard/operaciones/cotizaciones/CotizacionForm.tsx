"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Tercero    { id: string; nit: string; razon_social: string; }
interface Aerolinea  { id: string; codigo_iata: string; nombre: string; }
interface Concepto   { id: string; nombre: string; seccion: string; tipo_calculo: string; moneda: string; }

interface Linea {
  id?: string;
  seccion: string;
  orden: number;
  concepto_id: string | null;
  descripcion: string;
  tipo_calculo: string;
  valor_unitario: number;
  costo_unitario: number;
  base: number;
  minimo: number | null;
  total_venta: number;
  total_costo: number;
  moneda: string;
  proveedor_id: string | null;
  condiciones_costo: string;
  notas: string;
  _proveedor_nombre?: string;
}

interface CotizacionDetalle {
  id: string;
  numero: string;
  cliente_id: string;
  fecha: string;
  fecha_vigencia: string;
  tipo_operacion: string;
  modalidad: string;
  origen: string;
  destino: string;
  aerolinea_id: string | null;
  incoterm: string | null;
  piezas: number | null;
  peso_kg: number | null;
  valor_mercancia: number | null;
  moneda_mercancia: string;
  trm: number | null;
  notas: string | null;
  estado: string;
  lineas: Linea[];
}

// ── Constantes ───────────────────────────────────────────────────────────────

const SECCIONES = [
  { key: "TRANSPORTE_INTERNACIONAL", label: "Transporte internacional" },
  { key: "GASTOS_ORIGEN",            label: "Gastos de origen" },
  { key: "GASTOS_DESTINO",           label: "Gastos en destino" },
  { key: "ADUANA",                   label: "Aduana" },
  { key: "TRANSPORTE_TERRESTRE",     label: "Transporte terrestre" },
  { key: "ALMACENAMIENTO",           label: "Almacenamiento" },
  { key: "SEGURO",                   label: "Seguro" },
];

const INCOTERMS = ["EXW","FCA","FAS","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP"];

const ESTADO_STYLE: Record<string, string> = {
  BORRADOR:  "bg-gray-100 text-gray-600",
  ENVIADA:   "bg-blue-50 text-blue-700",
  APROBADA:  "bg-green-50 text-green-700",
  RECHAZADA: "bg-red-50 text-red-600",
  VENCIDA:   "bg-amber-50 text-amber-700",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(n: number | string | null | undefined, dec = 2) {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return (isNaN(num) ? 0 : num).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function toInput(v: number | string | null | undefined, fallback = ""): string {
  if (v == null) return fallback;
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : String(n);
}

function calcTotal(tipo: string, valorU: number, base: number, minimo: number | null, valorCifBase: number, trm: number, monedaLinea: string, monedaCif: string, aplicarMinimo = true): number {
  let total = 0;
  if (tipo === "PORCENTAJE") {
    let vm = valorCifBase || 0;
    if (monedaCif !== monedaLinea && trm) {
      vm = monedaCif === "USD" ? vm * trm : vm / trm;
    }
    total = (valorU / 100) * vm;
  } else {
    total = valorU * (base || 1);
  }
  // El mínimo es condición comercial — solo aplica a la venta, no al costo
  if (aplicarMinimo && minimo !== null && total < minimo) total = minimo;
  // Porcentajes sobre CIF se elevan al peso entero superior (práctica aduanera Colombia)
  if (tipo === "PORCENTAJE") return Math.ceil(total);
  return Math.round(total * 10000) / 10000;
}

// ── Componente búsqueda con autocomplete ─────────────────────────────────────

function BusquedaInput({ label, value, display, onSelect, fetchFn, placeholder, disabled }: {
  label: string;
  value: string;
  display: string;
  onSelect: (id: string, nombre: string) => void;
  fetchFn: (q: string) => Promise<{ id: string; label: string }[]>;
  placeholder: string;
  disabled?: boolean;
}) {
  const [q, setQ]             = useState(display);
  const [opciones, setOpciones] = useState<{ id: string; label: string }[]>([]);
  const [abierto, setAbierto]  = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (display) setQ(display); }, [display]);

  function onChange(val: string) {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) { setOpciones([]); setAbierto(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetchFn(val);
      setOpciones(res);
      setAbierto(res.length > 0);
    }, 300);
  }

  function seleccionar(op: { id: string; label: string }) {
    setQ(op.label);
    setAbierto(false);
    onSelect(op.id, op.label);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input value={q} onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        disabled={disabled}
        placeholder={placeholder} className={inputCls} />
      {abierto && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
          {opciones.map((op) => (
            <button key={op.id} type="button"
              onMouseDown={() => seleccionar(op)}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal de línea ────────────────────────────────────────────────────────────

function parseNum(s: string, fallback: number): number {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? fallback : n;
}

function filterDecimal(raw: string): string {
  // Solo dígitos y un punto decimal (acepta coma como separador)
  const s = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  return dot === -1 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
}

function LineaModal({ seccion, linea, valorCif, monedaMercancia, trm, pesoKg, conceptos, onGuardar, onCerrar }: {
  seccion: string;
  linea: Linea | null;
  valorCif: number;
  monedaMercancia: string;
  trm: number;
  pesoKg: number;
  conceptos: Concepto[];
  onGuardar: (l: Linea) => void;
  onCerrar: () => void;
}) {
  const baseDefault = linea ? linea.base : (pesoKg || 1);

  const [form, setForm] = useState<Linea>(linea ? {
    ...linea,
    condiciones_costo: linea.condiciones_costo ?? "",
    notas: linea.notas ?? "",
    _proveedor_nombre: linea._proveedor_nombre ?? "",
  } : {
    seccion, orden: 0, concepto_id: null, descripcion: "", tipo_calculo: "POR_EMBARQUE",
    valor_unitario: 0, costo_unitario: 0, base: baseDefault, minimo: null,
    total_venta: 0, total_costo: 0, moneda: "USD",
    proveedor_id: null, condiciones_costo: "", notas: "", _proveedor_nombre: "",
  });

  // Strings de display para campos numéricos — evita que "0." se convierta a "0" al parsear
  const [sVenta, setSVenta] = useState(() => toInput(linea?.valor_unitario, "0"));
  const [sCosto, setSCosto] = useState(() => toInput(linea?.costo_unitario, "0"));
  const [sBase,  setSBase]  = useState(() => linea ? toInput(linea.base, "1") : toInput(baseDefault, "1"));
  const [sMin,   setSMin]   = useState(() => linea?.minimo != null ? toInput(linea.minimo, "") : "");

  const conceptosSec = conceptos.filter((c) => c.seccion === seccion);

  function seleccionarConcepto(id: string) {
    const c = conceptos.find((x) => x.id === id);
    if (!c) return;
    setForm((p) => ({
      ...p, concepto_id: id, descripcion: c.nombre,
      tipo_calculo: c.tipo_calculo, moneda: c.moneda,
    }));
  }

  function recalc(f: Linea): Linea {
    return {
      ...f,
      total_venta: calcTotal(f.tipo_calculo, f.valor_unitario, f.base, f.minimo, valorCif, trm, f.moneda, monedaMercancia, true),
      total_costo: calcTotal(f.tipo_calculo, f.costo_unitario, f.base, f.minimo, valorCif, trm, f.moneda, monedaMercancia, false),
    };
  }

  function set(key: keyof Linea, val: unknown) {
    setForm((p) => recalc({ ...p, [key]: val } as Linea));
  }

  function setNumeric(
    key: "valor_unitario" | "costo_unitario" | "base" | "minimo",
    raw: string,
    setter: (s: string) => void,
    fallback: number | null,
  ) {
    const clean = filterDecimal(raw);
    setter(clean);
    const n = clean === "" ? fallback : parseNum(clean, fallback ?? 0);
    setForm((p) => recalc({ ...p, [key]: n } as Linea));
  }

  const showBase = form.tipo_calculo === "POR_KG";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
        <h3 className="text-[13px] font-semibold text-gray-800 mb-4">
          {linea ? "Editar línea" : "Nueva línea"} — {SECCIONES.find((s) => s.key === seccion)?.label}
        </h3>

        <div className="space-y-3">
          {/* Concepto del catálogo */}
          {conceptosSec.length > 0 && (
            <div>
              <label className={labelCls}>Concepto del catálogo</label>
              <select className={inputCls} value={form.concepto_id ?? ""}
                onChange={(e) => e.target.value ? seleccionarConcepto(e.target.value) : null}>
                <option value="">— Seleccionar o escribir libre —</option>
                {conceptosSec.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Descripción libre */}
          <div>
            <label className={labelCls}>Descripción *</label>
            <input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
              required className={inputCls} placeholder="Descripción del concepto" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Tipo cálculo</label>
              <select className={inputCls} value={form.tipo_calculo}
                onChange={(e) => set("tipo_calculo", e.target.value)}>
                <option value="POR_KG">Por Kg</option>
                <option value="POR_EMBARQUE">Por embarque</option>
                <option value="PORCENTAJE">% sobre CIF</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Moneda</label>
              <select className={inputCls} value={form.moneda}
                onChange={(e) => set("moneda", e.target.value)}>
                <option value="USD">USD</option>
                <option value="COP">COP</option>
              </select>
            </div>
            {showBase && (
              <div>
                <label className={labelCls}>Base (kg)</label>
                <input type="text" inputMode="decimal" className={inputCls}
                  value={sBase}
                  onChange={(e) => setNumeric("base", e.target.value, setSBase, 1)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Val. venta {form.tipo_calculo === "PORCENTAJE" ? "(%" : form.tipo_calculo === "POR_KG" ? "($/kg)" : "($/emb)"}</label>
              <input type="text" inputMode="decimal" className={inputCls}
                value={sVenta}
                onChange={(e) => setNumeric("valor_unitario", e.target.value, setSVenta, 0)} />
            </div>
            <div>
              <label className={labelCls}>Costo</label>
              <input type="text" inputMode="decimal" className={inputCls}
                value={sCosto}
                onChange={(e) => setNumeric("costo_unitario", e.target.value, setSCosto, 0)} />
            </div>
            <div>
              <label className={labelCls}>Mínimo</label>
              <input type="text" inputMode="decimal" className={inputCls}
                value={sMin} placeholder="—"
                onChange={(e) => setNumeric("minimo", e.target.value, setSMin, null)} />
            </div>
          </div>

          {/* Preview totales */}
          <div className="flex gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <div className="flex-1 text-center">
              <p className={labelCls}>Total venta</p>
              <p className="text-[13px] font-semibold text-blue-700">{form.moneda} {fmt(form.total_venta)}</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1 text-center">
              <p className={labelCls}>Total costo</p>
              <p className="text-[13px] font-semibold text-gray-600">{form.moneda} {fmt(form.total_costo)}</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1 text-center">
              <p className={labelCls}>Margen</p>
              <p className={`text-[13px] font-semibold ${form.total_venta - form.total_costo >= 0 ? "text-green-600" : "text-red-600"}`}>
                {form.moneda} {fmt(form.total_venta - form.total_costo)}
              </p>
            </div>
          </div>

          {/* Proveedor y condiciones */}
          <div>
            <label className={labelCls}>Proveedor (opcional)</label>
            <input className={inputCls} value={form._proveedor_nombre ?? ""} placeholder="Nombre del proveedor"
              onChange={(e) => setForm((p) => ({ ...p, _proveedor_nombre: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Condiciones / instrucción operativa</label>
            <textarea rows={2} className={inputCls + " resize-none"}
              value={form.condiciones_costo ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, condiciones_costo: e.target.value }))}
              placeholder="Ej: Confirmado con COPA para vuelo del viernes, sujeto a disponibilidad" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onCerrar}
            className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="button"
            onClick={() => { if (form.descripcion.trim()) onGuardar(form); }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CotizacionForm({ id }: { id: string }) {
  const router  = useRouter();
  const isNueva = id === "nueva";
  const [panelW, setPanelW] = useState(280);
  const dragging = useRef(false);

  // Catálogos
  const [aerolineas, setAerolineas]   = useState<Aerolinea[]>([]);
  const [conceptos, setConceptos]     = useState<Concepto[]>([]);
  const [asesores, setAsesores]       = useState<{id:string;nombre:string;apellido:string}[]>([]);

  // Encabezado
  const [clienteId, setClienteId]     = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [asesorId, setAsesorId]       = useState("");
  const [fecha, setFecha]             = useState(new Date().toISOString().slice(0, 10));
  const [vigencia, setVigencia]       = useState("");
  const [tipoOp, setTipoOp]           = useState("IMPORTACION");
  const [origen, setOrigen]           = useState("");
  const [destino, setDestino]         = useState("");
  const [aerolineaId, setAerolineaId] = useState("");
  const [incoterm, setIncoterm]       = useState("CIF");
  const [piezas, setPiezas]           = useState("");
  const [pesoKg, setPesoKg]           = useState("");
  const [valorMercancia, setValorMercancia] = useState("");
  const [monedaMercancia, setMonedaMercancia] = useState("USD");
  const [valorCif, setValorCif]           = useState("");
  const [trm, setTrm]                 = useState("");
  const [notas, setNotas]             = useState(
    "Sujeto a disponibilidad de espacios\n" +
    "Los gastos de puerto son aprox, los mismos se facturan contra soporte de puerto\n" +
    "Sujeto a verificacion de mercancia\n" +
    "Seguro Internacional sujeto a verificacion en caso de requerirlo\n" +
    "Las facturas deberan ser canceladas a la TRM del dia mas 30 pesos, siempre y cuando este valor no sea inferior a la tasa que registra la factura de venta\n" +
    "No incluye impuestos ni arancel"
  );
  const [estado, setEstado]           = useState("BORRADOR");
  const [cotizacionId, setCotizacionId] = useState<string | null>(null);
  const [numero, setNumero]             = useState<string>("");
  const [operacionId, setOperacionId]   = useState<string | null>(null);

  // Líneas por sección
  const [lineas, setLineas]           = useState<Record<string, Linea[]>>({});

  // UI
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>(
    Object.fromEntries(SECCIONES.map((s) => [s.key, isNueva]))
  );
  const [lineaModal, setLineaModal]   = useState<{ seccion: string; linea: Linea | null; idx: number | null } | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [printOpen, setPrintOpen]     = useState(false);
  const [printMoneda, setPrintMoneda] = useState<"COP" | "USD">("COP");
  const [aprobarOpen, setAprobarOpen] = useState(false);
  const [opsAbiertas, setOpsAbiertas] = useState<{ id: string; numero: string; clientes: { nombre: string }[] }[]>([]);
  const [opElegida, setOpElegida]     = useState("");   // "" = nueva operación
  const [busquedaOp, setBusquedaOp]   = useState("");

  // Cargar catálogos
  useEffect(() => {
    Promise.all([
      apiFetch<Aerolinea[]>("/operaciones/aerolineas?solo_activas=true"),
      apiFetch<Concepto[]>("/operaciones/conceptos?solo_activos=true"),
    ]).then(([a, c]) => { setAerolineas(a); setConceptos(c); });
    apiFetch<{id:string;nombre:string;apellido:string;es_asesor:boolean}[]>("/usuarios?solo_activos=true")
      .then((data) => setAsesores(data.filter((u) => u.es_asesor))).catch(() => {});

    if (!isNueva) cargarCotizacion();
    else cargarTrm();
  }, []);

  function onDragStart(e: React.MouseEvent) {
    dragging.current = true;
    const startX = e.clientX;
    const startW = panelW;
    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(480, Math.max(280, startW + ev.clientX - startX));
      setPanelW(next);
    }
    function onUp() {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function cargarTrm() {
    try {
      const data = await apiFetch<{ existe: boolean; tasa: string | null }>("/trm/hoy").catch(() => null);
      if (data?.existe && data.tasa) setTrm(parseFloat(data.tasa).toFixed(2));
    } catch {}
  }

  async function cargarCotizacion() {
    const data = await apiFetch<CotizacionDetalle>(`/operaciones/cotizaciones/${id}`);
    setCotizacionId(data.id);
    setNumero(data.numero);
    setClienteId(data.cliente_id);
    setFecha(data.fecha);
    setVigencia(data.fecha_vigencia);
    setTipoOp(data.tipo_operacion);
    setOrigen(data.origen);
    setDestino(data.destino);
    setAerolineaId(data.aerolinea_id ?? "");
    setIncoterm(data.incoterm ?? "CIF");
    setPiezas(data.piezas?.toString() ?? "");
    setPesoKg(toInput(data.peso_kg));
    setValorMercancia(toInput(data.valor_mercancia));
    setMonedaMercancia(data.moneda_mercancia);
    setValorCif(toInput(data.valor_cif));
    setTrm(toInput(data.trm));
    setNotas(data.notas ?? "");
    setEstado(data.estado);
    if (data.estado === "APROBADA") {
      apiFetch<{ id: string }>(`/operaciones/cotizaciones/${data.id}/operacion`)
        .then((op) => setOperacionId(op.id))
        .catch(() => {});
    }
    if ((data as any).asesor_id) setAsesorId((data as any).asesor_id);
    const tercero = await apiFetch<{ razon_social: string; asesor_id: string | null }>(`/terceros/${data.cliente_id}`);
    setClienteNombre(tercero.razon_social);
    // Agrupar líneas por sección
    const agrupadas: Record<string, Linea[]> = {};
    for (const l of data.lineas) {
      if (!agrupadas[l.seccion]) agrupadas[l.seccion] = [];
      agrupadas[l.seccion].push(l);
    }
    setLineas(agrupadas);
  }

  async function buscarClientes(q: string) {
    const data = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(q)}&tipo_tercero=CLIENTE`);
    return data.map((t) => ({ id: t.id, label: `${t.nit} — ${t.razon_social}` }));
  }

  const editable = estado === "BORRADOR";

  // Margen en tiempo real
  const vm   = parseFloat(valorMercancia) || 0;
  const trmN = parseFloat(trm) || 1;
  let totalVentaCOP = 0, totalCostoCOP = 0;
  Object.values(lineas).flat().forEach((l) => {
    const factor = l.moneda === "USD" ? trmN : 1;
    totalVentaCOP += l.total_venta * factor;
    totalCostoCOP += l.total_costo * factor;
  });
  const margenCOP = totalVentaCOP - totalCostoCOP;
  const margenPct = totalVentaCOP > 0 ? (margenCOP / totalVentaCOP) * 100 : 0;

  function agregarLinea(seccion: string) {
    setLineaModal({ seccion, linea: null, idx: null });
  }

  function editarLinea(seccion: string, idx: number) {
    setLineaModal({ seccion, linea: lineas[seccion][idx], idx });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function buildHeaderBody() {
    return {
      cliente_id: clienteId,
      fecha, fecha_vigencia: vigencia,
      tipo_operacion: tipoOp,
      modalidad: "AEREA",
      origen, destino,
      aerolinea_id: aerolineaId || null,
      incoterm: incoterm || null,
      piezas: piezas ? parseInt(piezas) : null,
      peso_kg: pesoKg ? parseFloat(pesoKg) : null,
      valor_mercancia: valorMercancia ? parseFloat(valorMercancia) : null,
      moneda_mercancia: monedaMercancia,
      valor_cif: valorCif ? parseFloat(valorCif) : null,
      trm: trm ? parseFloat(trm) : null,
      notas: notas || null,
      asesor_id: asesorId || null,
    };
  }

  function buildLineaPayload(l: Linea, orden: number) {
    return {
      seccion: l.seccion, orden,
      concepto_id: l.concepto_id ?? null,
      descripcion: l.descripcion,
      tipo_calculo: l.tipo_calculo,
      valor_unitario: l.valor_unitario,
      costo_unitario: l.costo_unitario,
      base: l.base,
      minimo: l.minimo,
      moneda: l.moneda,
      proveedor_id: l.proveedor_id ?? null,
      condiciones_costo: l.condiciones_costo || null,
      notas: l.notas || null,
    };
  }

  // Crea la cabecera en BD si aún no existe; retorna el id
  async function ensureCabecera(): Promise<string | null> {
    if (cotizacionId) return cotizacionId;
    // Si ya estamos en una cotización existente (URL tiene id real), úsarlo directamente
    // aunque el estado aún no haya cargado (race condition en montaje)
    if (!isNueva) return id;
    if (!clienteId)         { setError("Selecciona un cliente primero"); return null; }
    if (!vigencia)          { setError("Ingresa la fecha de vigencia"); return null; }
    if (!origen || !destino){ setError("Ingresa origen y destino"); return null; }
    const cot = await apiFetch<{ id: string; numero: string }>("/operaciones/cotizaciones", {
      method: "POST", body: JSON.stringify({ ...buildHeaderBody(), lineas: [] }),
    });
    setCotizacionId(cot.id);
    setNumero(cot.numero);
    setEstado("BORRADOR");
    router.replace(`/dashboard/operaciones/cotizaciones/${cot.id}`);
    return cot.id;
  }

  // ── Líneas ────────────────────────────────────────────────────────────────────

  async function eliminarLinea(seccion: string, idx: number) {
    const linea = lineas[seccion]?.[idx];
    if (linea?.id && cotizacionId) {
      try {
        await apiFetch(`/operaciones/cotizaciones/${cotizacionId}/lineas/${linea.id}`, { method: "DELETE" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar la línea");
        return;
      }
    }
    setLineas((p) => {
      const copia = { ...p };
      copia[seccion] = copia[seccion].filter((_, i) => i !== idx);
      if (!copia[seccion].length) delete copia[seccion];
      return copia;
    });
  }

  async function onGuardarLinea(l: Linea) {
    const { seccion, idx } = lineaModal!;
    setSaving(true); setError("");
    try {
      const cid = await ensureCabecera();
      if (!cid) return;

      const payload = buildLineaPayload(l, idx ?? (lineas[seccion]?.length ?? 0));
      let saved: Linea;

      if (idx !== null && l.id) {
        saved = await apiFetch<Linea>(`/operaciones/cotizaciones/${cid}/lineas/${l.id}`, {
          method: "PUT", body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch<Linea>(`/operaciones/cotizaciones/${cid}/lineas`, {
          method: "POST", body: JSON.stringify(payload),
        });
      }

      setLineas((p) => {
        const copia = { ...p };
        const arr = [...(copia[seccion] ?? [])];
        const completa = { ...saved, _proveedor_nombre: l._proveedor_nombre };
        if (idx !== null) arr[idx] = completa;
        else arr.push(completa);
        copia[seccion] = arr;
        return copia;
      });
      setLineaModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la línea");
    } finally { setSaving(false); }
  }

  async function guardar() {
    if (!clienteId) { setError("Selecciona un cliente"); return; }
    if (!vigencia)  { setError("Ingresa la fecha de vigencia"); return; }
    if (!origen || !destino) { setError("Ingresa origen y destino"); return; }

    setSaving(true); setError("");
    try {
      if (!cotizacionId) {
        // Cotización nueva sin líneas aún
        const cot = await apiFetch<{ id: string; numero: string }>("/operaciones/cotizaciones", {
          method: "POST", body: JSON.stringify({ ...buildHeaderBody(), lineas: [] }),
        });
        setCotizacionId(cot.id);
        setNumero(cot.numero);
        setEstado("BORRADOR");
        router.replace(`/dashboard/operaciones/cotizaciones/${cot.id}`);
      } else {
        // Solo actualizar encabezado — las líneas se guardan individualmente
        await apiFetch(`/operaciones/cotizaciones/${cotizacionId}`, {
          method: "PUT", body: JSON.stringify(buildHeaderBody()),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function cambiarEstado(accion: "enviar" | "rechazar" | "reabrir") {
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/cotizaciones/${cotizacionId}/${accion}`, { method: "POST" });
      await cargarCotizacion();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  async function abrirAprobar() {
    setError("");
    setOpElegida("");
    setBusquedaOp("");
    try {
      const ops = await apiFetch<{ id: string; numero: string; clientes: { nombre: string }[] }[]>("/operaciones/operaciones?estado=ABIERTA");
      setOpsAbiertas(ops);
    } catch { setOpsAbiertas([]); }
    setAprobarOpen(true);
  }

  async function confirmarAprobar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/cotizaciones/${cotizacionId}/aprobar`, {
        method: "POST", body: JSON.stringify({ operacion_id: opElegida || null }),
      });
      router.push("/dashboard/operaciones/operaciones");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 88px)" }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 shrink-0">
        <div>
          <button onClick={() => router.push("/dashboard/operaciones/cotizaciones")}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-0.5 transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Cotizaciones
          </button>
          <h1 className="text-[15px] font-semibold text-gray-800">
            {isNueva ? "Nueva cotización" : numero ? `Cotización ${numero}` : "Cargando..."}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNueva && estado && (
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${ESTADO_STYLE[estado] ?? "bg-gray-100 text-gray-500"}`}>{estado}</span>
          )}
          {!isNueva && cotizacionId && (
            <button onClick={() => { setPrintMoneda("COP"); setPrintOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] rounded-lg transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
            </button>
          )}
          {(isNueva || editable) && (
            <button onClick={guardar} disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          )}
          {!isNueva && editable && cotizacionId && (
            <button onClick={() => cambiarEstado("enviar")} disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
              Enviar al cliente
            </button>
          )}
          {!isNueva && estado === "ENVIADA" && cotizacionId && (
            <>
              <button onClick={() => cambiarEstado("reabrir")} disabled={saving}
                className="px-4 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-700 text-[12px] font-medium rounded-lg">
                Reabrir
              </button>
              <button onClick={abrirAprobar} disabled={saving}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">Aprobar</button>
              <button onClick={() => cambiarEstado("rechazar")} disabled={saving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">Rechazar</button>
            </>
          )}
          {!isNueva && estado === "RECHAZADA" && cotizacionId && (
            <button onClick={() => cambiarEstado("reabrir")} disabled={saving}
              className="px-4 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-700 text-[12px] font-medium rounded-lg">
              Reabrir
            </button>
          )}
          {!isNueva && estado === "APROBADA" && operacionId && (
            <button onClick={() => router.push(`/dashboard/operaciones/operaciones/${operacionId}`)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[12px] font-medium rounded-lg">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a1 1 0 0 0-.6 1.6L4 11l-1 4 4-1 2.8 2.8a1 1 0 0 0 1.6-.6z"/>
              </svg>
              Ver operación
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 shrink-0">{error}</div>}

      {/* ── Dos columnas ────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 overflow-hidden min-h-0">

        {/* ── Columna izquierda: encabezado + margen (redimensionable) ── */}
        <div className="shrink-0 overflow-y-auto flex flex-col gap-3 pb-4 relative"
          style={{ width: panelW }}>
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group z-10 flex items-center justify-center"
          >
            <div className="h-12 w-1 rounded-full bg-gray-200 group-hover:bg-blue-400 transition-colors" />
          </div>

          {/* Encabezado */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Encabezado</p>

            <BusquedaInput label="Cliente *" value={clienteId} display={clienteNombre}
              fetchFn={buscarClientes} placeholder="Buscar por NIT o nombre..."
              disabled={!editable && !isNueva}
              onSelect={(id, label) => {
                setClienteId(id);
                setClienteNombre(label.split(" — ")[1] ?? label);
                apiFetch<{ asesor_id: string | null }>(`/terceros/${id}`)
                  .then((t) => { if (t.asesor_id) setAsesorId(t.asesor_id); })
                  .catch(() => {});
              }} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Fecha *</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Vigencia *</label>
                <input type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Tipo de operación</label>
              <select value={tipoOp} onChange={(e) => setTipoOp(e.target.value)}
                disabled={!editable && !isNueva} className={inputCls}>
                <option value="IMPORTACION">Importación</option>
                <option value="EXPORTACION">Exportación</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Origen *</label>
                <input value={origen} onChange={(e) => setOrigen(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls} placeholder="TEL AVIV" />
              </div>
              <div>
                <label className={labelCls}>Destino *</label>
                <input value={destino} onChange={(e) => setDestino(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls} placeholder="BOGOTÁ" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Aerolínea</label>
              <select value={aerolineaId} onChange={(e) => setAerolineaId(e.target.value)}
                disabled={!editable && !isNueva} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {aerolineas.map((a) => <option key={a.id} value={a.id}>{a.codigo_iata} — {a.nombre}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Incoterm</label>
                <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls}>
                  {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Piezas</label>
                <input type="number" min="1" value={piezas} onChange={(e) => setPiezas(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Peso kg</label>
                <input type="text" inputMode="decimal" value={pesoKg} onChange={(e) => setPesoKg(filterDecimal(e.target.value))}
                  disabled={!editable && !isNueva} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>TRM</label>
                <input type="text" inputMode="decimal" value={trm} onChange={(e) => setTrm(filterDecimal(e.target.value))}
                  disabled={!editable && !isNueva} className={inputCls} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className={labelCls}>Valor mercancía (FOB)</label>
                <input type="text" inputMode="decimal" value={valorMercancia}
                  onChange={(e) => setValorMercancia(filterDecimal(e.target.value))}
                  disabled={!editable && !isNueva} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Moneda</label>
                <select value={monedaMercancia} onChange={(e) => setMonedaMercancia(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls}>
                  <option value="USD">USD</option>
                  <option value="COP">COP</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Valor CIF</label>
              <input type="text" inputMode="decimal" value={valorCif}
                onChange={(e) => setValorCif(filterDecimal(e.target.value))}
                disabled={!editable && !isNueva} className={inputCls} placeholder="0.00" />
            </div>

            {asesores.length > 0 && (
              <div>
                <label className={labelCls}>Asesor</label>
                <select value={asesorId} onChange={(e) => setAsesorId(e.target.value)}
                  disabled={!editable && !isNueva} className={inputCls}>
                  <option value="">Sin asesor</option>
                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Notas / condiciones</label>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
                disabled={!editable && !isNueva} className={inputCls + " resize-none"}
                placeholder="No incluye IVA · Sujeto a disponibilidad" />
            </div>
          </div>

          {/* Margen */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-3">Margen</p>
            <div className="space-y-2">
              {[
                { label: "Total venta", val: `COP ${fmt(totalVentaCOP, 0)}`, color: "text-blue-700" },
                { label: "Total costo", val: `COP ${fmt(totalCostoCOP, 0)}`, color: "text-gray-600" },
                { label: "Margen", val: `COP ${fmt(margenCOP, 0)}`, color: margenCOP >= 0 ? "text-green-700" : "text-red-600" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">{label}</span>
                  <span className={`text-[12px] font-semibold ${color}`}>{val}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Margen %</span>
                <span className={`text-[16px] font-bold ${margenPct >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {margenPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: secciones ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {SECCIONES.map(({ key, label }, secIdx) => {
              const filas = lineas[key] ?? [];
              return (
                <div key={key} className={secIdx > 0 ? "border-t border-gray-100" : ""}>
                  {/* Separador de sección */}
                  <div
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50/80 cursor-pointer select-none"
                    onClick={() => filas.length > 0 && setSeccionesAbiertas((p) => ({ ...p, [key]: !p[key] }))}
                  >
                    {filas.length > 0 && (
                      <span className="shrink-0 text-gray-400">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                          style={{ transform: seccionesAbiertas[key] ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 shrink-0">{label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    {filas.length > 0 && (
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">
                        {filas.length}
                      </span>
                    )}
                    {editable && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); agregarLinea(key); }}
                        className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium shrink-0 transition-colors">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Agregar
                      </button>
                    )}
                  </div>

                  {seccionesAbiertas[key] && (
                    <>
                  {/* Header columnas — solo si hay líneas */}
                  {filas.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-1 border-t border-gray-100 bg-white">
                      <div className="flex-1" />
                      <div className="text-right shrink-0 w-36">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Venta</span>
                      </div>
                      <div className="text-right shrink-0 w-36">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Costo</span>
                      </div>
                      <div className="text-right shrink-0 w-28">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Margen</span>
                      </div>
                      <div className="text-right shrink-0 w-16">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300">%</span>
                      </div>
                      {editable && <div className="shrink-0 w-[52px]" />}
                    </div>
                  )}

                  {/* Líneas */}
                  {filas.map((l, idx) => {
                    const margen = l.total_venta - l.total_costo;
                    const pctL   = l.total_venta > 0 ? (margen / l.total_venta) * 100 : 0;
                    return (
                      <div key={idx}
                        className="flex items-center gap-3 px-4 py-2 border-t border-gray-50 hover:bg-blue-50/20 group transition-colors">
                        {/* Descripción */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-gray-800 truncate">{l.descripcion}</p>
                          {l.condiciones_costo && (
                            <p className="text-[10px] text-gray-400 truncate">{l.condiciones_costo}</p>
                          )}
                        </div>
                        {/* Venta */}
                        <div className="text-right shrink-0 w-36">
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-[13px] font-mono font-semibold text-gray-800">
                              {fmt(l.total_venta)}
                            </span>
                            <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {l.moneda}
                            </span>
                          </div>
                        </div>
                        {/* Costo */}
                        <div className="text-right shrink-0 w-36">
                          <span className="text-[12px] font-mono text-gray-400">
                            {fmt(l.total_costo)}
                          </span>
                        </div>
                        {/* Margen valor */}
                        <div className={`text-right shrink-0 w-28 ${margen >= 0 ? "text-green-600" : "text-red-500"}`}>
                          <span className="text-[13px] font-mono font-semibold">
                            {fmt(margen)}
                          </span>
                        </div>
                        {/* Margen % */}
                        <div className={`text-right shrink-0 w-16 ${margen >= 0 ? "text-green-600" : "text-red-500"}`}>
                          <span className="text-[12px] font-semibold opacity-70">{pctL.toFixed(1)}%</span>
                        </div>
                        {/* Acciones */}
                        {editable && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-[52px]">
                            <button onClick={() => editarLinea(key, idx)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => eliminarLinea(key, idx)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Fila de totales de sección */}
                    </>
                  )}

                  {filas.length > 0 && (() => {
                    const monedas   = [...new Set(filas.map((l) => l.moneda))];
                    const monedaSec = monedas.length === 1 ? monedas[0] : "COP";
                    const factor    = (m: string) => m === "USD" && monedaSec === "COP" ? trmN : 1;
                    const sVenta  = filas.reduce((a, l) => a + l.total_venta * factor(l.moneda), 0);
                    const sCosto  = filas.reduce((a, l) => a + l.total_costo * factor(l.moneda), 0);
                    const sMargen = sVenta - sCosto;
                    const sPct    = sVenta > 0 ? (sMargen / sVenta) * 100 : 0;
                    return (
                      <div className="flex items-center gap-3 px-4 py-1.5 bg-blue-50/60 border-t border-blue-100">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500">Subtotal</span>
                        </div>
                        <div className="text-right shrink-0 w-36">
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-[12px] font-mono font-semibold text-gray-700">
                              {fmt(sVenta)}
                            </span>
                            <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">{monedaSec}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 w-36">
                          <span className="text-[12px] font-mono text-gray-400">
                            {fmt(sCosto)}
                          </span>
                        </div>
                        <div className={`text-right shrink-0 w-28 ${sMargen >= 0 ? "text-green-600" : "text-red-500"}`}>
                          <span className="text-[12px] font-mono font-semibold">
                            {fmt(sMargen)}
                          </span>
                        </div>
                        <div className={`text-right shrink-0 w-16 ${sMargen >= 0 ? "text-green-600" : "text-red-500"}`}>
                          <span className="text-[11px] font-semibold opacity-70">{sPct.toFixed(1)}%</span>
                        </div>
                        {editable && <div className="shrink-0 w-[52px]" />}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal aprobar: nueva operación o asociar a una abierta */}
      {aprobarOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-1">Aprobar cotización</h2>
            <p className="text-[11px] text-gray-400 mb-4">Al aprobar se genera la carpeta operativa. Puedes crear una operación nueva o asociar esta cotización a una operación abierta (consolidación de clientes).</p>

            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 mb-3">
              <input type="radio" name="op" checked={opElegida === ""} onChange={() => setOpElegida("")} className="accent-blue-600" />
              <span className="text-[12px] font-medium text-gray-700">Crear operación nueva</span>
            </label>

            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={busquedaOp} onChange={(e) => setBusquedaOp(e.target.value)}
                placeholder="Buscar operación abierta por número o cliente…"
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            <div className="space-y-2 mb-5 max-h-72 overflow-y-auto">
              {opsAbiertas.length === 0 ? (
                <p className="text-[11px] text-gray-400 px-1 py-2">No hay operaciones abiertas para asociar.</p>
              ) : (() => {
                const q = busquedaOp.trim().toLowerCase();
                const filtradas = q
                  ? opsAbiertas.filter((op) =>
                      op.numero.toLowerCase().includes(q) ||
                      (op.clientes ?? []).some((c) => c.nombre.toLowerCase().includes(q)))
                  : opsAbiertas;
                if (filtradas.length === 0) return <p className="text-[11px] text-gray-400 px-1 py-2">Sin coincidencias.</p>;
                return filtradas.map((op) => (
                  <label key={op.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${opElegida === op.id ? "border-blue-400 bg-blue-50/40" : "border-gray-200"}`}>
                    <input type="radio" name="op" checked={opElegida === op.id} onChange={() => setOpElegida(op.id)} className="accent-blue-600" />
                    <span className="font-mono font-semibold text-[12px] text-blue-700 shrink-0">{op.numero}</span>
                    <span className="text-[12px] text-gray-600 truncate">{op.clientes?.length ? op.clientes.map((c) => c.nombre).join(", ") : "Sin clientes aún"}</span>
                  </label>
                ));
              })()}
            </div>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAprobarOpen(false)} disabled={saving}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmarAprobar} disabled={saving}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Aprobando..." : opElegida ? "Asociar y aprobar" : "Crear y aprobar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal moneda de impresión */}
      {printOpen && cotizacionId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-1">Imprimir cotización</h2>
            <p className="text-[11px] text-gray-400 mb-4">Elige la moneda en la que se mostrarán los valores. La conversión usa la TRM de la cotización.</p>
            <div className="space-y-2 mb-5">
              {(["COP", "USD"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="printMoneda" checked={printMoneda === m}
                    onChange={() => setPrintMoneda(m)} className="accent-blue-600" />
                  <span className="text-[12px] text-gray-700 font-medium">{m}</span>
                  <span className="text-[11px] text-gray-400">— {m === "COP" ? "Pesos" : "Dólares"}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPrintOpen(false)}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={() => { window.open(`/cotizacion/${cotizacionId}?moneda=${printMoneda}`, "_blank"); setPrintOpen(false); }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">Ver impresión</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal línea */}
      {lineaModal && (
        <LineaModal
          seccion={lineaModal.seccion}
          linea={lineaModal.linea}
          valorCif={parseFloat(valorCif) || 0}
          monedaMercancia={monedaMercancia}
          trm={trmN}
          pesoKg={parseFloat(pesoKg) || 0}
          conceptos={conceptos}
          onGuardar={onGuardarLinea}
          onCerrar={() => setLineaModal(null)}
        />
      )}
    </div>
  );
}
