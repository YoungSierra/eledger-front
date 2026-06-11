"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Configuracion {
  clave: string;
  valor: string;
  tipo: string;
  descripcion: string | null;
}

const GRUPOS: { label: string; claves: string[] }[] = [
  { label: "Contabilidad", claves: ["permitir_correccion_asientos", "periodo_cierre_automatico"] },
  { label: "CxC y CxP",    claves: ["dias_alerta_vencimiento_cxc", "dias_alerta_vencimiento_cxp"] },
  { label: "Inventario",   claves: ["metodo_valoracion_inventario", "permite_stock_negativo"] },
  { label: "Facturación",  claves: ["dias_validez_cotizacion", "factura_requiere_cotizacion"] },
];

const OPCIONES_STRING: Record<string, string[]> = {
  metodo_valoracion_inventario: ["PROMEDIO", "PEPS"],
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function ConfiguracionPage() {
  const title = usePageTitle();
  const [lista, setLista]     = useState<Configuracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer]   = useState<Configuracion | null>(null);
  const [form, setForm]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<Configuracion[]>("/configuracion");
      setLista(data);
    } finally { setLoading(false); }
  }

  function abrirEditar(c: Configuracion) {
    setForm(c.valor);
    setError("");
    setDrawer(c);
  }

  async function guardar() {
    setSaving(true); setError("");
    try {
      await apiFetch(`/configuracion/${drawer!.clave}`, {
        method: "PUT",
        body: JSON.stringify({ valor: form }),
      });
      setDrawer(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  const byKey = Object.fromEntries(lista.map((c) => [c.clave, c]));
  const conocidas = new Set(GRUPOS.flatMap((g) => g.claves));
  const otros = lista.filter((c) => !conocidas.has(c.clave));

  const grupos: { label: string; items: Configuracion[] }[] = [
    ...GRUPOS.map((g) => ({
      label: g.label,
      items: g.claves.map((k) => byKey[k]).filter(Boolean) as Configuracion[],
    })).filter((g) => g.items.length > 0),
    ...(otros.length > 0 ? [{ label: "Otros", items: otros }] : []),
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-5 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Parámetros globales del comportamiento del sistema</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {loading ? (
          <p className="text-[12px] text-gray-400 text-center py-10">Cargando...</p>
        ) : grupos.map(({ label, items }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-semibold text-blue-600">{label}</span>
            </div>
            <table className="w-full">
              <colgroup>
                <col className="w-72" />
                <col />
                <col className="w-36" />
                <col className="w-12" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100">
                  {["Clave", "Descripción", "Valor actual", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.clave} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-[11px] font-mono text-gray-600">{c.clave}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-500">{c.descripcion ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {c.tipo === "boolean" ? (
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          c.valor === "true" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}>
                          {c.valor === "true" ? "Sí" : "No"}
                        </span>
                      ) : (
                        <span className="text-[12px] font-mono font-medium text-gray-700">{c.valor}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => abrirEditar(c)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[13px] font-semibold text-gray-800">Editar parámetro</h2>
                <p className="text-[11px] font-mono text-gray-400 mt-0.5">{drawer.clave}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              {drawer.descripcion && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-blue-700">{drawer.descripcion}</p>
                </div>
              )}

              <div>
                <label className={labelCls}>Valor</label>
                {drawer.tipo === "boolean" ? (
                  <div className="flex gap-2">
                    {[{ v: "true", label: "Sí" }, { v: "false", label: "No" }].map(({ v, label }) => (
                      <button key={v} onClick={() => setForm(v)}
                        className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                          form === v
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                ) : OPCIONES_STRING[drawer.clave] ? (
                  <select value={form} onChange={(e) => setForm(e.target.value)} className={inputCls}>
                    {OPCIONES_STRING[drawer.clave].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={drawer.tipo === "integer" || drawer.tipo === "numeric" ? "number" : "text"}
                    value={form}
                    onChange={(e) => setForm(e.target.value)}
                    step={drawer.tipo === "numeric" ? "0.01" : undefined}
                    min={drawer.tipo === "integer" || drawer.tipo === "numeric" ? "0" : undefined}
                    className={inputCls}
                  />
                )}
                <p className="text-[10px] text-gray-400 mt-1.5">Tipo: {drawer.tipo}</p>
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setDrawer(null)}
                className="flex-1 px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
