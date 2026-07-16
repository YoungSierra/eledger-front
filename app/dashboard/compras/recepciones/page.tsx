"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface OcSearch { id: string; numero: string; proveedor_nombre: string | null; estado: string; }
interface OcLinea {
  id: string; producto_id: string; producto_codigo: string | null; producto_nombre: string | null;
  maneja_inventario: boolean;
  cantidad: string; um_id: string; um_codigo: string | null;
  precio_unitario: string; pendiente: string;
}
interface Oc {
  id: string; numero: string;
  proveedor_id: string; proveedor_nit: string | null; proveedor_nombre: string | null;
  lineas: OcLinea[];
}
interface Bodega { id: string; codigo: string; nombre: string; }

interface LineaRecepForm {
  oc_linea_id: string;
  producto_codigo: string | null;
  producto_nombre: string | null;
  maneja_inventario: boolean;
  um_codigo: string | null;
  pendiente: string;
  cantidad: string;
  costo_unitario: string;
}

interface RecepLinea {
  id: string; oc_linea_id: string;
  producto_codigo: string | null; producto_nombre: string | null; maneja_inventario: boolean;
  cantidad: string; um_codigo: string | null; costo_unitario: string; costo_total: string;
}

interface Recepcion {
  id: string; numero: string; fecha: string;
  oc_id: string; oc_numero: string | null;
  bodega_id: string; bodega_nombre: string | null;
  proveedor_nit: string | null; proveedor_nombre: string | null;
  notas: string | null; estado: string;
  movimiento_id: string | null; asiento_id: string | null;
  total_costo: string;
  lineas: RecepLinea[];
}

interface ListItem {
  id: string; numero: string; fecha: string;
  oc_numero: string | null; bodega_nombre: string | null;
  proveedor_nit: string | null; proveedor_nombre: string | null;
  total_costo: string; estado: string;
}
interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  borrador:   "bg-amber-50 text-amber-700 border border-amber-200",
  confirmada: "bg-green-50 text-green-700 border border-green-200",
  anulada:    "bg-red-50 text-red-600 border border-red-200",
};
const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", confirmada: "Confirmada", anulada: "Anulada",
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

// ─── OC Search ────────────────────────────────────────────────────────────────

