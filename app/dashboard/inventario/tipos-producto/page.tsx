"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Cuenta { id: string; codigo: string; nombre: string; }

interface TipoProducto {
  id: string; codigo: string; nombre: string; maneja_inventario: boolean;
  cuenta_inventario_id: string | null;        cuenta_inventario_display: string | null;
  cuenta_costo_ventas_id: string | null;      cuenta_costo_ventas_display: string | null;
  cuenta_ingreso_id: string | null;           cuenta_ingreso_display: string | null;
  cuenta_devolucion_venta_id: string | null;  cuenta_devolucion_venta_display: string | null;
  cuenta_devolucion_compra_id: string | null; cuenta_devolucion_compra_display: string | null;
  cuenta_ajuste_entrada_id: string | null;    cuenta_ajuste_entrada_display: string | null;
  cuenta_ajuste_salida_id: string | null;     cuenta_ajuste_salida_display: string | null;
}

const TIPO_COLOR: Record<string, string> = {
  MERCANCIA:    "bg-blue-50 text-blue-700",
  SERVICIO:     "bg-purple-50 text-purple-700",
  MATERIA_PRIMA:"bg-amber-50 text-amber-700",
  INSUMO:       "bg-gray-100 text-gray-600",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY_FORM = {
  cuenta_inventario_id: "",       cuenta_inventario_display: "",
  cuenta_costo_ventas_id: "",     cuenta_costo_ventas_display: "",
  cuenta_ingreso_id: "",          cuenta_ingreso_display: "",
  cuenta_devolucion_venta_id: "", cuenta_devolucion_venta_display: "",
  cuenta_devolucion_compra_id: "", cuenta_devolucion_compra_display: "",
  cuenta_ajuste_entrada_id: "",   cuenta_ajuste_entrada_display: "",
  cuenta_ajuste_salida_id: "",    cuenta_ajuste_salida_display: "",
};

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
        placeholder="Buscar cuenta…" className={inputCls} />
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

export default function TiposProductoPage() {
  const title = usePageTitle();
  const [lista, setLista]     = useState<TipoProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer]   = useState<TipoProducto | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<TipoProducto[]>("/inventario/tipos-producto");
      setLista(data);
    } finally { setLoading(false); }
  }

  function abrirEditar(t: TipoProducto) {
    setForm({
      cuenta_inventario_id: t.cuenta_inventario_id ?? "",
      cuenta_inventario_display: t.cuenta_inventario_display ?? "",
      cuenta_costo_ventas_id: t.cuenta_costo_ventas_id ?? "",
      cuenta_costo_ventas_display: t.cuenta_costo_ventas_display ?? "",
      cuenta_ingreso_id: t.cuenta_ingreso_id ?? "",
      cuenta_ingreso_display: t.cuenta_ingreso_display ?? "",
      cuenta_devolucion_venta_id: t.cuenta_devolucion_venta_id ?? "",
      cuenta_devolucion_venta_display: t.cuenta_devolucion_venta_display ?? "",
      cuenta_devolucion_compra_id: t.cuenta_devolucion_compra_id ?? "",
      cuenta_devolucion_compra_display: t.cuenta_devolucion_compra_display ?? "",
      cuenta_ajuste_entrada_id: t.cuenta_ajuste_entrada_id ?? "",
      cuenta_ajuste_entrada_display: t.cuenta_ajuste_entrada_display ?? "",
      cuenta_ajuste_salida_id: t.cuenta_ajuste_salida_id ?? "",
      cuenta_ajuste_salida_display: t.cuenta_ajuste_salida_display ?? "",
    });
    setError(""); setDrawer(t);
  }

  async function guardar() {
    if (!drawer) return;
    setSaving(true); setError("");
    try {
      await apiFetch(`/inventario/tipos-producto/${drawer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          cuenta_inventario_id: form.cuenta_inventario_id || null,
          cuenta_costo_ventas_id: form.cuenta_costo_ventas_id || null,
          cuenta_ingreso_id: form.cuenta_ingreso_id || null,
          cuenta_devolucion_venta_id: form.cuenta_devolucion_venta_id || null,
          cuenta_devolucion_compra_id: form.cuenta_devolucion_compra_id || null,
          cuenta_ajuste_entrada_id: form.cuenta_ajuste_entrada_id || null,
          cuenta_ajuste_salida_id: form.cuenta_ajuste_salida_id || null,
        }),
      });
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  function cuentasConfig(t: TipoProducto) {
    return [
      t.cuenta_inventario_id, t.cuenta_costo_ventas_id, t.cuenta_ingreso_id,
      t.cuenta_devolucion_venta_id, t.cuenta_devolucion_compra_id,
      t.cuenta_ajuste_entrada_id, t.cuenta_ajuste_salida_id,
    ].filter(Boolean).length;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-5 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Cuentas contables globales por tipo — fallback cuando el producto o familia no tienen cuentas configuradas</p>
      </div>

      <div className="flex-1 min-h-0 max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[680px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                {["Tipo", "Maneja inventario", "Cuentas config.", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : lista.map((t) => {
                const n = cuentasConfig(t);
                return (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${TIPO_COLOR[t.codigo] ?? "bg-gray-100 text-gray-600"}`}>
                            {t.nombre}
                          </span>
                          <span className="ml-2 text-[10px] font-mono text-gray-300">{t.codigo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.maneja_inventario ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {t.maneja_inventario ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${n === 7 ? "bg-green-50 text-green-700" : n > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                        {n}/7
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => abrirEditar(t)} title="Configurar cuentas"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title="Cuentas contables"
              subtitle={drawer.nombre}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
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
