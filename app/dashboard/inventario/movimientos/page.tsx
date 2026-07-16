"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface MovListItem {
  id: string; numero: string | null; tipo: string; fecha: string;
  bodega_id: string; bodega_nombre: string; bodega_destino_nombre: string | null;
  descripcion: string | null; estado: string;
  origen_tipo: string | null; num_lineas: number; costo_total: string;
}
interface MovListResponse { items: MovListItem[]; total: number; pagina: number; por_pagina: number; }

interface MovLinea {
  id: string; producto_id: string; producto_codigo: string; producto_nombre: string;
  cantidad: string; um_id: string; um_codigo: string; costo_unitario: string; costo_total: string;
}
interface MovDetalle {
  id: string; numero: string | null; tipo: string; fecha: string;
  bodega_id: string; bodega_nombre: string;
  bodega_destino_id: string | null; bodega_destino_nombre: string | null;
  descripcion: string | null; estado: string; origen_tipo: string | null;
  asiento_id: string | null; lineas: MovLinea[]; costo_total: string;
}

interface Bodega { id: string; nombre: string; }
interface Producto { id: string; codigo: string; nombre: string; um_base_id: string; um_base_codigo: string; um_base_nombre: string; }
interface Um { id: string; codigo: string; nombre: string; }
interface SaldoInfo { costo_promedio: string; cantidad: string; }

interface AjusteLinea { producto_id: string; producto_nombre: string; cantidad: string; um_id: string; costo_unitario: string; }
interface UmProducto { id: string; codigo: string; nombre: string; }

const TIPOS = [
  { value: "ENTRADA_COMPRA",      label: "Entrada compra" },
  { value: "SALIDA_VENTA",        label: "Salida venta" },
  { value: "AJUSTE_ENTRADA",      label: "Ajuste entrada" },
  { value: "AJUSTE_SALIDA",       label: "Ajuste salida" },
  { value: "TRASLADO_SALIDA",     label: "Traslado" },
  { value: "DEVOLUCION_CLIENTE",  label: "Devolución cliente" },
  { value: "DEVOLUCION_PROVEEDOR","label": "Devolución proveedor" },
];
const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map(t => [t.value, t.label]));

const ESTADO_BADGE: Record<string, string> = {
  confirmado: "bg-green-100 text-green-700",
  borrador:   "bg-yellow-100 text-yellow-700",
  anulado:    "bg-red-100 text-red-700",
};

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}
function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v)); if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
// El encabezado de esta tabla es azul oscuro, pero <Th> pinta el texto en gris
// (pensado para encabezados claros). Se restaura el blanco, también en hover.
const thOscuro = "text-white [&>button:hover]:text-white";

// ─── Buscador de producto con autocomplete ────────────────────────────────

