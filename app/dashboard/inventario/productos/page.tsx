"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Cuenta { id: string; codigo: string; nombre: string; }
interface TipoProducto { id: string; codigo: string; nombre: string; maneja_inventario: boolean;
  cuenta_inventario_id: string | null;       cuenta_inventario_display: string | null;
  cuenta_costo_ventas_id: string | null;     cuenta_costo_ventas_display: string | null;
  cuenta_ingreso_id: string | null;          cuenta_ingreso_display: string | null;
  cuenta_devolucion_venta_id: string | null; cuenta_devolucion_venta_display: string | null;
  cuenta_devolucion_compra_id: string | null;cuenta_devolucion_compra_display: string | null;
  cuenta_ajuste_entrada_id: string | null;   cuenta_ajuste_entrada_display: string | null;
  cuenta_ajuste_salida_id: string | null;    cuenta_ajuste_salida_display: string | null;
}

interface Familia {
  id: string; codigo: string; nombre: string;
  cuenta_inventario_id: string | null;       cuenta_inventario_display: string | null;
  cuenta_costo_ventas_id: string | null;     cuenta_costo_ventas_display: string | null;
  cuenta_ingreso_id: string | null;          cuenta_ingreso_display: string | null;
  cuenta_devolucion_venta_id: string | null; cuenta_devolucion_venta_display: string | null;
  cuenta_devolucion_compra_id: string | null;cuenta_devolucion_compra_display: string | null;
  cuenta_ajuste_entrada_id: string | null;   cuenta_ajuste_entrada_display: string | null;
  cuenta_ajuste_salida_id: string | null;    cuenta_ajuste_salida_display: string | null;
}
interface UnidadMedida { id: string; codigo: string; nombre: string; }

interface Producto {
  id: string; codigo: string; nombre: string; descripcion: string | null;
  tipo_id: string; tipo_codigo: string; tipo_nombre: string;
  familia_id: string | null; familia_nombre: string | null;
  um_base_id: string; um_base_codigo: string; um_base_nombre: string;
  maneja_inventario: boolean; maneja_series: boolean; maneja_lotes: boolean;
  activo: boolean;
  cuenta_inventario_id: string | null;       cuenta_inventario_display: string | null;
  cuenta_costo_ventas_id: string | null;     cuenta_costo_ventas_display: string | null;
  cuenta_ingreso_id: string | null;          cuenta_ingreso_display: string | null;
  cuenta_devolucion_venta_id: string | null; cuenta_devolucion_venta_display: string | null;
  cuenta_devolucion_compra_id: string | null;cuenta_devolucion_compra_display: string | null;
  cuenta_ajuste_entrada_id: string | null;   cuenta_ajuste_entrada_display: string | null;
  cuenta_ajuste_salida_id: string | null;    cuenta_ajuste_salida_display: string | null;
}

