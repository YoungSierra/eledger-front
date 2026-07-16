"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Cuenta { id: string; codigo: string; nombre: string; }

interface CxcParametro {
  id: string;
  cuenta_clientes_id: string | null;
  cuenta_clientes_display: string | null;
  cuenta_ingresos_id: string | null;
  cuenta_ingresos_display: string | null;
  cuenta_iva_id: string | null;
  cuenta_iva_display: string | null;
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

export default function ParametrosCxcPage() {
  const title = usePageTitle();
  const [datos, setDatos]   = useState<CxcParametro | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [ok, setOk]         = useState(false);

  const [clientesId, setClientesId]     = useState<string | null>(null);
  const [clientesDisp, setClientesDisp] = useState<string | null>(null);
  const [ingresosId, setIngresosId]     = useState<string | null>(null);
  const [ingresosDisp, setIngresosDisp] = useState<string | null>(null);
  const [ivaId, setIvaId]               = useState<string | null>(null);
  const [ivaDisp, setIvaDisp]           = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const d = await apiFetch<CxcParametro>("/parametros-cxc");
      setDatos(d);
      setClientesId(d.cuenta_clientes_id);   setClientesDisp(d.cuenta_clientes_display);
      setIngresosId(d.cuenta_ingresos_id);   setIngresosDisp(d.cuenta_ingresos_display);
      setIvaId(d.cuenta_iva_id);             setIvaDisp(d.cuenta_iva_display);
    } finally { setLoading(false); }
  }

  async function guardar() {
    setSaving(true); setError(""); setOk(false);
    try {
      await apiFetch("/parametros-cxc", {
        method: "PUT",
        body: JSON.stringify({
          cuenta_clientes_id: clientesId,
          cuenta_ingresos_id: ingresosId,
          cuenta_iva_id: ivaId,
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
          Cuentas contables que se usan al contabilizar facturas y documentos de clientes
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
            label="Cuenta clientes"
            ayuda="Débito al contabilizar facturas. Ej: 1305xx — Clientes nacionales"
            valor={clientesId} display={clientesDisp}
            onChange={(id, d) => { setClientesId(id); setClientesDisp(d); }}
          />

          <CuentaSearch
            label="Cuenta ingresos"
            ayuda="Crédito al contabilizar facturas. Ej: 4135xx — Comercio al por mayor"
            valor={ingresosId} display={ingresosDisp}
            onChange={(id, d) => { setIngresosId(id); setIngresosDisp(d); }}
          />

          <CuentaSearch
            label="Cuenta IVA cobrado"
            ayuda="Crédito del IVA en facturas gravadas. Ej: 240806 — IVA por pagar"
            valor={ivaId} display={ivaDisp}
            onChange={(id, d) => { setIvaId(id); setIvaDisp(d); }}
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
