"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface TarifaIva { id: string; nombre: string; tipo: string; porcentaje: string; }
interface Retencion { id: string; nombre: string; tipo: string; porcentaje: string; }
interface Cuenta { id: string; codigo: string; nombre: string; }

interface ConceptoRetencion {
  id: string; retencion_id: string; retencion_nombre: string | null;
  retencion_tipo: string | null; retencion_porcentaje: string | null; activo: boolean;
}
interface Concepto {
  id: string; codigo: string; nombre: string; descripcion: string | null;
  tarifa_iva_id: string | null; tarifa_iva_nombre: string | null;
  tarifa_iva_tipo: string | null; tarifa_iva_porcentaje: string | null;
  cuenta_gasto_id: string | null; cuenta_gasto_codigo: string | null; cuenta_gasto_nombre: string | null;
  cuenta_cxp_id: string | null; cuenta_cxp_codigo: string | null; cuenta_cxp_nombre: string | null;
  activo: boolean; retenciones: ConceptoRetencion[];
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls = inputCls;

const TIPO_COLOR: Record<string, string> = {
  RETEFUENTE: "bg-purple-50 text-purple-700",
  RETEICA:    "bg-orange-50 text-orange-700",
  RETEIVA:    "bg-blue-50 text-blue-700",
  GRAVADO:    "bg-green-50 text-green-700",
  EXENTO:     "bg-yellow-50 text-yellow-700",
  EXCLUIDO:   "bg-gray-100 text-gray-500",
};

const EMPTY = {
  codigo: "", nombre: "", descripcion: "", tarifa_iva_id: "",
  cuenta_gasto_id: "", cuenta_gasto_display: "",
  cuenta_cxp_id:   "", cuenta_cxp_display: "",
};

// ── Componente reutilizable igual que en tarifas-iva ──────────────────────────
function CuentaSearch({ label, cuentaId, cuentaDisplay, onChange }: {
  label: string; cuentaId: string; cuentaDisplay: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ]           = useState(cuentaDisplay);
  const [opciones, setOpc]  = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(cuentaDisplay); }, [cuentaDisplay]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpc([]); setAbierto(false); return; }
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
// ─────────────────────────────────────────────────────────────────────────────

