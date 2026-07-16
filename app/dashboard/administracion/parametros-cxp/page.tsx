"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Cuenta { id: string; codigo: string; nombre: string; }

interface CxpParametro {
  id: string;
  cuenta_proveedores_id: string | null;
  cuenta_proveedores_display: string | null;
  cuenta_mercancias_recibidas_id: string | null;
  cuenta_mercancias_recibidas_display: string | null;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function CuentaSearch({ label, ayuda, valor, display, onChange }: {
  label: string; ayuda: string;
  valor: string | null; display: string | null;
  onChange: (id: string | null, display: string | null) => void;
}) {
  const [q, setQ]           = useState(display ?? "");
  const [opciones, setOpc]  = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(display ?? ""); }, [display]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpc([]); setAbierto(false); onChange(null, null); return; }
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
      <p className="text-[11px] text-gray-400 mb-1.5">{ayuda}</p>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código o nombre..." className={inputCls} />
      {abierto && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {opciones.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => {
                const d = `${c.codigo} — ${c.nombre}`;
                setQ(d); setAbierto(false); onChange(c.id, d);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="font-mono text-[11px] text-blue-600 mr-2">{c.codigo}</span>{c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParametrosCxpPage() {
  const title = usePageTitle();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [ok, setOk]           = useState(false);

  const [proveedoresId, setProveedoresId]         = useState<string | null>(null);
  const [proveedoresDisp, setProveedoresDisp]     = useState<string | null>(null);
  const [mercanciasId, setMercanciasId]           = useState<string | null>(null);
  const [mercanciasDisp, setMercanciasDisp]       = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const d = await apiFetch<CxpParametro>("/parametros-cxp");
      setProveedoresId(d.cuenta_proveedores_id);
      setProveedoresDisp(d.cuenta_proveedores_display);
      setMercanciasId(d.cuenta_mercancias_recibidas_id);
      setMercanciasDisp(d.cuenta_mercancias_recibidas_display);
    } finally { setLoading(false); }
  }

  async function guardar() {
    setSaving(true); setError(""); setOk(false);
    try {
      await apiFetch("/parametros-cxp", {
        method: "PUT",
        body: JSON.stringify({
          cuenta_proveedores_id: proveedoresId,
          cuenta_mercancias_recibidas_id: mercanciasId,
        }),
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  return (
    <div className="h-full flex flex-col max-w-2xl">
      <div className="mb-5 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Cuentas contables usadas en el flujo de compras y pagos a proveedores
        </p>
      </div>

      {loading ? (
        <p className="text-[12px] text-gray-400 text-center py-10">Cargando...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-5">
          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {ok && (
            <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Parámetros guardados correctamente.</p>
          )}

          <CuentaSearch
            label="Cuenta proveedores"
            ayuda="Débito al contabilizar comprobantes de pago. Ej: 2205xx — Proveedores nacionales"
            valor={proveedoresId} display={proveedoresDisp}
            onChange={(id, d) => { setProveedoresId(id); setProveedoresDisp(d); }}
          />

          <CuentaSearch
            label="Mercancías recibidas sin factura (cuenta transitoria)"
            ayuda="Crédito al confirmar una recepción; se reversa al causar la factura del proveedor. Defínela con tu contador según el PUC de la empresa."
            valor={mercanciasId} display={mercanciasDisp}
            onChange={(id, d) => { setMercanciasId(id); setMercanciasDisp(d); }}
          />

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={guardar} disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
              {saving ? "Guardando..." : "Guardar parámetros"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
