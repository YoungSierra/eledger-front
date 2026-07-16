"use client";

import { Bloque } from "@/lib/ayuda/contenido";

// Renderiza los bloques de un tema de ayuda. Se usa tanto en el manual
// navegable como en el panel contextual, para un estilo idéntico.
export default function AyudaContenido({ bloques }: { bloques: Bloque[] }) {
  return (
    <div className="space-y-3.5">
      {bloques.map((b, i) => {
        switch (b.tipo) {
          case "subtitulo":
            return (
              <h3 key={i} className="text-[11px] font-bold uppercase tracking-wide text-gray-500 pt-1">
                {b.texto}
              </h3>
            );

          case "parrafo":
            return (
              <p key={i} className="text-[12.5px] text-gray-600 leading-relaxed">
                {b.texto}
              </p>
            );

          case "lista":
            return (
              <ul key={i} className="space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-[12.5px] text-gray-600 leading-relaxed">
                    <span className="mt-[7px] w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            );

          case "pasos":
            return (
              <ol key={i} className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 text-[12.5px] text-gray-600 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-[1px]">
                      {j + 1}
                    </span>
                    <span className="pt-[1px]">{it}</span>
                  </li>
                ))}
              </ol>
            );

          case "campos":
            return (
              <dl key={i} className="border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
                {b.items.map((it, j) => (
                  <div key={j} className="px-3 py-2 sm:flex sm:gap-3">
                    <dt className="text-[11.5px] font-semibold text-gray-700 sm:w-2/5 shrink-0">{it.campo}</dt>
                    <dd className="text-[12px] text-gray-500 leading-relaxed">{it.desc}</dd>
                  </div>
                ))}
              </dl>
            );

          case "nota":
            return (
              <div key={i} className="flex gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[1px]">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p className="text-[12px] text-blue-900/80 leading-relaxed">{b.texto}</p>
              </div>
            );

          case "aviso":
            return (
              <div key={i} className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[1px]">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-[12px] text-amber-900/80 leading-relaxed">{b.texto}</p>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
