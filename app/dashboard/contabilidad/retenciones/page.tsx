"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Retencion {
  id: string; tipo: string; nombre: string;
  porcentaje: string; base_minima: string | null;
  cuenta_compras_id: string | null;
  cuenta_compras_codigo: string | null;
  cuenta_compras_nombre: string | null;
  cuenta_ventas_id: string | null;
  cuenta_ventas_codigo: string | null;
  cuenta_ventas_nombre: string | null;
  aplica_compra: boolean; aplica_venta: boolean; activo: boolean;
}
interface Cuenta { id: string; codigo: string; nombre: string; }

const TIPO_LABEL: Record<string, string> = { RETEFUENTE: "Retefuente", RETEICA: "ReteICA", RETEIVA: "ReteIVA" };
const TIPO_STYLE: Record<string, string> = {
  RETEFUENTE: "bg-blue-50 text-blue-700",
  RETEICA:    "bg-violet-50 text-violet-700",
  RETEIVA:    "bg-amber-50 text-amber-700",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY = {
  tipo: "RETEFUENTE", nombre: "", porcentaje: "",
  base_minima: "",
  cuenta_compras_id: "", cuenta_compras_display: "",
  cuenta_ventas_id: "", cuenta_ventas_display: "",
  aplica_compra: true, aplica_venta: true,
};

function CuentaSearch({ label, cuentaId, cuentaDisplay, onChange }: {
  label: string; cuentaId: string; cuentaDisplay: string; onChange: (id: string) => void;
}) {
  const [q, setQ] = useState(cuentaDisplay);
  const [opciones, setOpciones] = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(cuentaDisplay); }, [cuentaDisplay]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpciones([]); setAbierto(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(`/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true`);
      setOpciones(data.slice(0, 10)); setAbierto(data.length > 0);
    }, 300);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código o nombre..." className={inputCls} />
      {abierto && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {opciones.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { setQ(`${c.codigo} — ${c.nombre}`); setAbierto(false); onChange(c.id); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="font-mono text-[11px] text-blue-600 mr-2">{c.codigo}</span>{c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RetencionesPage() {
  const title = usePageTitle();
  const [lista, setLista]         = useState<Retencion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);
  const [pagina, setPagina]       = useState(1);
  const porPagina                 = 20;
  // El backend lista por tipo asc (y % desc dentro de cada tipo) — ese es el orden inicial.
  const { orden, alternar } = useOrden<
    "tipo" | "nombre" | "porcentaje" | "base_minima" | "cuenta_compras" | "cuenta_ventas"
    | "aplica_compra" | "aplica_venta" | "estado"
  >("tipo", "asc", () => setPagina(1));

  const [drawer, setDrawer]       = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando]   = useState<Retencion | null>(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => { cargar(); }, [soloActivas, filtroTipo]);

  async function cargar() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("solo_activas", String(soloActivas));
      if (filtroTipo) params.set("tipo", filtroTipo);
      const data = await apiFetch<Retencion[]>(`/maestros/retenciones?${params}`);
      setLista(data); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() {
    setForm(EMPTY); setEditando(null); setError(""); setDrawer("crear");
  }

  function abrirEditar(r: Retencion) {
    setForm({
      tipo: r.tipo, nombre: r.nombre,
      porcentaje: String(parseFloat(r.porcentaje)),
      base_minima: r.base_minima ? String(parseFloat(r.base_minima)) : "",
      cuenta_compras_id: r.cuenta_compras_id ?? "",
      cuenta_compras_display: r.cuenta_compras_id ? `${r.cuenta_compras_codigo} — ${r.cuenta_compras_nombre}` : "",
      cuenta_ventas_id: r.cuenta_ventas_id ?? "",
      cuenta_ventas_display: r.cuenta_ventas_id ? `${r.cuenta_ventas_codigo} — ${r.cuenta_ventas_nombre}` : "",
      aplica_compra: r.aplica_compra, aplica_venta: r.aplica_venta,
    });
    setEditando(r); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.porcentaje) { setError("Nombre y porcentaje son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        tipo: form.tipo, nombre: form.nombre,
        porcentaje: parseFloat(form.porcentaje),
        base_minima: form.base_minima ? parseFloat(form.base_minima) : null,
        cuenta_compras_id: form.cuenta_compras_id || null,
        cuenta_ventas_id: form.cuenta_ventas_id || null,
        aplica_compra: form.aplica_compra,
        aplica_venta: form.aplica_venta,
      };
      if (drawer === "crear") {
        await apiFetch("/maestros/retenciones", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/maestros/retenciones/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(r: Retencion) {
    try {
      await apiFetch(`/maestros/retenciones/${r.id}`, { method: "PUT", body: JSON.stringify({ activo: !r.activo }) });
      await cargar();
    } catch {}
  }

  const filtradas = lista.filter((r) => r.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  // Se ordena la lista completa antes de paginar.
  const ordenada = ordenarFilas(filtradas, orden, {
    tipo:           (r) => TIPO_LABEL[r.tipo] ?? r.tipo,
    nombre:         (r) => r.nombre,
    porcentaje:     (r) => Number(r.porcentaje),
    base_minima:    (r) => (r.base_minima === null ? null : Number(r.base_minima)),
    cuenta_compras: (r) => r.cuenta_compras_codigo,
    cuenta_ventas:  (r) => r.cuenta_ventas_codigo,
    aplica_compra:  (r) => (r.aplica_compra ? 1 : 0),
    aplica_venta:   (r) => (r.aplica_venta ? 1 : 0),
    estado:         (r) => (r.activo ? 1 : 0),
  });
  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Tarifas de Retefuente, ReteICA y ReteIVA vinculadas al plan de cuentas</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva retención
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          <option value="RETEFUENTE">Retefuente</option>
          <option value="RETEICA">ReteICA</option>
          <option value="RETEIVA">ReteIVA</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-600" />
          Solo activas
        </label>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="tipo"           orden={orden} alternar={alternar}>Tipo</Th>
                <Th campo="nombre"         orden={orden} alternar={alternar}>Nombre</Th>
                <Th campo="porcentaje"     orden={orden} alternar={alternar}>%</Th>
                <Th campo="base_minima"    orden={orden} alternar={alternar}>Base mínima</Th>
                <Th campo="cuenta_compras" orden={orden} alternar={alternar}>Cta. compras</Th>
                <Th campo="cuenta_ventas"  orden={orden} alternar={alternar}>Cta. ventas</Th>
                <Th campo="aplica_compra"  orden={orden} alternar={alternar}>Compra</Th>
                <Th campo="aplica_venta"   orden={orden} alternar={alternar}>Venta</Th>
                <Th campo="estado"         orden={orden} alternar={alternar}>Estado</Th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_STYLE[r.tipo] ?? "bg-gray-100 text-gray-500"}`}>
                        {TIPO_LABEL[r.tipo] ?? r.tipo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-700 font-semibold">{parseFloat(r.porcentaje)}%</td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">
                    {r.base_minima ? `$ ${parseFloat(r.base_minima).toLocaleString("es-CO", { maximumFractionDigits: 0 })}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-gray-500">{r.cuenta_compras_codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-gray-500">{r.cuenta_ventas_codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {r.aplica_compra ? <span className="text-green-600 text-[13px]">✓</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.aplica_venta ? <span className="text-green-600 text-[13px]">✓</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => abrirEditar(r)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActivo(r)} title={r.activo ? "Inactivar" : "Activar"}
                        className={`p-1.5 rounded-md transition-colors ${r.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                        {r.activo
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">{filtradas.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, filtradas.length)}`} de {filtradas.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* Overlay + Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nueva retención" : "Editar retención"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className={labelCls}>Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                  <option value="RETEFUENTE">Retefuente</option>
                  <option value="RETEICA">ReteICA</option>
                  <option value="RETEIVA">ReteIVA</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Retefuente servicios 11%" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Porcentaje (%) *</label>
                  <input type="number" min={0} max={100} step={0.0001}
                    value={form.porcentaje} onChange={(e) => setForm(p => ({ ...p, porcentaje: e.target.value }))}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Base mínima ($)</label>
                  <input type="number" min={0}
                    value={form.base_minima} onChange={(e) => setForm(p => ({ ...p, base_minima: e.target.value }))}
                    className={inputCls} placeholder="Opcional" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Aplica a</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.aplica_compra}
                      onChange={(e) => setForm(p => ({ ...p, aplica_compra: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600" />
                    Compras
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.aplica_venta}
                      onChange={(e) => setForm(p => ({ ...p, aplica_venta: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600" />
                    Ventas
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Cuentas PUC</p>
                <div className="space-y-3">
                  <CuentaSearch label="Cuenta retención compras"
                    cuentaId={form.cuenta_compras_id}
                    cuentaDisplay={form.cuenta_compras_display}
                    onChange={(id) => setForm(p => ({ ...p, cuenta_compras_id: id }))} />
                  <CuentaSearch label="Cuenta retención ventas"
                    cuentaId={form.cuenta_ventas_id}
                    cuentaDisplay={form.cuenta_ventas_display}
                    onChange={(id) => setForm(p => ({ ...p, cuenta_ventas_id: id }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setDrawer(null)}
                className="flex-1 px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