function OcSearch({ display, onChange }: { display: string; onChange: (id: string, d: string) => void }) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<OcSearch[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => { setQ(display); }, [display]);

  function buscar(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    if (!v.trim()) { setOpts([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      abort.current = new AbortController();
      setSearching(true);
      try {
        const d = await apiFetch<any>(
          `/compras/ordenes?busqueda=${encodeURIComponent(v.trim())}&por_pagina=30&estado=aprobada&estado=en_proceso`,
          { signal: abort.current.signal } as any,
        );
        setOpts(d.items ?? []);
        setOpen(true);
      } catch {
        // abortado por nueva búsqueda — no actualizar estado
      } finally {
        setSearching(false);
      }
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar OC aprobada…"
        className={inp + (searching ? " pr-8" : "")} />
      {searching && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]">…</span>
      )}
      {open && (
        <div className="absolute z-[9999] top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto w-full min-w-[320px]">
          {opts.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-gray-400">Sin resultados</p>
          ) : opts.map((o) => (
            <button key={o.id} type="button"
              onMouseDown={() => { setQ(o.numero); setOpen(false); onChange(o.id, o.numero); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{o.numero}</span>
              <span className="text-[11px] text-gray-700">{o.proveedor_nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RecepcionesPage() {
  const title = usePageTitle();
  const [lista, setLista] = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 20;
  const [loading, setLoading] = useState(true);
  const [fEstado, setFEstado] = useState("");
  // El backend lista por fecha descendente — ese es el orden inicial.
  const { orden, alternar } = useOrden<
    "numero" | "fecha" | "oc" | "proveedor" | "bodega" | "costo" | "estado"
  >("fecha", "desc", () => setPagina(1));

  const [bodegas, setBodegas] = useState<Bodega[]>([]);

  const [modo, setModo] = useState<"crear" | "editar" | "ver" | null>(null);
  const [activo, setActivo] = useState<Recepcion | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [confirmando, setConfirmando] = useState<Recepcion | null>(null);
  const [confirmandoSaving, setConfirmandoSaving] = useState(false);
  const [confirmandoError, setConfirmandoError] = useState("");
  const [confirmadoId, setConfirmadoId] = useState<string | null>(null);

  // Formulario
  const [fFecha, setFFecha] = useState(hoyLocal());
  const [fOcId, setFOcId] = useState("");
  const [fOcDisplay, setFOcDisplay] = useState("");
  const [fOcData, setFOcData] = useState<Oc | null>(null);
  const [fBodegaId, setFBodegaId] = useState("");
  const [fNotas, setFNotas] = useState("");
  const [lineas, setLineas] = useState<LineaRecepForm[]>([]);

  // El backend pagina; se ordena la página cargada antes de pintarla.
  const ordenada = ordenarFilas(lista, orden, {
    numero:    (r) => r.numero,
    fecha:     (r) => r.fecha,
    oc:        (r) => r.oc_numero,
    proveedor: (r) => r.proveedor_nombre,
    bodega:    (r) => r.bodega_nombre,
    costo:     (r) => Number(r.total_costo),
    estado:    (r) => ESTADO_LABEL[r.estado] ?? r.estado,
  });

  const totalPaginas = Math.max(1, Math.ceil(totalItems / porPagina));

  // ── Carga ───────────────────────────────────────────────────────────────────
  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), por_pagina: String(porPagina) });
      if (fEstado) params.set("estado", fEstado);
      const d: ListResponse = await apiFetch(`/compras/recepciones?${params}`);
      setLista(d.items);
      setTotalItems(d.total);
    } finally {
      setLoading(false);
    }
  }, [pagina, fEstado]);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  useEffect(() => {
    apiFetch("/inventario/bodegas").then((d: any) => {
      const arr: Bodega[] = d.items ?? d;
      setBodegas(arr);
      if (arr.length === 1) setFBodegaId(arr[0].id);
    }).catch(() => {});
  }, []);

  // ── Cargar OC seleccionada ───────────────────────────────────────────────────
  async function onOcSelect(id: string, display: string) {
    setFOcId(id);
    setFOcDisplay(display);
    try {
      const oc: Oc = await apiFetch(`/compras/ordenes/${id}`);
      setFOcData(oc);
      // Solo líneas con inventario y pendiente > 0
      const lineasPendientes = oc.lineas
        .filter((l) => l.maneja_inventario && parseFloat(l.pendiente) > 0)
        .map((l): LineaRecepForm => ({
          oc_linea_id: l.id,
          producto_codigo: l.producto_codigo,
          producto_nombre: l.producto_nombre,
          maneja_inventario: l.maneja_inventario,
          um_codigo: l.um_codigo,
          pendiente: l.pendiente,
          cantidad: l.pendiente,
          costo_unitario: l.precio_unitario,
        }));
      setLineas(lineasPendientes);
    } catch {
      setFOcData(null);
      setLineas([]);
    }
  }

  // ── Apertura modal ──────────────────────────────────────────────────────────
  function abrirCrear() {
    setActivo(null);
    setFFecha(hoyLocal());
    setFOcId(""); setFOcDisplay(""); setFOcData(null);
    setFBodegaId(bodegas.length === 1 ? bodegas[0].id : "");
    setFNotas("");
    setLineas([]);
    setError("");
    setModo("crear");
  }

  async function abrirVer(id: string) {
    const d: Recepcion = await apiFetch(`/compras/recepciones/${id}`);
    setActivo(d);
    setError("");
    setModo("ver");
  }

  function abrirEditar(rec: Recepcion) {
    setActivo(rec);
    setEditandoId(rec.id);
    setFFecha(rec.fecha);
    setFOcId(rec.oc_id);
    setFOcDisplay(rec.oc_numero ?? "");
    setFBodegaId(rec.bodega_id);
    setFNotas(rec.notas ?? "");
    setLineas(rec.lineas.map((l) => ({
      oc_linea_id: l.oc_linea_id,
      producto_codigo: l.producto_codigo,
      producto_nombre: l.producto_nombre,
      maneja_inventario: l.maneja_inventario,
      um_codigo: l.um_codigo,
      pendiente: l.cantidad,
      cantidad: l.cantidad,
      costo_unitario: l.costo_unitario,
    })));
    setError("");
    setModo("editar");
  }

  function cerrar() { setModo(null); setActivo(null); setEditandoId(null); setSaving(false); setError(""); }

  // ── Guardar recepción ────────────────────────────────────────────────────────
  async function guardar() {
    if (!fOcId) { setError("Seleccione una OC"); return; }
    if (!fBodegaId) { setError("Seleccione una bodega"); return; }
    const lineasValidas = lineas.filter((l) => parseFloat(l.cantidad) > 0);
    if (!lineasValidas.length) { setError("No hay líneas con cantidad a recibir"); return; }

    setSaving(true); setError("");
    try {
      const body = {
        fecha: fFecha,
        oc_id: fOcId,
        bodega_id: fBodegaId,
        notas: fNotas || null,
        lineas: lineasValidas.map((l) => ({
          oc_linea_id: l.oc_linea_id,
          cantidad: parseFloat(l.cantidad),
          costo_unitario: parseFloat(l.costo_unitario) || 0,
        })),
      };
      if (editandoId) {
        await apiFetch(`/compras/recepciones/${editandoId}`, { method: "PUT", body: JSON.stringify({ fecha: body.fecha, bodega_id: body.bodega_id, notas: body.notas, lineas: body.lineas }) });
      } else {
        await apiFetch("/compras/recepciones", { method: "POST", body: JSON.stringify(body) });
      }
      cerrar();
      cargarLista();
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // ── Confirmar / Anular ───────────────────────────────────────────────────────
  function abrirConfirmar(rec: Recepcion) {
    setConfirmando(rec);
    setConfirmandoError("");
  }

  async function ejecutarConfirmar() {
    if (!confirmando) return;
    setConfirmandoSaving(true); setConfirmandoError("");
    try {
      const id = confirmando.id;
      await apiFetch(`/compras/recepciones/${id}/confirmar`, { method: "POST" });
      if (activo?.id === id) {
        const d: Recepcion = await apiFetch(`/compras/recepciones/${id}`);
        setActivo(d);
      }
      setConfirmando(null);
      setConfirmadoId(id);
      cargarLista();
    } catch (e: any) {
      setConfirmandoError(e.message ?? "Error al confirmar");
    } finally {
      setConfirmandoSaving(false);
    }
  }

  async function anular(id: string) {
    if (!confirm("¿Anular esta recepción?")) return;
    try {
      await apiFetch(`/compras/recepciones/${id}/anular`, { method: "POST" });
      if (activo?.id === id) { const d: Recepcion = await apiFetch(`/compras/recepciones/${id}`); setActivo(d); }
      cargarLista();
    } catch (e: any) { alert(e.message ?? "Error"); }
  }

  const totalCosto = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.costo_unitario) || 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-[12px] font-medium hover:bg-blue-700">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva recepción
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
              <Th campo="numero"    orden={orden} alternar={alternar} className="w-28">Número</Th>
              <Th campo="fecha"     orden={orden} alternar={alternar} className="w-24">Fecha</Th>
              <Th campo="oc"        orden={orden} alternar={alternar} className="w-28">OC</Th>
              <Th campo="proveedor" orden={orden} alternar={alternar} className="w-52">Proveedor</Th>
              <Th campo="bodega"    orden={orden} alternar={alternar} className="w-32">Bodega</Th>
              <Th campo="costo"     orden={orden} alternar={alternar} align="right" className="w-32">Costo total</Th>
              <Th campo="estado"    orden={orden} alternar={alternar} align="center" className="w-28">Estado</Th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Cargando…</td></tr>
            ) : ordenada.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin recepciones</td></tr>
            ) : ordenada.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold whitespace-nowrap">{r.numero}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.fecha}</td>
                <td className="px-4 py-2.5 font-mono text-gray-600 whitespace-nowrap">{r.oc_numero}</td>
                <td className="px-4 py-2.5 w-52 max-w-[208px]">
                  <div className="font-medium text-gray-800 truncate">{r.proveedor_nombre}</div>
                  <div className="text-gray-400 text-[11px] truncate">{r.proveedor_nit}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600 truncate max-w-[128px]">{r.bodega_nombre}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(r.total_costo)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[r.estado] ?? ""}`}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <button onClick={() => abrirVer(r.id)} title="Ver"
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
          <div className="bg-white rounded-xl shadow-2xl w-[860px] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-[14px] font-semibold text-gray-800">
                {modo === "editar" ? `Editar recepción — ${activo?.numero ?? ""}` : "Nueva recepción de mercancía"}
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
                <div className="col-span-5">
                  <label className={lbl}>Orden de compra *</label>
                  {modo === "editar"
                    ? <div className={inp + " bg-gray-50 text-gray-500"}>{fOcDisplay}</div>
                    : <OcSearch display={fOcDisplay} onChange={onOcSelect} />}
                </div>
                <div className="col-span-5">
                  <label className={lbl}>Bodega destino *</label>
                  <select value={fBodegaId} onChange={(e) => setFBodegaId(e.target.value)} className={inp}>
                    <option value="">Seleccionar…</option>
                    {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                {fOcData && (
                  <div className="col-span-12">
                    <p className="text-[12px] text-gray-600">
                      Proveedor: <span className="font-medium">{fOcData.proveedor_nombre}</span>
                    </p>
                  </div>
                )}
                <div className="col-span-12">
                  <label className={lbl}>Notas</label>
                  <textarea value={fNotas} onChange={(e) => setFNotas(e.target.value)} rows={2} className={inp} />
                </div>
              </div>

              {/* Líneas */}
              {lineas.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-2">
                    Líneas a recibir (solo productos con inventario)
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[680px] text-[11px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                          <th className="px-3 py-1.5 text-left">Producto</th>
                          <th className="px-3 py-1.5 text-right w-24">Pendiente</th>
                          <th className="px-3 py-1.5 text-left w-12">UM</th>
                          <th className="px-3 py-1.5 text-right w-28">Cant. a recibir</th>
                          <th className="px-3 py-1.5 text-right w-28">Costo unit.</th>
                          <th className="px-3 py-1.5 text-right w-28">Costo total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lineas.map((l, i) => {
                          const costoTotal = (parseFloat(l.cantidad) || 0) * (parseFloat(l.costo_unitario) || 0);
                          return (
                            <tr key={l.oc_linea_id} className="bg-white">
                              <td className="px-3 py-2">
                                <span className="font-mono text-blue-600 mr-1">{l.producto_codigo}</span>
                                {l.producto_nombre}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">{fmt(l.pendiente, 4)}</td>
                              <td className="px-3 py-2 text-gray-500">{l.um_codigo}</td>
                              <td className="px-1 py-1">
                                <input type="number" step="0.001" min="0.001" max={l.pendiente}
                                  value={l.cantidad}
                                  onChange={(e) => setLineas((prev) => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                                  className={inpSm + " text-right"} />
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-600">
                                {fmt(l.costo_unitario)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(costoTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-200">
                          <td colSpan={5} className="px-3 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase">Costo total</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-gray-800">{fmt(totalCosto)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : fOcId ? (
                <p className="text-[12px] text-amber-600 bg-amber-50 rounded px-3 py-2">
                  Esta OC no tiene líneas de inventario pendientes por recibir.
                </p>
              ) : null}

              {error && <p className="text-[12px] text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving || !lineas.length}
                className="px-4 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar recepción"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ver ──────────────────────────────────────────────────────────── */}
      {modo === "ver" && activo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[860px] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-[14px] font-semibold text-gray-800">{activo.numero}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[activo.estado] ?? ""}`}>
                  {ESTADO_LABEL[activo.estado] ?? activo.estado}
                </span>
                {activo.asiento_id && (
                  <span className="text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Asiento generado
                  </span>
                )}
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-4 gap-4 text-[12px]">
                <div><span className={lbl}>OC</span><p className="font-mono text-blue-600">{activo.oc_numero}</p></div>
                <div><span className={lbl}>Proveedor</span><p className="text-gray-800">{activo.proveedor_nombre}</p></div>
                <div><span className={lbl}>Fecha</span><p className="text-gray-800">{activo.fecha}</p></div>
                <div><span className={lbl}>Bodega</span><p className="text-gray-800">{activo.bodega_nombre}</p></div>
                {activo.notas && <div className="col-span-4"><span className={lbl}>Notas</span><p className="text-gray-700">{activo.notas}</p></div>}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[680px] text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                      <th className="px-3 py-1.5 text-left">Producto</th>
                      <th className="px-3 py-1.5 text-right w-24">Cantidad</th>
                      <th className="px-3 py-1.5 text-left w-12">UM</th>
                      <th className="px-3 py-1.5 text-right w-28">Costo unit.</th>
                      <th className="px-3 py-1.5 text-right w-28">Costo total</th>
                      <th className="px-3 py-1.5 text-center w-28">Inventario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activo.lineas.map((l) => (
                      <tr key={l.id} className="bg-white">
                        <td className="px-3 py-2">
                          <span className="font-mono text-blue-600 mr-1">{l.producto_codigo}</span>
                          {l.producto_nombre}
                        </td>
                        <td className="px-3 py-2 text-right">{fmt(l.cantidad, 4)}</td>
                        <td className="px-3 py-2 text-gray-500">{l.um_codigo}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(l.costo_unitario)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(l.costo_total)}</td>
                        <td className="px-3 py-2 text-center">
                          {l.maneja_inventario ? (
                            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Mueve stock</span>
                          ) : (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Servicio</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={4} className="px-3 py-1.5 text-right text-[11px] font-bold text-gray-500 uppercase">Costo total</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-gray-800">{fmt(activo.total_costo)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-between gap-2 px-6 py-4 border-t border-gray-200">
              <div>
                {activo.estado === "borrador" && (
                  <button onClick={() => anular(activo.id)}
                    className="px-3 py-1.5 text-[12px] text-red-600 border border-red-200 rounded-md hover:bg-red-50">
                    Anular
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {activo.estado === "borrador" && (
                  <button onClick={() => abrirEditar(activo)}
                    className="px-3 py-1.5 text-[12px] text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Editar
                  </button>
                )}
                {activo.estado === "borrador" && (
                  <button onClick={() => abrirConfirmar(activo)}
                    className="px-4 py-2 text-[12px] bg-green-600 text-white rounded-md hover:bg-green-700">
                    Confirmar recepción
                  </button>
                )}
                {activo.estado === "confirmada" && (
                  <a href={`/recepcion/${activo.id}`} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 text-[12px] text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                    Imprimir
                  </a>
                )}
                <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal confirmar recepción ─────────────────────────────────────────── */}
      {confirmando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[560px] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">Confirmar recepción</h2>
                <p className="text-[11px] text-gray-400">{confirmando.numero} · {confirmando.proveedor_nombre}</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-3">
              <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-3">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Al confirmar se <strong>moverá el stock</strong> en la bodega y se <strong>generará el asiento contable</strong> (D Inventario / C Mercancías recibidas sin factura). Esta acción no se puede deshacer.
                </p>
              </div>

              {confirmandoError && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{confirmandoError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setConfirmando(null)} disabled={confirmandoSaving}
                className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={ejecutarConfirmar} disabled={confirmandoSaving}
                className="px-5 py-2 text-[12px] bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium">
                {confirmandoSaving ? "Confirmando…" : "Sí, confirmar recepción"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ¿imprimir? ─────────────────────────────────────────────────── */}
      {confirmadoId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">Recepción confirmada</h2>
                <p className="text-[11px] text-gray-400">El inventario y el asiento contable han sido generados.</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-[12px] text-gray-600">¿Desea imprimir la recepción?</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setConfirmadoId(null)}
                className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                No, cerrar
              </button>
              <button onClick={() => { window.open(`/recepcion/${confirmadoId}`, "_blank"); setConfirmadoId(null); }}
                className="px-5 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
