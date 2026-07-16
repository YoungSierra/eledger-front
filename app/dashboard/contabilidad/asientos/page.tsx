"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TipoDoc  { id: string; tipo_documento_id: string; tipo_documento_codigo: string; tipo_documento_nombre: string; tipo_documento_modulo: string; }
interface Moneda   { id: string; codigo: string; nombre: string; es_funcional: boolean; }
interface Cuenta   { id: string; codigo: string; nombre: string; requiere_tercero: boolean; requiere_cc: boolean; }
interface Tercero  { id: string; nit: string; razon_social: string; }
interface CC       { id: string; codigo: string; nombre: string; }

interface LineaResponse {
  id: string; orden: number;
  cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string;
  debito: string; credito: string;
  debito_funcional: string; credito_funcional: string;
  tercero_id: string | null; tercero_nit: string | null; tercero_nombre: string | null;
  centro_costo_id: string | null; centro_costo_nombre: string | null;
  descripcion: string | null;
  requiere_tercero: boolean; requiere_cc: boolean;
}
interface Asiento {
  id: string; numero: number; documento_numero: string | null;
  tipo_documento_id: string; tipo_documento_codigo: string; tipo_documento_nombre: string;
  fecha: string; descripcion: string; estado: "borrador" | "publicado";
  moneda_id: string; moneda_codigo: string; trm: string | null;
  asiento_origen_id: string | null;
  documento_origen_id: string | null;
  documento_origen_tipo: string | null;
  total_debito: string; total_credito: string;
  lineas: LineaResponse[];
  creado_en: string; creado_por: string;
}
interface AsientoListItem {
  id: string; numero: number; documento_numero: string | null;
  tipo_documento_codigo: string; tipo_documento_nombre: string;
  fecha: string; descripcion: string; estado: "borrador" | "publicado";
  moneda_codigo: string; total_debito: string; total_credito: string;
  documento_origen_id: string | null;
  creado_en: string;
}
interface ListResponse { items: AsientoListItem[]; total: number; pagina: number; por_pagina: number; }

