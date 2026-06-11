"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Centro {
  id: string;
  codigo: string;
  nombre: string;
  padre_id: string | null;
  descripcion: string | null;
  activo: boolean;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function CentrosCostoPage() {
  const title = usePageTitle();
  const [raices, setRaices]           = useState<Centro[]>([]);
  const [expandidos, setExpandidos]   = useState<Record<string, Centro[]>>({});
  const [abiertos, setAbiertos]       = useState<Record<string, boolean>>({});
  const [soloActivos, setSoloActivos] = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [resultados, setResultados]   = useState<Centro[] | null>(null);
  const [modal, setModal]             = useState<"crear" | "editar" | "desactivar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Centro | null>(null);
  const [padreModal, setPadreModal]   = useState<Centro | null>(null);
  const [form, setForm]               = useState({ codigo: "", nombre: "", descripcion: "" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const timer                         = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { cargarRaices(); }, [soloActivos]);

  async function cargarRaices() {
    const data = await apiFetch<Centro[]>(`/centros-costo?solo_activos=${soloActivos}`);
    setRaices(data);
  }

  async function expandir(c: Centro) {
    if (abiertos[c.id]) { setAbiertos((p) => ({ ...p, [c.id]: false })); return; }
    const hijos = await apiFetch<Centro[]>(`/centros-costo?padre_id=${c.id}&solo_activos=${soloActivos}`);
    setExpandidos((p) => ({ ...p, [c.id]: hijos }));
    setAbiertos((p) => ({ ...p, [c.id]: true }));
  }

  function handleBusqueda(val: string) {
    setBusqueda(val);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) { setResultados(null); return; }
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Centro[]>(`/centros-costo?busqueda=${encodeURIComponent(val)}`);
      setResultados(data);
    }, 300);
  }

  function cerrar() { setModal(null); setSeleccionado(null); setPadreModal(null); setError(""); }

  function abrirCrear(padre?: Centro) {
    setPadreModal(padre ?? null);
    setForm({ codigo: "", nombre: "", descripcion: "" });
    setError(""); setModal("crear");
  }

  function abrirEditar(c: Centro) {
    setSeleccionado(c);
    setForm({ codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion ?? "" });
    setError(""); setModal("editar");
  }

  function abrirDesactivar(c: Centro) { setSeleccionado(c); setError(""); setModal("desactivar"); }

  async function guardarCrear(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await apiFetch("/centros-costo", {
        method: "POST",
        body: JSON.stringify({ codigo: form.codigo, nombre: form.nombre, descripcion: form.descripcion || null, padre_id: padreModal?.id ?? null }),
      });
      if (padreModal) {
        const hijos = await apiFetch<Centro[]>(`/centros-costo?padre_id=${padreModal.id}&solo_activos=${soloActivos}`);
        setExpandidos((p) => ({ ...p, [padreModal.id]: hijos }));
        setAbiertos((p) => ({ ...p, [padreModal.id]: true }));
      } else { cargarRaices(); }
      cerrar();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  async function guardarEditar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await apiFetch(`/centros-costo/${seleccionado!.id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre: form.nombre, descripcion: form.descripcion || null }),
      });
      cargarRaices(); setExpandidos({}); cerrar();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  async function confirmarDesactivar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/centros-costo/${seleccionado!.id}`, { method: "DELETE" });
      cargarRaices(); setExpandidos({}); cerrar();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  async function reactivar(c: Centro) {
    try {
      await apiFetch(`/centros-costo/${c.id}/reactivar`, { method: "POST" });
      cargarRaices(); setExpandidos({});
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Error"); }
  }

  const lista = resultados ?? raices;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Jerarquía de centros para imputación de gastos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <input type="checkbox" id="soloActivos" checked={soloActivos}
              onChange={(e) => { setSoloActivos(e.target.checked); setExpandidos({}); }}
              className="w-3.5 h-3.5 accent-blue-600" />
            <label htmlFor="soloActivos" className="text-[12px] text-gray-500">Solo activos</label>
          </div>
          <button onClick={() => abrirCrear()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
            + Nuevo centro
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={busqueda} onChange={(e) => handleBusqueda(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        {busqueda && (
          <button onClick={() => { setBusqueda(""); setResultados(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Árbol */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {lista.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400 text-[12px]">
            {busqueda ? "Sin resultados" : "Sin centros de costo registrados"}
          </p>
        ) : (
          <FilaCentros cuentas={lista} expandidos={expandidos} abiertos={abiertos}
            onExpandir={expandir} onCrearHijo={abrirCrear} onEditar={abrirEditar}
            onDesactivar={abrirDesactivar} onReactivar={reactivar} flat={!!resultados} />
        )}
      </div>

      {/* Modal crear / editar */}
      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-1">
              {modal === "crear" ? "Nuevo centro de costo" : "Editar centro de costo"}
            </h2>
            {padreModal && (
              <p className="text-[11px] text-gray-400 mb-3">
                Hijo de: <span className="font-medium text-gray-600">{padreModal.codigo} — {padreModal.nombre}</span>
              </p>
            )}
            <form onSubmit={modal === "crear" ? guardarCrear : guardarEditar} className="space-y-3 mt-3">
              <div>
                <label className={labelCls}>Código</label>
                <input value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                  required disabled={modal === "editar"}
                  className={inputCls + (modal === "editar" ? " bg-gray-50 text-gray-400" : "")}
                  placeholder="ej. ADM, VTA-BOG" />
              </div>
              <div>
                <label className={labelCls}>Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  required className={inputCls} placeholder="ej. Administración" />
              </div>
              <div>
                <label className={labelCls}>Descripción (opcional)</label>
                <input value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className={inputCls} placeholder="Descripción del centro" />
              </div>
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={cerrar} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal desactivar */}
      {modal === "desactivar" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Desactivar centro de costo</h2>
            <p className="text-[12px] text-gray-500 mb-4">
              ¿Confirmas desactivar <strong>{seleccionado.codigo} — {seleccionado.nombre}</strong>? Debe no tener subcentros activos.
            </p>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cerrar} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={confirmarDesactivar} disabled={saving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Desactivando..." : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente árbol ────────────────────────────────────────────────────────

interface FilaProps {
  cuentas: Centro[];
  expandidos: Record<string, Centro[]>;
  abiertos: Record<string, boolean>;
  onExpandir: (c: Centro) => void;
  onCrearHijo: (c: Centro) => void;
  onEditar: (c: Centro) => void;
  onDesactivar: (c: Centro) => void;
  onReactivar: (c: Centro) => void;
  flat?: boolean;
  depth?: number;
}

function FilaCentros({ cuentas, expandidos, abiertos, onExpandir, onCrearHijo, onEditar, onDesactivar, onReactivar, flat = false, depth = 0 }: FilaProps) {
  return (
    <>
      {cuentas.map((c) => {
        const estaAbierto = abiertos[c.id];
        const hijos = expandidos[c.id] ?? [];

        return (
          <div key={c.id}>
            <div
              className={`flex items-center gap-2 px-3 py-2 transition-colors border-b border-gray-100 last:border-0 group ${c.activo ? "hover:bg-gray-50" : "bg-red-50/30 opacity-60"}`}
              style={{ paddingLeft: flat ? 12 : 12 + depth * 20 }}
            >
              {/* Expandir */}
              <button onClick={() => onExpandir(c)}
                className="w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer">
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${estaAbierto ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              {/* Código */}
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                {c.codigo}
              </span>

              {/* Nombre */}
              <span className="text-[12px] text-gray-700 flex-1">{c.nombre}</span>

              {/* Descripción */}
              {c.descripcion && (
                <span className="text-[10px] text-gray-400 italic truncate max-w-32 hidden md:block">{c.descripcion}</span>
              )}

              {/* Acciones */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditar(c)} title="Editar"
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                {c.activo && (
                  <button onClick={() => onCrearHijo(c)} title="Agregar subcentro"
                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                )}
                {c.activo ? (
                  <button onClick={() => onDesactivar(c)} title="Desactivar"
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                  </button>
                ) : (
                  <button onClick={() => onReactivar(c)} title="Reactivar"
                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {estaAbierto && hijos.length > 0 && (
              <FilaCentros cuentas={hijos} expandidos={expandidos} abiertos={abiertos}
                onExpandir={onExpandir} onCrearHijo={onCrearHijo} onEditar={onEditar}
                onDesactivar={onDesactivar} onReactivar={onReactivar} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </>
  );
}