export default function ConceptosCxpPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Concepto[]>([]);
  const [tarifas, setTarifas]   = useState<TarifaIva[]>([]);
  const [retenciones, setRet]   = useState<Retencion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSolo]  = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;
  const { orden, alternar } = useOrden<
    "codigo" | "nombre" | "cuentaGasto" | "cuentaCxp" | "iva" | "estado"
  >("nombre", "asc", () => setPagina(1));

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<Concepto | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [formRets, setFRets]    = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { cargar(); }, [soloActivos]);

  async function cargar() {
    setLoading(true);
    try {
      const [conceptos, tivas, rets] = await Promise.all([
        apiFetch<Concepto[]>(`/conceptos/cxp?solo_activos=${soloActivos}`),
        apiFetch<TarifaIva[]>("/maestros/tarifas-iva?solo_activas=true"),
        apiFetch<Retencion[]>("/maestros/retenciones?solo_activas=true"),
      ]);
      setLista(conceptos); setTarifas(tivas); setRet(rets); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() {
    setForm(EMPTY); setFRets([]);
    setEditando(null); setError(""); setDrawer("crear");
  }

  function abrirEditar(c: Concepto) {
    setForm({
      codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion ?? "",
      tarifa_iva_id: c.tarifa_iva_id ?? "",
      cuenta_gasto_id:      c.cuenta_gasto_id ?? "",
      cuenta_gasto_display: c.cuenta_gasto_id ? `${c.cuenta_gasto_codigo} — ${c.cuenta_gasto_nombre}` : "",
      cuenta_cxp_id:        c.cuenta_cxp_id ?? "",
      cuenta_cxp_display:   c.cuenta_cxp_id   ? `${c.cuenta_cxp_codigo} — ${c.cuenta_cxp_nombre}`   : "",
    });
    setFRets(c.retenciones.map(r => r.retencion_id));
    setEditando(c); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.codigo.trim()) { setError("El código es obligatorio"); return; }
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        tarifa_iva_id: form.tarifa_iva_id || null,
        cuenta_gasto_id: form.cuenta_gasto_id || null,
        cuenta_cxp_id: form.cuenta_cxp_id || null,
        retenciones: formRets.map(r => ({ retencion_id: r })),
      };
      if (drawer === "crear") {
        await apiFetch("/conceptos/cxp", { method: "POST", body: JSON.stringify(body) });
      } else {
        const { codigo: _, ...upd } = body;
        await apiFetch(`/conceptos/cxp/${editando!.id}`, { method: "PUT", body: JSON.stringify(upd) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(c: Concepto) {
    try {
      await apiFetch(`/conceptos/cxp/${c.id}`, { method: "PUT", body: JSON.stringify({ activo: !c.activo }) });
      await cargar();
    } catch {}
  }

  function toggleRet(id: string) {
    setFRets(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);
  }

  const filtrados = lista.filter(c =>
    c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  // Se ordena la lista completa antes de paginar.
  const ordenada = ordenarFilas(filtrados, orden, {
    codigo:      (c) => c.codigo,
    nombre:      (c) => c.nombre,
    cuentaGasto: (c) => c.cuenta_gasto_codigo,
    cuentaCxp:   (c) => c.cuenta_cxp_codigo,
    iva:         (c) => c.tarifa_iva_nombre,
    estado:      (c) => (c.activo ? 1 : 0),
  });
  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Plantillas contables para facturas de proveedor</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo concepto
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSolo(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Solo activos
        </label>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="codigo"      orden={orden} alternar={alternar}>Código</Th>
                <Th campo="nombre"      orden={orden} alternar={alternar}>Nombre</Th>
                <Th campo="cuentaGasto" orden={orden} alternar={alternar}>Cuenta gasto</Th>
                <Th campo="cuentaCxp"   orden={orden} alternar={alternar}>Cuenta CxP</Th>
                <Th campo="iva"         orden={orden} alternar={alternar}>IVA</Th>
                {/* Retenciones pinta N badges: no hay un valor único por el que ordenar. */}
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Retenciones</th>
                <Th campo="estado"      orden={orden} alternar={alternar}>Estado</Th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-[12px]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-blue-600">{c.codigo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] text-gray-800">{c.nombre}</p>
                    {c.descripcion && <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{c.descripcion}</p>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-gray-500 font-mono">{c.cuenta_gasto_codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-500 font-mono">{c.cuenta_cxp_codigo ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.tarifa_iva_nombre
                      ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_COLOR[c.tarifa_iva_tipo ?? ""] ?? "bg-gray-100 text-gray-500"}`}>
                          {c.tarifa_iva_nombre}
                        </span>
                      : <span className="text-[11px] text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.retenciones.length === 0
                        ? <span className="text-[11px] text-gray-300">—</span>
                        : c.retenciones.map(r => (
                          <span key={r.id} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${TIPO_COLOR[r.retencion_tipo ?? ""] ?? "bg-gray-100 text-gray-500"}`}>
                            {r.retencion_tipo} {r.retencion_porcentaje}%
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.activo ? "Activo" : "Inactivo"}
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
          <span className="text-[11px] text-gray-400">{filtrados.length === 0 ? "0" : `${(paginaActual-1)*porPagina+1}–${Math.min(paginaActual*porPagina, filtrados.length)}`} de {filtrados.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual===1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1,p-1))} disabled={paginaActual===1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual===totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nuevo concepto CxP" : "Editar concepto"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {/* Identificación */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Identificación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Código *</label>
                    <input value={form.codigo}
                      onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                      disabled={drawer === "editar"}
                      placeholder="HON-PN..."
                      maxLength={50}
                      className={`${inputCls} ${drawer === "editar" ? "bg-gray-50 text-gray-400" : ""}`} />
                  </div>
                  <div>
                    <label className={labelCls}>Nombre *</label>
                    <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Honorarios..." maxLength={200} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Descripción</label>
                  <input value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Descripción opcional" className={inputCls} />
                </div>
              </div>

              {/* Cuentas */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cuentas PUC</p>
                <CuentaSearch
                  label="Cuenta de gasto / costo (débito)"
                  cuentaId={form.cuenta_gasto_id}
                  cuentaDisplay={form.cuenta_gasto_display}
                  onChange={(id) => setForm(p => ({ ...p, cuenta_gasto_id: id }))}
                />
                <CuentaSearch
                  label="Cuenta CxP (crédito)"
                  cuentaId={form.cuenta_cxp_id}
                  cuentaDisplay={form.cuenta_cxp_display}
                  onChange={(id) => setForm(p => ({ ...p, cuenta_cxp_id: id }))}
                />
              </div>

              {/* IVA */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">IVA</p>
                <select value={form.tarifa_iva_id} onChange={(e) => setForm(p => ({ ...p, tarifa_iva_id: e.target.value }))} className={selectCls}>
                  <option value="">Sin IVA</option>
                  {tarifas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} ({t.tipo} {t.porcentaje}%)</option>
                  ))}
                </select>
              </div>

              {/* Retenciones */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Retenciones que aplican</p>
                {retenciones.length === 0
                  ? <p className="text-[11px] text-gray-300 italic">No hay retenciones configuradas</p>
                  : (
                    <div className="space-y-0.5 max-h-52 overflow-y-auto border border-gray-100 rounded-lg">
                      {[...retenciones].sort((a, b) => {
                        const asel = formRets.includes(a.id) ? 0 : 1;
                        const bsel = formRets.includes(b.id) ? 0 : 1;
                        return asel - bsel;
                      }).map(r => (
                        <label key={r.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={formRets.includes(r.id)} onChange={() => toggleRet(r.id)}
                            className="rounded border-gray-300 text-blue-600" />
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${TIPO_COLOR[r.tipo] ?? "bg-gray-100 text-gray-500"}`}>{r.tipo}</span>
                          <span className="text-[12px] text-gray-700 flex-1 leading-tight">{r.nombre}</span>
                          <span className="text-[11px] text-gray-400 shrink-0">{r.porcentaje}%</span>
                        </label>
                      ))}
                    </div>
                  )}
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
