"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface RemListItem {
  id: string; numero: string; fecha: string;
  cliente_id: string; cliente_nombre: string; cliente_nit?: string;
  bodega_id: string; bodega_nombre: string;
  estado: string; num_lineas: number;
}
interface RemListResponse { items: RemListItem[]; total: number; pagina: number; por_pagina: number; }

interface RemLinea {
  id: string; producto_id: string; producto_codigo: string; producto_nombre: string;
  cantidad: string; um_id: string; um_codigo: string; costo_unitario: string;
}
interface RemDetalle {
  id: string; numero: string; fecha: string;
  cliente_id: string; cliente_nombre: string; cliente_nit?: string;
  bodega_id: string; bodega_nombre: string;
  notas: string | null; estado: string;
  movimiento_id: string | null; asiento_id: string | null;
  lineas: RemLinea[];
}

interface Tercero { id: string; nit: string; razon_social: string; }
interface Bodega { id: string; nombre: string; }
interface Producto {
  id: string; codigo: string; nombre: string;
  um_base_id: string; um_base_codigo: string; um_base_nombre: string;
}
interface UmProducto { id: string; um_id?: string; codigo?: string; nombre?: string; um_codigo?: string; um_nombre?: string; }
interface LineaForm {
  producto_id: string; producto_display: string;
  cantidad: string; um_id: string; ums: { id: string; codigo: string }[];
  stock: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const lbl = "block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5";

const ESTADO_BADGE: Record<string, string> = {
  borrador:   "bg-amber-50 text-amber-700 border border-amber-200",
  despachada: "bg-blue-100 text-blue-800",
  facturada:  "bg-green-100 text-green-800",
  anulada:    "bg-red-100 text-red-800",
};
const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", despachada: "Despachada", facturada: "Facturada", anulada: "Anulada",
};

// ─── ProductoSearch ──────────────────────────────────────────────────────────

