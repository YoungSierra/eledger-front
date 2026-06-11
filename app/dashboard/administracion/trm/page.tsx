"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface TrmRegistro {
  id: string;
  fecha: string;
  tasa: string;
  fuente: string | null;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function TrmPage() {
  const [registros, setRegistros] = useState<TrmRegistro[]>([]);
  const [loading, setLoading]     = useState(true);
  const [limite, setLimite]       = useState(30);
  const [pagina, setPagina]       = useState(1);
  const porPagina                 = 15;

  // Form nuevo registro
  const [fecha, setFecha]   = useState(new Date().toISOString().slice(0, 10));
  const [tasa, setTasa]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [ok, setOk]         = useState("");

  // Sugerida del Banco República
  const [sugerida, setSugerida] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<TrmRegistro[]>(`/trm?limite=${limite}`);
      setRegistros(data);
      setPagina(1);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [limite]);

  useEffect(() => {
    cargar();
    apiFetch<{ existe: boolean; tasa: string | null; sugerida: string | null }>("/trm/hoy")
      .then((res) => {
        if (res.sugerida) setSugerida(parseFloat(res.sugerida).toFixed(2));
        if (!res.existe && res.sugerida) setTasa(parseFloat(res.sugerida).toFixed(2));
        if (res.existe && res.tasa) setTasa(parseFloat(res.tasa).toFixed(2));
      })
      .catch(() => {});
  }, []);

  async function guardar() {
    if (!tasa || isNaN(parseFloat(tasa))) { setError("Ingresa un valor válido"); return; }
    if (!fecha) { setError("Selecciona una fecha"); return; }
    setSaving(true); setError(""); setOk("");
    try {
      await apiFetch("/trm", { method: "POST", body: JSON.stringify({ tasa: parseFloat(tasa), fecha }) });
      setOk("TRM registrada correctamente.");
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const hayHoy = registros.some((r) => r.fecha === hoy);

  return (
    <div className="max-w-3xl space-y-5">

      {/* Encabezado */}
      <div>
        <h1 className="text-[16px] font-bold text-gray-800">TRM histórica</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Tasa Representativa del Mercado USD → COP registrada por día.
        </p>
      </div>

      {/* Panel registro */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Registrar TRM
        </p>

        {sugerida && (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            TRM Banco de la República hoy: <strong>$ {parseFloat(sugerida).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</strong>
            <button onClick={() => setTasa(sugerida)}
              className="ml-auto text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline">
              Usar este valor
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>1 USD = ___ COP</label>
            <input
              type="number" step="0.01" value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              placeholder="Ej: 4234.50"
              className={inputCls}
            />
          </div>
          <div className="flex items-end">
            <button onClick={guardar} disabled={saving}
              className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-md transition-colors">
              {saving ? "Guardando..." : hayHoy && fecha === hoy ? "Actualizar hoy" : "Guardar"}
            </button>
          </div>
        </div>

        {error && <p className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</p>}
        {ok    && <p className="mt-2 text-[11px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">{ok}</p>}
      </div>

      {/* Tabla historial */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Historial TRM</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">{registros.length} registros</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">Mostrar:</span>
              {[30, 60, 90].map((d) => (
                <button key={d} onClick={() => setLimite(d)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${limite === d ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  {d} días
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[12px] text-gray-400">Cargando...</div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-gray-400">Sin registros aún.</div>
        ) : (() => {
          const totalPaginas = Math.max(1, Math.ceil(registros.length / porPagina));
          const paginaActual = Math.min(pagina, totalPaginas);
          const filas = registros.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
          return (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Fecha", "TRM (COP por USD)", "Fuente"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r, i) => {
                    const esHoy = r.fecha === hoy;
                    return (
                      <tr key={r.id} className={`border-t border-gray-50 ${esHoy ? "bg-green-50/60" : i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                        <td className="px-4 py-2.5 text-[12px] text-gray-700">
                          <div className="flex items-center gap-2">
                            {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-CO", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                            {esHoy && <span className="text-[9px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">hoy</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[13px] font-bold ${esHoy ? "text-green-700" : "text-gray-800"}`}>
                            $ {parseFloat(r.tasa).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.fuente === "MANUAL" ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600"}`}>
                            {r.fuente ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">
                  {(paginaActual - 1) * porPagina + 1}–{Math.min(paginaActual * porPagina, registros.length)} de {registros.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
                  <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
                  <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
