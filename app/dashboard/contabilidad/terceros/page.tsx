"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Tercero {
  id: string;
  nit: string;
  digito_verif: string | null;
  razon_social: string;
  nombre1: string | null;
  nombre2: string | null;
  apellido1: string | null;
  apellido2: string | null;
  tipo_persona: "NATURAL" | "JURIDICA";
  tipo_tercero: "CLIENTE" | "PROSPECTO" | "PROVEEDOR" | "EMPLEADO" | "OTRO";
  asesor_id: string | null;
  asesor_nombre: string | null;
  regimen: string | null;
  responsable_iva: boolean;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  pais: string | null;
  codigo_postal: string | null;
  nombre_contacto: string | null;
  cargo_contacto: string | null;
  telefono_contacto: string | null;
  email_contacto: string | null;
  notas: string | null;
  activo: boolean;
}

type TipoTercero = "CLIENTE" | "PROSPECTO" | "PROVEEDOR" | "EMPLEADO" | "OTRO";
type TipoPersona = "NATURAL" | "JURIDICA";

const TIPO_COLOR: Record<TipoTercero, string> = {
  CLIENTE:   "bg-blue-50 text-blue-700",
  PROSPECTO: "bg-cyan-50 text-cyan-700",
  PROVEEDOR: "bg-violet-50 text-violet-700",
  EMPLEADO:  "bg-amber-50 text-amber-700",
  OTRO:      "bg-gray-100 text-gray-500",
};

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpDis = inp + " bg-gray-50 text-gray-400 cursor-not-allowed";

interface Asesor { id: string; nombre: string; apellido: string; }

interface Form {
  nit: string; digito_verif: string; razon_social: string;
  nombre1: string; nombre2: string; apellido1: string; apellido2: string;
  tipo_persona: TipoPersona; tipo_tercero: TipoTercero;
  regimen: string;
  email: string; telefono: string;
  direccion: string; ciudad: string; departamento: string;
  pais: string; codigo_postal: string;
  nombre_contacto: string; cargo_contacto: string;
  telefono_contacto: string; email_contacto: string;
  notas: string; activo: boolean;
  asesor_id: string;
}

const FORM_VACIO: Form = {
  nit: "", digito_verif: "", razon_social: "",
  nombre1: "", nombre2: "", apellido1: "", apellido2: "",
  tipo_persona: "JURIDICA", tipo_tercero: "CLIENTE",
  regimen: "",
  email: "", telefono: "",
  direccion: "", ciudad: "", departamento: "",
  pais: "Colombia", codigo_postal: "",
  nombre_contacto: "", cargo_contacto: "",
  telefono_contacto: "", email_contacto: "",
  notas: "", activo: true,
  asesor_id: "",
};

function SeccionDrawer({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-5 first:mt-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{titulo}</span>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  );
}

