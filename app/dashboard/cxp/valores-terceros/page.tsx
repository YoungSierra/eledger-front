"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Tercero { id: string; nit: string; razon_social: string; }
interface VrtItem {
  id: string; numero: string; fecha: string;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  valor: string; saldo: string; estado_pago: "pendiente" | "pagado" | "anulado";
  factura_id: string | null; factura_numero: string | null; cliente_nombre: string | null;
  comprobante_numero: string | null; fecha_pago: string | null;
}
interface ListResp { items: VrtItem[]; total: number; pagina: number; por_pagina: number; }
interface LineaDoc { id: string; descripcion: string; cuenta_codigo: string | null; cuenta_nombre: string | null; subtotal: string; total: string; }
interface DocDetalle {
  numero: string; fecha: string; tercero_nombre: string | null; tercero_nit: string | null;
  moneda_codigo: string; total: string; saldo: string; estado: string; descripcion: string | null;
  lineas: LineaDoc[];
}

const inp = "px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ESTADO: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  pagado: "bg-green-50 text-green-700",
  anulado: "bg-red-50 text-red-500",
};

function TerceroSearch({ onSelect }: { onSelect: (id: string, label: string) => void }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { onSelect("", ""); }
    if (timer.current) clearTimeout(timer.current);
    if (val.length < 2) { setOpts([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}&solo_activos=true`).catch(() => []);
      if (r.length > 0 && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 300) });
      }
      setOpts(r.slice(0, 10)); setOpen(r.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={ref} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Tercero (aduana, bodega)…" className={inp + " w-52"} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((t) => (
            <button key={t.id} type="button"
              onMouseDown={() => { const l = `${t.nit} — ${t.razon_social}`; setQ(l); setOpen(false); onSelect(t.id, l); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{t.nit}</span>
              <span className="text-[11px] text-gray-700">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ValoresTercerosPage() {
  const title = usePageTitle();
  const [items, setItems] = useState<VrtItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);

  const [fTerceroId, setFTerceroId] = useState("");
  const [fEstado, setFEstado] = useState("pendiente");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [sel, setSel] = useState<VrtItem | null>(null);
  const [detalle, setDetalle] = useState<DocDetalle | null>(null);

  async function abrirDetalle(v: VrtItem) {
    setSel(v); setDetalle(null);
    const d = await apiFetch<DocDetalle>(`/cxp/${v.id}`).catch(() => null);
    if (d) setDetalle(d);
  }

  const cargar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) });
      if (fTerceroId) p.set("tercero_id", fTerceroId);
      if (fEstado) p.set("estado", fEstado);
      if (fDesde) p.set("fecha_desde", fDesde);
      if (fHasta) p.set("fecha_hasta", fHasta);
      const r = await apiFetch<ListResp>(`/cxp/valores-terceros?${p}`);
      setItems(r.items); setTotal(r.total); setPagina(pag);
    } finally { setLoading(false); }
  }, [fTerceroId, fEstado, fDesde, fHasta]);

  useEffect(() => { cargar(1); /* eslint-disable-next-line */ }, []);

  const totalPags = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Dinero cobrado al cliente que se traslada a un tercero. Se paga desde Comprobantes de pago.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Tercero</label>
          <TerceroSearch onSelect={(id) => setFTerceroId(id)} />
        </div>
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={inp}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className={inp} />
        </div>
        <button onClick={() => cargar(1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Buscar
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
              <tr className="text-left text-[10px] uppercase text-gray-400">
                <th className="px-3 py-2.5">Documento</th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Tercero</th>
                <th className="px-3 py-2.5">Factura origen</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5 text-right">Saldo</th>
                <th className="px-3 py-2.5 text-center">Estado</th>
                <th className="px-3 py-2.5">Pago</th>
                <th className="px-3 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">Sin valores para terceros</td></tr>
              ) : items.map((v) => (
                <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button onClick={() => abrirDetalle(v)}
                      className="font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors">
                      {v.numero}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{v.fecha}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-gray-800">{v.tercero_nombre}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{v.tercero_nit}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {v.factura_id
                      ? <a href={`/factura/${v.factura_id}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-blue-600 hover:underline">{v.factura_numero}</a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[180px] truncate">{v.cliente_nombre ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(v.valor)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(v.saldo)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO[v.estado_pago]}`}>
                      {v.estado_pago.charAt(0).toUpperCase() + v.estado_pago.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {v.comprobante_numero
                      ? <span><span className="font-mono text-gray-600">{v.comprobante_numero}</span>{v.fecha_pago ? ` · ${v.fecha_pago}` : ""}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <button onClick={() => abrirDetalle(v)} title="Ver"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">{total === 0 ? "0" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, total)}`} de {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => cargar(1)} disabled={pagina === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => cargar(pagina - 1)} disabled={pagina === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pagina} / {totalPags}</span>
            <button onClick={() => cargar(pagina + 1)} disabled={pagina === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => cargar(totalPags)} disabled={pagina === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* Modal detalle VRT */}
      {sel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-blue-700 text-[13px]">{sel.numero}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO[sel.estado_pago]}`}>
                    {sel.estado_pago.charAt(0).toUpperCase() + sel.estado_pago.slice(1)}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-1">Valor recibido para tercero</p>
              </div>
              <button onClick={() => { setSel(null); setDetalle(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Cabecera */}
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><span className={lbl}>Tercero</span>{sel.tercero_nombre} <span className="text-gray-400 font-mono">{sel.tercero_nit}</span></div>
                <div><span className={lbl}>Fecha</span>{sel.fecha}</div>
                <div><span className={lbl}>Factura origen</span>
                  {sel.factura_id
                    ? <a href={`/factura/${sel.factura_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{sel.factura_numero}</a>
                    : "—"}
                </div>
                <div><span className={lbl}>Cliente</span>{sel.cliente_nombre ?? "—"}</div>
                <div><span className={lbl}>Valor</span><span className="font-mono">{fmt(sel.valor)}</span></div>
                <div><span className={lbl}>Saldo</span><span className="font-mono">{fmt(sel.saldo)}</span></div>
                <div className="col-span-2"><span className={lbl}>Pagado con</span>
                  {sel.comprobante_numero ? <span className="font-mono text-gray-700">{sel.comprobante_numero}{sel.fecha_pago ? ` · ${sel.fecha_pago}` : ""}</span> : <span className="text-gray-400">Sin pagos</span>}
                </div>
              </div>
              {/* Líneas */}
              <div>
                <p className={lbl}>Detalle</p>
                {!detalle ? (
                  <p className="text-[12px] text-gray-400 py-2">Cargando…</p>
                ) : (
                  <table className="w-full text-[12px] border border-gray-100 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400">
                      <tr>
                        <th className="text-left px-3 py-2">Concepto</th>
                        <th className="text-left px-3 py-2">Cuenta</th>
                        <th className="text-right px-3 py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detalle.lineas.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 text-gray-700">{l.descripcion}</td>
                          <td className="px-3 py-2 text-gray-500">
                            <span className="font-mono text-blue-600 mr-1">{l.cuenta_codigo ?? "—"}</span>{l.cuenta_nombre}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(l.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-[10px] text-gray-400">Este documento no genera asiento propio: el pasivo (2815) lo registró la factura de venta. Se paga desde Comprobantes de pago.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