const TIPO_COLOR: Record<string, string> = {
  MERCANCIA:    "bg-blue-50 text-blue-700",
  SERVICIO:     "bg-purple-50 text-purple-700",
  MATERIA_PRIMA:"bg-amber-50 text-amber-700",
  INSUMO:       "bg-gray-100 text-gray-600",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY_CUENTAS = {
  cuenta_inventario_id: "",       cuenta_inventario_display: "",
  cuenta_costo_ventas_id: "",     cuenta_costo_ventas_display: "",
  cuenta_ingreso_id: "",          cuenta_ingreso_display: "",
  cuenta_devolucion_venta_id: "", cuenta_devolucion_venta_display: "",
  cuenta_devolucion_compra_id: "", cuenta_devolucion_compra_display: "",
  cuenta_ajuste_entrada_id: "",   cuenta_ajuste_entrada_display: "",
  cuenta_ajuste_salida_id: "",    cuenta_ajuste_salida_display: "",
};

const EMPTY = {
  codigo: "", nombre: "", descripcion: "", tipo_id: "",
  familia_id: "", um_base_id: "",
  maneja_inventario: true, maneja_series: false, maneja_lotes: false,
  ...EMPTY_CUENTAS,
};

function CuentaSearch({ label, cuentaId, cuentaDisplay, onChange }: {
  label: string; cuentaId: string; cuentaDisplay: string;
  onChange: (id: string, display: string) => void;
}) {
  const [q, setQ]             = useState(cuentaDisplay);
  const [opciones, setOpc]    = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(cuentaDisplay); }, [cuentaDisplay]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpc([]); setAbierto(false); onChange("", ""); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(
        `/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true&solo_movimiento=true`
      );
      setOpc(data.slice(0, 10)); setAbierto(data.length > 0);
    }, 300);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar cuenta…" className={inputCls} />
      {abierto && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
          {opciones.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { const d = `${c.codigo} — ${c.nombre}`; setQ(d); setAbierto(false); onChange(c.id, d); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="font-mono text-[11px] text-blue-600 mr-2">{c.codigo}</span>{c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductoUm {
  id: string; um_id: string; um_codigo: string; um_nombre: string;
  factor: string; es_compra: boolean; es_venta: boolean;
}

const EMPTY_UM = { um_id: "", factor: "", es_compra: false, es_venta: false };

export default function ProductosPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Producto[]>([]);
  const [tipos, setTipos]       = useState<TipoProducto[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSolo]  = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;
  const { orden, alternar } = useOrden<
    "codigo" | "nombre" | "tipo" | "familia" | "um" | "estado"
  >("codigo", "asc", () => setPagina(1));

  const [drawer, setDrawer]       = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando]   = useState<Producto | null>(null);
  const [form, setForm]           = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [familiaPendiente, setFamiliaPendiente] = useState<Familia | null>(null);
  const [ums, setUms]             = useState<ProductoUm[]>([]);
  const [umForm, setUmForm]       = useState(EMPTY_UM);
  const [umSaving, setUmSaving]   = useState(false);
  const [umError, setUmError]     = useState("");
  const [cuentasOpen, setCuentasOpen] = useState(false);
  const [umsOpen, setUmsOpen]     = useState(false);
  const editandoIdRef             = useRef<string | null>(null);

  useEffect(() => {
    cargar();
    apiFetch<TipoProducto[]>("/inventario/tipos-producto").then(setTipos).catch(() => {});
    apiFetch<Familia[]>("/inventario/familias?solo_activas=true").then(setFamilias).catch(() => {});
    apiFetch<UnidadMedida[]>("/inventario/unidades-medida?solo_activas=true").then(setUnidades).catch(() => {});
  }, [soloActivos]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<Producto[]>(`/inventario/productos?solo_activos=${soloActivos}`);
      setLista(data); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() {
    editandoIdRef.current = null;
    setForm(EMPTY); setEditando(null); setError(""); setFamiliaPendiente(null);
    setCuentasOpen(false); setUmsOpen(false); setDrawer("crear");
  }

  async function cargarUms() {
    const id = editandoIdRef.current;
    if (!id) return;
    const data = await apiFetch<ProductoUm[]>(`/inventario/productos/${id}/unidades`);
    setUms(data);
  }

  function abrirEditar(p: Producto) {
    setForm({
      codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion ?? "",
      tipo_id: p.tipo_id, familia_id: p.familia_id ?? "", um_base_id: p.um_base_id,
      maneja_inventario: p.maneja_inventario,
      maneja_series: p.maneja_series, maneja_lotes: p.maneja_lotes,
      cuenta_inventario_id: p.cuenta_inventario_id ?? "",
      cuenta_inventario_display: p.cuenta_inventario_display ?? "",
      cuenta_costo_ventas_id: p.cuenta_costo_ventas_id ?? "",
      cuenta_costo_ventas_display: p.cuenta_costo_ventas_display ?? "",
      cuenta_ingreso_id: p.cuenta_ingreso_id ?? "",
      cuenta_ingreso_display: p.cuenta_ingreso_display ?? "",
      cuenta_devolucion_venta_id: p.cuenta_devolucion_venta_id ?? "",
      cuenta_devolucion_venta_display: p.cuenta_devolucion_venta_display ?? "",
      cuenta_devolucion_compra_id: p.cuenta_devolucion_compra_id ?? "",
      cuenta_devolucion_compra_display: p.cuenta_devolucion_compra_display ?? "",
      cuenta_ajuste_entrada_id: p.cuenta_ajuste_entrada_id ?? "",
      cuenta_ajuste_entrada_display: p.cuenta_ajuste_entrada_display ?? "",
      cuenta_ajuste_salida_id: p.cuenta_ajuste_salida_id ?? "",
      cuenta_ajuste_salida_display: p.cuenta_ajuste_salida_display ?? "",
    });
    editandoIdRef.current = p.id;
    setEditando(p); setError(""); setFamiliaPendiente(null);
    setUmForm(EMPTY_UM); setUmError(""); setCuentasOpen(false); setUmsOpen(false);
    apiFetch<ProductoUm[]>(`/inventario/productos/${p.id}/unidades`).then(setUms).catch(() => setUms([]));
    setDrawer("editar");
  }

  function onTipo(tipoId: string) {
    const t = tipos.find(t => t.id === tipoId);
    setForm(p => ({ ...p, tipo_id: tipoId, maneja_inventario: t ? t.maneja_inventario : true }));
  }

  const CAMPOS_CUENTA: Array<[string, string]> = [
    ["cuenta_inventario_id",        "cuenta_inventario_display"],
    ["cuenta_costo_ventas_id",      "cuenta_costo_ventas_display"],
    ["cuenta_ingreso_id",           "cuenta_ingreso_display"],
    ["cuenta_devolucion_venta_id",  "cuenta_devolucion_venta_display"],
    ["cuenta_devolucion_compra_id", "cuenta_devolucion_compra_display"],
    ["cuenta_ajuste_entrada_id",    "cuenta_ajuste_entrada_display"],
    ["cuenta_ajuste_salida_id",     "cuenta_ajuste_salida_display"],
  ];

  function aplicarCuentasFamilia(fam: Familia, soloVacias: boolean) {
    setForm(p => {
      const patch: Record<string, string> = {};
      for (const [idKey, dispKey] of CAMPOS_CUENTA) {
        if (!soloVacias || !p[idKey as keyof typeof p]) {
          patch[idKey]   = (fam[idKey as keyof Familia] as string | null) ?? "";
          patch[dispKey] = (fam[dispKey as keyof Familia] as string | null) ?? "";
        }
      }
      return { ...p, ...patch };
    });
  }

  function onFamilia(familiaId: string) {
    const fam = familias.find((f: Familia) => f.id === familiaId);
    setForm(p => ({ ...p, familia_id: familiaId }));
    if (!fam) return;
    if (drawer === "crear") {
      aplicarCuentasFamilia(fam, false);  // siempre reemplaza
    } else {
      setFamiliaPendiente(fam);          // en edición: preguntar
    }
  }

  function confirmarCambioFamilia(reemplazar: boolean) {
    if (reemplazar && familiaPendiente) {
      aplicarCuentasFamilia(familiaPendiente, false);  // reemplaza todo
    }
    setFamiliaPendiente(null);
  }

  async function guardar() {
    if (!form.codigo.trim()) { setError("El código es obligatorio"); return; }
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    if (!form.tipo_id) { setError("El tipo de producto es obligatorio"); return; }
    if (!form.um_base_id) { setError("La unidad de medida es obligatoria"); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        tipo_id: form.tipo_id,
        familia_id: form.familia_id || null,
        um_base_id: form.um_base_id,
        maneja_inventario: form.maneja_inventario,
        maneja_series: form.maneja_series,
        maneja_lotes: form.maneja_lotes,
        cuenta_inventario_id: form.cuenta_inventario_id || null,
        cuenta_costo_ventas_id: form.cuenta_costo_ventas_id || null,
        cuenta_ingreso_id: form.cuenta_ingreso_id || null,
        cuenta_devolucion_venta_id: form.cuenta_devolucion_venta_id || null,
        cuenta_devolucion_compra_id: form.cuenta_devolucion_compra_id || null,
        cuenta_ajuste_entrada_id: form.cuenta_ajuste_entrada_id || null,
        cuenta_ajuste_salida_id: form.cuenta_ajuste_salida_id || null,
      };
      if (drawer === "crear") {
        body.codigo = form.codigo.trim().toUpperCase();
        await apiFetch("/inventario/productos", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/inventario/productos/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function agregarUm() {
    const id = editandoIdRef.current;
    if (!id) return;
    if (!umForm.um_id) { setUmError("Selecciona una unidad de medida"); return; }
    if (!umForm.factor || parseFloat(umForm.factor) <= 0) { setUmError("El factor debe ser mayor a 0"); return; }
    setUmSaving(true); setUmError("");
    try {
      await apiFetch(`/inventario/productos/${id}/unidades`, {
        method: "POST",
        body: JSON.stringify({
          um_id: umForm.um_id,
          factor: parseFloat(umForm.factor),
          es_compra: umForm.es_compra,
          es_venta: umForm.es_venta,
        }),
      });
      setUmForm(EMPTY_UM);
      await cargarUms();
    } catch (e) { setUmError(e instanceof Error ? e.message : "Error al agregar"); }
    finally { setUmSaving(false); }
  }

  async function eliminarUm(umId: string) {
    const id = editandoIdRef.current;
    if (!id) return;
    try {
      await apiFetch(`/inventario/productos/${id}/unidades/${umId}`, { method: "DELETE" });
      await cargarUms();
    } catch {}
  }

  async function toggleActivo(p: Producto) {
    try {
      await apiFetch(`/inventario/productos/${p.id}`, { method: "PUT", body: JSON.stringify({ activo: !p.activo }) });
      await cargar();
    } catch {}
  }

  const filtrados = lista.filter((p) =>
    p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  // Se ordena la lista completa antes de paginar.
  const ordenada = ordenarFilas(filtrados, orden, {
    codigo:  (p) => p.codigo,
    nombre:  (p) => p.nombre,
    tipo:    (p) => p.tipo_nombre,
    familia: (p) => p.familia_nombre,
    um:      (p) => p.um_base_codigo,
    estado:  (p) => (p.activo ? 1 : 0),
  });
  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Catálogo de productos, servicios e insumos</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo producto
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSolo(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Solo activos
        </label>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/60 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="codigo"  orden={orden} alternar={alternar}>Código</Th>
                <Th campo="nombre"  orden={orden} alternar={alternar}>Nombre</Th>
                <Th campo="tipo"    orden={orden} alternar={alternar}>Tipo</Th>
                <Th campo="familia" orden={orden} alternar={alternar}>Familia</Th>
                <Th campo="um"      orden={orden} alternar={alternar}>UM</Th>
                <Th campo="estado"  orden={orden} alternar={alternar}>Estado</Th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-[12px] font-semibold text-gray-800">{p.codigo}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-700">{p.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_COLOR[p.tipo_codigo] ?? "bg-gray-100 text-gray-500"}`}>
                      {p.tipo_nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-400">{p.familia_nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-blue-600">{p.um_base_codigo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => abrirEditar(p)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActivo(p)} title={p.activo ? "Inactivar" : "Activar"}
                        className={`p-1.5 rounded-md transition-colors ${p.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                        {p.activo
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">{filtrados.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, filtrados.length)}`} de {filtrados.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nuevo producto" : "Editar producto"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className={labelCls}>Código *</label>
                <input value={form.codigo} onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="PROD-001" maxLength={50} disabled={drawer === "editar"}
                  className={`${inputCls} ${drawer === "editar" ? "bg-gray-50 text-gray-400" : ""}`} />
              </div>
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del producto" className={inputCls} maxLength={200} />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Opcional…" rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className={labelCls}>Tipo *</label>
                <select value={form.tipo_id} onChange={(e) => onTipo(e.target.value)} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Familia</label>
                <select value={form.familia_id} onChange={(e) => onFamilia(e.target.value)} className={inputCls}>
                  <option value="">— Sin familia —</option>
                  {familias.map(f => <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>)}
                </select>
              </div>
              {familiaPendiente && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex flex-col gap-2">
                  <p className="text-[11px] text-amber-800">¿Reemplazar las cuentas contables con las de <strong>{familiaPendiente.nombre}</strong>?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => confirmarCambioFamilia(true)}
                      className="flex-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium rounded-md">
                      Sí, reemplazar
                    </button>
                    <button type="button" onClick={() => confirmarCambioFamilia(false)}
                      className="flex-1 px-3 py-1 border border-amber-300 text-amber-700 text-[11px] font-medium rounded-md hover:bg-amber-100">
                      No, mantener
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Unidad de medida base *</label>
                <select value={form.um_base_id} onChange={(e) => setForm(p => ({ ...p, um_base_id: e.target.value }))} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nombre}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.maneja_inventario}
                    onChange={(e) => setForm(p => ({ ...p, maneja_inventario: e.target.checked }))}
                    disabled={form.tipo === "SERVICIO"}
                    className="rounded border-gray-300 text-blue-600 disabled:opacity-40" />
                  <span className="text-[12px] text-gray-700">Maneja inventario</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.maneja_series}
                    onChange={(e) => setForm(p => ({ ...p, maneja_series: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600" />
                  <span className="text-[12px] text-gray-700">Maneja series</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.maneja_lotes}
                    onChange={(e) => setForm(p => ({ ...p, maneja_lotes: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600" />
                  <span className="text-[12px] text-gray-700">Maneja lotes</span>
                </label>
              </div>

              <div className="pt-1 border-t border-gray-100">
                <button type="button" onClick={() => setCuentasOpen(o => !o)}
                  className="flex items-center justify-between w-full group">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-300 group-hover:text-gray-400 transition-colors">
                    Cuentas contables — opcionales
                  </p>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`text-gray-300 transition-transform ${cuentasOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {cuentasOpen && <div className="space-y-3 mt-3">
                  <CuentaSearch label="Inventario"
                    cuentaId={form.cuenta_inventario_id} cuentaDisplay={form.cuenta_inventario_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_inventario_id: id, cuenta_inventario_display: d }))} />
                  <CuentaSearch label="Costo de ventas"
                    cuentaId={form.cuenta_costo_ventas_id} cuentaDisplay={form.cuenta_costo_ventas_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_costo_ventas_id: id, cuenta_costo_ventas_display: d }))} />
                  <CuentaSearch label="Ingresos"
                    cuentaId={form.cuenta_ingreso_id} cuentaDisplay={form.cuenta_ingreso_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_ingreso_id: id, cuenta_ingreso_display: d }))} />
                  <CuentaSearch label="Devolución en ventas"
                    cuentaId={form.cuenta_devolucion_venta_id} cuentaDisplay={form.cuenta_devolucion_venta_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_devolucion_venta_id: id, cuenta_devolucion_venta_display: d }))} />
                  <CuentaSearch label="Devolución a proveedor"
                    cuentaId={form.cuenta_devolucion_compra_id} cuentaDisplay={form.cuenta_devolucion_compra_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_devolucion_compra_id: id, cuenta_devolucion_compra_display: d }))} />
                  <CuentaSearch label="Ajuste entrada"
                    cuentaId={form.cuenta_ajuste_entrada_id} cuentaDisplay={form.cuenta_ajuste_entrada_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_ajuste_entrada_id: id, cuenta_ajuste_entrada_display: d }))} />
                  <CuentaSearch label="Ajuste salida"
                    cuentaId={form.cuenta_ajuste_salida_id} cuentaDisplay={form.cuenta_ajuste_salida_display}
                    onChange={(id, d) => setForm(p => ({ ...p, cuenta_ajuste_salida_id: id, cuenta_ajuste_salida_display: d }))} />
                </div>}
              </div>

              {/* Unidades de medida alternas — solo en edición */}
              {drawer === "editar" && (
                <div className="pt-1 border-t border-gray-100">
                  <button type="button" onClick={() => setUmsOpen(o => !o)}
                    className="flex items-center justify-between w-full group">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-300 group-hover:text-gray-400 transition-colors">
                      Unidades de medida alternas
                      {ums.length > 0 && <span className="ml-2 normal-case font-normal text-gray-300">({ums.length})</span>}
                    </p>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={`text-gray-300 transition-transform ${umsOpen ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {umsOpen && <>
                  {ums.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {ums.map(u => (
                        <div key={u.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                          <span className="font-mono text-[11px] text-blue-600 w-10 shrink-0">{u.um_codigo}</span>
                          <span className="text-[11px] text-gray-600 flex-1">{u.um_nombre}</span>
                          <span className="text-[11px] text-gray-500">×{parseFloat(u.factor).toLocaleString("es-CO", { maximumFractionDigits: 6 })}</span>
                          <div className="flex gap-1">
                            {u.es_compra && <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">COMPRA</span>}
                            {u.es_venta && <span className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-semibold">VENTA</span>}
                          </div>
                          <button onClick={() => eliminarUm(u.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {umError && <p className="text-[11px] text-red-600 mb-2">{umError}</p>}

                  <div className="space-y-2">
                    <div>
                      <label className={labelCls}>Unidad</label>
                      <select value={umForm.um_id} onChange={e => setUmForm(p => ({ ...p, um_id: e.target.value }))} className={inputCls}>
                        <option value="">— Seleccionar —</option>
                        {unidades
                          .filter(u => u.id !== form.um_base_id)
                          .map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Factor de conversión *</label>
                      <input type="number" min="0.000001" step="any" value={umForm.factor}
                        onChange={e => setUmForm(p => ({ ...p, factor: e.target.value }))}
                        placeholder="Ej: 12 (1 CAJA = 12 UND)" className={inputCls} />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={umForm.es_compra}
                          onChange={e => setUmForm(p => ({ ...p, es_compra: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600" />
                        <span className="text-[12px] text-gray-700">Compra</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={umForm.es_venta}
                          onChange={e => setUmForm(p => ({ ...p, es_venta: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600" />
                        <span className="text-[12px] text-gray-700">Venta</span>
                      </label>
                    </div>
                    <button onClick={agregarUm} disabled={umSaving}
                      className="w-full px-3 py-1.5 border border-blue-300 text-blue-600 text-[12px] font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors">
                      {umSaving ? "Agregando..." : "+ Agregar unidad"}
                    </button>
                  </div>
                  </>}
                </div>
              )}

              {drawer === "crear" && (
                <p className="text-[11px] text-gray-400 text-center pt-1 border-t border-gray-100">
                  Guarda el producto primero para agregar unidades de medida alternas.
                </p>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => { setDrawer(null); setFamiliaPendiente(null); }} className="flex-1 px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
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
