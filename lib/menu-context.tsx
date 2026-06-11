"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";

export interface OpcionMenu { nombre: string; ruta: string; implementada: boolean; }
export interface GrupoMenu  { modulo_codigo: string; modulo_nombre: string; opciones: OpcionMenu[]; }

export const MenuContext = createContext<GrupoMenu[]>([]);

export function usePageTitle(): string {
  const grupos  = useContext(MenuContext);
  const pathname = usePathname();
  for (const g of grupos) {
    for (const op of g.opciones) {
      if (op.ruta === pathname) return op.nombre;
    }
  }
  return "";
}

export function useHasRuta(ruta: string): boolean {
  const grupos = useContext(MenuContext);
  return grupos.some(g => g.opciones.some(op => op.ruta === ruta));
}
