"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Tercero { id: string; nit: string; razon_social: string; }
interface Aerolinea { id: string; codigo_iata: string; nombre: string; }
interface Aeropuerto { id: string; codigo_iata: string; nombre: string; ciudad: string; }

interface CotizacionLinea {
  seccion: string; descripcion: string; tipo_calculo: string;
  valor_unitario: number; total_venta: number; total_costo: number; moneda: string;
}

interface Cotizacion {
  id: string; numero: string; cliente_id: string;
  fecha: string; fecha_vigencia: string;
  tipo_operacion: string; origen: string; destino: string;
  aerolinea_id: string | null; incoterm: string | null;
  piezas: number | null; peso_kg: number | null;
  valor_mercancia: number | null; moneda_mercancia: string;
  trm: number | null; notas: string | null;
  estado: string; lineas: CotizacionLinea[];
}

interface ConfLinea {
  cotizacion_linea_id: string; seccion: string; orden: number;
  descripcion: string; tipo_calculo: string; moneda: string;
  opcional: boolean; valor_tercero: boolean;
  base_cotizada: string; valor_unitario_cotizado: string; costo_unitario_cotizado: string;
  minimo: string | null; minimo_costo: string | null;
  total_venta_cotizado: string; total_costo_cotizado: string;
  confirmado: boolean;
  base_confirmada: string; valor_unitario_confirmado: string; costo_unitario_confirmado: string;
  total_venta_confirmado: string; total_costo_confirmado: string;
  confirmado_por_nombre: string | null; confirmado_en: string | null;
  notas_confirmacion: string | null;
  facturado: string; bloqueada: boolean;
}
interface ConfGrupo {
  cotizacion_id: string; numero: string; cliente_nombre: string;
  moneda_mercancia: string; trm: string | null; peso_kg: string | null;
  lineas: ConfLinea[];
}
interface ConfResp {
  operacion_id: string; numero: string;
  total_lineas: number; lineas_confirmadas: number;
  cotizaciones: ConfGrupo[];
}

interface Operacion {
  id: string; numero: string; cotizacion_id: string;
  fecha_apertura: string; estado: string;
  aerolinea_id: string | null;
  piezas: number | null; peso_kg: number | null;
  // Suma de las cotizaciones; con co-loading piezas/peso_kg solo traen la primera.
  piezas_total: number | null; peso_kg_total: number | null;
}

interface Hawb {
  id: string; numero_hawb: string;
  cotizacion_id: string | null; cotizacion_numero: string | null; cliente_nombre: string | null;
  shipper_id: string; consignee_id: string;
  aeropuerto_origen_id: string | null; aeropuerto_destino_id: string | null;
  aerolinea_id: string | null; vuelo: string | null;
  fecha_vuelo: string | null; piezas: number | null;
  peso_bruto_kg: number | null; peso_cargable_kg: number | null;
  descripcion_mercancia: string | null; dimensiones: string | null;
  trm: number | null; estado: string;
}

interface Mawb {
  id: string; numero_mawb: string;
  consignee_id: string | null;
  aerolinea_id: string | null;
  aeropuerto_origen_id: string | null; aeropuerto_destino_id: string | null;
  vuelo: string | null; fecha_vuelo: string | null;
  piezas: number | null; peso_bruto_kg: number | null; peso_cargable_kg: number | null;
  descripcion_mercancia: string | null;
  flete_total: number | null; moneda_flete: string;
  estado: string;
}

interface ManifiestoLinea {
  id: string; hawb_id: string;
  exportador_id: string; importador_id: string;
  piezas: number | null; peso_kg: number | null; descripcion: string | null;
}

interface Manifiesto {
  id: string; mawb_id: string; aerolinea_id: string | null;
  fecha: string; estado: string; lineas: ManifiestoLinea[];
  emitido_por_nombre?: string | null; emitido_en?: string | null;
  anulado_por_nombre?: string | null; anulado_en?: string | null; anulado_motivo?: string | null;
}

interface Evento {
  id: string; fecha_hora: string; usuario_id: string;
  tipo: string; descripcion: string; notificado_cliente: boolean;
  hawb_id: string | null; hawb_numero: string | null;
}

interface Documento {
  id: string; tipo: string; nombre: string;
  estado: string; fecha_recepcion: string | null; archivo: string | null;
}

interface Cliente { id: string; nombre: string; nit: string | null; }

interface Carpeta {
  operacion: Operacion;
  cotizaciones: Cotizacion[];
  clientes: Cliente[];
  hawbs: Hawb[];
  mawbs: Mawb[];
  manifiestos: Manifiesto[];
  eventos: Evento[];
  documentos: Documento[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADO_OP: Record<string, string> = {
  ABIERTA:   "bg-blue-50 text-blue-700",
  EN_CURSO:  "bg-amber-50 text-amber-700",
  CERRADA:   "bg-gray-100 text-gray-500",
  CANCELADA: "bg-red-50 text-red-600",
};

const ESTADO_DOC: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-500",
  EMITIDA:  "bg-green-50 text-green-700",
  ANULADA:  "bg-red-50 text-red-500",
};

const ESTADO_DOC_OPE: Record<string, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  RECIBIDO:  "bg-blue-50 text-blue-700",
  APROBADO:  "bg-green-50 text-green-700",
};

const TIPO_EVENTO: Record<string, string> = {
  STATUS:              "Estado",
  DOCUMENTO_RECIBIDO:  "Documento",
  NOTA:                "Nota",
  RESERVA:             "Reserva",
  APERTURA:            "Apertura",
  CIERRE:              "Cierre",
};

const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";

// Orden de presentación: sigue el recorrido del embarque, no el alfabético.
const SECCIONES_ORDEN = [
  "TRANSPORTE_INTERNACIONAL",
  "GASTOS_ORIGEN",
  "GASTOS_DESTINO",
  "ADUANA",
  "TRANSPORTE_TERRESTRE",
  "ALMACENAMIENTO",
  "SEGURO",
] as const;

const SECCION_LABEL: Record<string, string> = {
  TRANSPORTE_INTERNACIONAL: "Transporte internacional",
  GASTOS_ORIGEN:            "Gastos de origen",
  GASTOS_DESTINO:           "Gastos en destino",
  ADUANA:                   "Aduana",
  TRANSPORTE_TERRESTRE:     "Transporte terrestre",
  ALMACENAMIENTO:           "Almacenamiento",
  SEGURO:                   "Seguro",
};

function ordenSeccion(seccion: string): number {
  const i = SECCIONES_ORDEN.indexOf(seccion as (typeof SECCIONES_ORDEN)[number]);
  return i === -1 ? SECCIONES_ORDEN.length : i;
}

