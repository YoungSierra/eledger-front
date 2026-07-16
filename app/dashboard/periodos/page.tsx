"use client";

import { useEffect, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Periodo {
  id: string; anio: number; mes: number;
  fecha_inicio: string; fecha_cierre: string;
  estado: "abierto" | "cerrado" | "bloqueado";
  cerrado_en: string | null; activo: boolean;
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const ESTADO_BADGE: Record<string, string> = {
  abierto:   "bg-green-50 text-green-700",
  cerrado:   "bg-gray-100 text-gray-500",
  bloqueado: "bg-blue-50 text-blue-600",
};
const ESTADO_DOT: Record<string, string> = {
  abierto: "bg-green-500", cerrado: "bg-gray-400", bloqueado: "bg-blue-500",
};
const ESTADO_LABEL: Record<string, string> = {
  abierto: "Abierto", cerrado: "Cerrado", bloqueado: "Por abrir",
};

const anioActual = new Date().getFullYear();
const mesActual  = new Date().getMonth() + 1;

function primerDia(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}
function ultimoDia(anio: number, mes: number) {
  return new Date(anio, mes, 0).toISOString().slice(0, 10);
}

export default function PeriodosPage() {
  const title = usePageTitle();
  const [periodos, setPeriodos]         = useState<Periodo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtroAnio, setFiltroAnio]     = useState<string>(String(anioActual));
  const [drawer, setDrawer]             = useState<"crear" | "editar" | null>(null);
  const [modalAccion, setModalAccion]   = useState<"cerrar" | "reabrir" | "iniciar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Periodo | null>(null);
  const [motivo, setMotivo]             = useState("");
  const [form, setForm]                 = useState({
    anio: anioActual, mes: mesActual,
    fecha_inicio: primerDia(anioActual, mesActual),
    fecha_cierre: ultimoDia(anioActual, mesActual),
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [pagina, setPagina]   = useState(1);
  const porPagina             = 12;
  const { orden, alternar } = useOrden<"periodo" | "vigencia" | "estado">("periodo", "desc", () => setPagina(1));

  async function cargar() {
    setLoading(true);
    setPeriodos(await apiFetch<Periodo[]>(`/periodos`));
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [filtroAnio]);

  function cerrarDrawer() { setDrawer(null); setSeleccionado(null); setError(""); }
  function cerrarModal()  { setModalAccion(null); setSeleccionado(null); setError(""); setMotivo(""); }

  function abrirCrear() {
    let anio = anioActual;
    let mes = mesActual;
    // Con filtro de año activo, precargar ese año y el mes siguiente al último
    // período existente (Enero si el año aún no tiene ninguno).
    if (filtroAnio) {
      anio = Number(filtroAnio);
      const meses = periodos.filter((p) => p.anio === anio).map((p) => p.mes);
      mes = meses.length === 0 ? 1 : Math.min(Math.max(...meses) + 1, 12);
    }
    setForm({ anio, mes, fecha_inicio: primerDia(anio, mes), fecha_cierre: ultimoDia(anio, mes) });
    setSeleccionado(null); setError(""); setDrawer("crear");
  }

  function abrirEditar(p: Periodo) {
    setSeleccionado(p);
    setForm({ anio: p.anio, mes: p.mes, fecha_inicio: p.fecha_inicio, fecha_cierre: p.fecha_cierre });
    setError(""); setDrawer("editar");
  }

  function actualizarFechas(anio: number, mes: number) {
    setForm((p) => ({ ...p, anio, mes, fecha_inicio: primerDia(anio, mes), fecha_cierre: ultimoDia(anio, mes) }));
  }

  async function guardarDrawer(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (drawer === "crear") {
        await apiFetch("/periodos", { method: "POST", body: JSON.stringify(form) });
      } else {
        await apiFetch(`/periodos/${seleccionado!.id}`, { method: "PUT", body: JSON.stringify({ fecha_inicio: form.fecha_inicio, fecha_cierre: form.fecha_cierre }) });
      }
      cerrarDrawer(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function confirmarCerrar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/periodos/${seleccionado!.id}/cerrar`, { method: "POST" });
      cerrarModal(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cerrar");
    } finally { setSaving(false); }
  }

  async function generarAnio() {
    setSaving(true); setError("");
    try {
      await apiFetch("/periodos/generar-anio", { method: "POST", body: JSON.stringify({ anio: form.anio }) });
      cerrarDrawer();
      setFiltroAnio(String(form.anio));
      cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar los períodos");
    } finally { setSaving(false); }
  }

  async function confirmarIniciar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/periodos/${seleccionado!.id}/iniciar`, { method: "POST" });
      cerrarModal(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar");
    } finally { setSaving(false); }
  }

  async function confirmarReabrir() {
    if (!motivo.trim()) { setError("Debes ingresar un motivo de reapertura"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch(`/periodos/${seleccionado!.id}/reabrir?motivo=${encodeURIComponent(motivo)}`, { method: "POST" });
      cerrarModal(); cargar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al reabrir");
    } finally { setSaving(false); }
  }

  // Filtro de años: SOLO los años que tienen períodos + el año actual, del más
  // reciente al más antiguo. Así la fila refleja la realidad y no se llena de
  // años futuros vacíos ni acumula años para siempre.
  const aniosFiltro = Array.from(new Set([anioActual, ...periodos.map((p) => p.anio)]))
    .sort((a, b) => a - b);
  // Select del drawer (crear): ventana hacia adelante para poder crear anticipado,
  // más cualquier año que ya tenga datos. Desde 2026 (inicio) hasta año actual + 10.
  const aniosDisponibles = Array.from(
    new Set([
      ...Array.from({ length: anioActual + 10 - 2026 + 1 }, (_, i) => 2026 + i),
      ...periodos.map((p) => p.anio),
    ])
  ).sort((a, b) => a - b);

  const periodosFiltrados = filtroAnio ? periodos.filter((p) => String(p.anio) === filtroAnio) : periodos;
  // Se ordena la lista completa antes de paginar. El período es cronológico:
  // año y mes se combinan en un solo número para que Enero 2027 no quede antes
  // que Diciembre 2026.
  const ordenada = ordenarFilas(periodosFiltrados, orden, {
    periodo:  (p) => p.anio * 100 + p.mes,
    vigencia: (p) => p.fecha_inicio,
    estado:   (p) => ESTADO_LABEL[p.estado],
  });
  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
  // Meses ya existentes del año seleccionado en el drawer.
  const anioCompleto = periodos.filter((p) => p.anio === form.anio).length >= 12;

  return (
    <div className="h-full flex flex-col">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Enero–Diciembre · Colombia (NIIF PyMES)</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo período
        </button>
      </div>

      {/* Filtro año */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <span className="text-[11px] text-gray-400">Año:</span>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFiltroAnio("")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filtroAnio === "" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            Todos
          </button>
          {aniosFiltro.map((a) => (
            <button key={a} onClick={() => setFiltroAnio(String(a))}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filtroAnio === String(a) ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[520px] text-[12px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-200">
                <Th campo="periodo"  orden={orden} alternar={alternar}>Período</Th>
                <Th campo="vigencia" orden={orden} alternar={alternar}>Vigencia</Th>
                <Th campo="estado"   orden={orden} alternar={alternar}>Estado</Th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin períodos registrados</td></tr>
              ) : filas.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-blue-600">{MESES[p.mes - 1]} {p.anio}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-[11.5px] text-gray-500">{p.fecha_inicio}</span>
                    <span className="text-gray-300 mx-1.5">→</span>
                    <span className="font-mono text-[11.5px] text-gray-500">{p.fecha_cierre}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[p.estado]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ESTADO_DOT[p.estado]}`} />
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.estado === "bloqueado" && (
                        <button onClick={() => { setSeleccionado(p); setError(""); setModalAccion("iniciar"); }}
                          title="Abrir período"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </button>
                      )}
                      {(p.estado === "abierto" || p.estado === "bloqueado") && (
                        <button onClick={() => abrirEditar(p)} title="Editar fechas"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      {(p.estado === "abierto" || p.estado === "bloqueado") && (
                        <button onClick={() => { setSeleccionado(p); setError(""); setModalAccion("cerrar"); }}
                          title="Cerrar período"
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </button>
                      )}
                      {p.estado === "cerrado" && (
                        <button onClick={() => { setSeleccionado(p); setMotivo(""); setError(""); setModalAccion("reabrir"); }}
                          title="Reabrir período"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 0 9.9-1"/><polyline points="15 3 21 3 21 9"/>
                          </svg>
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
            {periodosFiltrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, periodosFiltrados.length)}`} de {periodosFiltrados.length}
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

      {/* Drawer — Crear / Editar período */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nuevo período" : "Editar fechas"}
              subtitle={seleccionado ? `${MESES[seleccionado.mes - 1]} ${seleccionado.anio}` : undefined}
              onClose={cerrarDrawer}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            />
            <form onSubmit={guardarDrawer} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {drawer === "crear" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Año</label>
                    <select value={form.anio} onChange={(e) => actualizarFechas(+e.target.value, form.mes)} className={inp}>
                      {aniosDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Mes</label>
                    <select value={form.mes} onChange={(e) => actualizarFechas(form.anio, +e.target.value)} className={inp}>
                      {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Fecha cierre</label>
                  <input type="date" value={form.fecha_cierre}
                    onChange={(e) => setForm((p) => ({ ...p, fecha_cierre: e.target.value }))}
                    className={inp} />
                </div>
              </div>
              {drawer === "editar" && (
                <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5">
                  Solo se pueden modificar fechas mientras el período está abierto o programado.
                </p>
              )}
              {drawer === "crear" && (
                <div className="border-t border-gray-100 pt-3">
                  <button type="button" onClick={generarAnio} disabled={saving || anioCompleto}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-blue-600 text-[12px] font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
                    Generar todos los períodos de {form.anio}
                  </button>
                  <p className="text-[10.5px] text-gray-400 mt-1.5 text-center">
                    {anioCompleto
                      ? `El año ${form.anio} ya tiene los 12 períodos.`
                      : "Crea los 12 meses del año en estado “Por abrir”; omite los que ya existan."}
                  </p>
                </div>
              )}
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>}
            </form>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={cerrarDrawer} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarDrawer} disabled={saving} className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : drawer === "crear" ? "Crear" : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal — Iniciar período */}
      {modalAccion === "iniciar" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Abrir período</h2>
            <p className="text-[12px] text-gray-500 mb-3">
              ¿Confirmas abrir <strong>{MESES[seleccionado.mes - 1]} {seleccionado.anio}</strong>? Quedará abierto y aceptará transacciones.
            </p>
            <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5 mb-4">
              Si el cierre automático está activo, el período abierto anterior se cerrará al abrir este.
            </p>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cerrarModal} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmarIniciar} disabled={saving}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Abriendo..." : "Abrir período"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Cerrar período */}
      {modalAccion === "cerrar" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Cerrar período</h2>
            <p className="text-[12px] text-gray-500 mb-3">
              ¿Confirmas cerrar <strong>{MESES[seleccionado.mes - 1]} {seleccionado.anio}</strong>?
            </p>
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-4">
              Un período cerrado no permite nuevos asientos. Requiere reapertura manual.
            </p>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cerrarModal} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmarCerrar} disabled={saving}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Cerrando..." : "Cerrar período"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Reabrir período */}
      {modalAccion === "reabrir" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Reabrir período</h2>
            <p className="text-[12px] text-gray-500 mb-3">
              Período: <strong>{MESES[seleccionado.mes - 1]} {seleccionado.anio}</strong>
            </p>
            <div className="mb-3">
              <label className={lbl}>Motivo de reapertura *</label>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                className={inp} placeholder="Corrección de asientos, ajuste contable..." />
            </div>
            <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5 mb-4">
              La reapertura quedará registrada en la bitácora del período.
            </p>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cerrarModal} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmarReabrir} disabled={saving}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Reabriendo..." : "Reabrir período"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
