"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

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
  aerolinea_id: string | null;
  piezas: number | null; peso_kg: number | null;
  valor_mercancia: number | null; moneda_mercancia: string;
  trm: number | null; notas: string | null;
  estado: string; lineas: CotizacionLinea[];
}

interface Operacion {
  id: string; numero: string; cotizacion_id: string;
  fecha_apertura: string; estado: string;
  aerolinea_id: string | null;
  piezas: number | null; peso_kg: number | null;
}

interface Hawb {
  id: string; numero_hawb: string;
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
}

interface Evento {
  id: string; fecha_hora: string; usuario_id: string;
  tipo: string; descripcion: string; notificado_cliente: boolean;
}

interface Documento {
  id: string; tipo: string; nombre: string;
  estado: string; fecha_recepcion: string | null; archivo: string | null;
}

interface Carpeta {
  operacion: Operacion;
  cotizacion: Cotizacion;
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
  const [tab, setTab] = useState<"datos" | "hawb" | "mawb" | "manifiesto" | "bitacora" | "documentos">("datos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [confirmarCerrar, setConfirmarCerrar] = useState(false);
  const [anularManifId, setAnularManifId] = useState<string | null>(null);

  // Modales (solo Bitácora, Documentos y Manifiesto — HAWB y MAWB tienen página propia)
  const [manifiestoModal, setManifiestoModal] = useState(false);
  const [eventoModal, setEventoModal] = useState(false);
  const [documentoModal, setDocumentoModal] = useState(false);
  const [docEditar, setDocEditar] = useState<Documento | null>(null);

  const [eventoForm, setEventoForm] = useState({ tipo: "STATUS", descripcion: "", notificado_cliente: false });
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
      const t = await apiFetch<Tercero>(`/terceros/${data.cotizacion.cliente_id}`);
      setClienteNombre(t.razon_social);
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
    } catch { /* redirige a /login si sesión expiró */ }
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) return;
    cargarCarpeta();
    apiFetch<Aerolinea[]>("/operaciones/aerolineas?solo_activas=true").then(setAerolineas).catch(() => {});
    apiFetch<Aeropuerto[]>("/operaciones/aeropuertos?solo_activos=true").then(setAeropuertos).catch(() => {});
  }, [resolvedId, cargarCarpeta]);

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

  async function cambiarEstadoManifiesto(manifiestoId: string, nuevoEstado: string) {
    if (!carpeta) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/operaciones/operaciones/${carpeta.operacion.id}/manifiestos/${manifiestoId}`, {
        method: "PUT", body: JSON.stringify({ estado: nuevoEstado }),
      });
      await cargarCarpeta();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
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
        method: "POST", body: JSON.stringify(eventoForm),
      });
      setEventoModal(false);
      setEventoForm({ tipo: "STATUS", descripcion: "", notificado_cliente: false });
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

  const { operacion, cotizacion, hawbs, mawbs, manifiestos, eventos, documentos } = carpeta;

  // Operación cerrada o cancelada: no admite nuevos MAWB / HAWB / Manifiesto.
  const opBloqueada = operacion.estado === "CERRADA" || operacion.estado === "CANCELADA";
  const msgBloqueada = operacion.estado === "CANCELADA" ? "La operación está cancelada" : "La operación está cerrada";

  // Cierre: no se puede cerrar con MAWB/HAWB/manifiesto en borrador (deben estar emitidos o anulados).
  const mawbBorr = mawbs.filter((m) => m.estado === "BORRADOR").length;
  const hawbBorr = hawbs.filter((h) => h.estado === "BORRADOR").length;
  const manifBorr = manifiestos.filter((m) => m.estado === "BORRADOR").length;
  const puedeCerrar = mawbBorr === 0 && hawbBorr === 0 && manifBorr === 0;

  const aerolineaNombre = (id: string | null) => {
    const a = aerolineas.find((x) => x.id === id);
    return a ? `${a.codigo_iata} — ${a.nombre}` : "—";
  };
  const aeropuertoNombre = (id: string | null) => {
    const a = aeropuertos.find((x) => x.id === id);
    return a ? `${a.codigo_iata} — ${a.ciudad}` : "—";
  };

  const TABS = [
    { key: "datos",       label: "Datos",       count: null },
    { key: "mawb",        label: "MAWB",        count: mawbs.length },
    { key: "hawb",        label: "HAWB",        count: hawbs.length },
    { key: "manifiesto",  label: "Manifiesto",  count: manifiestos.length },
    { key: "bitacora",    label: "Bitácora",    count: eventos.length },
    { key: "documentos",  label: "Documentos",  count: documentos.length },
  ] as const;

  return (
    <div className="max-w-7xl space-y-4">

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
              {clienteNombre} · {cotizacion.origen} → {cotizacion.destino} · {cotizacion.tipo_operacion}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Apertura: {operacion.fecha_apertura} · Cotización: {cotizacion.numero}
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

      {anularManifId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Anular manifiesto</h2>
            <p className="text-[12px] text-gray-500 mb-3">
              ¿Confirmas anular este manifiesto? Quedará en solo lectura; si necesitas corregir, crea uno nuevo.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAnularManifId(null)} disabled={saving}
                className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                No, volver
              </button>
              <button onClick={async () => { await cambiarEstadoManifiesto(anularManifId, "ANULADA"); setAnularManifId(null); }} disabled={saving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Anulando..." : "Sí, anular"}
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
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">
                No se puede cerrar: hay {[mawbBorr && `${mawbBorr} MAWB`, hawbBorr && `${hawbBorr} HAWB`, manifBorr && `${manifBorr} manifiesto(s)`].filter(Boolean).join(" y ")} en borrador.
                Deben estar emitidos o anulados antes de cerrar.
              </p>
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
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Datos de la cotización</p>
            {([
              ["Número cotización", cotizacion.numero],
              ["Tipo operación", cotizacion.tipo_operacion],
              ["Ruta", `${cotizacion.origen} → ${cotizacion.destino}`],
              ["Incoterm", cotizacion.incoterm ?? "—"],
              ["Piezas", cotizacion.piezas?.toString() ?? "—"],
              ["Peso cargable", cotizacion.peso_kg ? `${fmt(cotizacion.peso_kg, 4)} kg` : "—"],
              ["Valor mercancía", cotizacion.valor_mercancia ? `${cotizacion.moneda_mercancia} ${fmt(cotizacion.valor_mercancia)}` : "—"],
              ["TRM", cotizacion.trm ? fmt(cotizacion.trm, 2) : "—"],
              ["Fecha cotización", cotizacion.fecha],
              ["Vigencia", cotizacion.fecha_vigencia],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[12px]">
                <span className="text-gray-400">{k}</span>
                <span className="text-gray-800 font-medium text-right max-w-[55%]">{v}</span>
              </div>
            ))}
            <div className="pt-2">
              <button onClick={() => window.open(`/dashboard/operaciones/cotizaciones/${cotizacion.id}`, "_blank")}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                Ver cotización completa ↗
              </button>
            </div>
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
                ["Piezas", operacion.piezas?.toString() ?? "—"],
                ["Peso kg", operacion.peso_kg ? fmt(operacion.peso_kg, 4) : "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12px]">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-gray-800 font-medium">{v}</span>
                </div>
              ))}
            </div>
            {cotizacion.notas && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">Notas / condiciones</p>
                <p className="text-[12px] text-amber-800 whitespace-pre-line">{cotizacion.notas}</p>
              </div>
            )}
          </div>
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
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 mr-1">{m.lineas.length} HAWB{m.lineas.length !== 1 ? "s" : ""}</span>
                  {!opBloqueada && m.estado === "BORRADOR" && (
                    <button onClick={() => cambiarEstadoManifiesto(m.id, "EMITIDA")} disabled={saving}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] rounded-lg transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Emitir
                    </button>
                  )}
                  {!opBloqueada && (m.estado === "BORRADOR" || m.estado === "EMITIDA") && (
                    <button onClick={() => setAnularManifId(m.id)} disabled={saving}
                      className="flex items-center gap-1.5 px-2.5 py-1 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-[11px] rounded-lg transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      Anular
                    </button>
                  )}
                  <button
                    onClick={() => window.open(`/manifiesto/${operacion.id}/${m.id}`, "_blank")}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] rounded-lg transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Imprimir
                  </button>
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
