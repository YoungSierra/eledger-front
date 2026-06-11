"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  naturaleza: "DEBITO" | "CREDITO";
  acepta_movimiento: boolean;
  requiere_tercero: boolean;
  requiere_cc: boolean;
  padre_id: string | null;
  activo: boolean;
}

// Color por clase (primer dígito del código)
const CLASE_COLOR: Record<string, { bg: string; text: string; dot: string; nombre: string }> = {
  "1": { bg: "bg-emerald-50",  text: "text-emerald-800", dot: "bg-emerald-500", nombre: "Activo"                   },
  "2": { bg: "bg-red-50",      text: "text-red-800",     dot: "bg-red-500",     nombre: "Pasivo"                   },
  "3": { bg: "bg-blue-50",     text: "text-blue-800",    dot: "bg-blue-500",    nombre: "Patrimonio"               },
  "4": { bg: "bg-violet-50",   text: "text-violet-800",  dot: "bg-violet-500",  nombre: "Ingresos"                 },
  "5": { bg: "bg-orange-50",   text: "text-orange-800",  dot: "bg-orange-500",  nombre: "Gastos"                   },
  "6": { bg: "bg-amber-50",    text: "text-amber-800",   dot: "bg-amber-500",   nombre: "Costos de ventas"         },
  "7": { bg: "bg-yellow-50",   text: "text-yellow-800",  dot: "bg-yellow-500",  nombre: "Costos de producción"     },
  "8": { bg: "bg-slate-50",    text: "text-slate-700",   dot: "bg-slate-400",   nombre: "Cuentas de orden deudoras"},
  "9": { bg: "bg-gray-50",     text: "text-gray-700",    dot: "bg-gray-400",    nombre: "Cuentas de orden acreed." },
};

