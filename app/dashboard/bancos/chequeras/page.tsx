"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface CuentaBancaria { id: string; nombre: string; numero: string; banco_nombre: string | null; }
interface Chequera {
  id: string; cuenta_id: string; cuenta_nombre: string | null; banco_nombre: string | null;
  prefijo: string | null; numero_desde: number; numero_hasta: number;
  consecutivo_actual: number; estado: string; descripcion: string | null; activo: boolean;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls = inputCls;

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA:  "bg-green-50 text-green-700",
  AGOTADA: "bg-yellow-50 text-yellow-700",
  ANULADA: "bg-gray-100 text-gray-500",
};

const EMPTY_FORM = { cuenta_id: "", prefijo: "", numero_desde: "", numero_hasta: "", descripcion: "" };

export default function ChequerasPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Chequera[]>([]);
  const [cuentas, setCuentas]   = useState<CuentaBancaria[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<Chequera | null>(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [estadoEdit, setEstadoEdit] = useState("ACTIVA");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { cargar(); }, [soloActivas]);

  async function cargar() {
    setLoading(true);
    try {
      const [ch, cu] = await Promise.all([
        apiFetch<Chequera[]>(`/bancos/chequeras?solo_activas=${soloActivas}`),
        apiFetch<CuentaBancaria[]>("/bancos/cuentas?solo_activas=true"),
      ]);
      setLista(ch); setCuentas(cu); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() {
    setForm(EMPTY_FORM); setEditando(null); setEstadoEdit("ACTIVA"); setError(""); setDrawer("crear");
  }

  function abrirEditar(c: Chequera) {
    setForm({
      cuenta_id: c.cuenta_id, prefijo: c.prefijo ?? "",
      numero_desde: String(c.numero_desde), numero_hasta: String(c.numero_hasta),
      descripcion: c.descripcion ?? "",
    });
    setEstadoEdit(c.estado); setEditando(c); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.cuenta_id) { setError("Selecciona una cuenta bancaria"); return; }
    const nd = parseInt(form.numero_desde);
    const nh = parseInt(form.numero_hasta);
    if (!nd || nd < 1) { setError("Número desde inválido"); return; }
    if (!nh || nh < nd) { setError("Número hasta debe ser ≥ número desde"); return; }
    setSaving(true); setError("");
    try {
      if (drawer === "crear") {
        await apiFetch("/bancos/chequeras", {
          method: "POST",
          body: JSON.stringify({
            cuenta_id: form.cuenta_id,
            prefijo: form.prefijo || null,
            numero_desde: nd,
            numero_hasta: nh,
            descripcion: form.descripcion || null,
          }),
        });
      } else {
        await apiFetch(`/bancos/chequeras/${editando!.id}`, {
          method: "PUT",
          body: JSON.stringify({
            prefijo: form.prefijo || null,
            numero_desde: nd,
            numero_hasta: nh,
            estado: estadoEdit,
            descripcion: form.descripcion || null,
          }),
        });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(c: Chequera) {
    try {
      await apiFetch(`/bancos/chequeras/${c.id}`, { method: "PUT", body: JSON.stringify({ activo: !c.activo }) });
      await cargar();
    } catch {}
  }

  const filtrados = lista.filter((c) => {
    const texto = busqueda.toLowerCase();
    return (
      (c.banco_nombre ?? "").toLowerCase().includes(texto) ||
      (c.cuenta_nombre ?? "").toLowerCase().includes(texto) ||
      (c.prefijo ?? "").toLowerCase().includes(texto) ||
      String(c.numero_desde).includes(texto)
    );
  });
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = filtrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Talonarios de cheques asociados a cuentas bancarias</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva chequera
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
          Solo activas
        </label>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50/60 z-10">
              <tr className="border-b border-gray-100">
                {["Banco / Cuenta", "Prefijo", "Rango", "Consecutivo", "Estado", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[12px] text-gray-800 font-medium">{c.banco_nombre ?? "—"}</p>
                    <p className="text-[11px] text-gray-400">{c.cuenta_nombre ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{c.prefijo ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{c.numero_desde.toLocaleString()} – {c.numero_hasta.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-700 font-medium">{c.consecutivo_actual.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[c.estado] ?? "bg-gray-100 text-gray-500"}`}>
                      {c.estado}
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
          <span className="text-[11px] text-gray-400">{filtrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, filtrados.length)}`} de {filtrados.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-[13px] font-semibold text-gray-800">{drawer === "crear" ? "Nueva chequera" : "Editar chequera"}</h2>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {drawer === "crear" && (
                <div>
                  <label className={labelCls}>Cuenta bancaria *</label>
                  <select value={form.cuenta_id} onChange={(e) => setForm(p => ({ ...p, cuenta_id: e.target.value }))} className={selectCls}>
                    <option value="">Seleccionar...</option>
                    {cuentas.map((cu) => (
                      <option key={cu.id} value={cu.id}>{cu.banco_nombre} — {cu.nombre} ({cu.numero})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Prefijo</label>
                <input value={form.prefijo} onChange={(e) => setForm(p => ({ ...p, prefijo: e.target.value }))}
                  placeholder="Ej: CHK, 00" className={inputCls} maxLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Número desde *</label>
                  <input type="number" min={1} value={form.numero_desde} onChange={(e) => setForm(p => ({ ...p, numero_desde: e.target.value }))}
                    placeholder="1001" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Número hasta *</label>
                  <input type="number" min={1} value={form.numero_hasta} onChange={(e) => setForm(p => ({ ...p, numero_hasta: e.target.value }))}
                    placeholder="1100" className={inputCls} />
                </div>
              </div>

              {drawer === "editar" && (
                <div>
                  <label className={labelCls}>Estado</label>
                  <select value={estadoEdit} onChange={(e) => setEstadoEdit(e.target.value)} className={selectCls}>
                    <option value="ACTIVA">Activa</option>
                    <option value="AGOTADA">Agotada</option>
                    <option value="ANULADA">Anulada</option>
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Descripción</label>
                <input value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Notas opcionales" className={inputCls} maxLength={255} />
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
