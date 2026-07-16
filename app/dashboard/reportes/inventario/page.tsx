"use client";

import { useState, useCallback, useEffect, Fragment } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Linea {
  producto_codigo: string; producto_nombre: string; familia: string; um: string;
  cantidad: string; costo_promedio: string; valor_total: string;
}
interface Grupo { bodega_id: string; bodega: string; lineas: Linea[]; subtotal: string; }
interface Reporte { empresa: string; fecha_corte: string; grupos: Grupo[]; gran_total: string; }
interface Bodega { id: string; nombre: string; }
interface Familia { id: string; nombre: string; }

function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function InventarioValoradoPage() {
  usePageTitle();

  const [corte,    setCorte]    = useState(hoyLocal());
  const [bodegaId, setBodegaId] = useState("");
  const [familiaId,setFamiliaId]= useState("");
  const [bodegas,  setBodegas]  = useState<Bodega[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [data,     setData]     = useState<Reporte | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [exporting,setExporting]= useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    apiFetch<any>("/inventario/bodegas").then(d => setBodegas(d.items ?? d)).catch(() => {});
    apiFetch<Familia[]>("/inventario/familias").then(setFamilias).catch(() => {});
  }, []);

  const generar = useCallback(async () => {
    if (!corte) return;
    setLoading(true); setError(null); setData(null);
    try {
      const p = new URLSearchParams({ fecha_corte: corte });
      if (bodegaId)  p.set("bodega_id", bodegaId);
      if (familiaId) p.set("familia_id", familiaId);
      setData(await apiFetch<Reporte>(`/reportes/inventario-valorado?${p}`));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al generar el reporte");
    } finally { setLoading(false); }
  }, [corte, bodegaId, familiaId]);

  async function exportarExcel() {
    setExporting(true);
    try {
      const token = localStorage.getItem("access_token");
      const p = new URLSearchParams({ fecha_corte: corte });
      if (bodegaId)  p.set("bodega_id", bodegaId);
      if (familiaId) p.set("familia_id", familiaId);
      const res = await fetch(`${BASE_URL}/reportes/inventario-valorado/excel?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `inventario_valorado_${corte}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  function imprimir() {
    const p = new URLSearchParams({ fecha_corte: corte });
    if (bodegaId)  p.set("bodega_id", bodegaId);
    if (familiaId) p.set("familia_id", familiaId);
    window.open(`/inventario-valorado?${p}`, "_blank");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filtros */}
      <div className="flex-none border-b border-gray-100 px-5 py-3 bg-white">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={lbl}>Fecha de corte</label>
            <input type="date" value={corte} onChange={e => setCorte(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Bodega</label>
            <select value={bodegaId} onChange={e => setBodegaId(e.target.value)} className={inp}>
              <option value="">Todas las bodegas</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Familia</label>
            <select value={familiaId} onChange={e => setFamiliaId(e.target.value)} className={inp}>
              <option value="">Todas las familias</option>
              {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <button onClick={generar} disabled={loading || !corte}
            className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Generando…" : "Generar"}
          </button>
          {data && (
            <>
              <button onClick={imprimir}
                className="px-3 py-1.5 border border-gray-200 text-[12px] text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Imprimir
              </button>
              <button onClick={exportarExcel} disabled={exporting}
                className="px-3 py-1.5 border border-gray-200 text-[12px] text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {exporting ? "Exportando…" : "Excel"}
              </button>
            </>
          )}
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {!data ? (
          <div className="flex items-center justify-center h-full text-[13px] text-gray-400">
            Selecciona los filtros y haz clic en Generar
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-[10px] font-bold uppercase text-white bg-[#1e3a5f]">
                <th className="px-4 py-2.5 text-left w-52">Código</th>
                <th className="px-4 py-2.5 text-left w-56">Producto</th>
                <th className="px-4 py-2.5 text-left w-52">Familia</th>
                <th className="px-4 py-2.5 text-center w-14">UM</th>
                <th className="px-4 py-2.5 text-right w-32">Cantidad</th>
                <th className="px-4 py-2.5 text-right w-36">Costo prom.</th>
                <th className="px-4 py-2.5 text-right w-40">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {data.grupos.map(g => (
                <Fragment key={g.bodega_id}>
                  {/* Fila bodega */}
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={7} className="px-4 py-2 text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                      {g.bodega}
                    </td>
                  </tr>
                  {g.lineas.map((ln, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className="px-4 py-2 font-mono text-[11px] text-blue-600 whitespace-nowrap">{ln.producto_codigo}</td>
                      <td className="px-4 py-2 text-gray-800">{ln.producto_nombre}</td>
                      <td className="px-4 py-2 text-gray-500 text-[11px]">{ln.familia}</td>
                      <td className="px-4 py-2 text-center text-gray-400 text-[11px]">{ln.um}</td>
                      <td className="px-4 py-2 text-right font-mono">{fmt(ln.cantidad, 4)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">{fmt(ln.costo_promedio)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(ln.valor_total)}</td>
                    </tr>
                  ))}
                  {/* Subtotal bodega */}
                  <tr className="bg-blue-50/60 border-t border-blue-100">
                    <td colSpan={6} className="px-4 py-1.5 text-right text-[11px] font-bold text-blue-700">
                      Subtotal {g.bodega}
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono font-bold text-blue-800">{fmt(g.subtotal)}</td>
                  </tr>
                </Fragment>
              ))}
              {/* Gran total */}
              <tr className="bg-[#1e3a5f] border-t-2 border-[#1e3a5f]">
                <td colSpan={6} className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-white">
                  Total inventario
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-white text-[13px]">
                  {fmt(data.gran_total)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
