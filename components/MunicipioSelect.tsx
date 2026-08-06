"use client";

import { useEffect, useMemo, useState } from "react";
import SelectBuscable from "@/components/SelectBuscable";
import { apiFetch } from "@/lib/api";

export interface Municipio {
  codigo: string;
  nombre: string;
  depto_codigo: string;
  depto_nombre: string;
}

export interface Pais {
  codigo: string;
  nombre: string;
}

/** Catálogos cacheados en memoria: son estáticos y se piden una sola vez. */
function useCatalogo<T>(ruta: string, cache: { datos: T[] | null; enVuelo: Promise<T[]> | null }) {
  const [items, setItems] = useState<T[]>(cache.datos ?? []);
  useEffect(() => {
    if (cache.datos) return;
    if (!cache.enVuelo) cache.enVuelo = apiFetch<T[]>(ruta).then((d) => (cache.datos = d));
    let vivo = true;
    cache.enVuelo.then((d) => { if (vivo) setItems(d); }).catch(() => { cache.enVuelo = null; });
    return () => { vivo = false; };
  }, [ruta, cache]);
  return items;
}

const cacheMunicipios: { datos: Municipio[] | null; enVuelo: Promise<Municipio[]> | null } = { datos: null, enVuelo: null };
const cachePaises: { datos: Pais[] | null; enVuelo: Promise<Pais[]> | null } = { datos: null, enVuelo: null };
const cacheTiposDoc: { datos: Pais[] | null; enVuelo: Promise<Pais[]> | null } = { datos: null, enVuelo: null };

export const useMunicipios = () => useCatalogo<Municipio>("/municipios", cacheMunicipios);
export const usePaises = () => useCatalogo<Pais>("/paises", cachePaises);
export const useTiposDocumento = () => useCatalogo<Pais>("/paises/tipos-documento", cacheTiposDoc);

/** Selector de país (ISO 3166-1), con buscador. */
export function PaisSelect({ value, onChange }: { value: string; onChange: (codigo: string) => void }) {
  const paises = usePaises();
  const opciones = useMemo(
    () => paises.map((p) => ({ valor: p.codigo, etiqueta: p.nombre, detalle: p.codigo })),
    [paises],
  );
  return <SelectBuscable opciones={opciones} value={value} onChange={onChange}
    placeholder="Seleccionar…" textoBusqueda="Buscar país…" />;
}

/** Selector del catálogo DIAN de tipo de documento de identificación. */
export function TipoDocumentoSelect({ value, onChange }: { value: string; onChange: (codigo: string) => void }) {
  const tipos = useTiposDocumento();
  const opciones = useMemo(
    () => tipos.map((t) => ({ valor: t.codigo, etiqueta: t.nombre, detalle: t.codigo })),
    [tipos],
  );
  return <SelectBuscable opciones={opciones} value={value} onChange={onChange}
    placeholder="Seleccionar…" textoBusqueda="Buscar tipo de documento…" />;
}

/**
 * Selectores dependientes departamento → ciudad sobre el catálogo DIVIPOLA.
 * Devuelve el código DANE de 5 dígitos del municipio, que es lo que exige la
 * facturación electrónica; la ciudad y el departamento en texto los deriva el
 * backend al guardar.
 *
 * Solo aplica dentro de Colombia: para terceros del exterior el llamador debe
 * mostrar campos de texto libres en su lugar.
 */
export default function MunicipioSelect({
  value, onChange, labelCls, disabled = false,
}: {
  value: string;
  onChange: (codigo: string) => void;
  labelCls?: string;
  disabled?: boolean;
}) {
  const municipios = useMunicipios();
  const actual = municipios.find((m) => m.codigo === value) ?? null;
  const [depto, setDepto] = useState("");

  // Al cargar un registro existente, posicionar el departamento del municipio guardado.
  useEffect(() => { if (actual) setDepto(actual.depto_codigo); }, [actual?.depto_codigo]);

  const departamentos = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of municipios) m.set(x.depto_codigo, x.depto_nombre);
    return [...m.entries()]
      .map(([valor, etiqueta]) => ({ valor, etiqueta }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [municipios]);

  // Sin departamento elegido se buscan los 1.122; con departamento, solo los suyos.
  const ciudades = useMemo(
    () => municipios
      .filter((m) => !depto || m.depto_codigo === depto)
      .map((m) => ({ valor: m.codigo, etiqueta: m.nombre, detalle: depto ? undefined : m.depto_nombre })),
    [municipios, depto],
  );

  function cambiarDepto(codigo: string) {
    setDepto(codigo);
    // Si el municipio elegido ya no pertenece al departamento, se limpia.
    if (actual && codigo && actual.depto_codigo !== codigo) onChange("");
  }

  if (disabled) {
    return <p className="text-[12px] text-gray-700">{actual ? `${actual.nombre}, ${actual.depto_nombre}` : "—"}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Departamento</label>
        <SelectBuscable opciones={departamentos} value={depto} onChange={cambiarDepto}
          placeholder="Seleccionar…" textoBusqueda="Buscar departamento…" />
      </div>
      <div>
        <label className={labelCls}>Ciudad / Municipio</label>
        <SelectBuscable opciones={ciudades} value={value} onChange={onChange}
          placeholder={depto ? "Seleccionar…" : "Buscar en todo el país…"}
          textoBusqueda="Buscar municipio…" />
      </div>
    </div>
  );
}