const NIVEL_LABEL = ["", "Clase", "Grupo", "Cuenta", "Subcuenta", "Auxiliar"];

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function CuentasPage() {
  const title = usePageTitle();
  const [raices, setRaices]       = useState<Cuenta[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, Cuenta[]>>({});
  const [abiertos, setAbiertos]   = useState<Record<string, boolean>>({});
  const [soloActivas, setSoloActivas] = useState(true);
  const [busqueda, setBusqueda]   = useState("");
  const [resultados, setResultados] = useState<Cuenta[] | null>(null);
  const [modal, setModal]         = useState<"crear" | "editar" | "desactivar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Cuenta | null>(null);
  const [padreModal, setPadreModal] = useState<Cuenta | null>(null);
  const [form, setForm]           = useState({ codigo: "", nombre: "", naturaleza: "DEBITO" as "DEBITO" | "CREDITO", descripcion: "", requiere_tercero: false, requiere_cc: false });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const busquedaTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { cargarRaices(); }, [soloActivas]);

  async function cargarRaices() {
    const data = await apiFetch<Cuenta[]>(`/cuentas?solo_activas=${soloActivas}`);
    setRaices(data);
  }

  async function expandir(cuenta: Cuenta) {
    if (abiertos[cuenta.id]) {
      setAbiertos((p) => ({ ...p, [cuenta.id]: false }));
      return;
    }
    setAbiertos((p) => ({ ...p, [cuenta.id]: true }));
    const hijos = await apiFetch<Cuenta[]>(`/cuentas?padre_id=${cuenta.id}&solo_activas=${soloActivas}`);
    setExpandidos((p) => ({ ...p, [cuenta.id]: hijos }));
  }

  function handleBusqueda(val: string) {
    setBusqueda(val);
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    if (!val.trim()) { setResultados(null); return; }
    busquedaTimer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(`/cuentas?busqueda=${encodeURIComponent(val)}`);
      setResultados(data);
    }, 300);
  }

  function cerrar() { setModal(null); setSeleccionado(null); setPadreModal(null); setError(""); }

  function abrirCrearHijo(padre: Cuenta) {
    setPadreModal(padre);
    setForm({ codigo: padre.codigo, nombre: "", naturaleza: padre.naturaleza, descripcion: "", requiere_tercero: false, requiere_cc: false });
    setError(""); setModal("crear");
  }

  function abrirDesactivar(c: Cuenta) {
    setSeleccionado(c);
    setError(""); setModal("desactivar");
  }

  async function confirmarDesactivar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/cuentas/${seleccionado!.id}`, { method: "DELETE" });
      await cargarRaices(); setExpandidos({}); setAbiertos({}); cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al desactivar");
    } finally { setSaving(false); }
  }

  async function reactivar(c: Cuenta) {
    try {
      await apiFetch(`/cuentas/${c.id}/reactivar`, { method: "POST" });
      await cargarRaices(); setExpandidos({}); setAbiertos({});
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al reactivar");
    }
  }

  function abrirEditar(c: Cuenta) {
    setSeleccionado(c);
    setForm({ codigo: c.codigo, nombre: c.nombre, naturaleza: c.naturaleza, descripcion: "", requiere_tercero: c.requiere_tercero, requiere_cc: c.requiere_cc });
    setError(""); setModal("editar");
  }

  async function guardarCrear(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await apiFetch("/cuentas", {
        method: "POST",
        body: JSON.stringify({
          codigo: form.codigo,
          nombre: form.nombre,
          naturaleza: form.naturaleza,
          padre_id: padreModal?.id ?? null,
          descripcion: form.descripcion || null,
          requiere_tercero: form.requiere_tercero,
          requiere_cc: form.requiere_cc,
        }),
      });
      if (padreModal) {
        const hijos = await apiFetch<Cuenta[]>(`/cuentas?padre_id=${padreModal.id}`);
        setExpandidos((p) => ({ ...p, [padreModal.id]: hijos }));
        setAbiertos((p) => ({ ...p, [padreModal.id]: true }));
      } else {
        await cargarRaices(); setExpandidos({}); setAbiertos({});
      }
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally { setSaving(false); }
  }

  async function guardarEditar(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await apiFetch(`/cuentas/${seleccionado!.id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre: form.nombre, descripcion: form.descripcion || null, requiere_tercero: form.requiere_tercero, requiere_cc: form.requiere_cc }),
      });
      if (seleccionado!.padre_id) {
        const hijos = await apiFetch<Cuenta[]>(`/cuentas?padre_id=${seleccionado!.padre_id}`);
        setExpandidos((p) => ({ ...p, [seleccionado!.padre_id!]: hijos }));
        setAbiertos((p) => ({ ...p, [seleccionado!.padre_id!]: true }));
      } else {
        await cargarRaices();
      }
      cerrar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al editar");
    } finally { setSaving(false); }
  }

  const lista = resultados ?? raices;

  return (
    <div className="max-w-4xl">
      {/* Encabezado */}
      <div className="mb-5">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Buscador + filtro */}
      <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={busqueda}
          onChange={(e) => handleBusqueda(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {busqueda && (
          <button onClick={() => { setBusqueda(""); setResultados(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer shrink-0">
        <input type="checkbox" checked={soloActivas}
          onChange={(e) => { setSoloActivas(e.target.checked); setExpandidos({}); setAbiertos({}); }}
          className="rounded border-gray-300 text-blue-600" />
        Solo activas
      </label>
      </div>

      {/* Árbol / resultados */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {lista.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400 text-[12px]">
            {busqueda ? "Sin resultados" : "Sin cuentas"}
          </p>
        ) : (
          <FilaCuentas
            cuentas={lista}
            expandidos={expandidos}
            abiertos={abiertos}
            onExpandir={expandir}
            onCrearHijo={abrirCrearHijo}
            onEditar={abrirEditar}
            onDesactivar={abrirDesactivar}
            onReactivar={reactivar}
            flat={!!resultados}
          />
        )}
      </div>

      {/* Modal desactivar */}
      {modal === "desactivar" && seleccionado && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-2">Desactivar cuenta</h2>
            <p className="text-[12px] text-gray-500 mb-1">
              ¿Confirmas desactivar <strong>{seleccionado.codigo} — {seleccionado.nombre}</strong>?
            </p>
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-4">
              No se podrá usar en asientos contables. Debe no tener subcuentas activas.
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

      {/* Modal crear / editar */}
      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-[14px] font-semibold text-gray-800 mb-1">
              {modal === "crear" ? "Nueva cuenta" : "Editar cuenta"}
            </h2>
            {padreModal && (
              <p className="text-[11px] text-gray-400 mb-3">
                Subcuenta de: <span className="font-medium text-gray-600">{padreModal.codigo} — {padreModal.nombre}</span>
              </p>
            )}
            <form onSubmit={modal === "crear" ? guardarCrear : guardarEditar} className="space-y-3">
              <div>
                <label className={labelCls}>Código</label>
                <input value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                  required disabled={modal === "editar"}
                  className={inputCls + (modal === "editar" ? " bg-gray-50 text-gray-400" : "")}
                  placeholder={padreModal ? `${padreModal.codigo}XX` : "ej. 1"} />
                {modal === "crear" && padreModal && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Debe comenzar con <strong>{padreModal.codigo}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  required className={inputCls} placeholder="Nombre de la cuenta" />
              </div>
              <div>
                <label className={labelCls}>Naturaleza</label>
                <select value={form.naturaleza} onChange={(e) => setForm((p) => ({ ...p, naturaleza: e.target.value as "DEBITO" | "CREDITO" }))}
                  className={inputCls}>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                </select>
                {modal === "editar" && (
                  <p className="text-[10px] text-amber-600 mt-1">⚠ Cambiar la naturaleza puede afectar la presentación de reportes si ya existen asientos.</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Descripción (opcional)</label>
                <input value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className={inputCls} placeholder="Descripción adicional" />
              </div>
              <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.requiere_tercero}
                    onChange={(e) => setForm(p => ({ ...p, requiere_tercero: e.target.checked }))}
                    className="rounded border-gray-300 text-amber-600" />
                  <span className="text-[12px] text-gray-700">Requiere tercero <span className="text-[10px] text-amber-600 font-semibold">3RO</span></span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.requiere_cc}
                    onChange={(e) => setForm(p => ({ ...p, requiere_cc: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600" />
                  <span className="text-[12px] text-gray-700">Requiere centro de costo <span className="text-[10px] text-purple-600 font-semibold">CC</span></span>
                </label>
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
    </div>
  );
}

// ── Componente de filas del árbol ───────────────────────────────────────────

interface FilaProps {
  cuentas: Cuenta[];
  expandidos: Record<string, Cuenta[]>;
  abiertos: Record<string, boolean>;
  onExpandir: (c: Cuenta) => void;
  onCrearHijo: (c: Cuenta) => void;
  onEditar: (c: Cuenta) => void;
  onDesactivar: (c: Cuenta) => void;
  onReactivar: (c: Cuenta) => void;
  flat?: boolean;
  depth?: number;
}

function FilaCuentas({ cuentas, expandidos, abiertos, onExpandir, onCrearHijo, onEditar, onDesactivar, onReactivar, flat = false, depth = 0 }: FilaProps) {
  return (
    <>
      {cuentas.map((c) => {
        const clase = c.codigo[0];
        const color = CLASE_COLOR[clase] ?? CLASE_COLOR["9"];
        const tieneHijos = c.nivel < 5;
        const estaAbierto = abiertos[c.id];
        const hijos = expandidos[c.id] ?? [];

        return (
          <div key={c.id}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 transition-colors border-b border-gray-100 last:border-0 group ${c.activo ? "hover:bg-gray-50" : "bg-red-50/40 opacity-60"} ${tieneHijos ? "cursor-pointer" : ""}`}
              style={{ paddingLeft: flat ? 12 : 12 + depth * 20 }}
              onClick={() => tieneHijos && onExpandir(c)}
            >
              {/* Flecha / punto */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {tieneHijos ? (
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${estaAbierto ? "rotate-90" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                )}
              </div>

              {/* Código */}
              <span className={`font-mono text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>
                {c.codigo}
              </span>

              {/* Nombre */}
              <span className={`text-[12px] flex-1 ${c.nivel <= 2 ? "font-semibold text-gray-800" : "text-gray-700"}`}>
                {c.nombre}
              </span>

              {/* Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {c.acepta_movimiento && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">MOV</span>
                )}
                {c.requiere_tercero && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">3RO</span>
                )}
                {c.requiere_cc && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-semibold">CC</span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  c.naturaleza === "DEBITO" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}>
                  {c.naturaleza === "DEBITO" ? "DB" : "CR"}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEditar(c)} title="Editar"
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                {c.nivel < 5 && (
                  <button onClick={() => onCrearHijo(c)} title="Agregar subcuenta"
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

            {/* Hijos recursivos */}
            {estaAbierto && hijos.length > 0 && (
              <FilaCuentas
                cuentas={hijos}
                expandidos={expandidos}
                abiertos={abiertos}
                onExpandir={onExpandir}
                onCrearHijo={onCrearHijo}
                onEditar={onEditar}
                onDesactivar={onDesactivar}
                onReactivar={onReactivar}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
