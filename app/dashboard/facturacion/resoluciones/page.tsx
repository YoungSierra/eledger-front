"use client";

import { useEffect, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Resolucion {
  id: string; tipo: string; numero_resolucion: string;
  prefijo: string | null; rango_desde: number; rango_hasta: number;
  consecutivo_actual: number; disponibles: number;
  fecha_desde: string; fecha_hasta: string;
  activo: boolean; vencida: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  FACTURA_VENTA: "Factura de venta",
  NOTA_CREDITO:  "Nota crédito",
  NOTA_DEBITO:   "Nota débito",
};
const TIPO_STYLE: Record<string, string> = {
  FACTURA_VENTA: "bg-blue-50 text-blue-700",
  NOTA_CREDITO:  "bg-green-50 text-green-700",
  NOTA_DEBITO:   "bg-amber-50 text-amber-700",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY = {
  tipo: "FACTURA_VENTA", numero_resolucion: "", prefijo: "",
  rango_desde: "", rango_hasta: "", fecha_desde: "", fecha_hasta: "",
};

function pctUsado(r: Resolucion) {
  const total = r.rango_hasta - r.rango_desde + 1;
  return total > 0 ? Math.round((r.consecutivo_actual / total) * 100) : 0;
}

export default function ResolucionesPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<Resolucion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [soloActivas, setSoloActivas] = useState(false);

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<Resolucion | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { cargar(); }, [soloActivas]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<Resolucion[]>(`/facturacion/resoluciones?solo_activas=${soloActivas}`);
      setLista(data);
    } finally { setLoading(false); }
  }

  function abrirCrear() { setForm(EMPTY); setEditando(null); setError(""); setDrawer("crear"); }

  function abrirEditar(r: Resolucion) {
    setForm({
      tipo: r.tipo,
      numero_resolucion: r.numero_resolucion,
      prefijo: r.prefijo ?? "",
      rango_desde: String(r.rango_desde),
      rango_hasta: String(r.rango_hasta),
      fecha_desde: r.fecha_desde,
      fecha_hasta: r.fecha_hasta,
    });
    setEditando(r); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.numero_resolucion.trim() || !form.rango_desde || !form.rango_hasta || !form.fecha_desde || !form.fecha_hasta) {
      setError("Completa todos los campos obligatorios"); return;
    }
    setSaving(true); setError("");
    try {
      const body = {
        tipo: form.tipo,
        numero_resolucion: form.numero_resolucion,
        prefijo: form.prefijo || null,
        rango_desde: parseInt(form.rango_desde),
        rango_hasta: parseInt(form.rango_hasta),
        fecha_desde: form.fecha_desde,
        fecha_hasta: form.fecha_hasta,
      };
      if (drawer === "crear") {
        await apiFetch("/facturacion/resoluciones", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/facturacion/resoluciones/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(r: Resolucion) {
    try {
      await apiFetch(`/facturacion/resoluciones/${r.id}`, { method: "PUT", body: JSON.stringify({ activo: !r.activo }) });
      await cargar();
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Habilitaciones para facturación electrónica</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva resolución
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Solo activas
        </label>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[12px] text-gray-400">Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-[12px] text-gray-400">
          Sin resoluciones registradas
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto space-y-3">
          {lista.map((r) => {
            const pct = pctUsado(r);
            const alertaAgotamiento = r.disponibles < 100 && r.disponibles > 0;
            const agotada = r.disponibles === 0;
            return (
              <div key={r.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${r.vencida ? "border-red-200" : agotada ? "border-red-200" : alertaAgotamiento ? "border-amber-200" : "border-gray-200"}`}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_STYLE[r.tipo] ?? "bg-gray-100 text-gray-500"}`}>
                      {TIPO_LABEL[r.tipo] ?? r.tipo}
                    </span>
                    <span className="text-[13px] font-bold text-gray-800">
                      {r.prefijo ? `${r.prefijo} ` : ""}Resolución {r.numero_resolucion}
                    </span>
                    {r.vencida && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">Vencida</span>}
                    {agotada && !r.vencida && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">Agotada</span>}
                    {alertaAgotamiento && !r.vencida && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">⚠ Quedan {r.disponibles}</span>}
                    {!r.activo && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">Inactiva</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => abrirEditar(r)} title="Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => toggleActivo(r)} title={r.activo ? "Inactivar" : "Activar"}
                      className={`p-1.5 rounded-md transition-colors ${r.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                      {r.activo
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  </div>
                </div>

                <div className="px-5 py-3 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Rango</p>
                    <p className="text-[12px] font-semibold text-gray-700">{r.rango_desde.toLocaleString("es-CO")} – {r.rango_hasta.toLocaleString("es-CO")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Consecutivo actual</p>
                    <p className="text-[12px] font-semibold text-gray-700">{(r.rango_desde + r.consecutivo_actual - 1).toLocaleString("es-CO")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Vigencia</p>
                    <p className="text-[12px] font-semibold text-gray-700">{r.fecha_desde} → {r.fecha_hasta}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Disponibles</p>
                    <p className={`text-[12px] font-semibold ${agotada ? "text-red-600" : alertaAgotamiento ? "text-amber-600" : "text-green-600"}`}>
                      {r.disponibles.toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400">Uso del rango</span>
                    <span className="text-[10px] font-semibold text-gray-600">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-green-500"}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overlay + Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-50 flex flex-col">
            <DrawerHeader
              title={drawer === "crear" ? "Nueva resolución DIAN" : "Editar resolución"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className={labelCls}>Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                  <option value="FACTURA_VENTA">Factura de venta</option>
                  <option value="NOTA_CREDITO">Nota crédito</option>
                  <option value="NOTA_DEBITO">Nota débito</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Número de resolución *</label>
                <input value={form.numero_resolucion}
                  onChange={(e) => setForm(p => ({ ...p, numero_resolucion: e.target.value }))}
                  placeholder="18764000001234" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Prefijo</label>
                <input value={form.prefijo} onChange={(e) => setForm(p => ({ ...p, prefijo: e.target.value.toUpperCase() }))}
                  placeholder="FE, FV, SETP..." className={inputCls} maxLength={10} />
                <p className="text-[10px] text-gray-400 mt-1">Opcional — dejar vacío si no hay prefijo</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Rango desde *</label>
                  <input type="number" min={1} value={form.rango_desde}
                    onChange={(e) => setForm(p => ({ ...p, rango_desde: e.target.value }))}
                    className={inputCls} placeholder="1" />
                </div>
                <div>
                  <label className={labelCls}>Rango hasta *</label>
                  <input type="number" min={1} value={form.rango_hasta}
                    onChange={(e) => setForm(p => ({ ...p, rango_hasta: e.target.value }))}
                    className={inputCls} placeholder="10000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fecha desde *</label>
                  <input type="date" value={form.fecha_desde}
                    onChange={(e) => setForm(p => ({ ...p, fecha_desde: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha hasta *</label>
                  <input type="date" value={form.fecha_hasta}
                    onChange={(e) => setForm(p => ({ ...p, fecha_hasta: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>

              {drawer === "editar" && editando && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">Consecutivo actual</p>
                  <p className="text-[13px] font-semibold text-blue-800">
                    {(editando.rango_desde + editando.consecutivo_actual - 1).toLocaleString("es-CO")}
                    <span className="text-[11px] text-blue-400 ml-2">({editando.disponibles.toLocaleString("es-CO")} disponibles)</span>
                  </p>
                </div>
              )}
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