export default function TercerosPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Tercero[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro]     = useState<TipoTercero | "">("");
  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [seleccionado, setSel]  = useState<Tercero | null>(null);
  const [form, setForm]         = useState<Form>(FORM_VACIO);
  const [soloActivos, setSoloActivos] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [pagina, setPagina]     = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [asesores, setAsesores] = useState<Asesor[]>([]);

  useEffect(() => {
    apiFetch<{ id: string; nombre: string; apellido: string; es_asesor: boolean }[]>("/usuarios?solo_activos=true")
      .then((data) => setAsesores(data.filter((u) => u.es_asesor))).catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [busqueda, filtro, soloActivos]);
  useEffect(() => { setPagina(1); }, [busqueda, filtro, soloActivos, porPagina]);

  async function cargar() {
    const p = new URLSearchParams();
    if (busqueda) p.set("busqueda", busqueda);
    if (filtro)   p.set("tipo_tercero", filtro);
    p.set("solo_activos", String(soloActivos));
    const data = await apiFetch<Tercero[]>(`/terceros?${p}`);
    setLista(data);
  }

  function cerrar() { setDrawer(null); setSel(null); setForm(FORM_VACIO); setError(""); }

  async function toggleActivo(t: Tercero) {
    await apiFetch(`/terceros/${t.id}`, { method: "PUT", body: JSON.stringify({ activo: !t.activo }) });
    await cargar();
  }

  function abrirCrear() { setForm(FORM_VACIO); setError(""); setDrawer("crear"); }

  async function abrirEditar(t: Tercero) {
    setError(""); setDrawer("editar");
    const full = await apiFetch<Tercero>(`/terceros/${t.id}`);
    setSel(full);
    setForm({
      nit: full.nit, digito_verif: full.digito_verif ?? "", razon_social: full.razon_social,
      nombre1: full.nombre1 ?? "", nombre2: full.nombre2 ?? "",
      apellido1: full.apellido1 ?? "", apellido2: full.apellido2 ?? "",
      tipo_persona: full.tipo_persona, tipo_tercero: full.tipo_tercero,
      regimen: full.regimen ?? "",
      email: full.email ?? "", telefono: full.telefono ?? "",
      direccion: full.direccion ?? "", ciudad: full.ciudad ?? "",
      departamento: full.departamento ?? "", pais: full.pais ?? "",
      codigo_postal: full.codigo_postal ?? "",
      nombre_contacto: full.nombre_contacto ?? "", cargo_contacto: full.cargo_contacto ?? "",
      telefono_contacto: full.telefono_contacto ?? "", email_contacto: full.email_contacto ?? "",
      notas: full.notas ?? "", activo: full.activo,
      asesor_id: full.asesor_id ?? "",
    });
  }

  function f(k: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const esNat = form.tipo_persona === "NATURAL";
      const razonSocial = esNat
        ? [form.nombre1, form.nombre2, form.apellido1, form.apellido2].filter(Boolean).join(" ")
        : form.razon_social;
      const responsableIva = form.regimen === "ORDINARIO";
      const payload = {
        nit: form.nit, digito_verif: form.digito_verif || null,
        razon_social: razonSocial,
        nombre1: esNat ? (form.nombre1 || null) : null,
        nombre2: esNat ? (form.nombre2 || null) : null,
        apellido1: esNat ? (form.apellido1 || null) : null,
        apellido2: esNat ? (form.apellido2 || null) : null,
        tipo_persona: form.tipo_persona, tipo_tercero: form.tipo_tercero,
        regimen: form.regimen || null, responsable_iva: responsableIva,
        email: form.email || null, telefono: form.telefono || null,
        direccion: form.direccion || null, ciudad: form.ciudad || null,
        departamento: form.departamento || null, pais: form.pais || null,
        codigo_postal: form.codigo_postal || null,
        nombre_contacto: form.nombre_contacto || null,
        cargo_contacto: form.cargo_contacto || null,
        telefono_contacto: form.telefono_contacto || null,
        email_contacto: form.email_contacto || null,
        notas: form.notas || null,
        asesor_id: form.asesor_id || null,
      };
      if (drawer === "crear") {
        await apiFetch("/terceros", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/terceros/${seleccionado!.id}`, { method: "PUT", body: JSON.stringify({ ...payload, activo: form.activo }) });
      }
      await cargar(); cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  const esNatural = form.tipo_persona === "NATURAL";

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = lista.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Clientes, proveedores y contactos</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo tercero
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por NIT o nombre..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as TipoTercero | "")}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          <option value="CLIENTE">Clientes</option>
          <option value="PROSPECTO">Prospectos</option>
          <option value="PROVEEDOR">Proveedores</option>
          <option value="EMPLEADO">Empleados</option>
          <option value="OTRO">Otros</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-600" />
          <span className="text-[12px] text-gray-500">Solo activos</span>
        </label>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap">NIT</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Razón social</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Tipo</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">País</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Ciudad</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Teléfono</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Contacto</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Estado</th>
              <th className="px-4 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[12px] text-gray-400">Sin resultados</td></tr>
            ) : filas.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                  {t.nit}{t.digito_verif ? `-${t.digito_verif}` : ""}
                </td>
                <td className="px-4 py-2.5 text-[12px] text-gray-800 font-medium">{t.razon_social}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_COLOR[t.tipo_tercero]}`}>
                    {t.tipo_tercero}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{t.pais ?? "—"}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{t.ciudad ?? "—"}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{t.telefono ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {t.nombre_contacto ? (
                    <div>
                      <div className="text-[11px] text-gray-700 font-medium">{t.nombre_contacto}</div>
                      {t.cargo_contacto && <div className="text-[10px] text-gray-400">{t.cargo_contacto}</div>}
                    </div>
                  ) : <span className="text-[12px] text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.activo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                    {t.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(t)} title="Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {t.activo ? (
                      <button onClick={() => toggleActivo(t)} title="Inactivar"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      </button>
                    ) : (
                      <button onClick={() => toggleActivo(t)} title="Activar"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Mostrar</span>
            <select value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-[11px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-[11px] text-gray-400">
              — {lista.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, lista.length)}`} de {lista.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">
              {paginaActual} / {totalPaginas}
            </span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas}
              className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      </div>

      {/* Drawer lateral */}
      {drawer && (
        <>
          {/* Overlay — solo decorativo, no cierra el drawer */}
          <div className="fixed inset-0 bg-black/20 z-40" />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col">

            {/* Header drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">
                  {drawer === "crear" ? "Nuevo tercero" : "Editar tercero"}
                </h2>
                {seleccionado && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{seleccionado.nit} · {seleccionado.razon_social}</p>
                )}
              </div>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Contenido scrolleable */}
            <form onSubmit={guardar} className="flex-1 overflow-y-auto px-5 py-4">

              {/* ── SECCIÓN 1: Identificación ── */}
              <SeccionDrawer titulo="Identificación" />

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>NIT *</label>
                  <input value={form.nit} onChange={f("nit")} required
                    className={inp} placeholder="901702367" />
                </div>
                <div>
                  <label className={lbl}>Dígito verif.</label>
                  <input value={form.digito_verif} onChange={f("digito_verif")}
                    className={inp} placeholder="9" maxLength={1} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>Tipo persona *</label>
                  <select value={form.tipo_persona} onChange={f("tipo_persona")}
                    disabled={drawer === "editar"}
                    className={drawer === "editar" ? inpDis : inp}>
                    <option value="JURIDICA">Jurídica</option>
                    <option value="NATURAL">Natural</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Tipo tercero *</label>
                  <select value={form.tipo_tercero} onChange={f("tipo_tercero")} className={inp}>
                    <option value="CLIENTE">Cliente</option>
                    <option value="PROSPECTO">Prospecto</option>
                    <option value="PROVEEDOR">Proveedor</option>
                    <option value="EMPLEADO">Empleado</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              {esNatural ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={lbl}>Primer nombre *</label>
                      <input value={form.nombre1} onChange={f("nombre1")} required className={inp} placeholder="Juan" />
                    </div>
                    <div>
                      <label className={lbl}>Segundo nombre</label>
                      <input value={form.nombre2} onChange={f("nombre2")} className={inp} placeholder="Carlos" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={lbl}>Primer apellido *</label>
                      <input value={form.apellido1} onChange={f("apellido1")} required className={inp} placeholder="García" />
                    </div>
                    <div>
                      <label className={lbl}>Segundo apellido</label>
                      <input value={form.apellido2} onChange={f("apellido2")} className={inp} placeholder="López" />
                    </div>
                  </div>
                  {(form.nombre1 || form.apellido1) && (
                    <div className="mb-3 px-2.5 py-1.5 bg-blue-50 rounded-md">
                      <span className="text-[10px] text-blue-500 font-medium">Nombre completo: </span>
                      <span className="text-[11px] text-blue-700 font-semibold">
                        {[form.nombre1, form.nombre2, form.apellido1, form.apellido2].filter(Boolean).join(" ")}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="mb-3">
                  <label className={lbl}>Razón social *</label>
                  <input value={form.razon_social} onChange={f("razon_social")} required
                    className={inp} placeholder="Empresa S.A.S" />
                </div>
              )}

              <div className="mb-3">
                <label className={lbl}>Régimen tributario</label>
                <select value={form.regimen} onChange={f("regimen")} className={inp}>
                  <option value="">— Sin especificar —</option>
                  <option value="ORDINARIO">Régimen ordinario (responsable de IVA)</option>
                  <option value="SIMPLIFICADO">Régimen simplificado (no responsable de IVA)</option>
                  <option value="ESPECIAL">Régimen especial</option>
                </select>
              </div>

              {drawer === "editar" && (
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.activo}
                      onChange={(e) => setForm(p => ({ ...p, activo: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-blue-600" />
                    <span className="text-[12px] text-gray-700">Tercero activo</span>
                  </label>
                </div>
              )}

              {/* ── SECCIÓN 2: Ubicación ── */}
              <SeccionDrawer titulo="Ubicación" />

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>País</label>
                  <input value={form.pais} onChange={f("pais")} className={inp} placeholder="Colombia" />
                </div>
                <div>
                  <label className={lbl}>Departamento</label>
                  <input value={form.departamento} onChange={f("departamento")} className={inp} placeholder="Cundinamarca" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>Ciudad</label>
                  <input value={form.ciudad} onChange={f("ciudad")} className={inp} placeholder="Bogotá" />
                </div>
                <div>
                  <label className={lbl}>Código postal</label>
                  <input value={form.codigo_postal} onChange={f("codigo_postal")} className={inp} placeholder="110111" />
                </div>
              </div>

              <div className="mb-3">
                <label className={lbl}>Dirección</label>
                <input value={form.direccion} onChange={f("direccion")} className={inp} placeholder="Cra 106 # 15a-25 Bod 143" />
              </div>

              {/* ── SECCIÓN 3: Contacto ── */}
              <SeccionDrawer titulo="Contacto" />

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>Teléfono empresa</label>
                  <input value={form.telefono} onChange={f("telefono")} className={inp} placeholder="601 2345678" />
                </div>
                <div>
                  <label className={lbl}>Email empresa</label>
                  <input type="email" value={form.email} onChange={f("email")} className={inp} placeholder="info@empresa.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>Nombre contacto</label>
                  <input value={form.nombre_contacto} onChange={f("nombre_contacto")} className={inp} placeholder="Juan García" />
                </div>
                <div>
                  <label className={lbl}>Cargo</label>
                  <input value={form.cargo_contacto} onChange={f("cargo_contacto")} className={inp} placeholder="Gerente logística" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={lbl}>Teléfono directo</label>
                  <input value={form.telefono_contacto} onChange={f("telefono_contacto")} className={inp} placeholder="314 3045776" />
                </div>
                <div>
                  <label className={lbl}>Email directo</label>
                  <input type="email" value={form.email_contacto} onChange={f("email_contacto")} className={inp} placeholder="juan@empresa.com" />
                </div>
              </div>

              {(form.tipo_tercero === "CLIENTE" || form.tipo_tercero === "PROSPECTO") && (
                <div className="mb-4">
                  <label className={lbl}>Asesor asignado</label>
                  <select value={form.asesor_id} onChange={f("asesor_id")} className={inp}>
                    <option value="">Sin asesor</option>
                    {asesores.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className={lbl}>Notas</label>
                <textarea value={form.notas} onChange={f("notas")} rows={3}
                  className={inp + " resize-none"} placeholder="Observaciones, condiciones especiales..." />
              </div>

              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>
              )}
            </form>

            {/* Footer fijo */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={cerrar}
                className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
