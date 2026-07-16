"use client";

import { useEffect, useMemo, useState } from "react";
import { MODULOS_AYUDA, getModuloDeTema, todosLosTemas } from "@/lib/ayuda/contenido";
import AyudaContenido from "@/components/AyudaContenido";

// Manual navegable: índice por módulo a la izquierda, contenido a la derecha.
// Acepta ?tema=<id> para abrir directamente un tema (deep-link desde el panel).
export default function AyudaPage() {
  const primerTema = MODULOS_AYUDA[0]?.temas[0]?.id ?? "";
  const [temaId, setTemaId] = useState<string>(primerTema);
  const [q, setQ] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  // Lee ?tema= de la URL al montar (evita depender de useSearchParams/Suspense).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tema");
    if (p && todosLosTemas().some((t) => t.id === p)) setTemaId(p);
  }, []);

  const tema = useMemo(() => todosLosTemas().find((t) => t.id === temaId) ?? null, [temaId]);
  const modulo = useMemo(() => (tema ? getModuloDeTema(tema.id) : null), [tema]);

  const ql = q.trim().toLowerCase();

  function seleccionar(id: string) {
    setTemaId(id);
    // Refleja el tema en la URL sin recargar (compartible).
    window.history.replaceState(null, "", `/dashboard/ayuda?tema=${id}`);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado */}
      <div className="shrink-0 mb-4">
        <h1 className="text-[16px] font-semibold text-gray-800">Manual del sistema</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Guía de uso por módulo. También disponible desde el botón «?» en cada pantalla.</p>
      </div>

      <div className="flex-1 min-h-0 flex gap-5">
        {/* Índice */}
        <nav className="shrink-0 w-64 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          <div className="shrink-0 p-2.5 border-b border-gray-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en el manual…"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {MODULOS_AYUDA.map((m) => {
              const temas = m.temas.filter(
                (t) => !ql || t.titulo.toLowerCase().includes(ql) || t.resumen.toLowerCase().includes(ql)
              );
              if (temas.length === 0) return null;
              return (
                <div key={m.codigo} className="mb-3">
                  <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">{m.nombre}</p>
                  <div className="space-y-0.5">
                    {temas.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => seleccionar(t.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                          t.id === temaId
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {t.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Contenido */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl overflow-y-auto">
          {tema ? (
            <article className="max-w-2xl mx-auto px-7 py-6">
              {modulo && <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500 mb-1">{modulo.nombre}</p>}
              <h2 className="text-[19px] font-semibold text-gray-800">{tema.titulo}</h2>
              <p className="text-[12.5px] text-gray-400 mt-1 mb-5 leading-relaxed">{tema.resumen}</p>

              {tema.captura && (
                <figure className="mb-5">
                  <button
                    type="button"
                    onClick={() => setZoom(tema.captura!)}
                    className="group block w-full border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors"
                    title="Clic para ampliar"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tema.captura} alt={`Pantalla: ${tema.titulo}`} className="w-full block" />
                  </button>
                  <figcaption className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    Clic en la imagen para ampliarla
                  </figcaption>
                </figure>
              )}

              <AyudaContenido bloques={tema.bloques} />
            </article>
          ) : (
            <div className="h-full flex items-center justify-center text-[12px] text-gray-400">
              Selecciona un tema del índice.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox de captura */}
      {zoom && (
        <div
          className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setZoom(null)}
        >
          <button
            onClick={() => setZoom(null)}
            title="Cerrar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt="Captura ampliada"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white"
          />
        </div>
      )}
    </div>
  );
}