function ProductoSearch({ value, label, onChange }: {
  value: string; label: string;
  onChange: (id: string, nombre: string, prod: Producto) => void;
}) {
  const [q, setQ]     = useState(label);
  const [opts, setOpts] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref      = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(label); }, [label]);

  useEffect(() => {
    if (!q || q === label) { setOpts([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch<any>(`/inventario/productos?q=${encodeURIComponent(q)}&solo_inventariables=true&limit=10`);
        setOpts(r.items ?? r);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q, label]);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleFocus() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      <input ref={inputRef} value={q} onChange={handleChange} onFocus={handleFocus}
        placeholder="Buscar producto…"
        className={inp + " w-full"} />
      {open && opts.length > 0 && rect && (
        <div style={{
          position: "fixed", zIndex: 9999,
          top: rect.bottom + 4, left: rect.left, width: rect.width,
        }} className="bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto">
          {opts.map(p => (
            <button key={p.id} type="button"
              className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50"
              onMouseDown={() => { onChange(p.id, `${p.codigo} — ${p.nombre}`, p); setQ(`${p.codigo} — ${p.nombre}`); setOpen(false); }}>
              <span className="font-mono text-blue-600 mr-2">{p.codigo}</span>{p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal detalle ────────────────────────────────────────────────────────

function ModalDetalle({ movId, onClose, onPublicado, onEditar }: { movId: string; onClose: () => void; onPublicado?: (id: string) => void; onEditar?: (det: MovDetalle) => void }) {
  const [det, setDet]         = useState<MovDetalle | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pubError, setPubError]     = useState("");

  useEffect(() => {
    apiFetch<MovDetalle>(`/inventario/movimientos/${movId}`).then(setDet).catch(() => {});
  }, [movId]);

  async function publicar() {
    setPublishing(true); setPubError("");
    try {
      await apiFetch(`/inventario/movimientos/${movId}/publicar`, { method: "POST" });
      onPublicado?.(movId);
      onClose();
    } catch (e: unknown) {
      setPubError(e instanceof Error ? e.message : "Error al publicar");
    } finally { setPublishing(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              {det?.numero && <span className="font-mono text-[12px] text-blue-600 font-semibold">{det.numero}</span>}
              <span className="font-bold text-[13px] text-gray-800">
                {det ? TIPO_LABEL[det.tipo] ?? det.tipo : "Cargando…"}
              </span>
            </div>
            {det && (
              <span className="text-[11px] text-gray-400">
                {det.fecha} · {det.bodega_nombre}
                {det.bodega_destino_nombre && (
                  <> <span className="mx-1 text-gray-300">→</span> <span className="text-gray-500 font-medium">{det.bodega_destino_nombre}</span></>
                )}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        {det && (
          <>
            {det.descripcion && (
              <div className="px-6 py-2 text-[12px] text-gray-500 border-b border-gray-50">{det.descripcion}</div>
            )}
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[760px] text-[12px]">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white text-[10px] uppercase">
                    <th className="px-4 py-2 text-left">Código</th>
                    <th className="px-4 py-2 text-left">Producto</th>
                    <th className="px-4 py-2 text-right w-28">Cantidad</th>
                    <th className="px-4 py-2 text-center w-14">UM</th>
                    <th className="px-4 py-2 text-right w-32">Costo unit.</th>
                    <th className="px-4 py-2 text-right w-32">Costo total</th>
                  </tr>
                </thead>
                <tbody>
                  {det.lineas.map(ln => (
                    <tr key={ln.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className="px-4 py-2 font-mono text-blue-600 text-[11px]">{ln.producto_codigo}</td>
                      <td className="px-4 py-2 text-gray-800">{ln.producto_nombre}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(ln.cantidad, 4)}</td>
                      <td className="px-4 py-2 text-center text-gray-400">{ln.um_codigo}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(ln.costo_unitario)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(ln.costo_total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#1e3a5f]">
                    <td colSpan={5} className="px-4 py-2 text-right text-[11px] font-bold uppercase text-white">Total</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-white">{fmt(det.costo_total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {det.estado === "confirmado" && (
              <div className="flex justify-end px-6 py-3 border-t border-gray-100 gap-2">
                <button onClick={() => window.open(`/movimiento/${det.id}`, "_blank")}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Imprimir
                </button>
                <button onClick={onClose}
                  className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                  Cerrar
                </button>
              </div>
            )}
            {det.estado === "borrador" && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-yellow-50/60">
                <div>
                  <span className="text-[11px] text-yellow-700 font-medium">Borrador — sin efecto en inventario</span>
                  {pubError && <span className="ml-3 text-[11px] text-red-600">{pubError}</span>}
                </div>
                <div className="flex gap-2">
                  {onEditar && (
                    <button onClick={() => onEditar(det)}
                      className="px-4 py-1.5 border border-gray-300 text-[12px] text-gray-700 rounded-md hover:bg-gray-50">
                      Editar
                    </button>
                  )}
                  <button onClick={publicar} disabled={publishing}
                    className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {publishing ? "Publicando…" : "Publicar"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal nuevo movimiento ───────────────────────────────────────────────

function ModalAjuste({ bodegas, ums, onClose, onSaved, editando }: {
  bodegas: Bodega[]; ums: Um[];
  onClose: () => void; onSaved: (publicadoId?: string) => void;
  editando?: MovDetalle;
}) {
  function tipoEdicion(tipo: string) {
    if (tipo === "TRASLADO_SALIDA" || tipo === "TRASLADO_ENTRADA") return "TRASLADO";
    return tipo;
  }
  const [tipo, setTipo]           = useState(editando ? tipoEdicion(editando.tipo) : "AJUSTE_ENTRADA");
  const [fecha, setFecha]         = useState(editando?.fecha ?? hoyLocal());
  const [bodegaId, setBodegaId]   = useState(editando?.bodega_id ?? bodegas[0]?.id ?? "");
  const [bodegaDestId, setBodegaDestId] = useState(editando?.bodega_destino_id ?? "");
  const [desc, setDesc]           = useState(editando?.descripcion ?? "");
  const [lineas, setLineas]       = useState<AjusteLinea[]>(
    editando?.lineas.length
      ? editando.lineas.map(l => ({
          producto_id: l.producto_id,
          producto_nombre: `${l.producto_codigo} — ${l.producto_nombre}`,
          cantidad: l.cantidad,
          um_id: l.um_id,
          costo_unitario: l.costo_unitario,
        }))
      : [{ producto_id: "", producto_nombre: "", cantidad: "", um_id: ums[0]?.id ?? "", costo_unitario: "" }]
  );
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [umsPorLinea, setUmsPorLinea] = useState<Record<number, UmProducto[]>>({});

  useEffect(() => {
    if (!editando?.lineas) return;
    editando.lineas.forEach((ln, i) => {
      if (!ln.producto_id) return;
      apiFetch<any[]>(`/inventario/productos?q=${encodeURIComponent(ln.producto_codigo)}&limit=5`)
        .then(res => {
          const arr: Producto[] = (res as any).items ?? res;
          const prod = arr.find(p => p.id === ln.producto_id);
          if (prod) cargarUmsProducto(i, prod);
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const esTraslado = tipo === "TRASLADO";

  async function cargarUmsProducto(idx: number, prod: Producto) {
    try {
      const alternas = await apiFetch<any[]>(`/inventario/productos/${prod.id}/unidades`).catch(() => []);
      const lista: UmProducto[] = [
        { id: prod.um_base_id, codigo: prod.um_base_codigo, nombre: prod.um_base_nombre },
        ...(alternas ?? [])
          .filter((a: any) => a.activo)
          .map((a: any) => ({ id: a.um_id, codigo: a.um_codigo, nombre: a.um_nombre })),
      ];
      setUmsPorLinea(prev => ({ ...prev, [idx]: lista }));
      setLineas(prev => prev.map((l, i) =>
        i === idx && !lista.find(u => u.id === l.um_id)
          ? { ...l, um_id: lista[0].id }
          : l
      ));
    } catch {}
  }

  async function cargarCosto(idx: number, productoId: string, bodega?: string) {
    const bid = bodega ?? bodegaId;
    if (!productoId || !bid) return;
    try {
      const r = await apiFetch<any>(`/inventario/saldos?producto_id=${productoId}&bodega_id=${bid}`);
      const item = r.items?.[0];
      if (item) {
        setLineas(prev => prev.map((l, i) =>
          i === idx ? { ...l, costo_unitario: item.costo_promedio } : l
        ));
      }
    } catch {}
  }

  function addLinea() {
    setLineas(p => [...p, { producto_id: "", producto_nombre: "", cantidad: "", um_id: ums[0]?.id ?? "", costo_unitario: "" }]);
  }
  function removeLinea(i: number) { setLineas(p => p.filter((_, j) => j !== i)); }
  function setLinea(i: number, field: keyof AjusteLinea, val: string) {
    setLineas(p => p.map((l, j) => j === i ? { ...l, [field]: val } : l));
  }

  async function guardar(publicar = false) {
    if (!bodegaId) { setError("Selecciona bodega origen"); return; }
    if (esTraslado && !bodegaDestId) { setError("Selecciona bodega destino"); return; }
    if (esTraslado && bodegaId === bodegaDestId) { setError("Bodega origen y destino deben ser diferentes"); return; }
    const lineasValidas = lineas.filter(l => l.producto_id && parseFloat(l.cantidad) > 0);
    if (!lineasValidas.length) { setError("Agrega al menos una línea válida"); return; }

    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        tipo, fecha, bodega_id: bodegaId,
        descripcion: desc || null,
        publicar,
        lineas: lineasValidas.map(l => ({
          producto_id: l.producto_id,
          cantidad: parseFloat(l.cantidad),
          um_id: l.um_id,
          costo_unitario: parseFloat(l.costo_unitario) || 0,
        })),
      };
      if (esTraslado) body.bodega_destino_id = bodegaDestId;

      const url    = editando ? `/inventario/movimientos/${editando.id}` : "/inventario/movimientos";
      const method = editando ? "PUT" : "POST";
      const res = await apiFetch<{ id: string; estado: string }>(url, { method, body: JSON.stringify(body) });
      onSaved(publicar && res.estado === "confirmado" ? res.id : undefined);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  const titulosModal: Record<string, string> = {
    AJUSTE_ENTRADA: "Ajuste de entrada",
    AJUSTE_SALIDA:  "Ajuste de salida",
    TRASLADO:       "Traslado entre bodegas",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[820px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="font-bold text-[13px] text-gray-800">
            {editando ? `Editar borrador ${editando.numero ?? ""}` : "Nuevo movimiento de inventario"}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Encabezado */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-44 flex-none">
                <label className={lbl}>Tipo</label>
                <select value={tipo} onChange={e => { setTipo(e.target.value); setBodegaDestId(""); }} className={inp + " w-full"}>
                  <option value="AJUSTE_ENTRADA">Ajuste entrada</option>
                  <option value="AJUSTE_SALIDA">Ajuste salida</option>
                  <option value="TRASLADO">Traslado</option>
                </select>
              </div>
              <div className="w-36 flex-none">
                <label className={lbl}>Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inp + " w-full"} />
              </div>
              <div className="flex-1">
                <label className={lbl}>{esTraslado ? "Bodega origen" : "Bodega"}</label>
                <select value={bodegaId} onChange={e => setBodegaId(e.target.value)} className={inp + " w-full"}>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              {esTraslado && (
                <div className="flex-1">
                  <label className={lbl}>Bodega destino</label>
                  <select value={bodegaDestId} onChange={e => setBodegaDestId(e.target.value)} className={inp + " w-full"}>
                    <option value="">— Seleccionar —</option>
                    {bodegas.filter(b => b.id !== bodegaId).map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className={lbl}>Descripción</label>
              <input value={desc} onChange={e => setDesc(e.target.value)}
                placeholder={esTraslado ? "Motivo del traslado…" : "Conteo físico, merma…"}
                className={inp + " w-full"} />
            </div>
          </div>

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Líneas</span>
              <button type="button" onClick={addLinea}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">+ Agregar línea</button>
            </div>
            <table className="w-full min-w-[680px] text-[12px]">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right w-32">Cantidad</th>
                  <th className="px-3 py-2 text-center w-36">UM</th>
                  <th className="px-3 py-2 text-right w-40">Costo unit.</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-1.5">
                      <ProductoSearch value={l.producto_id} label={l.producto_nombre}
                        onChange={(id, nombre, prod) => {
                          setLinea(i, "producto_id", id);
                          setLinea(i, "producto_nombre", nombre);
                          cargarUmsProducto(i, prod);
                          cargarCosto(i, id);
                        }} />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" min="0" step="0.0001" value={l.cantidad}
                        onChange={e => setLinea(i, "cantidad", e.target.value)}
                        className={inp + " w-full text-right"} />
                    </td>
                    <td className="px-3 py-1.5">
                      <select value={l.um_id} onChange={e => setLinea(i, "um_id", e.target.value)}
                        className={inp + " w-full"}>
                        {(umsPorLinea[i] ?? ums).map(u => <option key={u.id} value={u.id}>{u.codigo}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <MontoInput value={l.costo_unitario} onChange={v => setLinea(i, "costo_unitario", v)}
                        decimales={2} className={inp + " w-full text-right"} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {lineas.length > 1 && (
                        <button type="button" onClick={() => removeLinea(i)}
                          className="text-red-400 hover:text-red-600 text-[13px]">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-1.5 border border-gray-200 text-[12px] text-gray-600 rounded-md hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => guardar(false)} disabled={saving}
            className="px-4 py-1.5 border border-blue-300 text-[12px] text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar borrador"}
          </button>
          <button onClick={() => guardar(true)} disabled={saving}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar y publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────

export default function MovimientosPage() {
  usePageTitle();

  const [desde,    setDesde]    = useState(primerDiaMes());
  const [hasta,    setHasta]    = useState(hoyLocal());
  const [tipo,     setTipo]     = useState("");
  const [bodegaId, setBodegaId] = useState("");
  const [estado,   setEstado]   = useState("");
  const [pagina,   setPagina]   = useState(1);
  const { orden, alternar } = useOrden<
    "numero" | "fecha" | "tipo" | "descripcion" | "bodega" | "lineas" | "costo" | "estado"
  >("fecha", "desc");

  const [data,     setData]     = useState<MovListResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [bodegas,  setBodegas]  = useState<Bodega[]>([]);
  const [ums,      setUms]      = useState<Um[]>([]);

  const [detId,       setDetId]       = useState<string | null>(null);
  const [showAjuste,  setShowAjuste]  = useState(false);
  const [editandoMov, setEditandoMov] = useState<MovDetalle | null>(null);
  const [publicadoId, setPublicadoId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<any>("/inventario/bodegas").then(d => setBodegas(d.items ?? d)).catch(() => {});
    apiFetch<any>("/inventario/unidades-medida").then(d => setUms(d.items ?? d)).catch(() => {});
  }, []);

  const buscar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: "30" });
      if (desde)    p.set("fecha_desde", desde);
      if (hasta)    p.set("fecha_hasta", hasta);
      if (tipo)     p.set("tipo", tipo);
      if (bodegaId) p.set("bodega_id", bodegaId);
      if (estado)   p.set("estado", estado);
      setData(await apiFetch<MovListResponse>(`/inventario/movimientos?${p}`));
      setPagina(pag);
    } catch {} finally { setLoading(false); }
  }, [desde, hasta, tipo, bodegaId, estado]);

  useEffect(() => { buscar(1); }, []);

  const totalPags = data ? Math.ceil(data.total / data.por_pagina) : 0;
  const ini = data ? (data.pagina - 1) * data.por_pagina + 1 : 0;
  const fin = data ? Math.min(data.pagina * data.por_pagina, data.total) : 0;

  // La paginación es del servidor: se ordenan las filas de la página actual.
  const ordenados = ordenarFilas(data?.items ?? [], orden, {
    numero:      (m) => m.numero,
    fecha:       (m) => m.fecha,
    tipo:        (m) => TIPO_LABEL[m.tipo] ?? m.tipo,
    descripcion: (m) => m.descripcion,
    bodega:      (m) => `${m.bodega_nombre}${m.bodega_destino_nombre ? ` → ${m.bodega_destino_nombre}` : ""}`,
    lineas:      (m) => m.num_lineas,
    costo:       (m) => Number(m.costo_total),
    estado:      (m) => m.estado,
  });

  return (
    <div className="h-full flex flex-col">
      {/* Filtros */}
      <div className="flex-none border-b border-gray-100 px-5 py-3 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={lbl}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inp}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Bodega</label>
            <select value={bodegaId} onChange={e => setBodegaId(e.target.value)} className={inp}>
              <option value="">Todas</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className={inp}>
              <option value="">Todos</option>
              <option value="confirmado">Confirmado</option>
              <option value="borrador">Borrador</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <button onClick={() => buscar(1)} disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Buscando…" : "Buscar"}
          </button>
          <button onClick={() => setShowAjuste(true)}
            className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo movimiento
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#1e3a5f] text-white text-[10px] font-bold uppercase">
              <Th campo="numero"      orden={orden} alternar={alternar} className={`${thOscuro} w-24`}>Número</Th>
              <Th campo="fecha"       orden={orden} alternar={alternar} className={`${thOscuro} w-28`}>Fecha</Th>
              <Th campo="tipo"        orden={orden} alternar={alternar} className={`${thOscuro} w-40`}>Tipo</Th>
              <Th campo="descripcion" orden={orden} alternar={alternar} className={`${thOscuro} w-44`}>Descripción</Th>
              <Th campo="bodega"      orden={orden} alternar={alternar} className={`${thOscuro} w-80`}>Bodega</Th>
              <Th campo="lineas"      orden={orden} alternar={alternar} align="center" className={`${thOscuro} w-16`}>Líneas</Th>
              <Th campo="costo"       orden={orden} alternar={alternar} align="right"  className={`${thOscuro} w-36`}>Costo total</Th>
              <Th campo="estado"      orden={orden} alternar={alternar} align="center" className={`${thOscuro} w-24`}>Estado</Th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {!data || ordenados.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-[13px] text-gray-400">
                {loading ? "Cargando…" : "Sin movimientos en el período"}
              </td></tr>
            ) : ordenados.map(m => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                <td className="px-4 py-2 font-mono text-[11px] text-blue-600">{m.numero ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-gray-500">{m.fecha}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                <td className="px-4 py-2 text-gray-500 text-[11px] truncate max-w-[176px]">{m.descripcion ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{m.bodega_nombre}{m.bodega_destino_nombre ? ` → ${m.bodega_destino_nombre}` : ""}</td>
                <td className="px-4 py-2 text-center text-gray-500">{m.num_lineas}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(m.costo_total)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[m.estado] ?? "bg-gray-100 text-gray-600"}`}>
                    {m.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => setDetId(m.id)}
                    className="text-gray-400 hover:text-blue-600" title="Ver detalle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data && data.total > 0 && (
        <div className="flex-none border-t border-gray-100 px-5 py-2 flex items-center justify-between bg-white">
          <span className="text-[11px] text-gray-400">{ini}–{fin} de {data.total}</span>
          <div className="flex gap-1">
            <button onClick={() => buscar(pagina - 1)} disabled={pagina <= 1}
              className="px-2.5 py-1 text-[11px] border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-600">{pagina} / {totalPags}</span>
            <button onClick={() => buscar(pagina + 1)} disabled={pagina >= totalPags}
              className="px-2.5 py-1 text-[11px] border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        </div>
      )}

      {/* Modales */}
      {detId && (
        <ModalDetalle movId={detId}
          onClose={() => setDetId(null)}
          onPublicado={(id) => { setDetId(null); buscar(pagina); setPublicadoId(id); }}
          onEditar={(det) => { setDetId(null); setEditandoMov(det); }} />
      )}

      {publicadoId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">Movimiento publicado</h2>
                <p className="text-[11px] text-gray-400">El inventario y el asiento contable han sido generados.</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-[12px] text-gray-600">¿Desea imprimir el movimiento?</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setPublicadoId(null)}
                className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                No, cerrar
              </button>
              <button onClick={() => { window.open(`/movimiento/${publicadoId}`, "_blank"); setPublicadoId(null); }}
                className="px-5 py-2 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
      {(showAjuste || editandoMov) && (
        <ModalAjuste bodegas={bodegas} ums={ums}
          editando={editandoMov ?? undefined}
          onClose={() => { setShowAjuste(false); setEditandoMov(null); }}
          onSaved={(pid) => { setShowAjuste(false); setEditandoMov(null); buscar(1); if (pid) setPublicadoId(pid); }} />
      )}
    </div>
  );
}
