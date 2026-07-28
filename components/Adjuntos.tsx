"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

interface Adjunto {
  id: string;
  nombre_archivo: string;
  content_type: string | null;
  tamano: number | null;
  descripcion: string | null;
  subido_por_nombre: string | null;
  subido_en: string;
}

function fmtSize(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Adjuntos({
  entidad, entidadId, titulo = "Adjuntos", soloLectura = false, compacto = false,
}: { entidad: string; entidadId: string; titulo?: string; soloLectura?: boolean; compacto?: boolean }) {
  const [items, setItems] = useState<Adjunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    setLoading(true);
    try {
      const r = await apiFetch<Adjunto[]>(`/adjuntos/${entidad}/${entidadId}`);
      setItems(r);
    } catch { setItems([]); } finally { setLoading(false); }
  }

  useEffect(() => { if (entidadId) cargar(); }, [entidad, entidadId]); // eslint-disable-line

  async function subir(file: File) {
    setSubiendo(true); setError("");
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/adjuntos/${entidad}/${entidadId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: "Error al subir" }));
        throw new Error(e.detail || "Error al subir");
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function descargar(a: Adjunto) {
    try {
      const r = await apiFetch<{ url: string | null; directo: boolean }>(`/adjuntos/${a.id}/url`);
      if (r.directo && r.url) {
        window.open(r.url, "_blank");
        return;
      }
      // Fallback: descargar por stream autenticado
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/adjuntos/${a.id}/raw`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = a.nombre_archivo; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al descargar"); }
  }

  async function eliminar(a: Adjunto) {
    if (!window.confirm(`¿Eliminar "${a.nombre_archivo}"?`)) return;
    try {
      await apiFetch(`/adjuntos/${a.id}`, { method: "DELETE" });
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al eliminar"); }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{titulo}{items.length > 0 && <span className="ml-1 text-gray-300">({items.length})</span>}</p>
        {!soloLectura && (
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={subiendo}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              {subiendo ? "Subiendo…" : "Adjuntar"}
            </button>
          </>
        )}
      </div>

      {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg">{error}</p>}

      {loading ? (
        <p className="text-[11px] text-gray-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">Sin adjuntos</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div className="flex-1 min-w-0">
                <button onClick={() => descargar(a)} className="text-[12px] text-blue-700 hover:underline truncate block max-w-full text-left" title={a.nombre_archivo}>{a.nombre_archivo}</button>
                <p className="text-[10px] text-gray-400">{fmtSize(a.tamano)}{a.subido_por_nombre ? ` · ${a.subido_por_nombre}` : ""} · {a.subido_en?.slice(0, 10)}</p>
              </div>
              <button onClick={() => descargar(a)} title="Descargar" className="p-1 text-gray-400 hover:text-blue-600 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              {!soloLectura && (
                <button onClick={() => eliminar(a)} title="Eliminar" className="p-1 text-gray-400 hover:text-red-500 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
