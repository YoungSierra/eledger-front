"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Concepto {
  id: string; nombre: string; seccion: string;
  tipo_calculo: "POR_KG" | "POR_EMBARQUE" | "PORCENTAJE";
  moneda: "USD" | "COP"; activo: boolean;
  cuenta_ingreso_id: string | null; cuenta_ingreso_nombre: string | null;
  tarifa_iva_id: string | null; tarifa_iva_nombre: string | null;
}
interface Cuenta { id: string; codigo: string; nombre: string; }
interface TarifaIva { id: string; nombre: string; porcentaje: string; }

type TipoCalculo = "POR_KG" | "POR_EMBARQUE" | "PORCENTAJE";
type Moneda = "USD" | "COP";

const SECCIONES = [
  "TRANSPORTE_INTERNACIONAL", "GASTOS_ORIGEN", "GASTOS_DESTINO",
  "ADUANA", "TRANSPORTE_TERRESTRE", "ALMACENAMIENTO", "SEGURO",
];

const SECCION_LABEL: Record<string, string> = {
  TRANSPORTE_INTERNACIONAL: "Transporte internacional",
  GASTOS_ORIGEN:            "Gastos de origen",
  GASTOS_DESTINO:           "Gastos en destino",
  ADUANA:                   "Aduana",
  TRANSPORTE_TERRESTRE:     "Transporte terrestre",
  ALMACENAMIENTO:           "Almacenamiento",
  SEGURO:                   "Seguro",
};

const TIPO_LABEL: Record<TipoCalculo, string> = {
  POR_KG:       "Por Kg",
  POR_EMBARQUE: "Por embarque",
  PORCENTAJE:   "% sobre CIF",
};

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

interface Form { nombre: string; seccion: string; tipo_calculo: TipoCalculo; moneda: Moneda; cuenta_ingreso_id: string; tarifa_iva_id: string; }
const FORM_VACIO: Form = { nombre: "", seccion: "TRANSPORTE_INTERNACIONAL", tipo_calculo: "POR_KG", moneda: "USD", cuenta_ingreso_id: "", tarifa_iva_id: "" };

