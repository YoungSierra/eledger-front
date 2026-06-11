"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Aeropuerto {
  id: string; codigo_iata: string; nombre: string;
  ciudad: string; pais: string;
  modalidad: "AEREA" | "MARITIMA" | "TERRESTRE"; activo: boolean;
}

type Modalidad = "AEREA" | "MARITIMA" | "TERRESTRE";

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpDis = inp + " bg-gray-50 text-gray-400 cursor-not-allowed";

interface Form { codigo_iata: string; nombre: string; ciudad: string; pais: string; modalidad: Modalidad; }
const FORM_VACIO: Form = { codigo_iata: "", nombre: "", ciudad: "", pais: "Colombia", modalidad: "AEREA" };

export default function AeropuertosPage() {
  const title = usePageTitle();
  const [lista, setLista]             = useState<Aeropuerto[]>([]);
  const [busqueda, setBusqueda]       = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [drawer, setDrawer]           = useState<"crear" | "editar" | null>(null);
  const [sel, setSel]                 = useState<Aeropuerto | null>(null);
  const [form, setForm]               = useState<Form>(FORM_VACIO);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [timer, setTimer]             = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pagina, setPagina]           = useState(1);
  const [porPagina]                   = useState(25);

  useEffect(() => { cargar(); }, [soloActivos]);

  async function cargar(q?: string) {
    const params = new URLSearchParams({ solo_activos: String(soloActivos) });
    if (q) params.set("busqueda", q);
    const data = await apiFetch<Aeropuerto[]>(`/operaciones/aeropuertos?${params}`);
    setLista(data);
    setPagina(1);
  }

  function onBusqueda(val: string) {
    setBusqueda(val);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => cargar(val || undefined), 300));
  }

  function cerrar() { setDrawer(null); setSel(null); setForm(FORM_VACIO); setError(""); }
  function abrirCrear() { setForm(FORM_VACIO); setError(""); setDrawer("crear"); }

  function abrirEditar(a: Aeropuerto) {
    setSel(a);
    setForm({ codigo_iata: a.codigo_iata, nombre: a.nombre, ciudad: a.ciudad, pais: a.pais, modalidad: a.modalidad });
    setError(""); setDrawer("editar");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (drawer === "crear") {
        await apiFetch("/operaciones/aeropuertos", { method: "POST", body: JSON.stringify(form) });
      } else {
        await apiFetch(`/operaciones/aeropuertos/${sel!.id}`, { method: "PUT", body: JSON.stringify({ nombre: form.nombre, ciudad: form.ciudad, pais: form.pais, modalidad: form.modalidad }) });
      }
      await cargar(busqueda || undefined); cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function toggleActivo(a: Aeropuerto) {
    await apiFetch(`/operaciones/aeropuertos/${a.id}`, { method: "PUT", body: JSON.stringify({ activo: !a.activo }) });
    cargar(busqueda || undefined);
  }

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = lista.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Catálogo de puntos de origen y destino</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar por código IATA, nombre o ciudad..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Solo activos
        </label>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 w-20">IATA</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Nombre</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Ciudad</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">País</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Estado</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-gray-400">Sin aeropuertos registrados</td></tr>
              ) : filas.map((a) => (
                <tr key={a.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${!a.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-gray-700">{a.codigo_iata}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-800">{a.nombre}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-600">{a.ciudad}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-500">{a.pais}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.activo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEditar(a)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {a.activo ? (
                        <button onClick={() => toggleActivo(a)} title="Inactivar"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </button>
                      ) : (
                        <button onClick={() => toggleActivo(a)} title="Activar"
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
          <span className="text-[11px] text-gray-400">
            {lista.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, lista.length)}`} de {lista.length}
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

      {/* Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">
                  {drawer === "crear" ? "Nuevo aeropuerto" : "Editar aeropuerto"}
                </h2>
                {sel && <p className="text-[11px] text-gray-400 mt-0.5">{sel.codigo_iata} — {sel.nombre}</p>}
              </div>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={guardar} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className={lbl}>Código IATA *</label>
                <input value={form.codigo_iata}
                  onChange={(e) => drawer === "crear" && setForm(p => ({ ...p, codigo_iata: e.target.value.toUpperCase() }))}
                  required maxLength={10} readOnly={drawer === "editar"}
                  className={drawer === "editar" ? inpDis : inp} placeholder="Ej: BOG" />
              </div>
              <div>
                <label className={lbl}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required className={inp} placeholder="Ej: El Dorado Internacional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Ciudad *</label>
                  <input value={form.ciudad} onChange={(e) => setForm(p => ({ ...p, ciudad: e.target.value }))}
                    required className={inp} placeholder="Ej: Bogotá" />
                </div>
                <div>
                  <label className={lbl}>País *</label>
                  <input value={form.pais} onChange={(e) => setForm(p => ({ ...p, pais: e.target.value }))}
                    required className={inp} placeholder="Ej: Colombia" />
                </div>
              </div>
              <div>
                <label className={lbl}>Modalidad *</label>
                <select value={form.modalidad} onChange={(e) => setForm(p => ({ ...p, modalidad: e.target.value as Modalidad }))} className={inp}>
                  <option value="AEREA">Aérea</option>
                  <option value="MARITIMA">Marítima</option>
                  <option value="TERRESTRE">Terrestre</option>
                </select>
              </div>
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>}
            </form>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={cerrar} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