function ProductoSearch({ value, onChange }: {
  value: string;
  onChange: (id: string, prod: Producto) => void;
}) {
  const [q, setQ] = useState(value);
  const [opts, setOpts] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { setQ(value); }, [value]);

  async function buscar(texto: string) {
    setQ(texto);
    if (texto.length < 2) { setOpts([]); setOpen(false); return; }
    const res = await apiFetch<Producto[]>(`/inventario/productos?q=${encodeURIComponent(texto)}&limit=20`).catch(() => [] as Producto[]);
    setOpts(res); setOpen(res.length > 0);
  }

  return (
    <div className="relative">
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full px-2 py-1 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        placeholder="Buscar producto…" />
      {open && (
        <div className="absolute z-[200] top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {opts.map((p) => (
            <button key={p.id} type="button" onMouseDown={() => { onChange(p.id, p); setQ(`${p.codigo} – ${p.nombre}`); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-blue-50">
              <span className="font-mono text-[10px] text-gray-400 mr-1">{p.codigo}</span>{p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function RemisionesPage() {
  usePageTitle("Remisiones");

  const [lista, setLista]     = useState<RemListItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [pagina, setPagina]   = useState(1);
  const [cargando, setCargando] = useState(false);
  const POR_PAGINA = 30;
  const { orden, alternar } = useOrden<
    "numero" | "fecha" | "cliente" | "bodega" | "items" | "estado"
  >("fecha", "desc");

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde]   = useState("");
  const [filtroHasta, setFiltroHasta]   = useState("");
  const [filtroClienteId, setFiltroClienteId]     = useState("");
  const [filtroClienteQ, setFiltroClienteQ]       = useState("");
  const [filtroClienteOpts, setFiltroClienteOpts] = useState<Tercero[]>([]);
  const [filtroClienteOpen, setFiltroClienteOpen] = useState(false);
  const filtroClienteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bodegas, setBodegas]   = useState<Bodega[]>([]);

  // Modal
  const [modo, setModo]     = useState<"ver" | "crear" | "editar" | null>(null);
  const [activo, setActivo] = useState<RemDetalle | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Despacho
  const [despachando, setDespachando]   = useState(false);
  const [despachoError, setDespachoError] = useState("");
  const [despachado, setDespachado]     = useState<string | null>(null);

  // Form
  const [fFecha, setFFecha]     = useState(hoyLocal());
  const [fBodegaId, setFBodegaId] = useState("");
  const [fClienteId, setFClienteId] = useState("");
  const [fClienteQ, setFClienteQ]   = useState("");
  const [fClienteOpts, setFClienteOpts] = useState<Tercero[]>([]);
  const [fClienteOpen, setFClienteOpen] = useState(false);
  const [fNotas, setFNotas]     = useState("");
  const [lineas, setLineas]     = useState<LineaForm[]>([]);
  const clienteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<Bodega[]>("/inventario/bodegas?solo_activas=true").then(setBodegas).catch(() => {});
  }, []);

  function buscarClienteFiltro(val: string) {
    setFiltroClienteQ(val);
    if (!val) { setFiltroClienteId(""); setFiltroClienteOpts([]); setFiltroClienteOpen(false); return; }
    if (filtroClienteTimer.current) clearTimeout(filtroClienteTimer.current);
    filtroClienteTimer.current = setTimeout(async () => {
      const res = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}&tipo_tercero=CLIENTE&solo_activos=true`).catch(() => [] as Tercero[]);
      setFiltroClienteOpts(res.slice(0, 8)); setFiltroClienteOpen(res.length > 0);
    }, 250);
  }

  const buscar = useCallback(async (pag: number) => {
    setCargando(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(POR_PAGINA) });
      if (filtroEstado)    p.set("estado", filtroEstado);
      if (filtroDesde)     p.set("fecha_desde", filtroDesde);
      if (filtroHasta)     p.set("fecha_hasta", filtroHasta);
      if (filtroClienteId) p.set("cliente_id", filtroClienteId);
      const res = await apiFetch<RemListResponse>(`/inventario/remisiones?${p}`);
      setLista(res.items); setTotal(res.total); setPagina(pag);
    } finally { setCargando(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroDesde, filtroHasta, filtroClienteId]);

  useEffect(() => { buscar(1); }, []);

  // ── Helpers form ──────────────────────────────────────────────────────────

  function lineaVacia(): LineaForm {
    return { producto_id: "", producto_display: "", cantidad: "", um_id: "", ums: [], stock: null };
  }

  async function cargarStock(productoId: string, bodegaId: string): Promise<string> {
    if (!bodegaId) return "0";
    const res = await apiFetch<{ items: { cantidad: string }[] }>(
      `/inventario/saldos?producto_id=${productoId}&bodega_id=${bodegaId}&por_pagina=1`
    ).catch(() => null);
    return res?.items?.[0]?.cantidad ?? "0";
  }

  async function cargarUms(productoId: string, prod: Producto): Promise<{ id: string; codigo: string }[]> {
    const alternas = await apiFetch<UmProducto[]>(`/inventario/productos/${productoId}/unidades`).catch(() => [] as UmProducto[]);
    return [
      { id: prod.um_base_id, codigo: prod.um_base_codigo },
      ...alternas.map((a) => ({ id: a.um_id ?? a.id ?? "", codigo: a.um_codigo ?? a.codigo ?? "" })),
    ];
  }

  async function onProductoSeleccionado(idx: number, prod: Producto) {
    const [ums, stock] = await Promise.all([
      cargarUms(prod.id, prod),
      cargarStock(prod.id, fBodegaId),
    ]);
    setLineas((prev) => prev.map((l, i) => i === idx
      ? { ...l, producto_id: prod.id, producto_display: `${prod.codigo} – ${prod.nombre}`, um_id: ums[0]?.id ?? "", ums, stock }
      : l
    ));
  }

  async function onBodegaCambia(nuevaBodegaId: string) {
    setFBodegaId(nuevaBodegaId);
    const actualizadas = await Promise.all(
      lineas.map(async (l) => {
        if (!l.producto_id) return l;
        const stock = await cargarStock(l.producto_id, nuevaBodegaId);
        return { ...l, stock };
      })
    );
    setLineas(actualizadas);
  }

  function buscarCliente(val: string) {
    setFClienteQ(val);
    if (clienteTimer.current) clearTimeout(clienteTimer.current);
    if (val.length < 2) { setFClienteOpts([]); setFClienteOpen(false); return; }
    clienteTimer.current = setTimeout(async () => {
      const res = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}&tipo_tercero=CLIENTE&solo_activos=true`).catch(() => [] as Tercero[]);
      setFClienteOpts(res.slice(0, 10)); setFClienteOpen(res.length > 0);
    }, 250);
  }

  // ── Abrir / cerrar ────────────────────────────────────────────────────────

  function cerrar() { setModo(null); setActivo(null); setError(""); setDespachoError(""); }

  async function abrirVer(id: string) {
    const det = await apiFetch<RemDetalle>(`/inventario/remisiones/${id}`);
    setActivo(det); setModo("ver");
  }

  function abrirCrear() {
    setActivo(null);
    setFFecha(hoyLocal()); setFBodegaId(bodegas[0]?.id ?? "");
    setFClienteId(""); setFClienteQ(""); setFNotas("");
    setLineas([lineaVacia()]);
    setError(""); setModo("crear");
  }

  async function abrirEditar(det: RemDetalle) {
    setFFecha(det.fecha);
    setFBodegaId(det.bodega_id);
    setFClienteId(det.cliente_id);
    setFClienteQ(det.cliente_nombre);
    setFNotas(det.notas ?? "");
    // Pre-llenar líneas con ums básicas; cargar stock en paralelo
    const lineasBase: LineaForm[] = det.lineas.map((l) => ({
      producto_id: l.producto_id,
      producto_display: `${l.producto_codigo} – ${l.producto_nombre}`,
      cantidad: l.cantidad,
      um_id: l.um_id,
      ums: [{ id: l.um_id, codigo: l.um_codigo }],
      stock: null,
    }));
    setLineas(lineasBase);
    setError(""); setModo("editar");
    // Cargar stocks en paralelo
    const stocks = await Promise.all(
      det.lineas.map((l) => cargarStock(l.producto_id, det.bodega_id))
    );
    setLineas((prev) => prev.map((l, i) => ({ ...l, stock: stocks[i] ?? "0" })));
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  async function guardar(despachar = false) {
    if (!fClienteId) { setError("Seleccione un cliente"); return; }
    if (!fBodegaId)  { setError("Seleccione una bodega");  return; }
    const lineasValidas = lineas.filter((l) => l.producto_id);
    if (lineasValidas.length === 0) { setError("Agregue al menos un producto"); return; }
    if (lineasValidas.some((l) => !(parseFloat(l.cantidad) > 0))) {
      setError("Hay productos con cantidad en 0 o vacía"); return;
    }
    setSaving(true); setError("");
    try {
      const body = {
        fecha: fFecha, cliente_id: fClienteId, bodega_id: fBodegaId,
        notas: fNotas || null,
        lineas: lineasValidas.map((l) => ({ producto_id: l.producto_id, cantidad: parseFloat(l.cantidad), um_id: l.um_id })),
      };
      const url    = modo === "editar" && activo ? `/inventario/remisiones/${activo.id}` : "/inventario/remisiones";
      const method = modo === "editar" ? "PUT" : "POST";
      const res = await apiFetch<RemDetalle>(url, { method, body: JSON.stringify(body) });

      if (despachar) {
        const despachada = await apiFetch<RemDetalle>(`/inventario/remisiones/${res.id}/despachar`, { method: "POST" });
        cerrar(); buscar(1); setDespachado(despachada.id);
      } else {
        cerrar(); buscar(1);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  // ── Despachar desde vista ─────────────────────────────────────────────────

  async function despachar() {
    if (!activo) return;
    setDespachando(true); setDespachoError("");
    try {
      await apiFetch(`/inventario/remisiones/${activo.id}/despachar`, { method: "POST" });
      cerrar(); buscar(1); setDespachado(activo.id);
    } catch (e: unknown) {
      setDespachoError(e instanceof Error ? e.message : "Error al despachar");
    } finally { setDespachando(false); }
  }

  const totalPags = Math.max(1, Math.ceil(total / POR_PAGINA));

  // La paginación es del servidor: se ordenan las filas de la página actual.
  const ordenada = ordenarFilas(lista, orden, {
    numero:  (r) => r.numero,
    fecha:   (r) => r.fecha,
    cliente: (r) => r.cliente_nombre,
    bodega:  (r) => r.bodega_nombre,
    items:   (r) => r.num_lineas,
    estado:  (r) => ESTADO_LABEL[r.estado] ?? r.estado,
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-none border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Desde</label>
            <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)}
              className="px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-36" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Hasta</label>
            <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)}
              className="px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-36" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400">
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="despachada">Despachada</option>
              <option value="facturada">Facturada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div className="relative">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cliente</label>
            <input value={filtroClienteQ} onChange={(e) => buscarClienteFiltro(e.target.value)}
              onBlur={() => setTimeout(() => setFiltroClienteOpen(false), 150)}
              className="px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
              placeholder="NIT o nombre…" />
            {filtroClienteOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-64">
                {filtroClienteOpts.map((c) => (
                  <button key={c.id} type="button"
                    onMouseDown={() => { setFiltroClienteId(c.id); setFiltroClienteQ(c.razon_social); setFiltroClienteOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-blue-50">
                    <span className="font-mono text-blue-600 mr-1.5">{c.nit}</span>{c.razon_social}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => buscar(1)} disabled={cargando}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Buscando…" : "Buscar"}
          </button>
          <div className="flex-1" />
          <button onClick={abrirCrear}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded-md hover:bg-blue-700">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nueva remisión
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead>
            <tr className="border-b border-gray-200">
              <Th campo="numero"  orden={orden} alternar={alternar} className="w-32">Número</Th>
              <Th campo="fecha"   orden={orden} alternar={alternar} className="w-24">Fecha</Th>
              <Th campo="cliente" orden={orden} alternar={alternar} className="w-52">Cliente</Th>
              <Th campo="bodega"  orden={orden} alternar={alternar} className="w-40">Bodega</Th>
              <Th campo="items"   orden={orden} alternar={alternar} align="right"  className="w-16">Items</Th>
              <Th campo="estado"  orden={orden} alternar={alternar} align="center" className="w-28">Estado</Th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={7} className="py-10 text-center text-[12px] text-gray-400">Cargando…</td></tr>}
            {!cargando && ordenada.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[12px] text-gray-400">Sin remisiones</td></tr>}
            {ordenada.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold whitespace-nowrap">{r.numero}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.fecha}</td>
                <td className="px-4 py-2.5 w-52 max-w-[208px]">
                  <div className="font-medium text-gray-800 truncate">{r.cliente_nombre}</div>
                  {r.cliente_nit && <div className="text-gray-400 text-[11px] truncate">{r.cliente_nit}</div>}
                </td>
                <td className="px-4 py-2.5 text-gray-500 truncate max-w-[160px]">{r.bodega_nombre}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{r.num_lineas}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[r.estado] ?? ""}`}>
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
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0 text-[11px] text-gray-500">
        <span>{total} remisión{total !== 1 ? "es" : ""}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => buscar(pagina - 1)} disabled={pagina <= 1}
            className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">‹</button>
          <span>Página {pagina} de {totalPags}</span>
          <button onClick={() => buscar(pagina + 1)} disabled={pagina >= totalPags}
            className="px-2 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
        </div>
      </div>

      {/* ── Modal ver / crear / editar ─────────────────────────────────────── */}
      {modo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[820px] h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-800">
                  {modo === "crear" ? "Nueva remisión"
                    : modo === "editar" && activo ? `Editar ${activo.numero}`
                    : activo ? `Remisión ${activo.numero}`
                    : "Remisión"}
                </h2>
                {modo === "ver" && activo && (
                  <p className="text-[11px] text-gray-400">{activo.fecha} · {activo.cliente_nombre} · {activo.bodega_nombre}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {modo === "ver" && activo && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[activo.estado] ?? ""}`}>
                    {ESTADO_LABEL[activo.estado] ?? activo.estado}
                  </span>
                )}
                <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* ── MODO VER ──────────────────────────────────────────────────── */}
            {modo === "ver" && activo && (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="grid grid-cols-3 gap-4 text-[12px]">
                    <div>
                      <span className={lbl}>Cliente</span>
                      <p className="text-gray-800">{activo.cliente_nombre}</p>
                      {activo.cliente_nit && <p className="text-[11px] text-gray-400 font-mono">{activo.cliente_nit}</p>}
                    </div>
                    <div><span className={lbl}>Fecha</span><p className="text-gray-800">{activo.fecha}</p></div>
                    <div><span className={lbl}>Bodega</span><p className="text-gray-800">{activo.bodega_nombre}</p></div>
                    {activo.notas && <div className="col-span-3"><span className={lbl}>Notas</span><p className="text-gray-700">{activo.notas}</p></div>}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[680px] text-[11px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                          <th className="px-3 py-1.5 text-left">Producto</th>
                          <th className="px-3 py-1.5 text-right w-28">Cantidad</th>
                          <th className="px-3 py-1.5 text-left w-16">UM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activo.lineas.map((l) => (
                          <tr key={l.id} className="bg-white">
                            <td className="px-3 py-2">
                              <span className="font-mono text-blue-600 mr-1.5">{l.producto_codigo}</span>
                              {l.producto_nombre}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">
                              {parseFloat(l.cantidad).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{l.um_codigo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {despachoError && <p className="text-[11px] text-red-500">{despachoError}</p>}
                </div>

                <div className="flex justify-between gap-2 px-6 py-4 border-t border-gray-200">
                  <div />
                  <div className="flex gap-2">
                    {activo.estado === "borrador" && (
                      <button onClick={() => abrirEditar(activo)}
                        className="px-3 py-1.5 text-[12px] text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                        Editar
                      </button>
                    )}
                    {activo.estado === "borrador" && (
                      <button onClick={despachar} disabled={despachando}
                        className="px-4 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {despachando ? "Despachando…" : "Despachar"}
                      </button>
                    )}
                    {activo.estado === "despachada" && (
                      <a href={`/remision/${activo.id}`} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 text-[12px] text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                        Imprimir
                      </a>
                    )}
                    <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── MODO CREAR / EDITAR ───────────────────────────────────────── */}
            {(modo === "crear" || modo === "editar") && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Fecha + Bodega */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Fecha</label>
                      <input type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Bodega</label>
                      <select value={fBodegaId} onChange={(e) => onBodegaCambia(e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400">
                        {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Cliente</label>
                    <div className="relative">
                      <input value={fClienteQ} onChange={(e) => buscarCliente(e.target.value)}
                        onBlur={() => setTimeout(() => setFClienteOpen(false), 150)}
                        className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Buscar cliente por NIT o nombre…" />
                      {fClienteOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {fClienteOpts.map((c) => (
                            <button key={c.id} type="button"
                              onMouseDown={() => { setFClienteId(c.id); setFClienteQ(`${c.nit} — ${c.razon_social}`); setFClienteOpen(false); }}
                              className="w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50">
                              <span className="font-mono text-blue-600 mr-2">{c.nit}</span>
                              <span className="text-gray-700">{c.razon_social}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Notas</label>
                    <input value={fNotas} onChange={(e) => setFNotas(e.target.value)}
                      className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="Opcional…" />
                  </div>

                  {/* Líneas */}
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Productos</div>
                    <div className="border border-gray-200 rounded-lg">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-400">
                            <th className="px-3 py-1.5 text-left">Producto</th>
                            <th className="px-3 py-1.5 text-right w-24">Disponible</th>
                            <th className="px-3 py-1.5 text-right w-24">Cantidad</th>
                            <th className="px-3 py-1.5 text-left w-24 pl-2">UM</th>
                            <th className="px-3 py-1.5 w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineas.map((l, i) => {
                            const consumidoOtras = lineas.reduce((s, o, j) =>
                              j !== i && o.producto_id === l.producto_id ? s + (parseFloat(o.cantidad) || 0) : s, 0);
                            const maxDisp = l.stock !== null ? Math.max(0, parseFloat(l.stock) - consumidoOtras) : undefined;
                            const excede = maxDisp !== undefined && parseFloat(l.cantidad) > maxDisp;
                            return (
                              <tr key={i} className="bg-white">
                                <td className="px-3 py-1.5">
                                  <ProductoSearch value={l.producto_display} onChange={(id, prod) => onProductoSeleccionado(i, prod)} />
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  {l.stock !== null ? (
                                    <span className={`font-mono text-[11px] ${parseFloat(l.stock) - consumidoOtras <= 0 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                                      {(parseFloat(l.stock) - consumidoOtras).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                                    </span>
                                  ) : <span className="text-gray-300 text-[11px]">—</span>}
                                </td>
                                <td className="px-3 py-1.5">
                                  <input type="number" value={l.cantidad}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (maxDisp !== undefined && parseFloat(val) > maxDisp) return;
                                      setLineas((prev) => prev.map((x, j) => j === i ? { ...x, cantidad: val } : x));
                                    }}
                                    min="0" step="any" max={maxDisp}
                                    className={`w-full px-2 py-1 text-[12px] text-right border rounded focus:outline-none focus:ring-1 ${excede ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-blue-400"}`} />
                                </td>
                                <td className="px-3 py-1.5">
                                  <select value={l.um_id} onChange={(e) => setLineas((prev) => prev.map((x, j) => j === i ? { ...x, um_id: e.target.value } : x))}
                                    className="w-full px-2 py-1 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400">
                                    {l.ums.length === 0 && <option value="">—</option>}
                                    {l.ums.map((u) => <option key={u.id} value={u.id}>{u.codigo}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {lineas.length > 1 && (
                                    <button onClick={() => setLineas((prev) => prev.filter((_, j) => j !== i))}
                                      className="text-gray-300 hover:text-red-400 text-base leading-none">×</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={() => setLineas((prev) => [...prev, lineaVacia()])}
                      className="mt-2 text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1">
                      <span className="text-base leading-none">+</span> Agregar producto
                    </button>
                  </div>

                  {error && <p className="text-[11px] text-red-500">{error}</p>}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
                  <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button onClick={() => guardar(false)} disabled={saving}
                    className="px-4 py-2 text-[12px] text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">
                    {saving ? "Guardando…" : "Guardar borrador"}
                  </button>
                  <button onClick={() => guardar(true)} disabled={saving}
                    className="px-5 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50">
                    {saving ? "Guardando…" : "Guardar y despachar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal imprimir ────────────────────────────────────────────────── */}
      {despachado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">Remisión despachada</h2>
                <p className="text-[11px] text-gray-400">El inventario fue actualizado.</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-[12px] text-gray-600">¿Desea imprimir la remisión?</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setDespachado(null)}
                className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                No, cerrar
              </button>
              <button onClick={() => { window.open(`/remision/${despachado}`, "_blank"); setDespachado(null); }}
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