function CuentaSearch({ label, cuentaDisplay, onChange }: {
  label: string; cuentaDisplay: string; onChange: (id: string) => void;
}) {
  const [q, setQ]           = useState(cuentaDisplay);
  const [opciones, setOpc]  = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(cuentaDisplay); }, [cuentaDisplay]);

  function buscar(val: string) {
    setQ(val);
    onChange("");
    if (!val.trim()) { setOpc([]); setAbierto(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(
        `/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true&solo_movimiento=true`
      ).catch(() => []);
      setOpc(data.slice(0, 10)); setAbierto(data.length > 0);
    }, 300);
  }

  return (
    <div className="relative">
      <label className={lbl}>{label}</label>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código o nombre..." className={inp} />
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

export default function ConceptosPage() {
  const title = usePageTitle();
  const [lista, setLista]             = useState<Concepto[]>([]);
  const [soloActivos, setSoloActivos] = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [filtroSeccion, setFiltroSeccion] = useState("");
  const [drawer, setDrawer]           = useState<"crear" | "editar" | null>(null);
  const [sel, setSel]                 = useState<Concepto | null>(null);
  const [form, setForm]               = useState<Form>(FORM_VACIO);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [tarifasIva, setTarifasIva]   = useState<TarifaIva[]>([]);
  const [cuentaNombre, setCuentaNombre] = useState("");
  const [pagina, setPagina]           = useState(1);
  const porPagina                     = 20;
  const { orden, alternar } = useOrden<"seccion" | "concepto" | "tipo" | "moneda" | "estado">("seccion", "asc", () => setPagina(1));

  useEffect(() => { cargar(); }, [soloActivos]);
  useEffect(() => { apiFetch<TarifaIva[]>("/maestros/tarifas-iva?solo_activas=true").then(setTarifasIva).catch(() => {}); }, []);

  async function cargar() {
    const data = await apiFetch<Concepto[]>(`/operaciones/conceptos?solo_activos=${soloActivos}`);
    setLista(data);
    setPagina(1);
  }

  function cerrar() { setDrawer(null); setSel(null); setForm(FORM_VACIO); setError(""); setCuentaNombre(""); }

  function abrirCrear() { setForm(FORM_VACIO); setError(""); setCuentaNombre(""); setDrawer("crear"); }

  function abrirEditar(c: Concepto) {
    setSel(c);
    setForm({ nombre: c.nombre, seccion: c.seccion, tipo_calculo: c.tipo_calculo, moneda: c.moneda,
      cuenta_ingreso_id: c.cuenta_ingreso_id ?? "", tarifa_iva_id: c.tarifa_iva_id ?? "" });
    setCuentaNombre(c.cuenta_ingreso_nombre ?? "");
    setError(""); setDrawer("editar");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, cuenta_ingreso_id: form.cuenta_ingreso_id || null, tarifa_iva_id: form.tarifa_iva_id || null };
      if (drawer === "crear") {
        await apiFetch("/operaciones/conceptos", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/operaciones/conceptos/${sel!.id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      await cargar(); cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function toggleActivo(c: Concepto) {
    await apiFetch(`/operaciones/conceptos/${c.id}`, { method: "PUT", body: JSON.stringify({ activo: !c.activo }) });
    cargar();
  }

  const conceptosFiltrados = lista
    .filter((c) => {
      const matchBusqueda = !busqueda.trim() || c.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchSeccion  = !filtroSeccion || c.seccion === filtroSeccion;
      return matchBusqueda && matchSeccion;
    })
    .sort((a, b) => SECCIONES.indexOf(a.seccion) - SECCIONES.indexOf(b.seccion));

  // Se ordena la lista completa antes de paginar. La sección ordena por su
  // orden canónico (el de SECCIONES, que es el flujo de la operación), no
  // alfabéticamente: es el orden que la página muestra por defecto.
  const ordenada = ordenarFilas(conceptosFiltrados, orden, {
    seccion:  (c) => SECCIONES.indexOf(c.seccion),
    concepto: (c) => c.nombre,
    tipo:     (c) => TIPO_LABEL[c.tipo_calculo],
    moneda:   (c) => c.moneda,
    estado:   (c) => (c.activo ? 1 : 0),
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Conceptos que precargan en las líneas de cotización</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo concepto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 shrink-0 max-w-5xl">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar concepto..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={filtroSeccion} onChange={(e) => { setFiltroSeccion(e.target.value); setPagina(1); }}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Todas las secciones</option>
          {SECCIONES.map((s) => <option key={s} value={s}>{SECCION_LABEL[s]}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={soloActivos} onChange={(e) => { setSoloActivos(e.target.checked); setPagina(1); }}
            className="w-3.5 h-3.5 accent-blue-600" />
          Solo activos
        </label>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 max-w-5xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="seccion"  orden={orden} alternar={alternar}>Sección</Th>
                <Th campo="concepto" orden={orden} alternar={alternar}>Concepto</Th>
                <Th campo="tipo"     orden={orden} alternar={alternar}>Tipo cálculo</Th>
                <Th campo="moneda"   orden={orden} alternar={alternar}>Moneda</Th>
                <Th campo="estado"   orden={orden} alternar={alternar}>Estado</Th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-gray-400">
                  {busqueda || filtroSeccion ? "Sin resultados para los filtros aplicados" : "Sin conceptos registrados"}
                </td></tr>
              ) : filas.map((c) => (
                <tr key={c.id} className={`hover:bg-blue-50/30 transition-colors ${!c.activo ? "opacity-40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                        {SECCION_LABEL[c.seccion]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-500">{TIPO_LABEL[c.tipo_calculo]}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.moneda === "USD" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                      {c.moneda}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.activo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEditar(c)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {c.activo ? (
                        <button onClick={() => toggleActivo(c)} title="Inactivar"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </button>
                      ) : (
                        <button onClick={() => toggleActivo(c)} title="Activar"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
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
            {conceptosFiltrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, conceptosFiltrados.length)}`} de {conceptosFiltrados.length}
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
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nuevo concepto" : "Editar concepto"}
              subtitle={sel ? sel.nombre : undefined}
              onClose={cerrar}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
            />
            <form onSubmit={guardar} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className={lbl}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required className={inp} placeholder="Ej: Flete internacional" />
              </div>
              <div>
                <label className={lbl}>Sección *</label>
                <select value={form.seccion} onChange={(e) => setForm(p => ({ ...p, seccion: e.target.value }))} className={inp}>
                  {SECCIONES.map((s) => <option key={s} value={s}>{SECCION_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tipo cálculo *</label>
                  <select value={form.tipo_calculo} onChange={(e) => setForm(p => ({ ...p, tipo_calculo: e.target.value as TipoCalculo }))} className={inp}>
                    <option value="POR_KG">Por Kg</option>
                    <option value="POR_EMBARQUE">Por embarque</option>
                    <option value="PORCENTAJE">% sobre CIF</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Moneda *</label>
                  <select value={form.moneda} onChange={(e) => setForm(p => ({ ...p, moneda: e.target.value as Moneda }))} className={inp}>
                    <option value="USD">USD</option>
                    <option value="COP">COP</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Parámetros de facturación</p>
                <CuentaSearch label="Cuenta de ingreso" cuentaDisplay={cuentaNombre}
                  onChange={(id) => setForm(p => ({ ...p, cuenta_ingreso_id: id }))} />
                <div>
                  <label className={lbl}>Tarifa de IVA</label>
                  <select value={form.tarifa_iva_id} onChange={(e) => setForm(p => ({ ...p, tarifa_iva_id: e.target.value }))} className={inp}>
                    <option value="">Sin IVA</option>
                    {tarifasIva.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.porcentaje}%)</option>)}
                  </select>
                </div>
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
