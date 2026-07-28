"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import ConfirmDialog from "@/components/ConfirmDialog";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface BanCuenta { id: string; nombre: string; numero: string; banco_nombre: string | null; cuenta_contable_id: string | null; activo: boolean; }
interface ExtractoItem { id: string; cuenta_id: string; cuenta_nombre: string | null; fecha_desde: string; fecha_hasta: string; saldo_final: string; estado: string; lineas: number; pendientes: number; }
interface LineaExtracto { id: string; fecha: string; descripcion: string; referencia: string | null; valor: string; conciliado: boolean; asiento_linea_id: string | null; }
interface Resumen { saldo_extracto: string; saldo_libro: string; diferencia: string; conciliado: string; no_conciliado: string; lineas_total: number; lineas_conciliadas: number; }
interface ExtractoDetalle { id: string; cuenta_nombre: string | null; fecha_desde: string; fecha_hasta: string; saldo_final: string; estado: string; lineas: LineaExtracto[]; resumen: Resumen; importacion?: { creadas: number; errores: string[] }; }
interface MovLibro { asiento_linea_id: string; fecha: string; documento_numero: string | null; asiento_numero: number; descripcion: string | null; valor: string; conciliado: boolean; }

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
function fmt(v: string | number) { const n = parseFloat(String(v)); return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function dec(v: string) { return parseFloat(v) || 0; }

export default function ConciliacionPage() {
  usePageTitle();
  const [cuentas, setCuentas] = useState<BanCuenta[]>([]);
  const [extractos, setExtractos] = useState<ExtractoItem[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [det, setDet] = useState<ExtractoDetalle | null>(null);
  const [libro, setLibro] = useState<MovLibro[]>([]);
  const [lineaSel, setLineaSel] = useState<LineaExtracto | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmState, setConfirmState] = useState<{ mensaje: string; titulo?: string; confirmLabel?: string; danger?: boolean; onOk: () => void } | null>(null);
  const pedirConfirm = (cfg: { mensaje: string; titulo?: string; confirmLabel?: string; danger?: boolean; onOk: () => void }) => setConfirmState(cfg);

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nCuenta, setNCuenta] = useState(""); const [nDesde, setNDesde] = useState(""); const [nHasta, setNHasta] = useState(hoyLocal()); const [nSaldo, setNSaldo] = useState("");
  const [modalLinea, setModalLinea] = useState(false);
  const [lFecha, setLFecha] = useState(hoyLocal()); const [lDesc, setLDesc] = useState(""); const [lRef, setLRef] = useState(""); const [lValor, setLValor] = useState(""); const [lSigno, setLSigno] = useState<"+" | "-">("-");

  const cargarExtractos = useCallback(async () => {
    const r = await apiFetch<ExtractoItem[]>("/bancos/extractos").catch(() => []);
    setExtractos(r);
  }, []);

  useEffect(() => {
    apiFetch<BanCuenta[]>("/bancos/cuentas?solo_activas=true").then(d => setCuentas(d.filter(c => c.activo && c.cuenta_contable_id))).catch(() => {});
    cargarExtractos();
  }, [cargarExtractos]);

  const abrir = useCallback(async (id: string) => {
    setSelId(id); setLineaSel(null); setError("");
    const [d, l] = await Promise.all([
      apiFetch<ExtractoDetalle>(`/bancos/extractos/${id}`),
      apiFetch<MovLibro[]>(`/bancos/extractos/${id}/libro`),
    ]);
    setDet(d); setLibro(l);
  }, []);

  async function refrescar() { if (selId) await abrir(selId); await cargarExtractos(); }

  async function crearExtracto() {
    if (!nCuenta || !nDesde || !nHasta) { setError("Completa cuenta y fechas"); return; }
    setBusy(true); setError("");
    try {
      const d = await apiFetch<ExtractoDetalle>("/bancos/extractos", { method: "POST", body: JSON.stringify({ cuenta_id: nCuenta, fecha_desde: nDesde, fecha_hasta: nHasta, saldo_final: dec(nSaldo) }) });
      setModalNuevo(false); await cargarExtractos(); abrir(d.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  async function agregarLinea() {
    if (!lDesc || dec(lValor) <= 0) { setError("Descripción y valor requeridos"); return; }
    setBusy(true); setError("");
    try {
      const valor = (lSigno === "-" ? -1 : 1) * dec(lValor);
      await apiFetch(`/bancos/extractos/${selId}/lineas`, { method: "POST", body: JSON.stringify({ fecha: lFecha, descripcion: lDesc, referencia: lRef || null, valor }) });
      setModalLinea(false); setLDesc(""); setLRef(""); setLValor(""); await refrescar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  function importar(file: File) {
    const n = det?.lineas.length ?? 0;
    if (n > 0) {
      pedirConfirm({
        titulo: "Reemplazar extracto",
        mensaje: `El extracto ya tiene ${n} líneas. Importar las reemplazará por las del archivo.`,
        confirmLabel: "Reemplazar",
        onOk: () => doImportar(file),
      });
      if (fileRef.current) fileRef.current.value = "";
    } else {
      doImportar(file);
    }
  }

  async function doImportar(file: File) {
    setBusy(true); setError("");
    try {
      const fd = new FormData(); fd.append("archivo", file);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/bancos/extractos/${selId}/importar`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: "Error" })); throw new Error(e.detail); }
      const d: ExtractoDetalle = await res.json();
      if (d.importacion) setError(`Importadas ${d.importacion.creadas} líneas${d.importacion.errores.length ? ` · ${d.importacion.errores.length} con error` : ""}`);
      await refrescar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al importar"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function conciliar(mov: MovLibro) {
    if (!lineaSel) { setError("Primero selecciona una línea del extracto"); return; }
    if (mov.conciliado) return;
    setBusy(true); setError("");
    try {
      await apiFetch("/bancos/extractos/conciliar", { method: "POST", body: JSON.stringify({ extracto_linea_id: lineaSel.id, asiento_linea_id: mov.asiento_linea_id }) });
      setLineaSel(null); await refrescar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al conciliar"); } finally { setBusy(false); }
  }

  async function desconciliar(l: LineaExtracto) {
    setBusy(true); setError("");
    try { await apiFetch("/bancos/extractos/desconciliar", { method: "POST", body: JSON.stringify({ extracto_linea_id: l.id }) }); await refrescar(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  function eliminarLinea(l: LineaExtracto) {
    pedirConfirm({
      titulo: "Eliminar línea", mensaje: "Se eliminará esta línea del extracto.", confirmLabel: "Eliminar", danger: true,
      onOk: async () => {
        try { await apiFetch(`/bancos/extractos/lineas/${l.id}`, { method: "DELETE" }); await refrescar(); }
        catch (e) { setError(e instanceof Error ? e.message : "Error"); }
      },
    });
  }

  function eliminarExtracto() {
    if (!det) return;
    pedirConfirm({
      titulo: "Eliminar extracto", mensaje: "Se eliminará el extracto completo con todas sus líneas.", confirmLabel: "Eliminar", danger: true,
      onOk: async () => {
        await apiFetch(`/bancos/extractos/${selId}`, { method: "DELETE" }).catch(() => {});
        setSelId(null); setDet(null); setLibro([]); cargarExtractos();
      },
    });
  }

  // ── Lista de extractos ──
  if (!selId || !det) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-gray-800">Conciliación bancaria</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Compara el extracto del banco contra el libro de la cuenta</p>
          </div>
          <button onClick={() => { setNCuenta(""); setNDesde(""); setNHasta(hoyLocal()); setNSaldo(""); setError(""); setModalNuevo(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo extracto
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              {["Cuenta", "Desde", "Hasta", "Saldo banco", "Líneas", "Pendientes", "Estado", ""].map((h, i) => (
                <th key={i} className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 ${["Saldo banco", "Líneas", "Pendientes"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {extractos.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin extractos cargados</td></tr>}
              {extractos.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => abrir(e.id)}>
                  <td className="px-3 py-2.5 text-gray-700">{e.cuenta_nombre}</td>
                  <td className="px-3 py-2.5 text-gray-500">{e.fecha_desde}</td>
                  <td className="px-3 py-2.5 text-gray-500">{e.fecha_hasta}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">${fmt(e.saldo_final)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{e.lineas}</td>
                  <td className="px-3 py-2.5 text-right">{e.pendientes > 0 ? <span className="text-amber-600 font-semibold">{e.pendientes}</span> : <span className="text-green-600">0</span>}</td>
                  <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${e.estado === "cerrada" ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-700"}`}>{e.estado}</span></td>
                  <td className="px-3 py-2.5 text-right text-blue-600 text-[11px]">Abrir →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modalNuevo && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
              <h2 className="text-[14px] font-semibold text-gray-800">Nuevo extracto</h2>
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</p>}
              <div>
                <label className={lbl}>Cuenta bancaria</label>
                <select value={nCuenta} onChange={e => setNCuenta(e.target.value)} className={inp}>
                  <option value="">— Seleccionar —</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.nombre} ({c.numero})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Desde</label><input type="date" value={nDesde} onChange={e => setNDesde(e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Hasta</label><input type="date" value={nHasta} onChange={e => setNHasta(e.target.value)} className={inp} /></div>
              </div>
              <div>
                <label className={lbl}>Saldo final según el banco</label>
                <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">$</span>
                  <MontoInput value={nSaldo} onChange={setNSaldo} decimales={2} className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-right" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setModalNuevo(false)} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
                <button onClick={crearExtracto} disabled={busy} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg disabled:opacity-50">Crear</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Pantalla de conciliación ──
  const r = det.resumen;
  const cuadra = Math.abs(dec(r.diferencia)) < 0.01;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => { setSelId(null); setDet(null); }} className="text-[11px] text-blue-600 hover:underline">← Extractos</button>
          <h1 className="text-[15px] font-semibold text-gray-800">{det.cuenta_nombre}</h1>
          <p className="text-[11px] text-gray-400">{det.fecha_desde} a {det.fecha_hasta} · <span className="capitalize">{det.estado}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] font-medium rounded-lg">Importar CSV</button>
          <button onClick={() => { setLFecha(det.fecha_hasta); setLDesc(""); setLRef(""); setLValor(""); setLSigno("-"); setError(""); setModalLinea(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">+ Línea</button>
          <button onClick={eliminarExtracto} className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[12px] font-medium rounded-lg">Eliminar</button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: "Saldo banco", v: r.saldo_extracto, c: "#1e293b" },
          { l: "Saldo libro", v: r.saldo_libro, c: "#2563eb" },
          { l: "Diferencia", v: r.diferencia, c: cuadra ? "#059669" : "#dc2626" },
          { l: "Conciliadas", v: `${r.lineas_conciliadas}/${r.lineas_total}`, c: "#475569", texto: true },
        ].map(x => (
          <div key={x.l} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{x.l}</p>
            <p className="text-[16px] font-bold font-mono mt-0.5" style={{ color: x.c }}>{x.texto ? x.v : `$${fmt(x.v)}`}</p>
          </div>
        ))}
      </div>
      {error && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">{error}</p>}
      {lineaSel && <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">Línea de extracto seleccionada (${fmt(lineaSel.valor)}). Haz clic en un movimiento del libro con el mismo valor para conciliar.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Extracto */}
        <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-colors ${dragOver ? "border-blue-400 ring-2 ring-blue-300" : "border-gray-200"}`}
          onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) { if (/\.csv$/i.test(f.name) || f.type.includes("csv") || f.type.includes("text")) importar(f); else setError("Solo se admite CSV"); }
          }}>
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-gray-700">Extracto del banco</p>
            <span className="text-[10px] text-gray-400">Arrastra un CSV aquí</span>
          </div>
          {dragOver && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-700 text-center">Suelta el archivo CSV para importar</div>
          )}
          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white border-b border-gray-100"><tr>
                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-400">Fecha</th>
                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-400">Descripción</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-gray-400">Valor</th>
                <th className="w-8"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {det.lineas.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sin líneas — importa un CSV o agrega manual</td></tr>}
                {det.lineas.map(l => (
                  <tr key={l.id}
                    onClick={() => !l.conciliado && setLineaSel(lineaSel?.id === l.id ? null : l)}
                    className={`${l.conciliado ? "bg-green-100" : "cursor-pointer hover:bg-blue-50/50"} ${lineaSel?.id === l.id ? "ring-2 ring-blue-400 ring-inset" : ""}`}>
                    <td className={`px-2 py-2 whitespace-nowrap ${l.conciliado ? "border-l-4 border-green-500 text-gray-600" : "text-gray-500"}`}>{l.fecha}</td>
                    <td className="px-2 py-2 text-gray-700">
                      {l.conciliado && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[9px] font-bold mr-1.5 align-middle">✓</span>}
                      <span className="truncate">{l.descripcion}</span>
                      {l.referencia && <span className="text-gray-400 ml-1">· {l.referencia}</span>}
                    </td>
                    <td className={`px-2 py-2 text-right font-mono ${dec(l.valor) < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(l.valor)}</td>
                    <td className="px-2 py-2 text-right">
                      {l.conciliado
                        ? <button onClick={(ev) => { ev.stopPropagation(); desconciliar(l); }} title="Desconciliar" className="text-gray-400 hover:text-amber-600">↺</button>
                        : <button onClick={(ev) => { ev.stopPropagation(); eliminarLinea(l); }} title="Eliminar" className="text-gray-300 hover:text-red-500">✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Libro */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50"><p className="text-[12px] font-semibold text-gray-700">Libro (movimientos contables)</p></div>
          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white border-b border-gray-100"><tr>
                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-400">Fecha</th>
                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-gray-400">Documento</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-gray-400">Valor</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {libro.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sin movimientos en el rango</td></tr>}
                {libro.map(m => {
                  const sugerido = lineaSel && !m.conciliado && Math.abs(dec(m.valor) - dec(lineaSel.valor)) < 0.01;
                  return (
                    <tr key={m.asiento_linea_id}
                      onClick={() => conciliar(m)}
                      className={`${m.conciliado ? "bg-green-100" : lineaSel ? "cursor-pointer hover:bg-blue-50/50" : ""} ${sugerido ? "ring-2 ring-green-400 ring-inset" : ""}`}>
                      <td className={`px-2 py-2 whitespace-nowrap ${m.conciliado ? "border-l-4 border-green-500 text-gray-600" : "text-gray-500"}`}>{m.fecha}</td>
                      <td className="px-2 py-2">
                        {m.conciliado && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[9px] font-bold mr-1.5 align-middle">✓</span>}
                        <span className="font-mono text-blue-600">{m.documento_numero ?? `#${m.asiento_numero}`}</span>
                        <span className="text-gray-400 ml-1 truncate">{m.descripcion}</span>
                      </td>
                      <td className={`px-2 py-2 text-right font-mono ${dec(m.valor) < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(m.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalLinea && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-[14px] font-semibold text-gray-800">Agregar línea del extracto</h2>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Fecha</label><input type="date" value={lFecha} onChange={e => setLFecha(e.target.value)} className={inp} /></div>
              <div>
                <label className={lbl}>Tipo</label>
                <select value={lSigno} onChange={e => setLSigno(e.target.value as "+" | "-")} className={inp}>
                  <option value="-">Salida / débito (−)</option>
                  <option value="+">Entrada / crédito (+)</option>
                </select>
              </div>
            </div>
            <div><label className={lbl}>Descripción</label><input value={lDesc} onChange={e => setLDesc(e.target.value)} className={inp} placeholder="Ej. Comisión bancaria" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Referencia</label><input value={lRef} onChange={e => setLRef(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Valor</label>
                <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">$</span>
                  <MontoInput value={lValor} onChange={setLValor} decimales={2} className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-right" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalLinea(false)} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg">Cancelar</button>
              <button onClick={agregarLinea} disabled={busy} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg disabled:opacity-50">Agregar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        titulo={confirmState?.titulo}
        mensaje={confirmState?.mensaje ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={() => confirmState?.onOk()}
        onClose={() => setConfirmState(null)}
      />
    </div>
  );
}
