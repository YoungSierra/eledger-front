"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import DrawerHeader from "@/components/DrawerHeader";

interface Rol { id: string; nombre: string; es_cliente: boolean; ver_solo_propios: boolean; es_superadmin?: boolean; }
interface Tercero { id: string; nit: string; razon_social: string; }
interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rol_id: string;
  tercero_id: string | null;
  es_asesor: boolean;
  ver_solo_propios: boolean;
  activo: boolean;
  creado_en: string;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300";

const EMPTY_FORM = { nombre: "", apellido: "", email: "", telefono: "", password: "", rol_id: "", tercero_id: "", es_asesor: false, ver_solo_propios: false };

// Color de avatar determinístico según el nombre (paleta de marca ampliada).
const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2", "#dc2626", "#4f46e5", "#0d9488", "#c026d3"];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function UsuariosPage() {
  const title = usePageTitle();
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [roles, setRoles]           = useState<Rol[]>([]);
  const [loading, setLoading]       = useState(true);
  const [soloActivos, setSoloActivos] = useState(true);
  const [modal, setModal]           = useState<"crear" | "editar" | "inactivar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [miRolId, setMiRolId]       = useState<string | null>(null);
  const [busqueda, setBusqueda]     = useState("");
  const [pagina, setPagina]         = useState(1);
  const porPagina                   = 12; // filas completas en 4 / 3 / 2 columnas
  // Búsqueda de tercero para rol cliente
  const [terceroQ, setTerceroQ]     = useState("");
  const [terceroOpts, setTerceroOpts] = useState<Tercero[]>([]);
  const [terceroNombre, setTerceroNombre] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setMiRolId(payload.rol_id ?? null);
      } catch { /* token malformado */ }
    }
  }, []);

  async function cargar() {
    setLoading(true);
    const [us, rs] = await Promise.all([
      apiFetch<Usuario[]>(`/usuarios?solo_activos=${soloActivos}`),
      apiFetch<Rol[]>("/roles"),
    ]);
    const superadminId = rs.find((r) => r.nombre.toLowerCase() === "superadmin")?.id;
    const ordenados = [
      ...us.filter((u) => u.rol_id === superadminId),
      ...us.filter((u) => u.rol_id !== superadminId).sort((a, b) =>
        `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
      ),
    ];
    setUsuarios(ordenados);
    setRoles(rs);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [soloActivos]);

  function nombreRol(rol_id: string) {
    return roles.find((r) => r.id === rol_id)?.nombre ?? "-";
  }

  function abrirCrear() {
    setForm({ ...EMPTY_FORM, rol_id: roles[0]?.id ?? "" });
    setError("");
    setModal("crear");
  }

  async function abrirEditar(u: Usuario) {
    setSeleccionado(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, telefono: u.telefono ?? "", password: "", rol_id: u.rol_id, tercero_id: u.tercero_id ?? "", es_asesor: u.es_asesor, ver_solo_propios: u.ver_solo_propios });
    setTerceroQ("");
    setError("");
    if (u.tercero_id) {
      try {
        const t = await apiFetch<Tercero>(`/terceros/${u.tercero_id}`);
        setTerceroNombre(`${t.nit} — ${t.razon_social}`);
      } catch { setTerceroNombre(u.tercero_id); }
    } else {
      setTerceroNombre("");
    }
    setModal("editar");
  }

  function abrirInactivar(u: Usuario) {
    setSeleccionado(u);
    setModal("inactivar");
  }

  function cerrar() { setModal(null); setSeleccionado(null); setError(""); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const rolSeleccionado = roles.find((r) => r.id === form.rol_id);
  const esRolCliente = rolSeleccionado?.es_cliente ?? false;
  const superadminRolId = roles.find((r) => r.es_superadmin)?.id;
  const yoSoySuperadmin = miRolId === superadminRolId;

  const usuariosFiltrados = busqueda.trim()
    ? usuarios.filter((u) =>
        `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
      )
    : usuarios;
  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = usuariosFiltrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  async function buscarTerceros(q: string) {
    setTerceroQ(q);
    if (!q.trim()) { setTerceroOpts([]); return; }
    setTimeout(async () => {
      const data = await apiFetch<Tercero[]>(`/terceros?tipo_tercero=CLIENTE&busqueda=${encodeURIComponent(q)}`);
      setTerceroOpts(data);
    }, 300);
  }

  async function guardarCrear(e: React.FormEvent) {
    e.preventDefault();
    if (esRolCliente && !form.tercero_id) { setError("Debes asociar un cliente para este rol"); return; }
    setSaving(true); setError("");
    try {
      const body = { ...form, telefono: form.telefono || null, tercero_id: form.tercero_id || null };
      await apiFetch("/usuarios", { method: "POST", body: JSON.stringify(body) });
      cerrar(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally { setSaving(false); }
  }

  async function guardarEditar(e: React.FormEvent) {
    e.preventDefault();
    if (esRolCliente && !form.tercero_id) { setError("Debes asociar un cliente para este rol"); return; }
    setSaving(true); setError("");
    const body: Record<string, unknown> = {
      nombre: form.nombre, apellido: form.apellido, telefono: form.telefono || null, rol_id: form.rol_id,
      tercero_id: form.tercero_id || null,
      es_asesor: form.es_asesor,
      ver_solo_propios: form.ver_solo_propios,
    };
    if (form.password) body.password = form.password;
    try {
      await apiFetch(`/usuarios/${seleccionado!.id}`, { method: "PUT", body: JSON.stringify(body) });
      cerrar(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al editar");
    } finally { setSaving(false); }
  }

  async function confirmarInactivar() {
    setSaving(true);
    try {
      await apiFetch(`/usuarios/${seleccionado!.id}`, { method: "DELETE" });
      cerrar(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al inactivar");
    } finally { setSaving(false); }
  }

  async function activar(u: Usuario) {
    try {
      await apiFetch(`/usuarios/${u.id}`, { method: "PUT", body: JSON.stringify({ activo: true }) });
      cargar();
    } catch { /* silencioso */ }
  }

  return (
    <div className="h-full flex flex-col">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Gestión de usuarios del sistema</p>
        </div>
        <button onClick={abrirCrear}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          + Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" id="soloActivos" checked={soloActivos}
            onChange={(e) => { setSoloActivos(e.target.checked); setPagina(1); }}
            className="w-3.5 h-3.5 accent-blue-600" />
          Solo activos
        </label>
      </div>

      {/* Grid de tarjetas */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-[12px]">Cargando...</div>
          ) : filas.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-[12px]">{busqueda ? "Sin resultados para la búsqueda" : "Sin usuarios registrados"}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-2">
              {filas.map((u) => {
                const iniciales = ((u.nombre[0] ?? "") + (u.apellido[0] ?? "")).toUpperCase();
                const esSuper = u.rol_id === superadminRolId;
                const puedeGestionar = !esSuper || yoSoySuperadmin;
                return (
                  <div key={u.id}
                    className={`bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col transition-all hover:shadow-md ${!u.activo ? "opacity-60" : ""}`}>

                    {/* Avatar + identidad */}
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[18px] font-bold shrink-0"
                          style={{ background: avatarColor(u.id) }}>
                          {iniciales}
                        </div>
                        <span className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${u.activo ? "bg-green-500" : "bg-gray-400"}`}
                          title={u.activo ? "Activo" : "Inactivo"} />
                      </div>
                      <p className="mt-3 text-[14px] font-semibold text-gray-800 leading-tight">{u.nombre} {u.apellido}</p>
                      <p className="text-[11.5px] text-gray-500 mt-0.5 capitalize">{nombreRol(u.rol_id)}</p>
                      {/* Slot de altura fija para el badge — alinea todas las tarjetas */}
                      <div className="h-6 mt-1 flex items-center justify-center">
                        {u.es_asesor && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700">
                            Asesor{u.ver_solo_propios && <span className="text-[9px] text-purple-400">· solo propios</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 my-4" />

                    {/* Contacto */}
                    <div className="space-y-2.5 text-[12px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <span className="text-gray-600 truncate">{u.email}</span>
                      </div>
                      {u.telefono && (
                        <div className="flex items-center gap-2.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span className="text-gray-600">{u.telefono}</span>
                        </div>
                      )}
                    </div>

                    {/* Acciones — híbrido: principal en texto + secundaria en icono */}
                    <div className="mt-auto pt-4 flex items-center gap-2">
                      {puedeGestionar ? (
                        <>
                          <button onClick={() => abrirEditar(u)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                          </button>
                          {u.activo ? (
                            <button onClick={() => abrirInactivar(u)} title="Inactivar"
                              className="p-2 border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                              </svg>
                            </button>
                          ) : (
                            <button onClick={() => activar(u)} title="Activar"
                              className="p-2 border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50 rounded-lg transition-colors">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="flex-1 text-center text-[10px] text-gray-300 py-1.5">Solo el superadmin puede gestionar este usuario</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {usuariosFiltrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, usuariosFiltrados.length)}`} de {usuariosFiltrados.length}
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

      {/* Drawer crear / editar usuario */}
      {(modal === "crear" || modal === "editar") && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
            <DrawerHeader
              title={modal === "crear" ? "Nuevo usuario" : "Editar usuario"}
              subtitle={seleccionado ? `${seleccionado.nombre} ${seleccionado.apellido}` : undefined}
              onClose={cerrar}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido *</label>
                  <input name="apellido" value={form.apellido} onChange={handleChange} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} className={inputCls} placeholder="Opcional" />
              </div>
              {modal === "crear" && (
                <div>
                  <label className={labelCls}>Correo electrónico *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputCls} />
                </div>
              )}
              <div>
                <label className={labelCls}>{modal === "crear" ? "Contraseña *" : "Nueva contraseña (opcional)"}</label>
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  required={modal === "crear"} autoComplete="new-password" className={inputCls} placeholder="••••••••" />
              </div>
              <div>
                <label className={labelCls}>Rol *</label>
                <select name="rol_id" value={form.rol_id} onChange={handleChange} required className={inputCls}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>

              {esRolCliente && (
                <div className="relative">
                  <label className={labelCls}>Cliente asociado *</label>
                  <input
                    value={form.tercero_id ? (terceroNombre || form.tercero_id) : terceroQ}
                    onChange={(e) => { setForm((p) => ({ ...p, tercero_id: "" })); buscarTerceros(e.target.value); }}
                    placeholder="Buscar por NIT o nombre..."
                    className={inputCls}
                  />
                  {terceroOpts.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {terceroOpts.map((t) => (
                        <button key={t.id} type="button"
                          onMouseDown={() => { setForm((p) => ({ ...p, tercero_id: t.id })); setTerceroNombre(`${t.nit} — ${t.razon_social}`); setTerceroOpts([]); }}
                          className="w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50 transition-colors">
                          <div className="font-medium text-gray-800">{t.razon_social}</div>
                          <div className="text-[10px] text-gray-400">NIT {t.nit}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.tercero_id && (
                    <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Cliente seleccionado
                    </p>
                  )}
                </div>
              )}

              {!roles.find((r) => r.id === form.rol_id)?.es_cliente && (
                <>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={form.es_asesor}
                      onChange={(e) => setForm((p) => ({ ...p, es_asesor: e.target.checked, ver_solo_propios: e.target.checked ? p.ver_solo_propios : false }))}
                      className="w-3.5 h-3.5 accent-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[12px] text-gray-700 font-medium">Es asesor</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Puede ser asignado como asesor en cotizaciones y clientes.</p>
                    </div>
                  </label>
                  {form.es_asesor && (
                    <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ml-4">
                      <input type="checkbox" checked={form.ver_solo_propios}
                        onChange={(e) => setForm((p) => ({ ...p, ver_solo_propios: e.target.checked }))}
                        className="w-3.5 h-3.5 accent-purple-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[12px] text-gray-700 font-medium">Ver solo registros propios</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Solo ve cotizaciones y operaciones donde está asignado como asesor.</p>
                      </div>
                    </label>
                  )}
                </>
              )}

              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={cerrar}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={modal === "crear" ? guardarCrear : guardarEditar} disabled={saving}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal confirmar inactivar */}
      {modal === "inactivar" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Inactivar usuario</h2>
            <p className="text-[12px] text-gray-500 mb-5">
              ¿Confirmas que deseas inactivar a <strong>{seleccionado.nombre} {seleccionado.apellido}</strong>?
              El usuario no podrá iniciar sesión.
            </p>
            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={cerrar}
                className="px-4 py-1.5 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                Cancelar
              </button>
              <button onClick={confirmarInactivar} disabled={saving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
                {saving ? "Inactivando..." : "Inactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
