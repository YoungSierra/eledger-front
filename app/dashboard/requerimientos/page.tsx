"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface UsuarioSel { id: string; nombre: string; email: string | null; }
interface Mensaje {
  id: string; usuario_id: string; usuario_nombre: string | null;
  tipo: "COMENTARIO" | "CAMBIO_ESTADO"; cuerpo: string; estado_nuevo: string | null; creado_en: string;
}
interface ReqItem {
  id: string; numero: string; asunto: string;
  estado: "PENDIENTE" | "EN_PROCESO" | "REVISION" | "REALIZADO";
  prioridad: "BAJA" | "MEDIA" | "ALTA";
  fecha_limite: string | null;
  solicitante_id: string; solicitante_nombre: string | null;
  asignado_id: string; asignado_nombre: string | null;
  tiene_adjunto: boolean; creado_en: string;
}
interface ReqDetalle extends ReqItem { descripcion: string; archivo_nombre: string | null; mensajes: Mensaje[]; }
interface ListResp { items: ReqItem[]; total: number; pagina: number; por_pagina: number; }
interface Me { id: string; }

const ESTADOS: { v: ReqItem["estado"]; label: string; cls: string }[] = [
  { v: "PENDIENTE",  label: "Pendiente",  cls: "bg-gray-100 text-gray-600" },
  { v: "EN_PROCESO", label: "En proceso", cls: "bg-blue-50 text-blue-700" },
  { v: "REVISION",   label: "Revisión",   cls: "bg-amber-50 text-amber-700" },
  { v: "REALIZADO",  label: "Realizado",  cls: "bg-green-50 text-green-700" },
];
const estadoCls = (e: string) => ESTADOS.find(x => x.v === e)?.cls ?? "bg-gray-100 text-gray-500";
const estadoLabel = (e: string) => ESTADOS.find(x => x.v === e)?.label ?? e;
const PRIORIDADES: { v: ReqItem["prioridad"]; label: string; cls: string }[] = [
  { v: "ALTA",  label: "Alta",  cls: "bg-red-50 text-red-600" },
  { v: "MEDIA", label: "Media", cls: "bg-amber-50 text-amber-600" },
  { v: "BAJA",  label: "Baja",  cls: "bg-gray-100 text-gray-500" },
];
const prioridadCls = (p: string) => PRIORIDADES.find(x => x.v === p)?.cls ?? "bg-gray-100 text-gray-500";

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fechaHora(s: string) {
  return new Date(s).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export default function RequerimientosPage() {
  const title = "Requerimientos";
  const [buzon, setBuzon] = useState<"recibidos" | "enviados">("recibidos");
  const [items, setItems] = useState<ReqItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);
  const [meId, setMeId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioSel[]>([]);

  // Filtros
  const [fEstado, setFEstado] = useState("");
  const [fPrioridad, setFPrioridad] = useState("");
  const [fRemitente, setFRemitente] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [soloNoFin, setSoloNoFin] = useState(true);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [detalle, setDetalle] = useState<ReqDetalle | null>(null);

  useEffect(() => {
    apiFetch<Me>("/auth/me").then(m => setMeId(m.id)).catch(() => {});
    apiFetch<UsuarioSel[]>("/requerimientos/usuarios").then(setUsuarios).catch(() => {});
  }, []);

  const cargar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ buzon, pagina: String(pag), por_pagina: String(porPagina) });
      if (fEstado) p.set("estado", fEstado);
      if (fPrioridad) p.set("prioridad", fPrioridad);
      if (fRemitente) p.set("remitente_id", fRemitente);
      if (fDesde) p.set("fecha_desde", fDesde);
      if (fHasta) p.set("fecha_hasta", fHasta);
      if (soloNoFin) p.set("no_finalizados", "true");
      const r = await apiFetch<ListResp>(`/requerimientos?${p}`);
      setItems(r.items); setTotal(r.total); setPagina(pag);
    } finally { setLoading(false); }
  }, [buzon, fEstado, fPrioridad, fRemitente, fDesde, fHasta, soloNoFin]);

  useEffect(() => { cargar(1); /* eslint-disable-next-line */ }, [buzon]);

  // Recarga vigente (respeta filtros y página actual), en un ref estable.
  const refetchRef = useRef(() => {});
  refetchRef.current = () => cargar(pagina);

  // Auto-refresco cada minuto + al pulsar la campana estando ya en la página.
  useEffect(() => {
    const tick = () => refetchRef.current();
    const t = setInterval(tick, 60_000);
    window.addEventListener("requerimientos:abrir", tick);
    return () => { clearInterval(t); window.removeEventListener("requerimientos:abrir", tick); };
  }, []);

  const totalPags = Math.max(1, Math.ceil(total / porPagina));

  async function abrirDetalle(id: string) {
    const d = await apiFetch<ReqDetalle>(`/requerimientos/${id}`).catch(() => null);
    if (d) setDetalle(d);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Solicitudes de acciones entre usuarios del sistema</p>
        </div>
        <button onClick={() => setModalNuevo(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo requerimiento
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 mb-3 shrink-0 border-b border-gray-200">
        {(["recibidos", "enviados"] as const).map(b => (
          <button key={b} onClick={() => setBuzon(b)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${buzon === b ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {b === "recibidos" ? "Recibidos" : "Enviados"}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white">
            <option value="">Todos</option>
            {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Prioridad</label>
          <select value={fPrioridad} onChange={e => setFPrioridad(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white">
            <option value="">Todas</option>
            {PRIORIDADES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
        </div>
        {buzon === "recibidos" && (
          <div>
            <label className={lbl}>Remitente</label>
            <select value={fRemitente} onChange={e => setFRemitente(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white max-w-[180px]">
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px]" />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer pb-0.5">
          <input type="checkbox" checked={soloNoFin} onChange={e => setSoloNoFin(e.target.checked)} className="rounded" />
          Solo no finalizados
        </label>
        <button onClick={() => cargar(1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Buscar
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
              <tr className="text-left text-[10px] uppercase text-gray-400">
                <th className="px-3 py-2.5">Número</th>
                <th className="px-3 py-2.5">Asunto</th>
                <th className="px-3 py-2.5">{buzon === "recibidos" ? "Remitente" : "Asignado a"}</th>
                <th className="px-3 py-2.5 text-center">Prioridad</th>
                <th className="px-3 py-2.5">Vence</th>
                <th className="px-3 py-2.5 text-center">Estado</th>
                <th className="px-3 py-2.5 w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Sin requerimientos</td></tr>
              ) : items.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-700 whitespace-nowrap">{r.numero}</td>
                  <td className="px-3 py-2.5 text-gray-800">
                    {r.asunto}
                    {r.tiene_adjunto && <span className="ml-1.5 text-gray-300" title="Tiene adjunto">📎</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{buzon === "recibidos" ? r.solicitante_nombre : r.asignado_nombre}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${prioridadCls(r.prioridad)}`}>{r.prioridad}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{r.fecha_limite ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${estadoCls(r.estado)}`}>{estadoLabel(r.estado)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <button onClick={() => abrirDetalle(r.id)} title="Ver"
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

      {modalNuevo && (
        <ModalNuevo usuarios={usuarios.filter(u => u.id !== meId)} onClose={() => setModalNuevo(false)}
          onCreado={() => { setModalNuevo(false); cargar(1); }} />
      )}
      {detalle && (
        <ModalDetalle req={detalle} meId={meId} onClose={() => setDetalle(null)}
          onCambio={async () => { const d = await apiFetch<ReqDetalle>(`/requerimientos/${detalle.id}`).catch(() => null); if (d) setDetalle(d); cargar(pagina); }} />
      )}
    </div>
  );
}

// ─── Modal Nuevo ────────────────────────────────────────────────────────────

function ModalNuevo({ usuarios, onClose, onCreado }: {
  usuarios: UsuarioSel[]; onClose: () => void; onCreado: () => void;
}) {
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [asignadoId, setAsignadoId] = useState("");
  const [prioridad, setPrioridad] = useState<ReqItem["prioridad"]>("MEDIA");
  const [fechaLimite, setFechaLimite] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function guardar() {
    if (!asunto.trim()) { setError("Indica el asunto"); return; }
    if (!asignadoId) { setError("Selecciona el usuario asignado"); return; }
    if (!descripcion.trim()) { setError("Describe el requerimiento"); return; }
    if (archivo && archivo.size > 5 * 1024 * 1024) { setError("El archivo supera 5 MB"); return; }
    setSaving(true); setError("");
    try {
      const creado = await apiFetch<{ id: string }>("/requerimientos", {
        method: "POST",
        body: JSON.stringify({ asunto, descripcion, asignado_id: asignadoId, prioridad, fecha_limite: fechaLimite || null }),
      });
      if (archivo) {
        const token = localStorage.getItem("access_token");
        const fd = new FormData(); fd.append("archivo", archivo);
        await fetch(`${BASE_URL}/requerimientos/${creado.id}/adjunto`, {
          method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
        });
      }
      onCreado();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
        <h2 className="text-[14px] font-semibold text-gray-800 mb-4">Nuevo requerimiento</h2>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Asunto *</label>
            <input value={asunto} onChange={e => setAsunto(e.target.value)} className={inp} placeholder="Ej. Crear prospecto TECEP" />
          </div>
          <div>
            <label className={lbl}>Dirigido a *</label>
            <select value={asignadoId} onChange={e => setAsignadoId(e.target.value)} className={inp}>
              <option value="">Selecciona un usuario…</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value as ReqItem["prioridad"])} className={inp}>
                {PRIORIDADES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Fecha límite</label>
              <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Descripción *</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4}
              className={inp + " resize-none"} placeholder="Describe lo que necesitas…" />
          </div>
          <div>
            <label className={lbl}>Adjunto (opcional, máx. 5 MB)</label>
            <input ref={fileRef} type="file" onChange={e => setArchivo(e.target.files?.[0] ?? null)}
              className="block w-full text-[11px] text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="px-4 py-1.5 text-[12px] text-gray-500 border border-gray-200 rounded-lg">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
            {saving ? "Creando…" : "Crear requerimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Detalle / Traza ──────────────────────────────────────────────────

function ModalDetalle({ req, meId, onClose, onCambio }: {
  req: ReqDetalle; meId: string; onClose: () => void; onCambio: () => void;
}) {
  const [respuesta, setRespuesta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function cambiarEstado(estado: string) {
    setSaving(true); setError("");
    try { await apiFetch(`/requerimientos/${req.id}/estado`, { method: "POST", body: JSON.stringify({ estado }) }); onCambio(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }
  async function enviarRespuesta() {
    if (!respuesta.trim()) return;
    setSaving(true); setError("");
    try { await apiFetch(`/requerimientos/${req.id}/mensajes`, { method: "POST", body: JSON.stringify({ cuerpo: respuesta }) }); setRespuesta(""); onCambio(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }
  async function subirAdjunto(f: File) {
    if (f.size > 5 * 1024 * 1024) { setError("El archivo supera 5 MB"); return; }
    setSaving(true); setError("");
    try {
      const token = localStorage.getItem("access_token");
      const fd = new FormData(); fd.append("archivo", f);
      const res = await fetch(`${BASE_URL}/requerimientos/${req.id}/adjunto`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      });
      if (!res.ok) throw new Error("No se pudo subir el archivo");
      onCambio();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }
  function descargar() {
    const token = localStorage.getItem("access_token");
    fetch(`${BASE_URL}/requerimientos/${req.id}/adjunto`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.blob()).then(b => {
        const url = URL.createObjectURL(b); const a = document.createElement("a");
        a.href = url; a.download = req.archivo_nombre ?? "adjunto"; a.click(); URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-blue-700 text-[13px]">{req.numero}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${estadoCls(req.estado)}`}>{estadoLabel(req.estado)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${prioridadCls(req.prioridad)}`}>{req.prioridad}</span>
              </div>
              <h2 className="text-[14px] font-semibold text-gray-800 mt-1">{req.asunto}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                De {req.solicitante_nombre} · Para {req.asignado_nombre}
                {req.fecha_limite ? ` · Vence ${req.fecha_limite}` : ""}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {/* Cambiar estado */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-gray-400 uppercase font-bold mr-1">Estado:</span>
            {ESTADOS.map(e => (
              <button key={e.v} onClick={() => cambiarEstado(e.v)} disabled={saving || req.estado === e.v}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${req.estado === e.v ? `${e.cls} ring-1 ring-inset ring-current` : "text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cuerpo + traza */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Descripción inicial */}
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Descripción</p>
            <p className="text-[12px] text-gray-700 whitespace-pre-line">{req.descripcion}</p>
            <div className="mt-2 flex items-center gap-2">
              {req.archivo_nombre ? (
                <button onClick={descargar} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800">
                  📎 {req.archivo_nombre}
                </button>
              ) : <span className="text-[11px] text-gray-300">Sin adjunto</span>}
              <button onClick={() => fileRef.current?.click()} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                {req.archivo_nombre ? "Reemplazar" : "Adjuntar"}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirAdjunto(f); }} />
            </div>
          </div>

          {/* Traza */}
          <div className="space-y-2">
            {req.mensajes.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">Sin actividad todavía</p>}
            {req.mensajes.map(m => (
              m.tipo === "CAMBIO_ESTADO" ? (
                <div key={m.id} className="flex items-center gap-2 text-[10px] text-gray-400 py-1">
                  <span className="flex-1 border-t border-gray-100" />
                  <span>{m.usuario_nombre}: {m.cuerpo} · {fechaHora(m.creado_en)}</span>
                  <span className="flex-1 border-t border-gray-100" />
                </div>
              ) : (
                <div key={m.id} className={`flex ${m.usuario_id === meId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 ${m.usuario_id === meId ? "bg-blue-50" : "bg-gray-100"}`}>
                    <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{m.usuario_nombre} · {fechaHora(m.creado_en)}</p>
                    <p className="text-[12px] text-gray-700 whitespace-pre-line">{m.cuerpo}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Responder */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-2">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={2}
              placeholder="Escribe una respuesta…" className={inp + " resize-none flex-1"} />
            <button onClick={enviarRespuesta} disabled={saving || !respuesta.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg shrink-0">
              Responder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
