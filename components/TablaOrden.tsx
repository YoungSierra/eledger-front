"use client";

import { useState } from "react";

/**
 * Ordenamiento por columna para las tablas del dashboard.
 *
 * Se ordena SIEMPRE sobre la lista completa y antes de paginar, para que la
 * página 1 traiga los primeros del orden y no los primeros del fetch.
 *
 * `ordenarFilas` no memoiza a propósito: los extractores suelen leer otros
 * estados (p. ej. el mapa de cotizaciones al que se cruza una operación), y
 * un useMemo con dependencias incompletas devolvería un orden viejo. Ordenar
 * unas decenas o cientos de filas por render no se nota.
 *
 * Uso:
 *   const [pagina, setPagina] = useState(1);
 *   const { orden, alternar } = useOrden<"numero" | "fecha">("fecha", "desc", () => setPagina(1));
 *   const lista = ordenarFilas(cotizaciones, orden, {
 *     numero: (c) => c.numero,
 *     fecha:  (c) => c.fecha,
 *   });
 *   ...
 *   <Th campo="numero" orden={orden} alternar={alternar}>Número</Th>
 */

export type Dir = "asc" | "desc";
export interface Orden<K extends string> { campo: K; dir: Dir }

export type Valor = string | number | null | undefined;
export type Extractores<T, K extends string> = Partial<Record<K, (fila: T) => Valor>>;

/**
 * @param alCambiar se dispara en cada clic de columna. Sirve para volver a la
 *   página 1: reordenar estando en la página 3 dejaría al usuario a mitad de
 *   una lista que ya no es la que estaba viendo.
 */
export function useOrden<K extends string>(
  campoInicial: K, dirInicial: Dir = "asc", alCambiar?: () => void,
) {
  const [orden, setOrden] = useState<Orden<K>>({ campo: campoInicial, dir: dirInicial });
  // Clic en la columna activa invierte; en otra, empieza ascendente.
  const alternar = (campo: K) => {
    setOrden((o) => (o.campo === campo
      ? { campo, dir: o.dir === "asc" ? "desc" : "asc" }
      : { campo, dir: "asc" }));
    alCambiar?.();
  };
  return { orden, alternar, setOrden };
}

function comparar(a: Valor, b: Valor): number {
  const aVacio = a === null || a === undefined || a === "";
  const bVacio = b === null || b === undefined || b === "";
  // Los vacíos caen al final en ambas direcciones: una fila sin dato no es
  // "la más pequeña", es una fila sin dato.
  if (aVacio && bVacio) return 0;
  if (aVacio) return 1;
  if (bVacio) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  // numeric:true ordena "Bodega 10" después de "Bodega 2"; sensitivity:"base"
  // ignora tildes y mayúsculas, como espera un usuario en español.
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

export function ordenarFilas<T, K extends string>(
  filas: T[], orden: Orden<K>, extractores: Extractores<T, K>,
): T[] {
  const extraer = extractores[orden.campo];
  if (!extraer) return filas;
  const signo = orden.dir === "asc" ? 1 : -1;
  const vacios: T[] = [];
  const conDato: T[] = [];
  for (const f of filas) {
    const v = extraer(f);
    (v === null || v === undefined || v === "" ? vacios : conDato).push(f);
  }
  conDato.sort((a, b) => comparar(extraer(a), extraer(b)) * signo);
  return [...conDato, ...vacios];
}

function Flecha({ activo, dir }: { activo: boolean; dir: Dir }) {
  if (!activo) {
    // Guía tenue: indica que la columna es ordenable sin competir con la activa.
    return (
      <svg className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 9l4-4 4 4"/><path d="M16 15l-4 4-4-4"/>
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 shrink-0 text-blue-600" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {dir === "asc" ? <path d="M6 15l6-6 6 6"/> : <path d="M6 9l6 6 6-6"/>}
    </svg>
  );
}

export function Th<K extends string>({
  campo, orden, alternar, children, align = "left", className = "",
}: {
  campo: K;
  orden: Orden<K>;
  alternar: (campo: K) => void;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const activo = orden.campo === campo;
  const alineacion = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justificacion = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <th className={`${alineacion} px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide ${activo ? "text-gray-600" : "text-gray-400"} ${className}`}>
      <button type="button" onClick={() => alternar(campo)}
        title={`Ordenar por ${typeof children === "string" ? children.toLowerCase() : "esta columna"}`}
        className={`group w-full inline-flex items-center gap-1 select-none hover:text-gray-700 transition-colors ${justificacion}`}>
        <span className="truncate">{children}</span>
        <Flecha activo={activo} dir={orden.dir} />
      </button>
    </th>
  );
}
