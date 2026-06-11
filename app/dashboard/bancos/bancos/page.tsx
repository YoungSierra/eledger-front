"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface MapeoColumnas {
  fecha: string; descripcion: string; debito: string; credito: string; referencia: string;
}

interface Banco {
  id: string; nombre: string; codigo: string | null; nit: string | null;
  formato: string | null; fila_inicio: number | null; formato_fecha: string | null;
  mapeo_columnas: MapeoColumnas | null;
  activo: boolean;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const EMPTY_MAPEO: MapeoColumnas = { fecha: "", descripcion: "", debito: "", credito: "", referencia: "" };
const EMPTY = { nombre: "", codigo: "", nit: "", formato: "", fila_inicio: "", formato_fecha: "DD/MM/YYYY", mapeo: EMPTY_MAPEO };

const FORMATO_COLOR: Record<string, string> = {
  OFX:   "bg-blue-50 text-blue-700",
  CSV:   "bg-green-50 text-green-700",
  EXCEL: "bg-emerald-50 text-emerald-700",
};

export default function BancosPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Banco[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<Banco | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { cargar(); }, [soloActivos]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<Banco[]>(`/bancos/bancos?solo_activos=${soloActivos}`);
      setLista(data); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() { setForm(EMPTY); setEditando(null); setError(""); setDrawer("crear"); }

  function abrirEditar(b: Banco) {
    setForm({
      nombre: b.nombre, codigo: b.codigo ?? "", nit: b.nit ?? "",
      formato: b.formato ?? "", fila_inicio: b.fila_inicio?.toString() ?? "",
      formato_fecha: b.formato_fecha ?? "DD/MM/YYYY",
      mapeo: b.mapeo_columnas
        ? { fecha: String(b.mapeo_columnas.fecha ?? ""), descripcion: String(b.mapeo_columnas.descripcion ?? ""), debito: String(b.mapeo_columnas.debito ?? ""), credito: String(b.mapeo_columnas.credito ?? ""), referencia: String(b.mapeo_columnas.referencia ?? "") }
        : EMPTY_MAPEO,
    });
    setEditando(b); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const necesitaMapeo = form.formato === "CSV" || form.formato === "EXCEL";
      const mapeo = necesitaMapeo ? {
        fecha:       form.mapeo.fecha       !== "" ? parseInt(form.mapeo.fecha)       : null,
        descripcion: form.mapeo.descripcion !== "" ? parseInt(form.mapeo.descripcion) : null,
        debito:      form.mapeo.debito      !== "" ? parseInt(form.mapeo.debito)      : null,
        credito:     form.mapeo.credito     !== "" ? parseInt(form.mapeo.credito)     : null,
        referencia:  form.mapeo.referencia  !== "" ? parseInt(form.mapeo.referencia)  : null,
      } : null;
      const body: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim() || null,
        nit: form.nit.trim() || null,
        formato: form.formato || null,
        fila_inicio: form.fila_inicio ? parseInt(form.fila_inicio) : null,
        formato_fecha: form.formato ? (form.formato_fecha.trim() || null) : null,
        mapeo_columnas: mapeo,
      };
      if (drawer === "crear") {
        await apiFetch("/bancos/bancos", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/bancos/bancos/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(b: Banco) {
    try {
      await apiFetch(`/bancos/bancos/${b.id}`, { method: "PUT", body: JSON.stringify({ activo: !b.activo }) });
      await cargar();
    } catch {}
  }

  const filtrados = lista.filter((b) =>
    b.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (b.codigo ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = filtrados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Entidades bancarias con las que opera la empresa</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo banco
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
          Solo activos
        </label>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50/60 z-10">
              <tr className="border-b border-gray-100">
                {["Nombre", "Código", "NIT", "Extracto", "Estado", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">{b.nombre}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{b.codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{b.nit ?? "—"}</td>
                  <td className="px-4 py-3">
                    {b.formato
                      ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${FORMATO_COLOR[b.formato] ?? "bg-gray-100 text-gray-500"}`}>{b.formato}</span>
                      : <span className="text-[12px] text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${b.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {b.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => abrirEditar(b)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActivo(b)} title={b.activo ? "Inactivar" : "Activar"}
                        className={`p-1.5 rounded-md transition-colors ${b.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                        {b.activo
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
              <h2 className="text-[13px] font-semibold text-gray-800">{drawer === "crear" ? "Nuevo banco" : "Editar banco"}</h2>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Bancolombia, Davivienda..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Código</label>
                <input value={form.codigo} onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value }))}
                  placeholder="Código interno o SWIFT" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>NIT</label>
                <input value={form.nit} onChange={(e) => setForm(p => ({ ...p, nit: e.target.value }))}
                  placeholder="890.903.938-8" className={inputCls} />
              </div>

              <div className="pt-1 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-300 mb-3">Configuración de extracto</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Formato</label>
                    <select value={form.formato} onChange={(e) => setForm(p => ({ ...p, formato: e.target.value }))} className={inputCls}>
                      <option value="">— Sin configurar —</option>
                      <option value="OFX">OFX</option>
                      <option value="CSV">CSV</option>
                      <option value="EXCEL">Excel</option>
                    </select>
                  </div>
                  {form.formato && (
                    <>
                      <div>
                        <label className={labelCls}>Fila de inicio de datos</label>
                        <input type="number" min="1" value={form.fila_inicio}
                          onChange={(e) => setForm(p => ({ ...p, fila_inicio: e.target.value }))}
                          placeholder="1" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Formato de fecha</label>
                        <input value={form.formato_fecha} onChange={(e) => setForm(p => ({ ...p, formato_fecha: e.target.value }))}
                          placeholder="DD/MM/YYYY" className={inputCls} />
                      </div>
                    </>
                  )}
                  {(form.formato === "CSV" || form.formato === "EXCEL") && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-300 mb-2">Mapeo de columnas (número de columna, desde 0)</p>
                      <div className="space-y-2">
                        {([
                          ["fecha",       "Fecha *"],
                          ["descripcion", "Descripción *"],
                          ["debito",      "Débito *"],
                          ["credito",     "Crédito *"],
                          ["referencia",  "Referencia"],
                        ] as [keyof MapeoColumnas, string][]).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 w-24 shrink-0">{label}</span>
                            <input type="number" min="0" value={form.mapeo[key]}
                              onChange={(e) => setForm(p => ({ ...p, mapeo: { ...p.mapeo, [key]: e.target.value } }))}
                              placeholder="0" className="w-16 px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
