"use client";

import { useEffect, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface CondicionPago {
  id: string; codigo: string; nombre: string;
  dias_vencimiento: number; descuento_pct: string; activo: boolean;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY = { codigo: "", nombre: "", dias_vencimiento: 0, descuento_pct: "0" };

export default function CondicionesPagoPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<CondicionPago[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;
  const { orden, alternar } = useOrden<
    "codigo" | "nombre" | "dias" | "descuento" | "estado"
  >("dias", "asc", () => setPagina(1));

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<CondicionPago | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { cargar(); }, [soloActivas]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<CondicionPago[]>(`/maestros/condiciones-pago?solo_activas=${soloActivas}`);
      setLista(data); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() {
    setForm(EMPTY); setEditando(null); setError(""); setDrawer("crear");
  }

  function abrirEditar(c: CondicionPago) {
    setForm({ codigo: c.codigo, nombre: c.nombre, dias_vencimiento: c.dias_vencimiento, descuento_pct: String(parseFloat(c.descuento_pct)) });
    setEditando(c); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.codigo.trim() || !form.nombre.trim()) { setError("Código y nombre son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      const body = { ...form, dias_vencimiento: Number(form.dias_vencimiento), descuento_pct: parseFloat(form.descuento_pct) || 0 };
      if (drawer === "crear") {
        await apiFetch("/maestros/condiciones-pago", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/maestros/condiciones-pago/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(c: CondicionPago) {
    try {
      await apiFetch(`/maestros/condiciones-pago/${c.id}`, { method: "PUT", body: JSON.stringify({ activo: !c.activo }) });
      await cargar();
    } catch {}
  }

  const filtradas = lista.filter((c) =>
    c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  // Se ordena la lista completa antes de paginar.
  const ordenada = ordenarFilas(filtradas, orden, {
    codigo:    (c) => c.codigo,
    nombre:    (c) => c.nombre,
    dias:      (c) => c.dias_vencimiento,
    descuento: (c) => Number(c.descuento_pct),
    estado:    (c) => (c.activo ? 1 : 0),
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Plazos y descuentos para documentos comerciales</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva condición
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 shrink-0 max-w-5xl">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-600" />
          Solo activas
        </label>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 max-w-5xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="codigo"    orden={orden} alternar={alternar}>Código</Th>
                <Th campo="nombre"    orden={orden} alternar={alternar}>Nombre</Th>
                <Th campo="dias"      orden={orden} alternar={alternar}>Días</Th>
                <Th campo="descuento" orden={orden} alternar={alternar}>Descuento %</Th>
                <Th campo="estado"    orden={orden} alternar={alternar}>Estado</Th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-[12px]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-blue-600">{c.codigo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-600">{c.dias_vencimiento === 0 ? "Contado" : `${c.dias_vencimiento} días`}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-600">{parseFloat(c.descuento_pct) > 0 ? `${parseFloat(c.descuento_pct)}%` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => abrirEditar(c)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActivo(c)} title={c.activo ? "Inactivar" : "Activar"}
                        className={`p-1.5 rounded-md transition-colors ${c.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                        {c.activo
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
              title={drawer === "crear" ? "Nueva condición de pago" : "Editar condición de pago"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className={labelCls}>Código *</label>
                <input value={form.codigo} onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="CON, 30D, 60D..." className={inputCls} maxLength={20} />
              </div>
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Contado, 30 días, 60 días..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Días de vencimiento</label>
                <input type="number" min={0} value={form.dias_vencimiento}
                  onChange={(e) => setForm(p => ({ ...p, dias_vencimiento: parseInt(e.target.value) || 0 }))}
                  className={inputCls} />
                <p className="text-[10px] text-gray-400 mt-1">0 = Contado inmediato</p>
              </div>
              <div>
                <label className={labelCls}>Descuento por pronto pago (%)</label>
                <input type="number" min={0} max={100} step={0.01} value={form.descuento_pct}
                  onChange={(e) => setForm(p => ({ ...p, descuento_pct: e.target.value }))}
                  className={inputCls} placeholder="0" />
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
