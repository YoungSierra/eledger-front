"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Cuenta { id: string; codigo: string; nombre: string; }

interface Familia {
  id: string; codigo: string; nombre: string; descripcion: string | null; activo: boolean;
  cuenta_inventario_id: string | null;       cuenta_inventario_display: string | null;
  cuenta_costo_ventas_id: string | null;     cuenta_costo_ventas_display: string | null;
  cuenta_ingreso_id: string | null;          cuenta_ingreso_display: string | null;
  cuenta_devolucion_venta_id: string | null; cuenta_devolucion_venta_display: string | null;
  cuenta_devolucion_compra_id: string | null;cuenta_devolucion_compra_display: string | null;
  cuenta_ajuste_entrada_id: string | null;   cuenta_ajuste_entrada_display: string | null;
  cuenta_ajuste_salida_id: string | null;    cuenta_ajuste_salida_display: string | null;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY_CUENTAS = {
  cuenta_inventario_id: "",       cuenta_inventario_display: "",
  cuenta_costo_ventas_id: "",     cuenta_costo_ventas_display: "",
  cuenta_ingreso_id: "",          cuenta_ingreso_display: "",
  cuenta_devolucion_venta_id: "", cuenta_devolucion_venta_display: "",
  cuenta_devolucion_compra_id: "", cuenta_devolucion_compra_display: "",
  cuenta_ajuste_entrada_id: "",   cuenta_ajuste_entrada_display: "",
  cuenta_ajuste_salida_id: "",    cuenta_ajuste_salida_display: "",
};

const EMPTY = { codigo: "", nombre: "", descripcion: "", ...EMPTY_CUENTAS };

// Cuántas de las 7 cuentas contables están configuradas (lo que pinta la celda "Cuentas config.").
function contarCuentas(f: Familia) {
  return [
    f.cuenta_inventario_id, f.cuenta_costo_ventas_id, f.cuenta_ingreso_id,
    f.cuenta_devolucion_venta_id, f.cuenta_devolucion_compra_id,
    f.cuenta_ajuste_entrada_id, f.cuenta_ajuste_salida_id,
  ].filter(Boolean).length;
}

// ── Selector de cuenta con autocomplete ──────────────────────────────────────
function CuentaSearch({ label, cuentaId, cuentaDisplay, onChange }: {
  label: string; cuentaId: string; cuentaDisplay: string;
  onChange: (id: string, display: string) => void;
}) {
  const [q, setQ]             = useState(cuentaDisplay);
  const [opciones, setOpc]    = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(cuentaDisplay); }, [cuentaDisplay]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpc([]); setAbierto(false); onChange("", ""); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(
        `/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true&solo_movimiento=true`
      );
      setOpc(data.slice(0, 10)); setAbierto(data.length > 0);
    }, 300);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código o nombre..." className={inputCls} />
      {abierto && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
          {opciones.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { const d = `${c.codigo} — ${c.nombre}`; setQ(d); setAbierto(false); onChange(c.id, d); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="font-mono text-[11px] text-blue-600 mr-2">{c.codigo}</span>{c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function FamiliasPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Familia[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSolo]  = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;
  const { orden, alternar } = useOrden<
    "codigo" | "nombre" | "descripcion" | "cuentas" | "estado"
  >("codigo", "asc", () => setPagina(1));

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<Familia | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { cargar(); }, [soloActivas]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<Familia[]>(`/inventario/familias?solo_activas=${soloActivas}`);
      setLista(data); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() {
    setForm(EMPTY); setEditando(null); setError(""); setDrawer("crear");
  }

  function abrirEditar(f: Familia) {
    setForm({
      codigo: f.codigo, nombre: f.nombre, descripcion: f.descripcion ?? "",
      cuenta_inventario_id: f.cuenta_inventario_id ?? "",
      cuenta_inventario_display: f.cuenta_inventario_display ?? "",
      cuenta_costo_ventas_id: f.cuenta_costo_ventas_id ?? "",
      cuenta_costo_ventas_display: f.cuenta_costo_ventas_display ?? "",
      cuenta_ingreso_id: f.cuenta_ingreso_id ?? "",
      cuenta_ingreso_display: f.cuenta_ingreso_display ?? "",
      cuenta_devolucion_venta_id: f.cuenta_devolucion_venta_id ?? "",
      cuenta_devolucion_venta_display: f.cuenta_devolucion_venta_display ?? "",
      cuenta_devolucion_compra_id: f.cuenta_devolucion_compra_id ?? "",
      cuenta_devolucion_compra_display: f.cuenta_devolucion_compra_display ?? "",
      cuenta_ajuste_entrada_id: f.cuenta_ajuste_entrada_id ?? "",
      cuenta_ajuste_entrada_display: f.cuenta_ajuste_entrada_display ?? "",
      cuenta_ajuste_salida_id: f.cuenta_ajuste_salida_id ?? "",
      cuenta_ajuste_salida_display: f.cuenta_ajuste_salida_display ?? "",
    });
    setEditando(f); setError(""); setDrawer("editar");
  }

  function setCuenta(campo: string, id: string) {
    setForm(p => ({ ...p, [campo]: id }));
  }

  async function guardar() {
    if (!form.codigo.trim()) { setError("El código es obligatorio"); return; }
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        cuenta_inventario_id: form.cuenta_inventario_id || null,
        cuenta_costo_ventas_id: form.cuenta_costo_ventas_id || null,
        cuenta_ingreso_id: form.cuenta_ingreso_id || null,
        cuenta_devolucion_venta_id: form.cuenta_devolucion_venta_id || null,
        cuenta_devolucion_compra_id: form.cuenta_devolucion_compra_id || null,
        cuenta_ajuste_entrada_id: form.cuenta_ajuste_entrada_id || null,
        cuenta_ajuste_salida_id: form.cuenta_ajuste_salida_id || null,
      };
      if (drawer === "crear") {
        body.codigo = form.codigo.trim().toUpperCase();
        await apiFetch("/inventario/familias", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/inventario/familias/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(f: Familia) {
    try {
      await apiFetch(`/inventario/familias/${f.id}`, { method: "PUT", body: JSON.stringify({ activo: !f.activo }) });
      await cargar();
    } catch {}
  }

  const filtrados = lista.filter((f) =>
    f.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  // Se ordena la lista completa antes de paginar.
  const ordenada = ordenarFilas(filtrados, orden, {
    codigo:      (f) => f.codigo,
    nombre:      (f) => f.nombre,
    descripcion: (f) => f.descripcion,
    cuentas:     (f) => contarCuentas(f),
    estado:      (f) => (f.activo ? 1 : 0),
  });
  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Clasificación contable de productos</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva familia
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0 max-w-5xl">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSolo(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Solo activas
        </label>
      </div>

      <div className="flex-1 min-h-0 max-w-5xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="codigo"      orden={orden} alternar={alternar}>Código</Th>
                <Th campo="nombre"      orden={orden} alternar={alternar}>Nombre</Th>
                <Th campo="descripcion" orden={orden} alternar={alternar}>Descripción</Th>
                <Th campo="cuentas"     orden={orden} alternar={alternar}>Cuentas config.</Th>
                <Th campo="estado"      orden={orden} alternar={alternar}>Estado</Th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((f) => {
                const cuentasConfig = contarCuentas(f);
                return (
                  <tr key={f.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-[12px]">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-semibold text-blue-600">{f.codigo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-700">{f.nombre}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-400">{f.descripcion ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cuentasConfig === 7 ? "bg-green-50 text-green-700" : cuentasConfig > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
                        {cuentasConfig}/7
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${f.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {f.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => abrirEditar(f)} title="Editar"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => toggleActivo(f)} title={f.activo ? "Inactivar" : "Activar"}
                          className={`p-1.5 rounded-md transition-colors ${f.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                          {f.activo
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">{filtrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, filtrados.length)}`} de {filtrados.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nueva familia" : "Editar familia"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className={labelCls}>Código *</label>
                <input value={form.codigo}
                  onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="FAM-01" maxLength={20} disabled={drawer === "editar"}
                  className={`${inputCls} ${drawer === "editar" ? "bg-gray-50 text-gray-400" : ""}`} />
              </div>
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Mercancías generales" className={inputCls} maxLength={100} />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Opcional..." rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>

              <div className="pt-1 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-300 mb-3">Cuentas contables — opcionales</p>
                <div className="space-y-3">
                  <CuentaSearch label="Inventario"
                    cuentaId={form.cuenta_inventario_id} cuentaDisplay={form.cuenta_inventario_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_inventario_id: id, cuenta_inventario_display: d }))} />
                  <CuentaSearch label="Costo de ventas"
                    cuentaId={form.cuenta_costo_ventas_id} cuentaDisplay={form.cuenta_costo_ventas_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_costo_ventas_id: id, cuenta_costo_ventas_display: d }))} />
                  <CuentaSearch label="Ingresos"
                    cuentaId={form.cuenta_ingreso_id} cuentaDisplay={form.cuenta_ingreso_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_ingreso_id: id, cuenta_ingreso_display: d }))} />
                  <CuentaSearch label="Devolución en ventas"
                    cuentaId={form.cuenta_devolucion_venta_id} cuentaDisplay={form.cuenta_devolucion_venta_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_devolucion_venta_id: id, cuenta_devolucion_venta_display: d }))} />
                  <CuentaSearch label="Devolución a proveedor"
                    cuentaId={form.cuenta_devolucion_compra_id} cuentaDisplay={form.cuenta_devolucion_compra_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_devolucion_compra_id: id, cuenta_devolucion_compra_display: d }))} />
                  <CuentaSearch label="Ajuste entrada"
                    cuentaId={form.cuenta_ajuste_entrada_id} cuentaDisplay={form.cuenta_ajuste_entrada_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_ajuste_entrada_id: id, cuenta_ajuste_entrada_display: d }))} />
                  <CuentaSearch label="Ajuste salida"
                    cuentaId={form.cuenta_ajuste_salida_id} cuentaDisplay={form.cuenta_ajuste_salida_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_ajuste_salida_id: id, cuenta_ajuste_salida_display: d }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
