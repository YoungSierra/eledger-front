"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Bodega { id: string; nombre: string; }

interface Saldo {
  producto_id: string; producto_codigo: string; producto_nombre: string; um_base_codigo: string;
  bodega_id: string; bodega_nombre: string;
  cantidad: string; costo_promedio: string; valor_total: string;
}
interface SaldoList { items: Saldo[]; total: number; pagina: number; por_pagina: number; }

interface KardexLinea {
  fecha: string; movimiento_id: string; numero: string | null; tipo: string; descripcion: string | null;
  cantidad_entrada: string; cantidad_salida: string;
  costo_unitario: string; costo_total: string;
  saldo_cantidad: string; saldo_valor: string; costo_promedio: string;
}
interface Kardex {
  producto_id: string; producto_codigo: string; producto_nombre: string;
  bodega_id: string | null; bodega_nombre: string | null;
  lineas: KardexLinea[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: string | number, d = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SaldosPage() {
  const title = usePageTitle();
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [lista, setLista] = useState<Saldo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 30;
  const [loading, setLoading] = useState(true);
  const { orden, alternar } = useOrden<
    "codigo" | "producto" | "bodega" | "cantidad" | "um" | "costoPromedio" | "valorTotal"
  >("codigo", "asc");

  const [fBodega, setFBodega] = useState("");
  const [fQ, setFQ] = useState("");
  const [soloConStock, setSoloConStock] = useState(true);

  const [kardex, setKardex] = useState<Kardex | null>(null);
  const [kardexProducto, setKardexProducto] = useState<Saldo | null>(null);
  const [kBodega, setKBodega] = useState("");
  const [kDesde, setKDesde] = useState("");
  const [kHasta, setKHasta] = useState(hoyLocal());
  const [kLoading, setKLoading] = useState(false);

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  useEffect(() => {
    apiFetch<any>("/inventario/bodegas").then((d) => {
      const arr: Bodega[] = d.items ?? d;
      setBodegas(arr);
    }).catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pagina), por_pagina: String(porPagina), solo_con_stock: String(soloConStock) });
      if (fBodega) p.set("bodega_id", fBodega);
      if (fQ.trim()) p.set("q", fQ.trim());
      const d: SaldoList = await apiFetch(`/inventario/saldos?${p}`);
      setLista(d.items);
      setTotal(d.total);
    } finally { setLoading(false); }
  }, [pagina, fBodega, fQ, soloConStock]);

  useEffect(() => { cargar(); }, [cargar]);

  async function abrirKardex(s: Saldo) {
    setKardexProducto(s);
    setKBodega(s.bodega_id);
    setKardex(null);
    await cargarKardex(s.producto_id, s.bodega_id, kDesde, kHasta);
  }

  async function cargarKardex(productoId: string, bodegaId: string, desde: string, hasta: string) {
    setKLoading(true);
    try {
      const p = new URLSearchParams({ producto_id: productoId });
      if (bodegaId) p.set("bodega_id", bodegaId);
      if (desde) p.set("desde", desde);
      if (hasta) p.set("hasta", hasta);
      const d: Kardex = await apiFetch(`/inventario/kardex?${p}`);
      setKardex(d);
    } finally { setKLoading(false); }
  }

  function cerrarKardex() { setKardex(null); setKardexProducto(null); }

  const totalValor = lista.reduce((s, r) => s + parseFloat(r.valor_total || "0"), 0);

  // El backend pagina; se ordena la página cargada antes de pintarla.
  const ordenada = ordenarFilas(lista, orden, {
    codigo:        (s) => s.producto_codigo,
    producto:      (s) => s.producto_nombre,
    bodega:        (s) => s.bodega_nombre,
    cantidad:      (s) => Number(s.cantidad),
    um:            (s) => s.um_base_codigo,
    costoPromedio: (s) => Number(s.costo_promedio),
    valorTotal:    (s) => Number(s.valor_total),
  });

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex-wrap">
        <input value={fQ} onChange={(e) => { setFQ(e.target.value); setPagina(1); }}
          placeholder="Buscar producto…"
          className="text-[12px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 w-52" />
        <select value={fBodega} onChange={(e) => { setFBodega(e.target.value); setPagina(1); }}
          className="text-[12px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-700">
          <option value="">Todas las bodegas</option>
          {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-600 cursor-pointer">
          <input type="checkbox" checked={soloConStock} onChange={(e) => { setSoloConStock(e.target.checked); setPagina(1); }}
            className="rounded" />
          Solo con stock
        </label>
      </div>

      {/* Tabla saldos */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr className="text-[10px] font-bold uppercase text-gray-400">
              <Th campo="codigo"        orden={orden} alternar={alternar} className="w-56">Código</Th>
              <Th campo="producto"      orden={orden} alternar={alternar} className="w-64">Producto</Th>
              <Th campo="bodega"        orden={orden} alternar={alternar} className="w-40">Bodega</Th>
              <Th campo="cantidad"      orden={orden} alternar={alternar} align="right" className="w-32">Cantidad</Th>
              <Th campo="um"            orden={orden} alternar={alternar} className="w-14">UM</Th>
              <Th campo="costoPromedio" orden={orden} alternar={alternar} align="right" className="w-36">Costo prom.</Th>
              <Th campo="valorTotal"    orden={orden} alternar={alternar} align="right" className="w-40">Valor total</Th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Cargando…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin resultados</td></tr>
            ) : ordenada.map((s) => (
              <tr key={`${s.producto_id}-${s.bodega_id}`} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-2.5 font-mono text-blue-600 text-[11px] whitespace-nowrap">{s.producto_codigo}</td>
                <td className="px-4 py-2.5 text-gray-800 font-medium">{s.producto_nombre}</td>
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{s.bodega_nombre}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap">{fmt(s.cantidad, 4)}</td>
                <td className="px-4 py-2.5 text-gray-400">{s.um_base_codigo}</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-600 whitespace-nowrap">{fmt(s.costo_promedio)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap">{fmt(s.valor_total)}</td>
                <td className="px-2 py-2.5">
                  <button onClick={() => abrirKardex(s)} title="Ver kardex"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {lista.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={6} className="px-4 py-2 text-right text-[11px] font-bold text-gray-500 uppercase">Valor total en pantalla</td>
                <td className="px-4 py-2 text-right font-mono font-bold text-gray-800">{fmt(totalValor)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-gray-200 bg-white flex-shrink-0 text-[12px] text-gray-500">
        <span>{Math.min((pagina - 1) * porPagina + 1, total)}–{Math.min(pagina * porPagina, total)} de {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina(1)} disabled={pagina === 1} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">«</button>
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹</button>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">›</button>
          <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} className="px-2 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">»</button>
        </div>
      </div>

      {/* ─── Modal kardex ──────────────────────────────────────────────────────── */}
      {kardexProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full" style={{ maxWidth: "60vw", maxHeight: "90vh" }}>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <p className="text-[11px] font-mono text-blue-600">{kardexProducto.producto_codigo}</p>
                <h2 className="text-[15px] font-semibold text-gray-800">{kardexProducto.producto_nombre}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Saldo actual: <span className="font-semibold text-gray-700">{fmt(kardexProducto.cantidad, 4)} {kardexProducto.um_base_codigo}</span>
                  <span className="mx-1.5">·</span>
                  Valor: <span className="font-semibold text-gray-700">{fmt(kardexProducto.valor_total)}</span>
                </p>
              </div>
              <button onClick={cerrarKardex} className="text-gray-400 hover:text-gray-600 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Filtros kardex */}
            <div className="flex items-end gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0 flex-wrap">
              <div>
                <label className={lbl}>Bodega</label>
                <select value={kBodega} onChange={(e) => setKBodega(e.target.value)}
                  className="text-[12px] border border-gray-200 rounded px-2 py-1 bg-white text-gray-700">
                  <option value="">Todas</option>
                  {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Desde</label>
                <input type="date" value={kDesde} onChange={(e) => setKDesde(e.target.value)}
                  className="text-[12px] border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700" />
              </div>
              <div>
                <label className={lbl}>Hasta</label>
                <input type="date" value={kHasta} onChange={(e) => setKHasta(e.target.value)}
                  className="text-[12px] border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700" />
              </div>
              <button onClick={() => cargarKardex(kardexProducto.producto_id, kBodega, kDesde, kHasta)}
                className="px-3 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700">
                Consultar
              </button>
            </div>

            {/* Tabla kardex */}
            <div className="flex-1 overflow-auto">
              {kLoading ? (
                <p className="text-center py-10 text-[12px] text-gray-400">Cargando…</p>
              ) : !kardex ? null : kardex.lineas.length === 0 ? (
                <p className="text-center py-10 text-[12px] text-gray-400">Sin movimientos en el período</p>
              ) : (
                <table className="w-full min-w-[760px] text-[11px]">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr className="text-[10px] font-bold uppercase text-gray-400">
                      <th className="px-3 py-2.5 text-left w-24">Fecha</th>
                      <th className="px-3 py-2.5 text-left w-24">Número</th>
                      <th className="px-3 py-2.5 text-left w-36">Tipo</th>
                      <th className="px-3 py-2.5 text-left">Descripción</th>
                      <th className="px-3 py-2.5 text-right w-28">Entrada</th>
                      <th className="px-3 py-2.5 text-right w-28">Salida</th>
                      <th className="px-3 py-2.5 text-right w-28">Costo unit.</th>
                      <th className="px-3 py-2.5 text-right w-28">Saldo cant.</th>
                      <th className="px-3 py-2.5 text-right w-32">Saldo valor</th>
                      <th className="px-3 py-2.5 text-right w-28">C. prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kardex.lineas.map((l, i) => {
                      const esEntrada = parseFloat(l.cantidad_entrada) > 0;
                      return (
                        <tr key={i} className="hover:bg-gray-50/60">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{l.fecha}</td>
                          <td className="px-3 py-2 font-mono text-blue-600 whitespace-nowrap text-[10px]">{l.numero ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{l.tipo}</td>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-[180px]">{l.descripcion ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-mono text-green-700 whitespace-nowrap">
                            {esEntrada ? fmt(l.cantidad_entrada, 4) : ""}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-red-600 whitespace-nowrap">
                            {!esEntrada ? fmt(l.cantidad_salida, 4) : ""}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600 whitespace-nowrap">{fmt(l.costo_unitario)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold whitespace-nowrap">{fmt(l.saldo_cantidad, 4)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold whitespace-nowrap">{fmt(l.saldo_valor)}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500 whitespace-nowrap">{fmt(l.costo_promedio)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-3 border-t border-gray-200 flex-shrink-0">
              <button onClick={cerrarKardex}
                className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