function fmt(n: number | string | null | undefined, dec = 2) {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return (isNaN(num) ? 0 : num).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── BusquedaInput ─────────────────────────────────────────────────────────────

function BusquedaInput({ label, display, onSelect, fetchFn, placeholder }: {
  label: string; display: string;
  onSelect: (id: string, nombre: string) => void;
  fetchFn: (q: string) => Promise<{ id: string; label: string }[]>;
  placeholder: string;
}) {
  const [q, setQ] = useState(display);
  const [opciones, setOpciones] = useState<{ id: string; label: string }[]>([]);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => { setQ(display); }, [display]);

  function onChange(val: string) {
    setQ(val);
    if (!val.trim()) { setOpciones([]); setAbierto(false); return; }
    setTimeout(async () => {
      const res = await fetchFn(val);
      setOpciones(res); setAbierto(res.length > 0);
    }, 300);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input value={q} onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder} className={inputCls} />
      {abierto && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {opciones.map((op) => (
            <button key={op.id} type="button" onMouseDown={() => { setQ(op.label); setAbierto(false); onSelect(op.id, op.label); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function OperacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const title = usePageTitle();
  const router = useRouter();
  const [resolvedId, setResolvedId] = useState("");
  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [terceroNombres, setTerceroNombres] = useState<Record<string, string>>({});
  const [aerolineas, setAerolineas] = useState<Aerolinea[]>([]);
  const [aeropuertos, setAeropuertos] = useState<Aeropuerto[]>([]);
  const [tab, setTab] = useState<"datos" | "confirmacion" | "hawb" | "mawb" | "manifiesto" | "bitacora" | "documentos">("datos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [confirmarCerrar, setConfirmarCerrar] = useState(false);
  const [anularManifId, setAnularManifId] = useState<string | null>(null);
  const [emitirManifId, setEmitirManifId] = useState<string | null>(null);
  const [motivoManif, setMotivoManif]     = useState("");
  const [menuManifId, setMenuManifId]     = useState<string | null>(null);

  // Facturar cotización
  interface FactLinea { linea_id: string; seccion: string; descripcion: string; moneda: string; total_venta: string; facturado: string; pendiente: string; }
  interface FactEstado { estado_facturacion: string; lineas: { moneda: string; total_venta: string; facturado: string; pendiente: string }[]; }
  const [factEstados, setFactEstados] = useState<Record<string, FactEstado>>({});
  const [factCotId, setFactCotId]     = useState<string | null>(null);
  const [factCotNum, setFactCotNum]   = useState("");
  const [factLineas, setFactLineas]   = useState<FactLinea[]>([]);
  const [factSel, setFactSel]         = useState<Record<string, { incluir: boolean; monto: string }>>({});
  const [factMoneda, setFactMoneda]   = useState<"COP" | "USD">("COP");
  const [trmHoyExiste, setTrmHoyExiste] = useState(true);
  const [factFecha, setFactFecha]     = useState("");
  const [factVenc, setFactVenc]       = useState("");
  const [factSaving, setFactSaving]   = useState(false);
  const [factError, setFactError]     = useState("");

  // Confirmación de lo cotizado
  const [conf, setConf] = useState<ConfResp | null>(null);
  // Buffer de edición: lo que el usuario está tocando antes de guardar.
  const [confEdit, setConfEdit] = useState<Record<string, { confirmado: boolean; base: string; venta: string; costo: string; nota: string }>>({});
  // Qué líneas tienen el campo de nota desplegado.
  const [notaAbierta, setNotaAbierta] = useState<Record<string, boolean>>({});

  // Mover cotización a otra operación (se aprobó sobre la carpeta equivocada)
  const [moverCot, setMoverCot]       = useState<{ id: string; numero: string } | null>(null);
  const [moverDestino, setMoverDestino] = useState("");   // "" = operación nueva
  const [moverMotivo, setMoverMotivo] = useState("");
  const [moverOps, setMoverOps]       = useState<{ id: string; numero: string; clientes: { nombre: string }[] }[]>([]);
  const [moverError, setMoverError]   = useState("");
  const [moverSaving, setMoverSaving] = useState(false);
  const [confSaving, setConfSaving] = useState(false);
  const [confError, setConfError]   = useState("");
  const [confOk, setConfOk]         = useState("");
  const [pesoMasivo, setPesoMasivo] = useState<Record<string, string>>({});
  // Con varias cotizaciones (co-loading) la lista es larga: arrancan colapsadas.
  const [cotAbiertas, setCotAbiertas] = useState<Record<string, boolean>>({});

  // Modales (solo Bitácora, Documentos y Manifiesto — HAWB y MAWB tienen página propia)
  const [manifiestoModal, setManifiestoModal] = useState(false);
  const [eventoModal, setEventoModal] = useState(false);
  const [documentoModal, setDocumentoModal] = useState(false);
  const [docEditar, setDocEditar] = useState<Documento | null>(null);

  const [eventoForm, setEventoForm] = useState({ tipo: "STATUS", descripcion: "", notificado_cliente: false, hawb_id: "" });
  const [docForm, setDocForm] = useState({ tipo: "FACTURA_COMERCIAL", nombre: "" });
  const [docEditForm, setDocEditForm] = useState<{ estado: string; fecha_recepcion: string; archivo: File | null }>({ estado: "RECIBIDO", fecha_recepcion: "", archivo: null });
  const [manifiestoForm, setManifiestoForm] = useState({ mawb_id: "", aerolinea_id: "", fecha: "" });

  interface ManifiestoLineaForm {
    hawb_id: string; hawb_numero: string; incluir: boolean;
    exportador_id: string; exportador_nombre: string;
    importador_id: string; importador_nombre: string;
    piezas: string; peso_kg: string; descripcion: string;
  }
  const [manifiestoLineas, setManifiestoLineas] = useState<ManifiestoLineaForm[]>([]);

  useEffect(() => { params.then(({ id }) => setResolvedId(id)); }, [params]);

  const cargarCarpeta = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const data = await apiFetch<Carpeta>(`/operaciones/operaciones/${resolvedId}/carpeta`);
      setCarpeta(data);
      setClienteNombre(data.clientes.map((c) => c.nombre).join(", "));
      // Resolver nombres de shipper/consignee de HAWBs y MAWBs
      const ids = new Set<string>();
      data.hawbs.forEach((h) => { ids.add(h.shipper_id); ids.add(h.consignee_id); });
      data.mawbs.forEach((m) => { if (m.consignee_id) ids.add(m.consignee_id); });
      const nombres: Record<string, string> = {};
      await Promise.all([...ids].map(async (id) => {
        try {
          const tercero = await apiFetch<Tercero>(`/terceros/${id}`);
          nombres[id] = tercero.razon_social;
        } catch {}
      }));
      setTerceroNombres(nombres);
      // Estado de facturación por cotización (para el resumen en las tarjetas).
      const est: Record<string, FactEstado> = {};
      await Promise.all(data.cotizaciones.map(async (c) => {
        try { est[c.id] = await apiFetch<FactEstado>(`/operaciones/cotizaciones/${c.id}/facturacion`); } catch {}
      }));
      setFactEstados(est);
    } catch { /* redirige a /login si sesión expiró */ }
  }, [resolvedId]);

  // El buffer arranca con lo confirmado (o lo cotizado si nunca se tocó).
  const semillaEdit = useCallback((data: ConfResp) => {
    const buf: Record<string, { confirmado: boolean; base: string; venta: string; costo: string; nota: string }> = {};
    data.cotizaciones.forEach((g) => g.lineas.forEach((l) => {
      buf[l.cotizacion_linea_id] = {
        confirmado: l.confirmado,
        base: l.base_confirmada,
        venta: l.valor_unitario_confirmado,
        costo: l.costo_unitario_confirmado,
        nota: l.notas_confirmacion ?? "",
      };
    }));
    setConfEdit(buf);
    // Deja abiertas las que ya traen nota, para que se vea sin tener que buscarla.
    setNotaAbierta(Object.fromEntries(
      data.cotizaciones.flatMap((g) => g.lineas)
        .filter((l) => (l.notas_confirmacion ?? "").trim() !== "")
        .map((l) => [l.cotizacion_linea_id, true]),
    ));
  }, []);

  const cargarConfirmacion = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const data = await apiFetch<ConfResp>(`/operaciones/operaciones/${resolvedId}/confirmacion`);
      setConf(data);
      semillaEdit(data);
      // Una sola cotización: abierta. Varias: colapsadas, salvo lo que el
      // usuario ya haya abierto en esta sesión.
      setCotAbiertas((prev) => {
        const abrir = data.cotizaciones.length <= 1;
        const next: Record<string, boolean> = {};
        data.cotizaciones.forEach((g) => { next[g.cotizacion_id] = prev[g.cotizacion_id] ?? abrir; });
        return next;
      });
    } catch { /* sesión */ }
  }, [resolvedId, semillaEdit]);

  useEffect(() => {
    if (!resolvedId) return;
    cargarCarpeta();
    apiFetch<Aerolinea[]>("/operaciones/aerolineas?solo_activas=true").then(setAerolineas).catch(() => {});
    apiFetch<Aeropuerto[]>("/operaciones/aeropuertos?solo_activos=true").then(setAeropuertos).catch(() => {});
  }, [resolvedId, cargarCarpeta]);

  useEffect(() => { cargarConfirmacion(); }, [cargarConfirmacion]);

  // El aviso de guardado se retira solo; el de error se queda hasta corregirlo.
  useEffect(() => {
    if (!confOk) return;
    const t = setTimeout(() => setConfOk(""), 4000);
    return () => clearTimeout(t);
  }, [confOk]);

  async function guardarConfirmacion() {
    if (!conf) return;
    setConfSaving(true); setConfError(""); setConfOk("");
    try {
      const lineas = conf.cotizaciones.flatMap((g) => g.lineas)
        .filter((l) => !l.bloqueada)
        .map((l) => {
          const e = confEdit[l.cotizacion_linea_id];
          return {
            cotizacion_linea_id: l.cotizacion_linea_id,
            confirmado: e?.confirmado ?? false,
            base_confirmada: e?.base || "0",
            valor_unitario_confirmado: e?.venta || "0",
            costo_unitario_confirmado: e?.costo || "0",
            notas: e?.nota ?? "",
          };
        });
      const data = await apiFetch<ConfResp>(`/operaciones/operaciones/${conf.operacion_id}/confirmacion`, {
        method: "PUT", body: JSON.stringify({ lineas }),
      });
      setConf(data); semillaEdit(data);
      setConfOk(`Cambios guardados · ${data.lineas_confirmadas} de ${data.total_lineas} conceptos confirmados`);
      await cargarCarpeta();   // el estado de facturación de las tarjetas cambia
    } catch (e) {
      setConfError(e instanceof Error ? e.message : "No se pudo guardar la confirmación");
    } finally { setConfSaving(false); }
  }

  async function aplicarPesoMasivo(cotizacionId: string) {
    const peso = pesoMasivo[cotizacionId];
    if (!conf || !peso || parseFloat(peso) <= 0) return;
    setConfSaving(true); setConfError(""); setConfOk("");
    try {
      const data = await apiFetch<ConfResp>(`/operaciones/operaciones/${conf.operacion_id}/confirmacion/aplicar-peso`, {
        method: "POST", body: JSON.stringify({ cotizacion_id: cotizacionId, peso_kg: peso }),
      });
      setConf(data); semillaEdit(data);
      setPesoMasivo((p) => ({ ...p, [cotizacionId]: "" }));
      setConfOk(`Peso aplicado a las líneas POR_KG · ${peso} kg`);
    } catch (e) {
      setConfError(e instanceof Error ? e.message : "No se pudo aplicar el peso");
    } finally { setConfSaving(false); }
  }

  async function abrirMover(cotId: string, cotNumero: string) {
    setMoverCot({ id: cotId, numero: cotNumero });
    setMoverDestino(""); setMoverMotivo(""); setMoverError("");
    try {
      const ops = await apiFetch<{ id: string; numero: string; clientes: { nombre: string }[] }[]>(
        "/operaciones/operaciones?estado=ABIERTA");
      setMoverOps(ops.filter((o) => o.id !== resolvedId));
    } catch { setMoverOps([]); }
  }

  async function confirmarMover() {
    if (!moverCot || !moverMotivo.trim()) return;
    setMoverSaving(true); setMoverError("");
    try {
      const destino = await apiFetch<{ numero: string }>(
        `/operaciones/cotizaciones/${moverCot.id}/mover`,
        { method: "POST", body: JSON.stringify({ operacion_id: moverDestino || null, motivo: moverMotivo.trim() }) },
      );
      setMoverCot(null);
      await cargarCarpeta();
      await cargarConfirmacion();
      setConfOk(`${moverCot.numero} se movió a ${destino.numero}`);
    } catch (e) {
      setMoverError(e instanceof Error ? e.message : "No se pudo mover la cotización");
    } finally { setMoverSaving(false); }
  }

  async function cambiarEstadoOp(nuevoEstado: string) {
    if (!carpeta) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}`, {
        method: "PUT", body: JSON.stringify({ estado: nuevoEstado }),
      });
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function emitirManifiesto(manifiestoId: string) {
    if (!carpeta) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/manifiestos/${manifiestoId}/emitir`, { method: "POST" });
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function anularManifiesto(manifiestoId: string, motivo: string) {
    if (!carpeta) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/manifiestos/${manifiestoId}/anular`, {
        method: "POST", body: JSON.stringify({ motivo }),
      });
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function abrirFacturar(cotId: string, cotNum: string) {
    setFactError(""); setFactCotId(cotId); setFactCotNum(cotNum);
    const hoy = new Date().toISOString().slice(0, 10);
    const venc = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setFactFecha(hoy); setFactVenc(venc); setFactMoneda("COP");
    apiFetch<{ existe: boolean }>("/trm/hoy").then((d) => setTrmHoyExiste(!!d?.existe)).catch(() => setTrmHoyExiste(true));
    try {
      const data = await apiFetch<{ lineas: FactLinea[] }>(`/operaciones/cotizaciones/${cotId}/facturacion`);
      setFactLineas(data.lineas);
      const sel: Record<string, { incluir: boolean; monto: string }> = {};
      data.lineas.forEach((l) => {
        const pend = parseFloat(l.pendiente);
        sel[l.linea_id] = { incluir: pend > 0, monto: pend > 0 ? l.pendiente : "0" };
      });
      setFactSel(sel);
    } catch (e) { setFactError(e instanceof Error ? e.message : "Error"); setFactLineas([]); }
  }

  async function generarFactura() {
    if (!factCotId) return;
    const lineas = factLineas
      .filter((l) => factSel[l.linea_id]?.incluir && parseFloat(factSel[l.linea_id]?.monto || "0") > 0)
      .map((l) => ({ cotizacion_linea_id: l.linea_id, monto: parseFloat(factSel[l.linea_id].monto) }));
    if (lineas.length === 0) { setFactError("Selecciona al menos una línea con monto"); return; }
    setFactSaving(true); setFactError("");
    try {
      const fac = await apiFetch<{ id: string }>(`/facturacion/facturas/desde-cotizacion/${factCotId}`, {
        method: "POST",
        body: JSON.stringify({ moneda: factMoneda, fecha: factFecha, fecha_vencimiento: factVenc, lineas }),
      });
      setFactCotId(null);
      window.open(`/dashboard/facturacion/facturas?factura=${fac.id}`, "_blank");
      await cargarCarpeta();
    } catch (e) { setFactError(e instanceof Error ? e.message : "Error al facturar"); }
    finally { setFactSaving(false); }
  }

  async function abrirManifiestoModal() {
    if (!carpeta) return;
    const fecha = new Date().toISOString().slice(0, 10);
    setManifiestoForm({ mawb_id: "", aerolinea_id: "", fecha });
    // Pre-poblar líneas con todos los HAWBs; resolver nombres de shipper/consignee
    const lineas: ManifiestoLineaForm[] = await Promise.all(
      carpeta.hawbs.map(async (h) => {
        let expNombre = "", impNombre = "";
        try {
          const [exp, imp] = await Promise.all([
            apiFetch<Tercero>(`/terceros/${h.shipper_id}`),
            apiFetch<Tercero>(`/terceros/${h.consignee_id}`),
          ]);
          expNombre = exp.razon_social;
          impNombre = imp.razon_social;
        } catch {}
        return {
          hawb_id: h.id, hawb_numero: h.numero_hawb, incluir: true,
          exportador_id: h.shipper_id, exportador_nombre: expNombre,
          importador_id: h.consignee_id, importador_nombre: impNombre,
          piezas: h.piezas?.toString() ?? "",
          peso_kg: h.peso_cargable_kg?.toString() ?? "",
          descripcion: h.descripcion_mercancia ?? "",
        };
      })
    );
    setManifiestoLineas(lineas);
    setManifiestoModal(true);
  }

  async function guardarManifiesto() {
    if (!carpeta || !manifiestoForm.mawb_id || !manifiestoForm.fecha) return;
    const lineasIncluidas = manifiestoLineas.filter((l) => l.incluir && l.exportador_id && l.importador_id);
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/manifiestos`, {
        method: "POST",
        body: JSON.stringify({
          mawb_id: manifiestoForm.mawb_id,
          aerolinea_id: manifiestoForm.aerolinea_id || null,
          fecha: manifiestoForm.fecha,
          lineas: lineasIncluidas.map((l) => ({
            hawb_id: l.hawb_id,
            exportador_id: l.exportador_id,
            importador_id: l.importador_id,
            piezas: l.piezas ? parseInt(l.piezas) : null,
            peso_kg: l.peso_kg ? parseFloat(l.peso_kg) : null,
            descripcion: l.descripcion || null,
          })),
        }),
      });
      setManifiestoModal(false);
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar manifiesto"); }
    finally { setSaving(false); }
  }

  async function guardarEvento() {
    if (!carpeta || !eventoForm.descripcion.trim()) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/eventos`, {
        method: "POST", body: JSON.stringify({ ...eventoForm, hawb_id: eventoForm.hawb_id || null }),
      });
      setEventoModal(false);
      setEventoForm({ tipo: "STATUS", descripcion: "", notificado_cliente: false, hawb_id: "" });
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar evento"); }
    finally { setSaving(false); }
  }

  async function guardarDocumento() {
    if (!carpeta || !docForm.nombre.trim()) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/documentos`, {
        method: "POST", body: JSON.stringify(docForm),
      });
      setDocumentoModal(false);
      setDocForm({ tipo: "FACTURA_COMERCIAL", nombre: "" });
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar documento"); }
    finally { setSaving(false); }
  }

  async function actualizarDocumento() {
    if (!carpeta || !docEditar) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/documentos/${docEditar.id}`, {
        method: "PUT",
        body: JSON.stringify({
          estado: docEditForm.estado,
          fecha_recepcion: docEditForm.fecha_recepcion || null,
        }),
      });
      if (docEditForm.archivo) {
        const form = new FormData();
        form.append("archivo", docEditForm.archivo);
        const token = localStorage.getItem("access_token");
        await fetch(`http://localhost:8001/operaciones/operaciones/${carpeta.operacion.id}/documentos/${docEditar.id}/archivo`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      }
      setDocEditar(null);
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar documento"); }
    finally { setSaving(false); }
  }

  async function descargarArchivo(documentoId: string) {
    if (!carpeta) return;
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `http://localhost:8001/operaciones/operaciones/${carpeta.operacion.id}/documentos/${documentoId}/archivo`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function buscarTerceros(q: string) {
    const data = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(q)}`);
    return data.map((t) => ({ id: t.id, label: `${t.nit} — ${t.razon_social}` }));
  }

  if (!carpeta) {
    return <div className="p-8 text-[12px] text-gray-400">Cargando...</div>;
  }

  const { operacion, cotizaciones, clientes, hawbs, mawbs, manifiestos, eventos, documentos } = carpeta;
  const cotizacion = cotizaciones[0];

  // Operación cerrada o cancelada: no admite nuevos MAWB / HAWB / Manifiesto.
  const opBloqueada = operacion.estado === "CERRADA" || operacion.estado === "CANCELADA";
  const msgBloqueada = operacion.estado === "CANCELADA" ? "La operación está cancelada" : "La operación está cerrada";

  // Cierre: no se puede cerrar con MAWB/HAWB/manifiesto en borrador (deben estar emitidos o anulados).
  const mawbBorr = mawbs.filter((m) => m.estado === "BORRADOR").length;
  const hawbBorr = hawbs.filter((h) => h.estado === "BORRADOR").length;
  const manifBorr = manifiestos.filter((m) => m.estado === "BORRADOR").length;
  // Y tampoco con conceptos no opcionales sin confirmar: lo no confirmado no es
  // facturable, y una operación cerrada ya no se toca.
  const sinConfirmar = (conf?.cotizaciones ?? [])
    .flatMap((g) => g.lineas)
    .filter((l) => !l.opcional && !l.confirmado).length;
  const puedeCerrar = mawbBorr === 0 && hawbBorr === 0 && manifBorr === 0 && sinConfirmar === 0;

  const aerolineaNombre = (id: string | null) => {
    const a = aerolineas.find((x) => x.id === id);
    return a ? `${a.codigo_iata} — ${a.nombre}` : "—";
  };
  const aeropuertoNombre = (id: string | null) => {
    const a = aeropuertos.find((x) => x.id === id);
    return a ? `${a.codigo_iata} — ${a.ciudad}` : "—";
  };

  const TABS = [
    { key: "datos",        label: "Datos",        count: null },
    // El contador muestra lo que traba el cierre: los opcionales no cuentan.
    { key: "confirmacion", label: "Confirmación", count: conf ? sinConfirmar : null },
    { key: "mawb",        label: "MAWB",        count: mawbs.length },
    { key: "hawb",        label: "HAWB",        count: hawbs.length },
    { key: "manifiesto",  label: "Manifiesto",  count: manifiestos.length },
    { key: "bitacora",    label: "Bitácora",    count: eventos.length },
    { key: "documentos",  label: "Documentos",  count: documentos.length },
  ] as const;

  return (
    <div className="max-w-[1600px] space-y-4">

      {/* ── Encabezado ────────────────────────────────────────────────── */}
      <div>
        <button onClick={() => router.push("/dashboard/operaciones/operaciones")}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-1 transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Operaciones
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[16px] font-bold text-gray-800">{title}</h1>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${ESTADO_OP[operacion.estado] ?? "bg-gray-100 text-gray-500"}`}>
                {operacion.estado}
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {clienteNombre}{cotizacion ? ` · ${cotizacion.origen} → ${cotizacion.destino} · ${cotizacion.tipo_operacion}` : ""}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Apertura: {operacion.fecha_apertura} · {cotizaciones.length} cotización(es) · {clientes.length} cliente(s)
            </p>
          </div>
          <div className="flex gap-2">
            {operacion.estado === "ABIERTA" && (
              <button onClick={() => cambiarEstadoOp("EN_CURSO")} disabled={saving}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                Iniciar operación
              </button>
            )}
            {operacion.estado === "EN_CURSO" && (
              <button onClick={() => setConfirmarCerrar(true)} disabled={saving}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                Cerrar operación
              </button>
            )}
            {(operacion.estado === "ABIERTA" || operacion.estado === "EN_CURSO") && (
              <button onClick={() => setConfirmarCancelar(true)} disabled={saving}
                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-[12px] font-medium rounded-lg">
                Cancelar operación
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{error}</div>}

      {factCotId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-1">Facturar cotización {factCotNum}</h2>
            <p className="text-[11px] text-gray-400 mb-3">Selecciona las líneas y el monto a facturar (en la moneda de cada línea). Se genera una factura de venta en borrador.</p>
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Moneda factura</label>
                <select value={factMoneda} onChange={(e) => setFactMoneda(e.target.value as "COP" | "USD")}
                  className="h-[34px] px-2.5 border border-gray-200 rounded-md text-[12px] bg-white">
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Fecha</label>
                <input type="date" value={factFecha} onChange={(e) => setFactFecha(e.target.value)} className="h-[34px] px-2.5 border border-gray-200 rounded-md text-[12px]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Vencimiento</label>
                <input type="date" value={factVenc} onChange={(e) => setFactVenc(e.target.value)} className="h-[34px] px-2.5 border border-gray-200 rounded-md text-[12px]" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
              {factLineas.length === 0 ? (
                <p className="text-[12px] text-gray-400 text-center py-6">Esta cotización no tiene conceptos.</p>
              ) : (
                <table className="w-full text-[11px] table-fixed">
                  <colgroup>
                    <col style={{ width: "32px" }} />
                    <col />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "170px" }} />
                  </colgroup>
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-[9px] uppercase text-gray-500">
                      <th className="px-2 py-1.5">
                        <input type="checkbox" title="Marcar/desmarcar todo lo facturable"
                          checked={factLineas.some((l) => parseFloat(l.pendiente) > 0) && factLineas.filter((l) => parseFloat(l.pendiente) > 0).every((l) => factSel[l.linea_id]?.incluir)}
                          onChange={(e) => { const v = e.target.checked; setFactSel((p) => { const n = { ...p }; factLineas.forEach((l) => { if (parseFloat(l.pendiente) > 0) n[l.linea_id] = { ...n[l.linea_id], incluir: v }; }); return n; }); }}
                          className="accent-blue-600" />
                      </th>
                      <th className="px-2 py-1.5">Concepto</th>
                      <th className="px-2 py-1.5 text-right">Facturado</th>
                      <th className="px-2 py-1.5 text-right">Pendiente</th>
                      <th className="px-2 py-1.5 text-right">Monto a facturar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factLineas.map((l) => {
                      const pend = parseFloat(l.pendiente);
                      const fact = parseFloat(l.facturado);
                      const bloqueada = pend <= 0.0001;
                      return (
                      <tr key={l.linea_id} className={`border-t border-gray-50 ${bloqueada ? "bg-gray-50/60" : ""}`}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" disabled={bloqueada} checked={factSel[l.linea_id]?.incluir ?? false}
                            onChange={(e) => setFactSel((p) => ({ ...p, [l.linea_id]: { ...p[l.linea_id], incluir: e.target.checked } }))}
                            className="accent-blue-600 disabled:opacity-40" />
                        </td>
                        <td className="px-2 py-1.5 text-gray-700 truncate">
                          {l.descripcion}
                          {bloqueada && <span className="ml-2 text-[9px] text-gray-400 uppercase">facturado</span>}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-emerald-700 whitespace-nowrap">{fact > 0 ? `${l.moneda} ${fact.toLocaleString("es-CO", { minimumFractionDigits: 2 })}` : "—"}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-gray-500 whitespace-nowrap">{l.moneda} {(pend > 0 ? pend : 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1.5 text-right">
                          {bloqueada
                            ? <span className="text-[11px] text-gray-300">—</span>
                            : <MontoInput value={factSel[l.linea_id]?.monto ?? ""} decimales={2}
                                onChange={(v) => setFactSel((p) => ({ ...p, [l.linea_id]: { ...p[l.linea_id], monto: v } }))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-right" />
                          }
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {factMoneda === "USD" && !trmHoyExiste && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p className="text-[11px] text-amber-700">
                  No hay TRM registrada para hoy. No es posible facturar en USD hasta que el administrador la registre; puedes facturar en COP o volver más tarde.
                </p>
              </div>
            )}
            {factError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mt-3">{factError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFactCotId(null)} disabled={factSaving}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={generarFactura} disabled={factSaving || factLineas.length === 0 || (factMoneda === "USD" && !trmHoyExiste)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {factSaving ? "Generando..." : "Generar factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emitirManifId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Emitir manifiesto</h2>
            <p className="text-[12px] text-gray-500 mb-4">
              ¿Confirmas la emisión de este manifiesto? Quedará registrado tu usuario y la fecha. Una vez emitido no se puede editar.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEmitirManifId(null)} disabled={saving}
                className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={async () => { await emitirManifiesto(emitirManifId); setEmitirManifId(null); }} disabled={saving}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Emitiendo..." : "Emitir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {anularManifId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Anular manifiesto</h2>
            <p className="text-[12px] text-gray-500 mb-3">
              Indica el motivo de la anulación. Quedará en solo lectura; si necesitas corregir, crea uno nuevo.
            </p>
            <textarea value={motivoManif} onChange={(e) => setMotivoManif(e.target.value)} rows={3} placeholder="Motivo…"
              className="w-full border border-gray-200 rounded-lg text-[12px] p-2 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAnularManifId(null)} disabled={saving}
                className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                No, volver
              </button>
              <button
                onClick={async () => { if (!motivoManif.trim()) { setError("Indica el motivo de anulación"); return; } await anularManifiesto(anularManifId, motivoManif); setAnularManifId(null); }}
                disabled={saving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Anulando..." : "Sí, anular"}
              </button>
            </div>
          </div>
        </div>
      )}

      {moverCot && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-1">Mover cotización</h2>
            <p className="text-[12px] text-gray-500 mb-4">
              <strong className="font-mono text-blue-700">{moverCot.numero}</strong> sale de {operacion.numero}.
              No se puede mover si ya tiene confirmación, guía emitida o facturas.
            </p>

            {moverError && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{moverError}</p>
            )}

            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Destino</label>
            <div className="space-y-1.5 mb-4 max-h-56 overflow-y-auto">
              <button onClick={() => setMoverDestino("")}
                className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                  moverDestino === "" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50"
                }`}>
                <span className="font-semibold">Operación nueva</span>
                <span className="block text-[10px] text-gray-400">Se abre una carpeta solo con esta cotización</span>
              </button>
              {moverOps.map((o) => (
                <button key={o.id} onClick={() => setMoverDestino(o.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                    moverDestino === o.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  <span className="font-mono font-semibold">{o.numero}</span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {o.clientes.map((c) => c.nombre).join(", ") || "Sin clientes"}
                  </span>
                </button>
              ))}
              {moverOps.length === 0 && (
                <p className="text-[11px] text-gray-400 px-1 py-1">No hay otras operaciones abiertas.</p>
              )}
            </div>

            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Motivo *</label>
            <input value={moverMotivo} onChange={(e) => setMoverMotivo(e.target.value)}
              placeholder="Ej: se aprobó sobre la operación equivocada"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] mb-4" />

            <div className="flex justify-end gap-2">
              <button onClick={() => setMoverCot(null)} disabled={moverSaving}
                className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmarMover} disabled={moverSaving || !moverMotivo.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {moverSaving ? "Moviendo..." : "Mover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarCerrar && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Cerrar operación</h2>
            {puedeCerrar ? (
              <p className="text-[12px] text-gray-500 mb-3">
                ¿Confirmas cerrar la operación <strong>{operacion.numero}</strong>? Se dará por finalizada.
              </p>
            ) : (
              <div className="space-y-2 mb-3">
                {(mawbBorr > 0 || hawbBorr > 0 || manifBorr > 0) && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                    Hay {[mawbBorr && `${mawbBorr} MAWB`, hawbBorr && `${hawbBorr} HAWB`, manifBorr && `${manifBorr} manifiesto(s)`].filter(Boolean).join(" y ")} en borrador.
                    Deben estar emitidos o anulados antes de cerrar.
                  </p>
                )}
                {sinConfirmar > 0 && (
                  <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                    Hay <strong>{sinConfirmar} concepto(s) sin confirmar</strong>. Sin confirmar no se pueden facturar,
                    y una operación cerrada ya no se modifica.
                    <button onClick={() => { setConfirmarCerrar(false); setTab("confirmacion"); }}
                      className="block mt-1 text-blue-600 hover:text-blue-700 font-semibold underline">
                      Ir a Confirmación
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarCerrar(false)} disabled={saving}
                className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                {puedeCerrar ? "No, volver" : "Entendido"}
              </button>
              {puedeCerrar && (
                <button onClick={async () => { await cambiarEstadoOp("CERRADA"); setConfirmarCerrar(false); }} disabled={saving}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                  {saving ? "Cerrando..." : "Sí, cerrar operación"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmarCancelar && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Cancelar operación</h2>
            <p className="text-[12px] text-gray-500 mb-3">
              ¿Confirmas cancelar la operación <strong>{operacion.numero}</strong>?
            </p>
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-4">
              La operación quedará cancelada y se revierten sus efectos. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarCancelar(false)} disabled={saving}
                className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                No, volver
              </button>
              <button onClick={async () => { await cambiarEstadoOp("CANCELADA"); setConfirmarCancelar(false); }} disabled={saving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Cancelando..." : "Sí, cancelar operación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {label}
            {count !== null && count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                tab === key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Datos ────────────────────────────────────────────────── */}
      {tab === "datos" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Cotizaciones / clientes ({cotizaciones.length})
            </p>
            {cotizaciones.map((cot) => (
              <div key={cot.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-gray-800">
                    {clientes.find((c) => c.id === cot.cliente_id)?.nombre ?? "Cliente"}
                  </span>
                  <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{cot.numero}</span>
                </div>
                {([
                  ["Ruta", `${cot.origen} → ${cot.destino}`],
                  ["Tipo / Incoterm", `${cot.tipo_operacion} · ${cot.incoterm ?? "—"}`],
                  ["Piezas / Peso", `${cot.piezas ?? "—"} · ${cot.peso_kg ? `${fmt(cot.peso_kg, 2)} kg` : "—"}`],
                  ["Valor mercancía", cot.valor_mercancia ? `${cot.moneda_mercancia} ${fmt(cot.valor_mercancia)}` : "—"],
                  ["TRM", cot.trm ? fmt(cot.trm, 2) : "—"],
                  ["Vigencia", cot.fecha_vigencia],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[12px]">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-gray-800 font-medium text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
                {cot.notas && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 whitespace-pre-line">{cot.notas}</p>
                )}
                {factEstados[cot.id] && (() => {
                  const fe = factEstados[cot.id];
                  const sumar = (campo: "facturado" | "pendiente") => {
                    const m: Record<string, number> = {};
                    fe.lineas.forEach((l) => { const v = parseFloat(l[campo] || "0"); if (v > 0) m[l.moneda] = (m[l.moneda] || 0) + v; });
                    return Object.entries(m).map(([mon, v]) => `${mon} ${v.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`).join(" · ");
                  };
                  const facturado = sumar("facturado"); const pendiente = sumar("pendiente");
                  const est = fe.estado_facturacion;
                  const style = est === "facturada" ? "bg-green-50 text-green-700"
                    : est === "parcial" ? "bg-amber-50 text-amber-700"
                    : est === "sin_confirmar" ? "bg-purple-50 text-purple-700"
                    : "bg-gray-100 text-gray-500";
                  return (
                    <div className="border-t border-gray-100 pt-2 mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Facturación</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${style}`}>{est.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between text-[11px]"><span className="text-gray-400">Facturado</span><span className="font-mono text-emerald-700">{facturado || "—"}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-gray-400">Pendiente</span><span className="font-mono text-gray-700">{pendiente || "—"}</span></div>
                      {est === "sin_confirmar" && (
                        <p className="text-[10px] text-purple-600 leading-snug">
                          Operación no ha confirmado conceptos. Sin confirmación no se puede facturar.
                        </p>
                      )}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => window.open(`/dashboard/operaciones/cotizaciones/${cot.id}`, "_blank")}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                    Ver cotización ↗
                  </button>
                  {factEstados[cot.id]?.estado_facturacion === "sin_confirmar" ? (
                    <button onClick={() => setTab("confirmacion")}
                      className="text-[11px] text-purple-700 hover:text-purple-800 font-semibold border border-purple-200 bg-purple-50 rounded-md px-2 py-0.5">
                      Confirmar
                    </button>
                  ) : (
                    <button onClick={() => abrirFacturar(cot.id, cot.numero)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold border border-emerald-200 bg-emerald-50 rounded-md px-2 py-0.5">
                      Facturar
                    </button>
                  )}
                  {!opBloqueada && cotizaciones.length > 1 && (
                    <button onClick={() => abrirMover(cot.id, cot.numero)}
                      title="Se aprobó sobre la operación equivocada"
                      className="ml-auto text-[11px] text-gray-500 hover:text-blue-600 font-medium">
                      Mover ↗
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Datos de la operación</p>
              {([
                ["Número operación", operacion.numero],
                ["Estado", operacion.estado],
                ["Fecha apertura", operacion.fecha_apertura],
                ["Aerolínea", aerolineaNombre(operacion.aerolinea_id)],
                ["Aeropuerto origen", aeropuertoNombre(mawbs[0]?.aeropuerto_origen_id ?? null)],
                ["Aeropuerto destino", aeropuertoNombre(mawbs[0]?.aeropuerto_destino_id ?? null)],
                ["Piezas", (operacion.piezas_total ?? operacion.piezas)?.toString() ?? "—"],
                ["Peso kg", (operacion.peso_kg_total ?? operacion.peso_kg) ? fmt(operacion.peso_kg_total ?? operacion.peso_kg, 2) : "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12px]">
                  <span className="text-gray-400">{k}</span>
                  <span className={k === "Número operación" ? "text-blue-700 font-semibold" : "text-gray-800 font-medium"}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Confirmación ─────────────────────────────────────────── */}
      {tab === "confirmacion" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[11px] text-gray-500 max-w-2xl">
              Operación confirma lo que realmente se ejecutó. Solo lo confirmado se puede facturar.
              Los valores llegan precargados con lo cotizado; ajústalos si cambiaron.
              Una línea con facturación queda bloqueada.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {conf && conf.cotizaciones.length > 1 && (() => {
                const todasAbiertas = conf.cotizaciones.every((g) => cotAbiertas[g.cotizacion_id]);
                return (
                  <button type="button"
                    onClick={() => setCotAbiertas(Object.fromEntries(
                      conf.cotizaciones.map((g) => [g.cotizacion_id, !todasAbiertas]),
                    ))}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
                    {todasAbiertas ? "Contraer todo" : "Expandir todo"}
                  </button>
                );
              })()}
              <button onClick={guardarConfirmacion} disabled={confSaving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg disabled:opacity-50">
                {confSaving ? "Guardando…" : "Guardar confirmación"}
              </button>
            </div>
          </div>

          {confError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{confError}</div>
          )}

          {confOk && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {confOk}
            </div>
          )}

          {conf && conf.cotizaciones.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-[12px] text-gray-400">
              Esta operación no tiene cotizaciones asociadas.
            </div>
          )}

          {conf?.cotizaciones.map((g) => {
            const porSeccion: Record<string, ConfLinea[]> = {};
            g.lineas.forEach((l) => { (porSeccion[l.seccion] ??= []).push(l); });
            const hayPorKg = g.lineas.some((l) => l.tipo_calculo === "POR_KG" && !l.bloqueada);
            const abierta = cotAbiertas[g.cotizacion_id] ?? false;
            const pendientes = g.lineas.filter((l) => !(confEdit[l.cotizacion_linea_id]?.confirmado ?? l.confirmado)).length;
            return (
              <div key={g.cotizacion_id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Encabezado de la cotización */}
                <div className={`flex flex-wrap items-center gap-3 px-4 py-2.5 bg-gray-50 ${abierta ? "border-b border-gray-200" : ""}`}>
                  <button type="button"
                    onClick={() => setCotAbiertas((p) => ({ ...p, [g.cotizacion_id]: !abierta }))}
                    className="flex items-center gap-2 text-left hover:opacity-70 transition-opacity">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      className="text-gray-400 shrink-0"
                      style={{ transform: abierta ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    <span className="text-[12px] font-bold text-gray-800">{g.numero}</span>
                    <span className="text-[11px] text-gray-500">{g.cliente_nombre}</span>
                  </button>
                  {g.peso_kg && <span className="text-[10px] text-gray-400">Cotizado {fmt(g.peso_kg)} kg</span>}
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                    pendientes === 0 ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700"
                  }`}>
                    {pendientes === 0 ? `${g.lineas.length} confirmadas` : `${pendientes} sin confirmar`}
                  </span>
                  <div className="flex-1" />
                  {abierta && hayPorKg && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Peso real</label>
                      <MontoInput value={pesoMasivo[g.cotizacion_id] ?? ""} decimales={2}
                        onChange={(v) => setPesoMasivo((p) => ({ ...p, [g.cotizacion_id]: v }))}
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-[11px] text-right font-mono" />
                      <button onClick={() => aplicarPesoMasivo(g.cotizacion_id)} disabled={confSaving}
                        className="px-2.5 py-1 text-[11px] text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50">
                        Aplicar a POR_KG
                      </button>
                    </div>
                  )}
                </div>

                {/* Encabezado — dos bloques espejo: cotizado (fijo) | confirmado (editable) */}
                {abierta && (
                <>
                  <div className="flex items-end gap-2 px-4 pt-2 text-[9px] font-bold uppercase tracking-widest">
                    <div className="w-8 shrink-0" />
                    <div className="flex-1 min-w-0" />
                    <div className="w-[356px] shrink-0 text-center text-gray-400 pr-3">Cotizado</div>
                    <div className="w-[464px] shrink-0 text-center text-blue-600 pl-3 border-l border-gray-200">Confirmado por operaciones</div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-100 text-[9px] font-bold uppercase tracking-wider text-gray-300">
                    <div className="w-8 shrink-0 text-center">OK</div>
                    <div className="flex-1 min-w-0">Concepto</div>
                    <div className="w-[356px] shrink-0 flex items-center gap-2 pr-3">
                      <div className="w-16 text-right">Base</div>
                      <div className="w-20 text-right">Venta</div>
                      <div className="w-20 text-right">Costo</div>
                      <div className="w-24 text-right">Total</div>
                    </div>
                    <div className="w-[464px] shrink-0 flex items-center gap-2 pl-3 border-l border-gray-200">
                      <div className="w-20 text-right">Base</div>
                      <div className="w-24 text-right">Venta</div>
                      <div className="w-24 text-right">Costo</div>
                      <div className="w-28 text-right">Total</div>
                      <div className="w-9 text-center">Nota</div>
                    </div>
                  </div>
                </>
                )}

                {abierta && Object.entries(porSeccion)
                  .sort(([a], [b]) => ordenSeccion(a) - ordenSeccion(b))
                  .map(([seccion, filas]) => (
                  <div key={seccion}>
                    <div className="px-4 py-1.5 bg-gray-50/60 border-b border-gray-100">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                        {SECCION_LABEL[seccion] ?? seccion}
                      </span>
                    </div>
                    {filas.map((l) => {
                      const e = confEdit[l.cotizacion_linea_id];
                      const cambiado = parseFloat(l.total_venta_confirmado) !== parseFloat(l.total_venta_cotizado);
                      const tieneNota = (e?.nota ?? "").trim() !== "";
                      const set = (campo: "base" | "venta" | "costo" | "nota", v: string) =>
                        setConfEdit((p) => ({ ...p, [l.cotizacion_linea_id]: { ...p[l.cotizacion_linea_id], [campo]: v } }));
                      const alternarConfirmado = () => {
                        if (l.bloqueada) return;
                        setConfEdit((p) => ({
                          ...p,
                          [l.cotizacion_linea_id]: { ...p[l.cotizacion_linea_id], confirmado: !p[l.cotizacion_linea_id]?.confirmado },
                        }));
                      };
                      return (
                        <div key={l.cotizacion_linea_id}>
                        <div
                          className={`flex items-center gap-2 px-4 py-2 border-b border-gray-50 ${l.bloqueada ? "bg-gray-50/70" : "hover:bg-blue-50/20"}`}>
                          <div className="w-8 shrink-0 flex justify-center">
                            <input type="checkbox" checked={e?.confirmado ?? false} disabled={l.bloqueada}
                              onChange={alternarConfirmado}
                              className="rounded border-gray-300 text-blue-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed" />
                          </div>
                          {/* Hacer clic en el concepto marca/desmarca — el check solo es muy pequeño */}
                          <div className="flex-1 min-w-0 select-none"
                            onClick={alternarConfirmado}
                            title={l.bloqueada ? "Línea facturada: no se puede desconfirmar" : "Clic para confirmar o desconfirmar"}
                            style={{ cursor: l.bloqueada ? "not-allowed" : "pointer" }}>
                            <p className={`text-[12px] truncate ${l.opcional ? "text-gray-500 italic" : "text-gray-800"}`}>
                              {l.descripcion}
                              {l.opcional && (
                                <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded not-italic">Opcional</span>
                              )}
                              {l.valor_tercero && (
                                <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded not-italic">Tercero</span>
                              )}
                              {l.bloqueada && (
                                <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded not-italic">Facturada</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {l.tipo_calculo}
                              {l.confirmado_por_nombre && ` · confirmó ${l.confirmado_por_nombre}`}
                            </p>
                          </div>
                          {/* Cotizado — solo lectura, es el documento comercial */}
                          <div className="w-[356px] shrink-0 flex items-center gap-2 pr-3 text-[11px] font-mono text-gray-400">
                            <span className="w-16 text-right">{l.tipo_calculo === "POR_KG" ? fmt(l.base_cotizada) : "—"}</span>
                            <span className="w-20 text-right">{fmt(l.valor_unitario_cotizado)}</span>
                            <span className="w-20 text-right">{fmt(l.costo_unitario_cotizado)}</span>
                            <span className="w-24 text-right text-gray-500">{fmt(l.total_venta_cotizado)}</span>
                          </div>
                          {/* Confirmado — editable */}
                          <div className="w-[464px] shrink-0 flex items-center gap-2 pl-3 border-l border-gray-200">
                            <div className="w-20">
                              <MontoInput value={e?.base ?? ""} decimales={2} disabled={l.bloqueada || l.tipo_calculo !== "POR_KG"}
                                onChange={(v) => set("base", v)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-right font-mono disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-100" />
                            </div>
                            <div className="w-24">
                              <MontoInput value={e?.venta ?? ""} decimales={2} disabled={l.bloqueada}
                                onChange={(v) => set("venta", v)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-right font-mono disabled:bg-gray-50 disabled:text-gray-400" />
                            </div>
                            <div className="w-24">
                              <MontoInput value={e?.costo ?? ""} decimales={2} disabled={l.bloqueada}
                                onChange={(v) => set("costo", v)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-right font-mono disabled:bg-gray-50 disabled:text-gray-400" />
                            </div>
                            <div className="w-28 text-right">
                              <span className={`text-[12px] font-mono font-semibold ${cambiado ? "text-amber-600" : "text-gray-800"}`}>
                                {fmt(l.total_venta_confirmado)}
                              </span>
                              <span className="ml-1 text-[9px] font-bold text-blue-500">{l.moneda}</span>
                            </div>
                            {/* Motivo del cambio */}
                            <div className="w-9 flex justify-center">
                              <button type="button" disabled={l.bloqueada && !tieneNota}
                                onClick={() => setNotaAbierta((p) => ({ ...p, [l.cotizacion_linea_id]: !p[l.cotizacion_linea_id] }))}
                                title={tieneNota ? "Ver o editar el motivo" : "Anotar el motivo del cambio"}
                                className={`p-1.5 rounded-md border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                  tieneNota
                                    ? "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100"
                                    : cambiado
                                      ? "bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100"
                                      : "bg-white border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300"
                                }`}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                  <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Motivo del cambio — queda con la línea, para saber después
                            por qué lo ejecutado no coincide con lo cotizado. */}
                        {notaAbierta[l.cotizacion_linea_id] && (
                          <div className="flex items-start gap-2 px-4 pb-2 -mt-1 border-b border-gray-50 bg-blue-50/20">
                            <div className="w-8 shrink-0" />
                            <div className="flex-1 min-w-0" />
                            <div className="w-[356px] shrink-0 pr-3" />
                            <div className="w-[464px] shrink-0 pl-3 border-l border-gray-200">
                              <input
                                value={e?.nota ?? ""}
                                onChange={(ev) => set("nota", ev.target.value)}
                                disabled={l.bloqueada}
                                placeholder="Motivo del cambio — ej: el proveedor cobró sobrepeso"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] text-gray-700 placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400" />
                            </div>
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: HAWB ─────────────────────────────────────────────────── */}
      {tab === "hawb" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {mawbs.length === 0 && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                Debes registrar primero un MAWB antes de crear HAWBs
              </p>
            )}
            <div className="ml-auto">
              <button
                onClick={() => router.push(`/dashboard/operaciones/operaciones/${operacion.id}/hawb/nuevo`)}
                disabled={mawbs.length === 0 || opBloqueada}
                title={opBloqueada ? msgBloqueada : mawbs.length === 0 ? "Registra primero un MAWB" : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded-lg">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Nuevo HAWB
              </button>
            </div>
          </div>
          {hawbs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-[12px] text-gray-400 shadow-sm">
              No hay HAWBs registrados
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["HAWB #", "Shipper", "Consignee", "Vuelo", "Fecha vuelo", "Piezas", "Peso carg.", "Estado"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hawbs.map((h) => (
                    <tr key={h.id}
                      onClick={() => router.push(`/dashboard/operaciones/operaciones/${operacion.id}/hawb/${h.id}`)}
                      className="border-t border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-[12px] font-bold text-blue-700">{h.numero_hawb}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-700">{terceroNombres[h.shipper_id] ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-700">{terceroNombres[h.consignee_id] ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{h.vuelo ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{h.fecha_vuelo ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{h.piezas ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{h.peso_cargable_kg ? fmt(h.peso_cargable_kg) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_DOC[h.estado] ?? "bg-gray-100 text-gray-500"}`}>
                          {h.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: MAWB ─────────────────────────────────────────────────── */}
      {tab === "mawb" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => router.push(`/dashboard/operaciones/operaciones/${operacion.id}/mawb/nuevo`)}
              disabled={opBloqueada}
              title={opBloqueada ? msgBloqueada : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded-lg">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo MAWB
            </button>
          </div>
          {mawbs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-[12px] text-gray-400 shadow-sm">
              No hay MAWBs registrados
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["MAWB #", "Consignee", "Aerolínea", "Vuelo", "Fecha vuelo", "Piezas", "Flete", "Estado"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mawbs.map((m) => (
                    <tr key={m.id}
                      onClick={() => router.push(`/dashboard/operaciones/operaciones/${operacion.id}/mawb/${m.id}`)}
                      className="border-t border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-[12px] font-bold text-blue-700">{m.numero_mawb}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-700">{m.consignee_id ? (terceroNombres[m.consignee_id] ?? "—") : "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{aerolineaNombre(m.aerolinea_id)}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{m.vuelo ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{m.fecha_vuelo ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">{m.piezas ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-600">
                        {m.flete_total ? `${m.moneda_flete} ${fmt(m.flete_total)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_DOC[m.estado] ?? "bg-gray-100 text-gray-500"}`}>
                          {m.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Manifiesto ───────────────────────────────────────────── */}
      {tab === "manifiesto" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={abrirManifiestoModal}
              disabled={mawbs.length === 0 || hawbs.length === 0 || opBloqueada}
              title={opBloqueada ? msgBloqueada : mawbs.length === 0 ? "Registra primero un MAWB" : hawbs.length === 0 ? "Registra primero un HAWB" : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded-lg">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo manifiesto
            </button>
          </div>
          {manifiestos.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-[12px] text-gray-400 shadow-sm">
              No hay manifiestos registrados
            </div>
          ) : manifiestos.map((m) => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-gray-700">Manifiesto — {m.fecha}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_DOC[m.estado] ?? "bg-gray-100 text-gray-500"}`}>{m.estado}</span>
                  {m.estado === "EMITIDA" && m.emitido_por_nombre && (
                    <span className="text-[10px] text-green-700">Emitido por {m.emitido_por_nombre}{m.emitido_en ? ` · ${m.emitido_en.slice(0, 10)}` : ""}</span>
                  )}
                  {m.estado === "ANULADA" && (
                    <span className="text-[10px] text-red-600">Anulado{m.anulado_por_nombre ? ` por ${m.anulado_por_nombre}` : ""}{m.anulado_en ? ` · ${m.anulado_en.slice(0, 10)}` : ""}{m.anulado_motivo ? ` — ${m.anulado_motivo}` : ""}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 mr-1">{m.lineas.length} HAWB{m.lineas.length !== 1 ? "s" : ""}</span>
                  <button
                    onClick={() => window.open(`/manifiesto/${operacion.id}/${m.id}`, "_blank")}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] rounded-lg transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Imprimir
                  </button>
                  {!opBloqueada && m.estado !== "ANULADA" && (
                    <div className="relative">
                      <button onClick={() => setMenuManifId(menuManifId === m.id ? null : m.id)} disabled={saving} title="Más acciones"
                        className="px-2 py-1 border border-gray-200 text-blue-600 hover:bg-gray-50 text-[15px] leading-none rounded-lg transition-colors">
                        ⋮
                      </button>
                      {menuManifId === m.id && (
                        <>
                          <div onClick={() => setMenuManifId(null)} className="fixed inset-0 z-40" />
                          <div className="absolute right-0 top-[115%] z-40 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] overflow-hidden">
                            {m.estado === "BORRADOR" && (
                              <button onClick={() => { setMenuManifId(null); setError(""); setEmitirManifId(m.id); }}
                                className="block w-full text-left px-3 py-2 text-[12px] font-semibold text-green-700 hover:bg-gray-50">
                                Emitir
                              </button>
                            )}
                            <button onClick={() => { setMenuManifId(null); setError(""); setMotivoManif(""); setAnularManifId(m.id); }}
                              className={`block w-full text-left px-3 py-2 text-[12px] text-red-600 hover:bg-gray-50 ${m.estado === "BORRADOR" ? "border-t border-gray-100" : ""}`}>
                              Anular
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {m.lineas.length > 0 && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["HAWB", "Piezas", "Peso kg", "Descripción"].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {m.lineas.map((l) => {
                      const h = hawbs.find((x) => x.id === l.hawb_id);
                      return (
                        <tr key={l.id} className="border-t border-gray-50">
                          <td className="px-4 py-2.5 text-[12px] font-mono text-blue-700">{h?.numero_hawb ?? l.hawb_id.slice(0, 8)}</td>
                          <td className="px-4 py-2.5 text-[12px] text-gray-600">{l.piezas ?? "—"}</td>
                          <td className="px-4 py-2.5 text-[12px] text-gray-600">{l.peso_kg ? fmt(l.peso_kg) : "—"}</td>
                          <td className="px-4 py-2.5 text-[12px] text-gray-600">{l.descripcion ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Bitácora ─────────────────────────────────────────────── */}
      {tab === "bitacora" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setEventoModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Registrar evento
            </button>
          </div>
          {eventos.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-[12px] text-gray-400 shadow-sm">
              Sin eventos registrados
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-50">
                {[...eventos].reverse().map((ev) => (
                  <div key={ev.id} className="px-4 py-3 flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {TIPO_EVENTO[ev.tipo] ?? ev.tipo}
                        </span>
                        {ev.hawb_numero && (
                          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{ev.hawb_numero}</span>
                        )}
                        {ev.notificado_cliente && (
                          <span className="text-[10px] text-green-600 font-medium">· Notificado al cliente</span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {new Date(ev.fecha_hora).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-700">{ev.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Documentos ───────────────────────────────────────────── */}
      {tab === "documentos" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setDocumentoModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar documento
            </button>
          </div>
          {documentos.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-[12px] text-gray-400 shadow-sm">
              Sin documentos registrados
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["Tipo", "Documento", "Estado", "Recibido", ""].map((h, i) => (
                      <th key={i} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((d) => (
                    <tr key={d.id} className="border-t border-gray-50">
                      <td className="px-4 py-3 text-[11px] text-gray-500 font-medium">{d.tipo.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-[12px] text-gray-800">{d.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_DOC_OPE[d.estado] ?? "bg-gray-100 text-gray-500"}`}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-500">{d.fecha_recepcion ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {d.archivo && (
                            <button onClick={() => descargarArchivo(d.id)}
                              className="text-[11px] text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Archivo
                            </button>
                          )}
                          <button onClick={() => { setDocEditar(d); setDocEditForm({ estado: d.estado, fecha_recepcion: d.fecha_recepcion ?? "", archivo: null }); }}
                            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                            Actualizar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ Modales (Manifiesto, Bitácora, Documentos) ════════════════════ */}

      {/* Modal Manifiesto */}
      {manifiestoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-[14px] font-semibold text-gray-800">Nuevo manifiesto</h3>
              <button onClick={() => setManifiestoModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Encabezado manifiesto */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>MAWB *</label>
                  <select className={inputCls} value={manifiestoForm.mawb_id}
                    onChange={(e) => {
                      const m = mawbs.find((x) => x.id === e.target.value);
                      setManifiestoForm((p) => ({ ...p, mawb_id: e.target.value, aerolinea_id: m?.aerolinea_id ?? p.aerolinea_id }));
                    }}>
                    <option value="">— Seleccionar —</option>
                    {mawbs.map((m) => <option key={m.id} value={m.id}>{m.numero_mawb}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Aerolínea</label>
                  <select className={inputCls} value={manifiestoForm.aerolinea_id}
                    onChange={(e) => setManifiestoForm((p) => ({ ...p, aerolinea_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {aerolineas.map((a) => <option key={a.id} value={a.id}>{a.codigo_iata} — {a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fecha *</label>
                  <input type="date" className={inputCls} value={manifiestoForm.fecha}
                    onChange={(e) => setManifiestoForm((p) => ({ ...p, fecha: e.target.value }))} />
                </div>
              </div>

              {/* Tabla de HAWBs */}
              {manifiestoLineas.length === 0 ? (
                <p className="text-[12px] text-gray-400 text-center py-4">No hay HAWBs disponibles para este manifiesto.</p>
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">HAWBs a incluir</p>
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[680px] text-[11px]">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">HAWB</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Exportador</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Importador</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500 w-16">Piezas</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500 w-20">Peso kg</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manifiestoLineas.map((l, i) => (
                          <tr key={l.hawb_id} className={`border-t border-gray-100 ${!l.incluir ? "opacity-40" : ""}`}>
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={l.incluir}
                                onChange={(e) => setManifiestoLineas((p) => p.map((x, j) => j === i ? { ...x, incluir: e.target.checked } : x))}
                                className="rounded border-gray-300 text-blue-600" />
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-blue-700">{l.hawb_numero}</td>
                            <td className="px-3 py-2">
                              <BusquedaInput label="" display={l.exportador_nombre} placeholder="Buscar exportador..."
                                fetchFn={buscarTerceros}
                                onSelect={(id, nombre) => setManifiestoLineas((p) => p.map((x, j) => j === i ? { ...x, exportador_id: id, exportador_nombre: nombre.split(" — ")[1] ?? nombre } : x))} />
                            </td>
                            <td className="px-3 py-2">
                              <BusquedaInput label="" display={l.importador_nombre} placeholder="Buscar importador..."
                                fetchFn={buscarTerceros}
                                onSelect={(id, nombre) => setManifiestoLineas((p) => p.map((x, j) => j === i ? { ...x, importador_id: id, importador_nombre: nombre.split(" — ")[1] ?? nombre } : x))} />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" value={l.piezas} disabled={!l.incluir}
                                onChange={(e) => setManifiestoLineas((p) => p.map((x, j) => j === i ? { ...x, piezas: e.target.value } : x))}
                                className="w-16 px-2 py-1 border border-gray-200 rounded text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" inputMode="decimal" value={l.peso_kg} disabled={!l.incluir}
                                onChange={(e) => setManifiestoLineas((p) => p.map((x, j) => j === i ? { ...x, peso_kg: e.target.value } : x))}
                                className="w-20 px-2 py-1 border border-gray-200 rounded text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={l.descripcion} disabled={!l.incluir}
                                onChange={(e) => setManifiestoLineas((p) => p.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setManifiestoModal(false)}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardarManifiesto}
                disabled={saving || !manifiestoForm.mawb_id || !manifiestoForm.fecha}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Crear manifiesto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Evento */}
      {eventoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-4">Registrar evento</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Tipo</label>
                <select className={inputCls} value={eventoForm.tipo}
                  onChange={(e) => setEventoForm((p) => ({ ...p, tipo: e.target.value }))}>
                  {Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>HAWB (opcional — dirige el evento a un cliente)</label>
                <select className={inputCls} value={eventoForm.hawb_id}
                  onChange={(e) => setEventoForm((p) => ({ ...p, hawb_id: e.target.value }))}>
                  <option value="">General (toda la operación)</option>
                  {hawbs.map((h) => (
                    <option key={h.id} value={h.id}>{h.numero_hawb}{h.cliente_nombre ? ` · ${h.cliente_nombre}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Descripción *</label>
                <textarea rows={3} className={inputCls + " resize-none"}
                  value={eventoForm.descripcion} placeholder="Describe el evento..."
                  onChange={(e) => setEventoForm((p) => ({ ...p, descripcion: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eventoForm.notificado_cliente}
                  onChange={(e) => setEventoForm((p) => ({ ...p, notificado_cliente: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-[12px] text-gray-600">Notificado al cliente</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEventoModal(false)}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardarEvento} disabled={saving || !eventoForm.descripcion.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Documento nuevo */}
      {documentoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-4">Agregar documento</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Tipo</label>
                <select className={inputCls} value={docForm.tipo}
                  onChange={(e) => setDocForm((p) => ({ ...p, tipo: e.target.value }))}>
                  <option value="FACTURA_COMERCIAL">Factura comercial</option>
                  <option value="LISTA_EMPAQUE">Lista de empaque</option>
                  <option value="CERTIFICADO_ORIGEN">Certificado de origen</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Nombre / descripción *</label>
                <input className={inputCls} value={docForm.nombre} placeholder="Ej: Factura comercial TECEP"
                  onChange={(e) => setDocForm((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDocumentoModal(false)}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardarDocumento} disabled={saving || !docForm.nombre.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Actualizar documento */}
      {docEditar && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Actualizar documento</h3>
            <p className="text-[12px] text-gray-500 mb-4">{docEditar.nombre}</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Estado</label>
                <select className={inputCls} value={docEditForm.estado}
                  onChange={(e) => setDocEditForm((p) => ({ ...p, estado: e.target.value }))}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="RECIBIDO">Recibido</option>
                  <option value="APROBADO">Aprobado</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Fecha de recepción</label>
                <input type="date" className={inputCls} value={docEditForm.fecha_recepcion}
                  onChange={(e) => setDocEditForm((p) => ({ ...p, fecha_recepcion: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Adjuntar archivo (PDF, imagen, Excel)</label>
                <input type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                  onChange={(e) => setDocEditForm((p) => ({ ...p, archivo: e.target.files?.[0] ?? null }))}
                  className="w-full text-[12px] text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {docEditar.archivo && (
                  <p className="text-[10px] text-green-600 mt-1">✓ Ya tiene archivo adjunto</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDocEditar(null)}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={actualizarDocumento} disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
