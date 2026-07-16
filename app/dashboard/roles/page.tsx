"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import DrawerHeader from "@/components/DrawerHeader";

interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_superadmin: boolean;
  es_cliente: boolean;
}

interface OpcionPermiso {
  opcion_id: string;
  opcion_nombre: string;
  implementada: boolean;
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
  puede_imprimir: boolean;
  puede_autorizar: boolean;
}

interface GrupoPermiso {
  modulo_codigo: string;
  modulo_nombre: string;
  opciones: OpcionPermiso[];
}

type AccionKey = "puede_ver" | "puede_crear" | "puede_editar" | "puede_eliminar" | "puede_imprimir" | "puede_autorizar";

const ACCIONES: { key: AccionKey; label: string }[] = [
  { key: "puede_ver",       label: "Ver"      },
  { key: "puede_crear",     label: "Crear"    },
  { key: "puede_editar",    label: "Editar"   },
  { key: "puede_eliminar",  label: "Eliminar" },
  { key: "puede_imprimir",  label: "Imprimir" },
  { key: "puede_autorizar", label: "Autorizar"},
];

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300";

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2", "#dc2626", "#4f46e5", "#0d9488", "#c026d3"];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function RolesPage() {
  const title = usePageTitle();
  const [roles, setRoles]               = useState<Rol[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState<"crear" | "editar" | "inactivar" | "permisos" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Rol | null>(null);
  const [form, setForm]                 = useState({ nombre: "", descripcion: "", es_cliente: false });
  const [grupos, setGrupos]             = useState<GrupoPermiso[]>([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [busqueda, setBusqueda]         = useState("");
  const [pagina, setPagina]             = useState(1);
  const porPagina                       = 12; // filas completas en 4 / 3 / 2 columnas

  async function cargar() {
    setLoading(true);
    const data = await apiFetch<Rol[]>("/roles");
    setRoles([
      ...data.filter((r) => r.es_superadmin),
      ...data.filter((r) => !r.es_superadmin).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    ]);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  function cerrar() { setModal(null); setSeleccionado(null); setError(""); }

  function abrirCrear() { setForm({ nombre: "", descripcion: "", es_cliente: false }); setError(""); setModal("crear"); }

  function abrirEditar(r: Rol) {
    setSeleccionado(r);
    setForm({ nombre: r.nombre, descripcion: r.descripcion ?? "", es_cliente: r.es_cliente });
    setError(""); setModal("editar");
  }

  function abrirInactivar(r: Rol) { setSeleccionado(r); setError(""); setModal("inactivar"); }

  async function abrirPermisos(r: Rol) {
    setSeleccionado(r); setError("");
    const data = await apiFetch<GrupoPermiso[]>(`/roles/${r.id}/permisos`);
    setGrupos(data);
    setModal("permisos");
  }

  async function guardarRol(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (modal === "crear") await apiFetch("/roles", { method: "POST", body: JSON.stringify(form) });
      else await apiFetch(`/roles/${seleccionado!.id}`, { method: "PUT", body: JSON.stringify(form) });
      cerrar(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  async function confirmarInactivar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/roles/${seleccionado!.id}`, { method: "DELETE" });
      cerrar(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  function toggleAccion(opcionId: string, accion: AccionKey) {
    setGrupos((prev) => prev.map((g) => ({
      ...g,
      opciones: g.opciones.map((op) =>
        op.opcion_id === opcionId ? { ...op, [accion]: !op[accion] } : op
      ),
    })));
  }

  function toggleFila(opcionId: string, valor: boolean) {
    setGrupos((prev) => prev.map((g) => ({
      ...g,
      opciones: g.opciones.map((op) =>
        op.opcion_id === opcionId
          ? { ...op, puede_ver: valor, puede_crear: valor, puede_editar: valor, puede_eliminar: valor, puede_imprimir: valor, puede_autorizar: valor }
          : op
      ),
    })));
  }

  function toggleGrupo(moduloCodigo: string, valor: boolean) {
    setGrupos((prev) => prev.map((g) =>
      g.modulo_codigo === moduloCodigo
        ? { ...g, opciones: g.opciones.map((op) => ({ ...op, puede_ver: valor, puede_crear: valor, puede_editar: valor, puede_eliminar: valor, puede_imprimir: valor, puede_autorizar: valor })) }
        : g
    ));
  }

  async function guardarPermisos() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/roles/${seleccionado!.id}/permisos`, {
        method: "PUT",
        body: JSON.stringify({ grupos }),
      });
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  const rolesFiltrados = busqueda.trim()
    ? roles.filter((r) => r.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (r.descripcion ?? "").toLowerCase().includes(busqueda.toLowerCase()))
    : roles;
  const totalPaginas = Math.max(1, Math.ceil(rolesFiltrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = rolesFiltrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Gestión de roles y permisos del sistema</p>
        </div>
        <button onClick={abrirCrear}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          + Nuevo rol
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4 shrink-0">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          placeholder="Buscar por nombre o descripción..."
          className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {/* Grid de tarjetas */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-[12px]">Cargando...</div>
          ) : filas.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-[12px]">{busqueda ? "Sin resultados para la búsqueda" : "Sin roles registrados"}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-2">
              {filas.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col transition-all hover:shadow-md">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: avatarColor(r.id) }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                      </svg>
                    </div>
                    <p className="mt-3 text-[14px] font-semibold text-gray-800 leading-tight capitalize">{r.nombre}</p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5 line-clamp-1 px-2">{r.descripcion || "Sin descripción"}</p>
                    <div className="h-6 mt-1 flex items-center justify-center gap-1.5">
                      {r.es_superadmin && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 border border-amber-200 rounded">Fijo</span>}
                      {r.es_cliente && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-200 rounded">Cliente</span>}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 my-4" />

                  {/* Acciones — híbrido: principal en texto + secundarias en icono */}
                  <div className="mt-auto flex items-center gap-2">
                    <button onClick={() => abrirPermisos(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Permisos
                    </button>
                    {!r.es_superadmin && (
                      <>
                        <button onClick={() => abrirEditar(r)} title="Editar"
                          className="p-2 border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => abrirInactivar(r)} title="Inactivar"
                          className="p-2 border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {rolesFiltrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, rolesFiltrados.length)}`} de {rolesFiltrados.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* Drawer crear/editar rol */}
      {(modal === "crear" || modal === "editar") && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
            <DrawerHeader
              title={modal === "crear" ? "Nuevo rol" : "Editar rol"}
              subtitle={seleccionado?.nombre}
              onClose={cerrar}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>}
            />
            <form onSubmit={guardarRol} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  required className={inputCls} placeholder="ej. contador" />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <input value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className={inputCls} placeholder="Opcional" />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={form.es_cliente}
                  onChange={(e) => setForm((p) => ({ ...p, es_cliente: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[12px] text-gray-700 font-medium">Rol de cliente (portal externo)</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">Los usuarios con este rol acceden al portal de seguimiento, no al sistema interno.</p>
                </div>
              </label>
              {error &&<p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>}
            </form>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={cerrar} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarRol} disabled={saving} className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal inactivar */}
      {modal === "inactivar" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Inactivar rol</h2>
            <p className="text-[12px] text-gray-500 mb-5">
              ¿Confirmas inactivar el rol <strong>{seleccionado.nombre}</strong>? Los usuarios con este rol perderán acceso.
            </p>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cerrar} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmarInactivar} disabled={saving} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Inactivando..." : "Inactivar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal permisos — matriz unificada */}
      {modal === "permisos" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg flex flex-col" style={{ width: "760px", maxHeight: "85vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800 capitalize">Permisos — {seleccionado.nombre}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {seleccionado.es_superadmin ? "Solo lectura — el superadmin tiene acceso total" : "Controla el acceso y las acciones por cada opción del sistema"}
                </p>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tabla */}
            <div className="overflow-auto flex-1">
              <table className="w-full min-w-[680px] text-[11px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-48">Opción</th>
                    {ACCIONES.map((a) => (
                      <th key={a.key} className="text-center py-2.5 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-16">{a.label}</th>
                    ))}
                    <th className="text-center py-2.5 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 w-12">Todo</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g) => {
                    const todoGrupo = g.opciones.every((op) => ACCIONES.every((a) => op[a.key]));
                    return [
                      /* Cabecera del grupo */
                      <tr key={`h-${g.modulo_codigo}`} className="bg-gray-50 border-y border-gray-100">
                        <td colSpan={8} className="px-6 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600">{g.modulo_nombre}</span>
                            {!seleccionado.es_superadmin && (
                              <button onClick={() => toggleGrupo(g.modulo_codigo, !todoGrupo)}
                                className="text-[9px] text-blue-500 hover:text-blue-700">
                                {todoGrupo ? "Quitar todo" : "Todo"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,
                      /* Opciones del grupo */
                      ...g.opciones.map((op) => {
                        const todoFila = ACCIONES.every((a) => op[a.key]);
                        return (
                          <tr key={op.opcion_id} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
                            <td className="px-6 py-2">
                              <span className={`${op.puede_ver ? "text-gray-800" : "text-gray-400"}`}>
                                {op.opcion_nombre}
                                {!op.implementada && <span className="ml-1.5 text-[9px] text-gray-300">próx.</span>}
                              </span>
                            </td>
                            {ACCIONES.map((a) => (
                              <td key={a.key} className="text-center py-2 px-2">
                                <input type="checkbox" checked={op[a.key]}
                                  onChange={() => !seleccionado.es_superadmin && toggleAccion(op.opcion_id, a.key)}
                                  disabled={seleccionado.es_superadmin}
                                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer disabled:cursor-default" />
                              </td>
                            ))}
                            <td className="text-center py-2 px-2">
                              <input type="checkbox" checked={todoFila}
                                onChange={() => !seleccionado.es_superadmin && toggleFila(op.opcion_id, !todoFila)}
                                disabled={seleccionado.es_superadmin}
                                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer disabled:cursor-default" />
                            </td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {error && <div className="px-6 py-2 shrink-0">
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>
            </div>}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={cerrar} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cerrar</button>
              {!seleccionado.es_superadmin && (
                <button onClick={guardarPermisos} disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                  {saving ? "Guardando..." : "Guardar permisos"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
