"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";
import AsientoModal, { AsientoData } from "@/components/AsientoModal";

interface BanCuenta {
  id: string; nombre: string; numero: string; banco_nombre: string | null;
  cuenta_contable_id: string | null; moneda_codigo: string | null; activo: boolean;
}
interface TransferListItem {
  id: string; numero: string; fecha: string;
  cuenta_origen_nombre: string | null; cuenta_destino_nombre: string | null;
  valor: string; estado: "borrador" | "contabilizado" | "anulado";
}
interface TransferDetalle {
  id: string; numero: string; fecha: string;
  cuenta_origen_id: string; cuenta_origen_nombre: string | null;
  cuenta_destino_id: string; cuenta_destino_nombre: string | null;
  valor: string; descripcion: string | null; estado: string; asiento_id: string | null;
}

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
function fmt(v: string | number) { return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function dec(v: string) { return parseFloat(v) || 0; }
const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado: "bg-red-50 text-red-600 border border-red-200",
};

export default function TransferenciasPage() {
  usePageTitle();
  const [rows, setRows]   = useState<TransferListItem[]>([]);
  const [cuentas, setCuentas] = useState<BanCuenta[]>([]);
  const [fDesde, setFDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [fHasta, setFHasta] = useState(hoyLocal);
  const { orden, alternar } = useOrden<"numero" | "fecha" | "origen" | "destino" | "valor" | "estado">("fecha", "desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [docId, setDocId]         = useState<string | null>(null);
  const [docNumero, setDocNumero] = useState("");
  const [docEstado, setDocEstado] = useState("");
  const [soloLectura, setSoloLectura] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [preview, setPreview]     = useState<AsientoData | null>(null);
  const [previewReal, setPreviewReal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [fecha, setFecha]       = useState(hoyLocal);
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [valorInput, setValorInput] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saldoOrigen, setSaldoOrigen] = useState<number | null>(null);

  const valor = dec(valorInput);

  useEffect(() => {
    if (!origenId || soloLectura) { setSaldoOrigen(null); return; }
    apiFetch<{ saldo_final: string }>(`/bancos/cuentas/${origenId}/movimientos`)
      .then(r => setSaldoOrigen(parseFloat(r.saldo_final)))
      .catch(() => setSaldoOrigen(null));
  }, [origenId, soloLectura]);

  const cargar = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (fDesde) q.set("fecha_desde", fDesde);
      if (fHasta) q.set("fecha_hasta", fHasta);
      const r = await apiFetch<TransferListItem[]>(`/bancos/transferencias?${q}`);
      setRows(r);
    } catch {}
  }, [fDesde, fHasta]);

  useEffect(() => {
    cargar();
    apiFetch<BanCuenta[]>("/bancos/cuentas?solo_activas=true").then(d => setCuentas(d.filter(c => c.activo && c.cuenta_contable_id))).catch(() => {});
  }, []); // eslint-disable-line

  function abrirNuevo() {
    setDocId(null); setDocNumero(""); setDocEstado(""); setSoloLectura(false);
    setFecha(hoyLocal()); setOrigenId(""); setDestinoId(""); setValorInput(""); setDescripcion("");
    setError(""); setModalOpen(true);
  }

  async function abrirDetalle(t: TransferListItem) {
    setDocId(t.id); setDocNumero(t.numero); setDocEstado(t.estado);
    setSoloLectura(t.estado !== "borrador"); setError(""); setModalOpen(true);
    try {
      const d = await apiFetch<TransferDetalle>(`/bancos/transferencias/${t.id}`);
      setFecha(d.fecha); setOrigenId(d.cuenta_origen_id); setDestinoId(d.cuenta_destino_id);
      setValorInput(d.valor); setDescripcion(d.descripcion || "");
    } catch (e) { setError(e instanceof Error ? e.message : "Error al cargar"); }
  }

  function cerrar() { if (!saving) setModalOpen(false); }

  function payload() {
    return { fecha, cuenta_origen_id: origenId, cuenta_destino_id: destinoId, valor, descripcion: descripcion || null };
  }

  async function guardarInterno(): Promise<string | null> {
    if (!origenId) { setError("Selecciona la cuenta origen"); return null; }
    if (!destinoId) { setError("Selecciona la cuenta destino"); return null; }
    if (origenId === destinoId) { setError("Las cuentas deben ser distintas"); return null; }
    if (valor <= 0) { setError("Ingresa el valor a transferir"); return null; }
    if (docId) { await apiFetch(`/bancos/transferencias/${docId}`, { method: "PUT", body: JSON.stringify(payload()) }); return docId; }
    const n = await apiFetch<{ id: string }>("/bancos/transferencias", { method: "POST", body: JSON.stringify(payload()) });
    return n.id;
  }

  async function guardar(contabilizar: boolean) {
    setSaving(true); setError("");
    try {
      const id = await guardarInterno();
      if (!id) return;
      if (contabilizar) await apiFetch(`/bancos/transferencias/${id}/contabilizar`, { method: "POST" });
      setModalOpen(false); cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function verAsiento() {
    setPreviewLoading(true); setError("");
    try {
      if (soloLectura && docId) { const d = await apiFetch<AsientoData>(`/bancos/transferencias/${docId}/asiento`); setPreview(d); setPreviewReal(true); }
      else {
        const id = await guardarInterno();
        if (!id) return;
        const d = await apiFetch<AsientoData>(`/bancos/transferencias/${id}/asiento`);
        setPreview(d); setPreviewReal(false);
        // reabrir como edición del borrador recién guardado
        setDocId(id);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Error al obtener asiento"); }
    finally { setPreviewLoading(false); }
  }

  async function anular() {
    let motivo: string | null = "Descartado";
    if (soloLectura) {
      motivo = window.prompt("Motivo de anulación:");
      if (!motivo || !motivo.trim()) return;
    } else if (!window.confirm("¿Descartar este borrador de transferencia?")) {
      return;
    }
    setSaving(true); setError("");
    try {
      await apiFetch(`/bancos/transferencias/${docId}/anular`, { method: "POST", body: JSON.stringify({ motivo }) });
      setModalOpen(false); cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al anular"); }
    finally { setSaving(false); }
  }

  const ordenada = ordenarFilas(rows, orden, {
    numero: r => r.numero, fecha: r => r.fecha, origen: r => r.cuenta_origen_nombre,
    destino: r => r.cuenta_destino_nombre, valor: r => Number(r.valor), estado: r => r.estado,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">Transferencias entre cuentas</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Movimiento de fondos entre cuentas bancarias propias</p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva transferencia
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div><label className={lbl}>Desde</label><input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" /></div>
        <div><label className={lbl}>Hasta</label><input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" /></div>
        <button onClick={cargar} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg">Buscar</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <Th campo="numero" orden={orden} alternar={alternar}>Número</Th>
              <Th campo="fecha" orden={orden} alternar={alternar}>Fecha</Th>
              <Th campo="origen" orden={orden} alternar={alternar}>Origen</Th>
              <Th campo="destino" orden={orden} alternar={alternar}>Destino</Th>
              <Th campo="valor" orden={orden} alternar={alternar} align="right">Valor</Th>
              <Th campo="estado" orden={orden} alternar={alternar}>Estado</Th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ordenada.length === 0 && (<tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin transferencias</td></tr>)}
            {ordenada.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5"><button onClick={() => abrirDetalle(r)} className="font-mono text-[11px] text-blue-700 hover:underline">{r.numero}</button></td>
                <td className="px-3 py-2.5 text-gray-600">{r.fecha}</td>
                <td className="px-3 py-2.5 text-gray-700">{r.cuenta_origen_nombre}</td>
                <td className="px-3 py-2.5 text-gray-700">{r.cuenta_destino_nombre}</td>
                <td className="px-3 py-2.5 text-right font-mono font-medium text-gray-800">${fmt(r.valor)}</td>
                <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[r.estado]}`}>{r.estado}</span></td>
                <td className="px-3 py-2.5 text-right">
                  {r.estado === "borrador" ? (
                    <button onClick={() => abrirDetalle(r)} title="Editar" className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Editar
                    </button>
                  ) : (
                    <button onClick={() => abrirDetalle(r)} title="Ver" className="inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full flex flex-col" style={{ maxWidth: 560, maxHeight: "92vh" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-gray-800">{docId ? (soloLectura ? "Transferencia" : "Editar transferencia") : "Nueva transferencia"}</h2>
                  {soloLectura && docEstado && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[docEstado] ?? ""}`}>{docEstado}</span>}
                </div>
                {docId && docNumero && <p className="text-[11px] text-gray-400 font-mono mt-0.5">{docNumero}</p>}
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>

            <div className="px-6 py-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={soloLectura} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Valor</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">$</span>
                    <MontoInput value={valorInput} onChange={setValorInput} decimales={2} disabled={soloLectura}
                      className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] font-semibold text-right text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className={lbl}>Cuenta origen (sale)</label>
                <select value={origenId} onChange={e => setOrigenId(e.target.value)} disabled={soloLectura} className={inp}>
                  <option value="">— Seleccionar —</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.nombre} ({c.numero}){c.moneda_codigo ? ` · ${c.moneda_codigo}` : ""}</option>)}
                </select>
                {!soloLectura && origenId && saldoOrigen !== null && (
                  <p className="text-[10px] mt-1 flex justify-between">
                    <span className="text-gray-400">Saldo en libros: <span className="font-mono text-gray-600">${fmt(saldoOrigen)}</span></span>
                    {valor > saldoOrigen && <span className="text-amber-600 font-medium">⚠ quedaría en ${fmt(saldoOrigen - valor)}</span>}
                  </p>
                )}
              </div>
              <div>
                <label className={lbl}>Cuenta destino (entra)</label>
                <select value={destinoId} onChange={e => setDestinoId(e.target.value)} disabled={soloLectura} className={inp}>
                  <option value="">— Seleccionar —</option>
                  {cuentas.filter(c => c.id !== origenId).map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.nombre} ({c.numero}){c.moneda_codigo ? ` · ${c.moneda_codigo}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Descripción</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value)} disabled={soloLectura} placeholder="Ej. Traslado a cuenta de nómina" className={inp} />
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 flex-wrap">
              {error && <p className="w-full text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{error}</p>}
              <button onClick={cerrar} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white">{soloLectura ? "Cerrar" : "Cancelar"}</button>
              <button onClick={verAsiento} disabled={previewLoading || (!soloLectura && (!origenId || !destinoId || valor <= 0))}
                className="px-4 py-2 text-[12px] font-medium border border-gray-300 text-blue-700 rounded-lg hover:bg-white disabled:opacity-40">
                {previewLoading ? "Cargando…" : "Ver asiento"}
              </button>
              {!soloLectura && (
                <>
                  <button onClick={() => guardar(false)} disabled={saving} className="flex-1 py-2 border border-blue-300 text-blue-600 bg-white hover:bg-blue-50 text-[12px] font-medium rounded-lg disabled:opacity-50">{saving ? "Guardando..." : "Guardar borrador"}</button>
                  <button onClick={() => guardar(true)} disabled={saving} className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">{saving ? "Procesando..." : "Guardar y contabilizar"}</button>
                  {docId && (
                    <button onClick={anular} disabled={saving} title="Descartar este borrador"
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-[12px] font-medium rounded-lg">Descartar</button>
                  )}
                </>
              )}
              {soloLectura && docEstado !== "anulado" && (
                <button onClick={anular} disabled={saving} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-[12px] font-medium rounded-lg">Anular</button>
              )}
            </div>
          </div>
        </div>
      )}

      {preview && <AsientoModal data={preview} real={previewReal} onClose={() => setPreview(null)} />}
    </div>
  );
}