interface LineaForm {
  _key: string; id?: string;
  cuenta_id: string; cuenta_display: string;
  requiere_tercero: boolean; requiere_cc: boolean;
  debito: string; credito: string;
  tercero_id: string; tercero_display: string;
  cc_id: string;
  descripcion: string;
}
interface FormHead {
  tipo_documento_id: string; fecha: string;
  descripcion: string; moneda_id: string; trm: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const inpSm = "px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

const ESTADO_BADGE: Record<string, string> = {
  borrador:  "bg-amber-50 text-amber-700 border border-amber-200",
  publicado: "bg-green-50 text-green-700 border border-green-200",
};

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function keyLinea() { return Math.random().toString(36).slice(2); }

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function CuentaSearch({ value, display, onChange }: {
  value: string; display: string;
  onChange: (id: string, display: string, rt: boolean, rcc: boolean) => void;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Cuenta[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(display); }, [display]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpts([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(
        `/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true&solo_movimiento=true`
      ).catch(() => []);
      if (data.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 320) });
      }
      setOpts(data.slice(0, 20)); setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={inputRef} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cuenta…" className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { setQ(c.codigo); setOpen(false); onChange(c.id, c.codigo, c.requiere_tercero, c.requiere_cc); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{c.codigo}</span>
              <span className="text-[11px] text-gray-700">{c.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TerceroSearch({ value, display, onChange }: {
  value: string; display: string;
  onChange: (id: string, display: string) => void;
}) {
  const [q, setQ] = useState(display);
  const [opts, setOpts] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(display); }, [display]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpts([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Tercero[]>(
        `/terceros?busqueda=${encodeURIComponent(val)}&solo_activos=true`
      ).catch(() => []);
      if (data.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
      }
      setOpts(data.slice(0, 10)); setOpen(data.length > 0);
    }, 250);
  }

  return (
    <div className="relative">
      <input ref={inputRef} value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Tercero…" className={inpSm} />
      {open && (
        <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-44 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {opts.map((t) => (
            <button key={t.id} type="button"
              onMouseDown={() => { setQ(t.nit); setOpen(false); onChange(t.id, t.nit); }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors">
              <span className="text-[11px] font-mono text-blue-600 mr-2">{t.nit}</span>
              <span className="text-[11px] text-gray-700">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AsientosPage() {
  const title = usePageTitle();
  const [lista, setLista]   = useState<AsientoListItem[]>([]);
  const [total, setTotal]   = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);
  const hasBuscado = useRef(false);
  // El backend lista por número descendente — ese es el orden inicial.
  const { orden, alternar } = useOrden<
    "numero" | "documento" | "fecha" | "descripcion" | "tipo" | "debitos" | "creditos" | "estado"
  >("numero", "desc", () => setPagina(1));

  // Filtros
  const [fEstado, setFEstado] = useState("");
  const [fTipo, setFTipo]     = useState("");
  const [fDesde, setFDesde]   = useState("");
  const [fHasta, setFHasta]   = useState("");

  // Catálogos
  const [tiposDoc, setTiposDoc]       = useState<TipoDoc[]>([]);
  const [monedas, setMonedas]         = useState<Moneda[]>([]);
  const [ccs, setCcs]                 = useState<CC[]>([]);
  const [monedaFuncId, setMonedaFuncId] = useState("");

  // Modal
  const [modo, setModo]     = useState<"crear" | "editar" | "ver" | null>(null);
  const [activo, setActivo] = useState<Asiento | null>(null);

  // Form
  const hoy = new Date().toISOString().slice(0, 10);
  const [head, setHead]   = useState<FormHead>({ tipo_documento_id: "", fecha: hoy, descripcion: "", moneda_id: "", trm: "" });
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  // Corrección
  const [modalCorregir, setModalCorregir] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [saving, setSaving]       = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError]         = useState("");
  const [printId, setPrintId]     = useState<string | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch<TipoDoc[]>("/consecutivos").then(setTiposDoc).catch(() => {});
    apiFetch<Moneda[]>("/maestros/monedas").then((data) => {
      setMonedas(data);
      const func = data.find((m) => m.es_funcional);
      if (func) setMonedaFuncId(func.id);
    }).catch(() => {});
    apiFetch<CC[]>("/centros-costo").then(setCcs).catch(() => {});
  }, []);

  // ── Listar ─────────────────────────────────────────────────────────────────

  const cargar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) });
      if (fEstado) p.set("estado", fEstado);
      if (fTipo)   p.set("tipo_documento_id", fTipo);
      if (fDesde)  p.set("fecha_desde", fDesde);
      if (fHasta)  p.set("fecha_hasta", fHasta);
      const res = await apiFetch<ListResponse>(`/asientos?${p}`);
      setLista(res.items); setTotal(res.total);
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fEstado, fTipo, fDesde, fHasta]);

  useEffect(() => { if (hasBuscado.current) cargar(pagina); }, [pagina]);

  // ── Abrir modal ────────────────────────────────────────────────────────────

  const tiposDocContabilidad = tiposDoc.filter((d) => d.tipo_documento_modulo === "contabilidad" && d.tipo_documento_codigo !== "ANU");

  function abrirCrear() {
    const amId = tiposDoc.find((t) => t.tipo_documento_codigo === "AM")?.tipo_documento_id ?? "";
    setHead({ tipo_documento_id: amId, fecha: hoy, descripcion: "", moneda_id: monedaFuncId, trm: "" });
    setLineas([]); setError(""); setModo("crear");
  }

  async function abrirEditar(item: AsientoListItem) {
    const a = await apiFetch<Asiento>(`/asientos/${item.id}`).catch(() => null);
    if (!a) return;
    setActivo(a);
    // Asientos generados por un módulo (CxC, CxP, etc.) son de solo lectura
    if (a.documento_origen_id) {
      setError(""); setModo("ver");
      return;
    }
    setHead({ tipo_documento_id: a.tipo_documento_id, fecha: a.fecha, descripcion: a.descripcion, moneda_id: a.moneda_id, trm: a.trm ?? "" });
    setLineas(a.lineas.map((l) => ({
      _key: keyLinea(), id: l.id,
      cuenta_id: l.cuenta_id, cuenta_display: l.cuenta_codigo,
      requiere_tercero: l.requiere_tercero ?? false, requiere_cc: l.requiere_cc ?? false,
      debito: parseFloat(l.debito) > 0 ? String(parseFloat(l.debito)) : "",
      credito: parseFloat(l.credito) > 0 ? String(parseFloat(l.credito)) : "",
      tercero_id: l.tercero_id ?? "", tercero_display: l.tercero_nit ?? "",
      cc_id: l.centro_costo_id ?? "", descripcion: l.descripcion ?? "",
    })));
    setError(""); setModo("editar");
  }

