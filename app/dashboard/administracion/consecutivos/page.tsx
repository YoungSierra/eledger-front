"use client";

import { useEffect, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Consecutivo {
  id: string;
  tipo_documento_codigo: string;
  tipo_documento_nombre: string;
  tipo_documento_modulo: string;
  prefijo: string | null;
  numero_actual: number;
  numero_inicio: number;
  longitud_minima: number;
  ejemplo: string;
  activo: boolean;
  es_personalizado: boolean;
}

const MODULO_COLOR: Record<string, string> = {
  facturacion: "bg-blue-50 text-blue-700",
  cxc:         "bg-green-50 text-green-700",
  cxp:         "bg-orange-50 text-orange-700",
  compras:     "bg-amber-50 text-amber-700",
  contabilidad:"bg-purple-50 text-purple-700",
  bancos:      "bg-cyan-50 text-cyan-700",
  administracion: "bg-gray-100 text-gray-600",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY_FORM = { prefijo: "", numero_inicio: "1", longitud_minima: "5" };
const EMPTY_NUEVO = { codigo: "", nombre: "", prefijo: "", numero_inicio: "1", longitud_minima: "5" };

export default function ConsecutivosPage() {
  const title = usePageTitle();
  const [lista, setLista]     = useState<Consecutivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer]   = useState<Consecutivo | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoForm, setNuevoForm]   = useState(EMPTY_NUEVO);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [colapsado, setColapsado] = useState<Record<string, boolean>>({});
  // El orden es compartido por los grupos: se aplica dentro de cada módulo.
  const { orden, alternar } = useOrden<
    "codigo" | "tipo" | "prefijo" | "actual" | "inicio" | "longitud" | "ejemplo"
  >("codigo", "asc");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<Consecutivo[]>("/consecutivos");
      setLista(data);
    } finally { setLoading(false); }
  }

  function abrirEditar(c: Consecutivo) {
    setForm({
      prefijo: c.prefijo ?? "",
      numero_inicio: String(c.numero_inicio),
      longitud_minima: String(c.longitud_minima),
    });
    setError(""); setDrawer(c);
  }

  async function crearNuevo() {
    if (!nuevoForm.codigo.trim()) { setError("El código es obligatorio"); return; }
    if (!nuevoForm.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      await apiFetch("/consecutivos", {
        method: "POST",
        body: JSON.stringify({
          codigo: nuevoForm.codigo.trim().toUpperCase(),
          nombre: nuevoForm.nombre.trim(),
          prefijo: nuevoForm.prefijo.trim().toUpperCase() || null,
          numero_inicio: parseInt(nuevoForm.numero_inicio) || 1,
          longitud_minima: parseInt(nuevoForm.longitud_minima) || 5,
        }),
      });
      setModalNuevo(false); setNuevoForm(EMPTY_NUEVO); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al crear"); }
    finally { setSaving(false); }
  }

  async function eliminar(c: Consecutivo) {
    if (!confirm(`¿Eliminar el consecutivo "${c.tipo_documento_codigo} — ${c.tipo_documento_nombre}"?`)) return;
    try {
      await apiFetch(`/consecutivos/${c.id}`, { method: "DELETE" });
      await cargar();
    } catch (e) { alert(e instanceof Error ? e.message : "Error al eliminar"); }
  }

  async function guardar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/consecutivos/${drawer!.id}`, {
        method: "PUT",
        body: JSON.stringify({
          prefijo: form.prefijo.trim() || null,
          numero_inicio: parseInt(form.numero_inicio) || 1,
          longitud_minima: parseInt(form.longitud_minima) || 5,
        }),
      });
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  // Agrupar por módulo
  const porModulo = lista.reduce<Record<string, Consecutivo[]>>((acc, c) => {
    (acc[c.tipo_documento_modulo] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <div className="mb-5 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Configuración de numeración por tipo de documento</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-2 max-w-5xl">
        {loading ? (
          <p className="text-[12px] text-gray-400 text-center py-10">Cargando...</p>
        ) : Object.entries(porModulo).map(([modulo, items]) => {
          const abierto = !colapsado[modulo];
          return (
          <div key={modulo} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div onClick={() => setColapsado((p) => ({ ...p, [modulo]: !p[modulo] }))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition-colors cursor-pointer select-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{modulo}</span>
              <div className="flex items-center gap-2.5">
                {modulo === "contabilidad" && (
                  <button onClick={(e) => { e.stopPropagation(); setNuevoForm(EMPTY_NUEVO); setError(""); setModalNuevo(true); }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium rounded transition-colors">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nuevo
                  </button>
                )}
                <span className="text-[10px] text-gray-400">{items.length}</span>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
            {abierto && (
            <div className="border-t border-gray-100">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-20" />
                <col className="w-52" />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-32" />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <Th campo="codigo"   orden={orden} alternar={alternar}>Código</Th>
                  <Th campo="tipo"     orden={orden} alternar={alternar}>Tipo de documento</Th>
                  <Th campo="prefijo"  orden={orden} alternar={alternar}>Prefijo</Th>
                  <Th campo="actual"   orden={orden} alternar={alternar}>Nº actual</Th>
                  <Th campo="inicio"   orden={orden} alternar={alternar}>Nº inicio</Th>
                  <Th campo="longitud" orden={orden} alternar={alternar}>Longitud</Th>
                  <Th campo="ejemplo"  orden={orden} alternar={alternar}>Ejemplo</Th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ordenarFilas(items, orden, {
                  codigo:   (c) => c.tipo_documento_codigo,
                  tipo:     (c) => c.tipo_documento_nombre,
                  prefijo:  (c) => c.prefijo,
                  actual:   (c) => c.numero_actual,
                  inicio:   (c) => c.numero_inicio,
                  longitud: (c) => c.longitud_minima,
                  ejemplo:  (c) => c.ejemplo,
                }).map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2 text-[11px] font-mono font-semibold text-blue-600">{c.tipo_documento_codigo}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-700">{c.tipo_documento_nombre}</td>
                    <td className="px-4 py-2 text-[12px] font-mono text-gray-500">{c.prefijo ?? "—"}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-500">{c.numero_actual.toLocaleString("es-CO")}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-500">{c.numero_inicio.toLocaleString("es-CO")}</td>
                    <td className="px-4 py-2 text-[12px] text-gray-500">{c.longitud_minima}</td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-600">
                        {c.ejemplo}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEditar(c)} title="Configurar"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {c.es_personalizado && c.numero_actual === 0 && (
                          <button onClick={() => eliminar(c)} title="Eliminar"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            )}
          </div>
          );
        })}
      </div>

      {modalNuevo && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title="Nuevo consecutivo contable"
              onClose={() => setModalNuevo(false)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>}
            />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className={labelCls}>Código *</label>
                <input value={nuevoForm.codigo}
                  onChange={(e) => setNuevoForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="NOM, AJU, DEP…" maxLength={20} className={inputCls} />
                <p className="text-[10px] text-gray-400 mt-1">Identificador único del tipo de documento.</p>
              </div>
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={nuevoForm.nombre}
                  onChange={(e) => setNuevoForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nómina, Ajuste contable…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Prefijo</label>
                <input value={nuevoForm.prefijo}
                  onChange={(e) => setNuevoForm(p => ({ ...p, prefijo: e.target.value.toUpperCase() }))}
                  placeholder="NOM, AJU…" maxLength={20} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Número de inicio</label>
                <input type="number" min="1" value={nuevoForm.numero_inicio}
                  onChange={(e) => setNuevoForm(p => ({ ...p, numero_inicio: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Longitud mínima (padding)</label>
                <input type="number" min="1" max="20" value={nuevoForm.longitud_minima}
                  onChange={(e) => setNuevoForm(p => ({ ...p, longitud_minima: e.target.value }))}
                  className={inputCls} />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-1">Primer número generado:</p>
                <p className="text-[14px] font-mono font-semibold text-gray-800">
                  {(nuevoForm.prefijo || "")}{String(parseInt(nuevoForm.numero_inicio) || 1).padStart(parseInt(nuevoForm.longitud_minima) || 5, "0")}
                </p>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setModalNuevo(false)} className="flex-1 px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={crearNuevo} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </>
      )}

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title="Configurar consecutivo"
              subtitle={drawer.tipo_documento_nombre}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>}
            />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              {drawer.numero_actual > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-amber-700">Ya se han generado <strong>{drawer.numero_actual}</strong> documentos. El número de inicio no puede modificarse.</p>
                </div>
              )}

              <div>
                <label className={labelCls}>Prefijo</label>
                <input value={form.prefijo} onChange={(e) => setForm(p => ({ ...p, prefijo: e.target.value.toUpperCase() }))}
                  placeholder="FAC, NCC, REC…" maxLength={20} className={inputCls} />
                <p className="text-[10px] text-gray-400 mt-1">Texto que antecede al número. Puede quedar vacío.</p>
              </div>
              <div>
                <label className={labelCls}>Número de inicio</label>
                <input type="number" min="1" value={form.numero_inicio}
                  onChange={(e) => setForm(p => ({ ...p, numero_inicio: e.target.value }))}
                  disabled={drawer.numero_actual > 0}
                  className={`${inputCls} ${drawer.numero_actual > 0 ? "bg-gray-50 text-gray-400" : ""}`} />
              </div>
              <div>
                <label className={labelCls}>Longitud mínima (padding de ceros)</label>
                <input type="number" min="1" max="20" value={form.longitud_minima}
                  onChange={(e) => setForm(p => ({ ...p, longitud_minima: e.target.value }))}
                  className={inputCls} />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-1">Próximo número generado:</p>
                <p className="text-[14px] font-mono font-semibold text-gray-800">
                  {(form.prefijo || "")}{String((drawer.numero_actual + 1)).padStart(parseInt(form.longitud_minima) || 5, "0")}
                </p>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