  async function abrirVer(item: AsientoListItem) {
    const a = await apiFetch<Asiento>(`/asientos/${item.id}`).catch(() => null);
    if (!a) return;
    setActivo(a); setError(""); setModo("ver");
  }

  function cerrar() { setModo(null); setActivo(null); setError(""); }

  // ── Líneas ─────────────────────────────────────────────────────────────────

  function addLinea() {
    setLineas((prev) => [...prev, { _key: keyLinea(), cuenta_id: "", cuenta_display: "", requiere_tercero: false, requiere_cc: false, debito: "", credito: "", tercero_id: "", tercero_display: "", cc_id: "", descripcion: "" }]);
  }
  function updLinea(key: string, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l) => l._key === key ? { ...l, ...patch } : l));
  }
  function delLinea(key: string) { setLineas((prev) => prev.filter((l) => l._key !== key)); }

  // ── Cuadre ─────────────────────────────────────────────────────────────────

  const totalD = lineas.reduce((s, l) => s + (parseFloat(l.debito) || 0), 0);
  const totalC = lineas.reduce((s, l) => s + (parseFloat(l.credito) || 0), 0);
  const diff   = Math.abs(totalD - totalC);
  const cuadra = totalD > 0 && diff < 0.0001;

  // ── Guardar ────────────────────────────────────────────────────────────────

  async function guardar(publicarAlGuardar = false) {
    if (!head.tipo_documento_id) { setError("Selecciona el tipo de documento"); return; }
    if (!head.descripcion.trim()) { setError("La descripción es obligatoria"); return; }
    if (lineas.length < 2) { setError("El asiento debe tener al menos 2 líneas"); return; }
    if (publicarAlGuardar && !cuadra) { setError("El asiento no cuadra"); return; }
    const faltaTercero = lineas.find(l => l.requiere_tercero && !l.tercero_id);
    if (faltaTercero) { setError(`La cuenta ${faltaTercero.cuenta_display} requiere tercero`); return; }
    const faltaCC = lineas.find(l => l.requiere_cc && !l.cc_id);
    if (faltaCC) { setError(`La cuenta ${faltaCC.cuenta_display} requiere centro de costo`); return; }

    const cuerpo = {
      tipo_documento_id: head.tipo_documento_id,
      fecha: head.fecha,
      descripcion: head.descripcion.trim(),
      moneda_id: head.moneda_id,
      trm: head.moneda_id !== monedaFuncId && head.trm ? parseFloat(head.trm) : null,
      lineas: lineas.map((l) => ({
        cuenta_id: l.cuenta_id,
        debito: parseFloat(l.debito) || 0,
        credito: parseFloat(l.credito) || 0,
        tercero_id: l.tercero_id || null,
        centro_costo_id: l.cc_id || null,
        descripcion: l.descripcion || null,
      })),
    };

    setSaving(true); setError("");
    try {
      let asientoId: string;
      if (modo === "crear") {
        const nuevo = await apiFetch<Asiento>("/asientos", { method: "POST", body: JSON.stringify(cuerpo) });
        asientoId = nuevo.id;
      } else {
        const aid = activo!.id;

        // 1. Actualizar encabezado
        await apiFetch(`/asientos/${aid}`, {
          method: "PUT",
          body: JSON.stringify({ fecha: head.fecha, descripcion: head.descripcion.trim(), moneda_id: head.moneda_id, trm: cuerpo.trm }),
        });

        // Refrescar líneas activas desde la BD para evitar IDs stale de intentos previos
        const fresco = await apiFetch<Asiento>(`/asientos/${aid}`);
        const originalIds = new Set((fresco.lineas ?? []).map((l) => l.id));
        const currentIds  = new Set(lineas.filter((l) => l.id).map((l) => l.id!));

        // 2. Eliminar líneas que el usuario quitó (ignorar 404 — ya estaban borradas)
        for (const id of originalIds) {
          if (!currentIds.has(id)) {
            await apiFetch(`/asientos/${aid}/lineas/${id}`, { method: "DELETE" }).catch(() => {});
          }
        }

        // 3. Actualizar líneas existentes que aún están activas en la BD
        for (const l of lineas.filter((l) => l.id && originalIds.has(l.id!))) {
          await apiFetch(`/asientos/${aid}/lineas/${l.id}`, {
            method: "PUT",
            body: JSON.stringify({
              cuenta_id: l.cuenta_id,
              debito: parseFloat(l.debito) || 0,
              credito: parseFloat(l.credito) || 0,
              tercero_id: l.tercero_id || null,
              centro_costo_id: l.cc_id || null,
              descripcion: l.descripcion || null,
            }),
          });
        }

        // 4. Agregar líneas nuevas (sin id o cuyo id ya no existe en la BD)
        for (const l of lineas.filter((l) => !l.id || !originalIds.has(l.id))) {
          await apiFetch(`/asientos/${aid}/lineas`, {
            method: "POST",
            body: JSON.stringify({
              cuenta_id: l.cuenta_id,
              debito: parseFloat(l.debito) || 0,
              credito: parseFloat(l.credito) || 0,
              tercero_id: l.tercero_id || null,
              centro_costo_id: l.cc_id || null,
              descripcion: l.descripcion || null,
            }),
          });
        }

        asientoId = aid;
      }
      if (publicarAlGuardar) {
        setPublishing(true);
        await apiFetch(`/asientos/${asientoId}/publicar`, { method: "POST" });
        cerrar(); cargar(1); setPagina(1);
        setPrintId(asientoId);
      } else {
        cerrar(); cargar(1); setPagina(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); setPublishing(false); }
  }

  // ── Corregir ───────────────────────────────────────────────────────────────

  async function corregir() {
    if (!motivo.trim()) { setError("El motivo es obligatorio"); return; }
    const faltaTercero = lineas.find(l => l.requiere_tercero && !l.tercero_id);
    if (faltaTercero) { setError(`La cuenta ${faltaTercero.cuenta_display} requiere tercero`); return; }
    const faltaCC = lineas.find(l => l.requiere_cc && !l.cc_id);
    if (faltaCC) { setError(`La cuenta ${faltaCC.cuenta_display} requiere centro de costo`); return; }
    setSaving(true); setError("");
    try {
      const actualizado = await apiFetch<Asiento>(`/asientos/${activo!.id}/corregir`, {
        method: "POST",
        body: JSON.stringify({
          motivo: motivo.trim(),
          descripcion: head.descripcion.trim() || null,
          lineas: lineas.map((l) => ({
            cuenta_id: l.cuenta_id,
            debito: parseFloat(l.debito) || 0,
            credito: parseFloat(l.credito) || 0,
            tercero_id: l.tercero_id || null,
            centro_costo_id: l.cc_id || null,
            descripcion: l.descripcion || null,
          })),
        }),
      });
      setModalCorregir(false); setMotivo("");
      cerrar(); cargar(1); setPagina(1);
      setPrintId(actualizado.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al corregir");
    } finally { setSaving(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // El backend pagina; se ordena la página cargada antes de pintarla.
  // Solo el listado de asientos — las líneas de un asiento conservan su orden contable.
  const ordenada = ordenarFilas(lista, orden, {
    numero:      (a) => a.numero,
    documento:   (a) => a.documento_numero,
    fecha:       (a) => a.fecha,
    descripcion: (a) => a.descripcion,
    tipo:        (a) => a.tipo_documento_codigo,
    debitos:     (a) => Number(a.total_debito),
    creditos:    (a) => Number(a.total_credito),
    estado:      (a) => a.estado,
  });

  const totalPags   = Math.max(1, Math.ceil(total / porPagina));
  const modoEdicion = modo === "crear" || modo === "editar";

  return (
    <div className="h-full flex flex-col">

      {/* Encabezado página */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Libro mayor · todos los módulos</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo asiento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="publicado">Publicado</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Tipo</label>
          <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            {Array.from(new Set(tiposDoc.map((t) => t.tipo_documento_modulo))).sort().map((mod) => {
              const items = tiposDoc.filter((t) => t.tipo_documento_modulo === mod);
              return (
                <optgroup key={mod} label={mod.charAt(0).toUpperCase() + mod.slice(1)}>
                  {items.map((t) => <option key={t.tipo_documento_id} value={t.tipo_documento_id}>{t.tipo_documento_codigo} — {t.tipo_documento_nombre}</option>)}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div>
          <label className={lbl}>Desde</label>
          <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className={lbl}>Hasta</label>
          <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <button onClick={() => { hasBuscado.current = true; setPagina(1); cargar(1); }} disabled={loading}
          className="px-4 py-1.5 bg-blue-600 text-white text-[12px] rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Buscando…" : "Buscar"}
        </button>
        {(fEstado || fTipo || fDesde || fHasta) && (
          <button onClick={() => { setFEstado(""); setFTipo(""); setFDesde(""); setFHasta(""); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline pb-0.5">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                <Th campo="numero"      orden={orden} alternar={alternar} className="whitespace-nowrap">#</Th>
                <Th campo="documento"   orden={orden} alternar={alternar} className="whitespace-nowrap">Documento</Th>
                <Th campo="fecha"       orden={orden} alternar={alternar} className="whitespace-nowrap">Fecha</Th>
                <Th campo="descripcion" orden={orden} alternar={alternar} className="whitespace-nowrap">Descripción</Th>
                <Th campo="tipo"        orden={orden} alternar={alternar} className="whitespace-nowrap">Tipo</Th>
                <Th campo="debitos"     orden={orden} alternar={alternar} className="whitespace-nowrap">Débitos</Th>
                <Th campo="creditos"    orden={orden} alternar={alternar} className="whitespace-nowrap">Créditos</Th>
                <Th campo="estado"      orden={orden} alternar={alternar} className="whitespace-nowrap">Estado</Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : ordenada.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin asientos registrados</td></tr>
              ) : ordenada.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5 text-[11px] font-mono text-gray-400">{a.numero}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                    {a.documento_numero ?? <span className="text-gray-300 font-normal italic text-[11px]">borrador</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{a.fecha}</td>
                  <td className="px-3 py-2.5 text-gray-700 max-w-[200px] truncate">{a.descripcion}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{a.tipo_documento_codigo}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600 whitespace-nowrap">{fmt(a.total_debito)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600 whitespace-nowrap">{fmt(a.total_credito)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[a.estado]}`}>
                      {a.estado === "borrador" ? "Borrador" : "Publicado"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {a.estado === "borrador" && (
                        <button onClick={() => abrirEditar(a)} title="Editar"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      {a.estado === "publicado" && (
                        <button onClick={() => a.documento_origen_id ? abrirVer(a) : abrirEditar(a)} title="Ver"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {total === 0 ? "0" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, total)}`} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={pagina === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pagina} / {totalPags}</span>
            <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPags)} disabled={pagina === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {/* ── Modal crear / editar / ver ─────────────────────────────────────── */}
      {modo && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: "min(900px, 95vw)", height: "min(88vh, 820px)" }}>

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-gray-800">
                  {modo === "crear" ? "Nuevo asiento"
                    : modo === "editar" ? `Editar borrador #${activo?.numero}`
                    : `${activo?.documento_numero} — ${activo?.tipo_documento_nombre}`}
                </h2>
                {modo === "ver" && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{activo?.fecha} · {activo?.descripcion}</p>
                )}
              </div>
              <button onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              {activo?.documento_origen_id && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-[11px] text-amber-700">
                    Este asiento fue generado automáticamente por el módulo <strong>{activo.documento_origen_tipo}</strong>. Para modificarlo, edita el documento de origen desde su módulo correspondiente.
                  </p>
                </div>
              )}

              {/* Encabezado */}
              {modo === "ver" ? (
                <div className="grid grid-cols-4 gap-4 bg-gray-50 rounded-xl px-4 py-3">
                  {[
                    ["Tipo", `${activo?.tipo_documento_codigo} — ${activo?.tipo_documento_nombre}`],
                    ["Fecha", activo?.fecha],
                    ["Moneda", activo?.moneda_codigo + (activo?.trm ? ` (TRM ${fmt(activo.trm)})` : "")],
                    ["N° interno", String(activo?.numero)],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                      <p className="text-[12px] text-gray-700 font-medium">{val}</p>
                    </div>
                  ))}
                  <div className="col-span-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Descripción</p>
                    <p className="text-[12px] text-gray-700">{activo?.descripcion}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-3">Encabezado</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className={lbl}>Tipo *</label>
                      <select value={head.tipo_documento_id}
                        onChange={(e) => setHead((h) => ({ ...h, tipo_documento_id: e.target.value }))}
                        disabled={modo === "editar"}
                        className={`${inp} ${modo === "editar" ? "bg-gray-50 text-gray-400" : ""}`}>
                        <option value="">Seleccionar…</option>
                        {tiposDocContabilidad.map((t) => <option key={t.tipo_documento_id} value={t.tipo_documento_id}>{t.tipo_documento_codigo} — {t.tipo_documento_nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Fecha *</label>
                      <input type="date" value={head.fecha} onChange={(e) => setHead((h) => ({ ...h, fecha: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Moneda</label>
                      <select value={head.moneda_id} onChange={(e) => setHead((h) => ({ ...h, moneda_id: e.target.value, trm: "" }))} className={inp}>
                        {monedas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                      </select>
                    </div>
                    {head.moneda_id && head.moneda_id !== monedaFuncId && (
                      <div>
                        <label className={lbl}>TRM *</label>
                        <input type="number" step="0.01" value={head.trm}
                          onChange={(e) => setHead((h) => ({ ...h, trm: e.target.value }))}
                          placeholder="4234.50" className={inp} />
                      </div>
                    )}
                    <div className="col-span-4">
                      <label className={lbl}>Descripción *</label>
                      <input value={head.descripcion} onChange={(e) => setHead((h) => ({ ...h, descripcion: e.target.value }))}
                        placeholder="Concepto del asiento…" className={inp} />
                    </div>
                  </div>
                </div>
              )}

              {/* Líneas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Líneas del asiento</p>
                  {modoEdicion && (
                    <button type="button" onClick={addLinea}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Agregar línea
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-2 py-2 text-[10px] font-bold uppercase text-gray-400 w-[240px]">Cuenta</th>
                        <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-gray-400 w-[110px]">Débito</th>
                        <th className="text-right px-2 py-2 text-[10px] font-bold uppercase text-gray-400 w-[110px]">Crédito</th>
                        <th className="text-left px-2 py-2 text-[10px] font-bold uppercase text-gray-400 w-[170px]">Tercero</th>
                        <th className="text-left px-2 py-2 text-[10px] font-bold uppercase text-gray-400 w-[130px]">C. Costo</th>
                        <th className="text-left px-2 py-2 text-[10px] font-bold uppercase text-gray-400">Glosa</th>
                        {modoEdicion && <th className="w-7" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {modo === "ver" ? (
                        activo?.lineas.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-4 text-center text-[12px] text-gray-400">Sin líneas</td></tr>
                        ) : activo?.lineas.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-50/50">
                            <td className="px-2 py-2 text-[11px]">
                              <span className="font-mono text-blue-600 mr-1.5">{l.cuenta_codigo}</span>
                              <span className="text-gray-600">{l.cuenta_nombre}</span>
                            </td>
                            <td className="px-2 py-2 text-right text-[12px] font-mono text-gray-700">{parseFloat(l.debito) > 0 ? fmt(l.debito) : ""}</td>
                            <td className="px-2 py-2 text-right text-[12px] font-mono text-gray-700">{parseFloat(l.credito) > 0 ? fmt(l.credito) : ""}</td>
                            <td className="px-2 py-2 text-[11px] text-gray-500">{l.tercero_nit ?? "—"}</td>
                            <td className="px-2 py-2 text-[11px] text-gray-500">{l.centro_costo_nombre ?? "—"}</td>
                            <td className="px-2 py-2 text-[11px] text-gray-500">{l.descripcion ?? ""}</td>
                          </tr>
                        ))
                      ) : lineas.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-6 text-center text-[12px] text-gray-400">Sin líneas — haz clic en "Agregar línea"</td></tr>
                      ) : lineas.map((l) => (
                        <tr key={l._key} className="hover:bg-gray-50/30">
                          <td className="px-1 py-1.5"><CuentaSearch value={l.cuenta_id} display={l.cuenta_display}
                            onChange={(id, display, rt, rcc) => updLinea(l._key, { cuenta_id: id, cuenta_display: display, requiere_tercero: rt, requiere_cc: rcc })} /></td>
                          <td className="px-1 py-1.5">
                            <input type="number" step="0.01" min="0" value={l.debito} placeholder="0.00"
                              onChange={(e) => updLinea(l._key, { debito: e.target.value })}
                              className={`${inpSm} text-right`} />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" step="0.01" min="0" value={l.credito} placeholder="0.00"
                              onChange={(e) => updLinea(l._key, { credito: e.target.value })}
                              className={`${inpSm} text-right`} />
                          </td>
                          <td className="px-1 py-1.5"><TerceroSearch value={l.tercero_id} display={l.tercero_display}
                            onChange={(id, display) => updLinea(l._key, { tercero_id: id, tercero_display: display })} /></td>
                          <td className="px-1 py-1.5">
                            <select value={l.cc_id} onChange={(e) => updLinea(l._key, { cc_id: e.target.value })} className={inpSm}>
                              <option value="">—</option>
                              {ccs.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1.5">
                            <input value={l.descripcion} onChange={(e) => updLinea(l._key, { descripcion: e.target.value })}
                              placeholder="Glosa…" className={inpSm} />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button type="button" onClick={() => delLinea(l._key)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Fila totales */}
                    <tfoot>
                      <tr className={`border-t-2 ${
                        modo === "ver" ? "border-gray-200 bg-gray-50/60"
                        : cuadra ? "border-green-300 bg-green-50/50"
                        : lineas.length > 0 ? "border-red-200 bg-red-50/30"
                        : "border-gray-100"}`}>
                        <td className="px-2 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Total</td>
                        <td className="px-2 py-2 text-right text-[13px] font-mono font-bold text-gray-800">
                          {fmt(modoEdicion ? totalD : activo?.total_debito ?? 0)}
                        </td>
                        <td className="px-2 py-2 text-right text-[13px] font-mono font-bold text-gray-800">
                          {fmt(modoEdicion ? totalC : activo?.total_credito ?? 0)}
                        </td>
                        <td colSpan={modoEdicion ? 4 : 3} className="px-3 py-2">
                          {modoEdicion && lineas.length > 0 && (
                            cuadra
                              ? <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  Cuadra
                                </span>
                              : <span className="text-[11px] font-semibold text-red-500">Diferencia: {fmt(diff)}</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
              {modo === "ver" ? (
                <>
                  <button onClick={cerrar} className="px-5 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cerrar</button>
                  <button onClick={() => window.open(`/asiento/${activo?.id}`, "_blank")}
                    className="flex-1 py-2 border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 text-[12px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Imprimir
                  </button>
                  {!activo?.documento_origen_id && (
                    <button onClick={() => { setError(""); setModalCorregir(true); }}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-medium rounded-lg transition-colors">
                      Corregir asiento
                    </button>
                  )}
                </>
              ) : activo?.estado === "publicado" ? (
                <>
                  <button onClick={cerrar} className="px-5 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cancelar</button>
                  <button onClick={() => window.open(`/asiento/${activo?.id}`, "_blank")}
                    className="flex-1 py-2 border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 text-[12px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Imprimir
                  </button>
                  <button onClick={() => { setError(""); setModalCorregir(true); }} disabled={saving}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
                    Corregir asiento
                  </button>
                </>
              ) : (
                <>
                  <button onClick={cerrar} className="px-5 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cancelar</button>
                  <button onClick={() => guardar(false)} disabled={saving}
                    className="flex-1 py-2 border border-blue-300 text-blue-600 bg-white hover:bg-blue-50 text-[12px] font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {saving && !publishing ? "Guardando..." : "Guardar borrador"}
                  </button>
                  <button onClick={() => guardar(true)} disabled={saving || !cuadra}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[12px] font-medium rounded-lg transition-colors">
                    {publishing ? "Publicando..." : "Publicar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal corrección */}
      {modalCorregir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-1">Corregir asiento</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              Los cambios se aplicarán directamente sobre el asiento. Se guardará un registro de auditoría con el estado anterior.
            </p>
            <div className="mb-4">
              <label className={lbl}>Motivo *</label>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo…" className={inp} autoFocus />
            </div>
            {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setModalCorregir(false); setMotivo(""); setError(""); }}
                className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={corregir} disabled={saving}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Procesando..." : "Confirmar corrección"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal imprimir tras publicar ── */}
      {printId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[13px] font-semibold text-gray-800 mb-1">Asiento publicado</p>
            <p className="text-[12px] text-gray-500 mb-5">¿Deseas imprimir el asiento?</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setPrintId(null)}
                className="px-4 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Ahora no
              </button>
              <button onClick={() => { window.open(`/asiento/${printId}`, "_blank"); setPrintId(null); }}
                className="px-4 py-2 text-[12px] bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
