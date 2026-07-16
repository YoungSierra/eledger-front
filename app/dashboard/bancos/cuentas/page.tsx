"use client";

import { useEffect, useRef, useState } from "react";
import DrawerHeader from "@/components/DrawerHeader";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface Banco { id: string; nombre: string; }
interface Moneda { id: string; codigo: string; nombre: string; }
interface CuentaBancaria {
  id: string; banco_id: string; banco_nombre: string | null;
  nombre: string; numero: string; tipo: string;
  moneda_id: string | null; moneda_codigo: string | null;
  cuenta_contable_id: string | null;
  cuenta_contable_codigo: string | null; cuenta_contable_nombre: string | null;
  saldo_inicial: string;
  activo: boolean;
}
interface Cuenta { id: string; codigo: string; nombre: string; }

const TIPO_STYLE: Record<string, string> = {
  CORRIENTE: "bg-blue-50 text-blue-700",
  AHORRO:    "bg-green-50 text-green-700",
};

const labelCls = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY = {
  banco_id: "", nombre: "", numero: "", tipo: "CORRIENTE",
  moneda_id: "", cuenta_contable_id: "", cuenta_contable_display: "",
  saldo_inicial: "0",
};

function CuentaSearch({ label, cuentaId, cuentaDisplay, onChange }: {
  label: string; cuentaId: string; cuentaDisplay: string; onChange: (id: string) => void;
}) {
  const [q, setQ] = useState(cuentaDisplay);
  const [opciones, setOpciones] = useState<Cuenta[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQ(cuentaDisplay); }, [cuentaDisplay]);

  function buscar(val: string) {
    setQ(val);
    if (!val.trim()) { setOpciones([]); setAbierto(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = await apiFetch<Cuenta[]>(`/cuentas?busqueda=${encodeURIComponent(val)}&solo_activas=true`);
      setOpciones(data.slice(0, 10)); setAbierto(data.length > 0);
    }, 300);
  }

  return (
    <div className="relative">
      <label className={labelCls}>{label}</label>
      <input value={q} onChange={(e) => buscar(e.target.value)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código o nombre..." className={inputCls} />
      {abierto && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {opciones.map((c) => (
            <button key={c.id} type="button"
              onMouseDown={() => { setQ(`${c.codigo} — ${c.nombre}`); setAbierto(false); onChange(c.id); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-blue-700">
              <span className="font-mono text-[11px] text-blue-600 mr-2">{c.codigo}</span>{c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CuentasBancariasPage() {
  const title = usePageTitle();
  const [lista, setLista]       = useState<CuentaBancaria[]>([]);
  const [bancos, setBancos]     = useState<Banco[]>([]);
  const [monedas, setMonedas]   = useState<Moneda[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;
  const { orden, alternar } = useOrden<
    "banco" | "nombre" | "numero" | "tipo" | "moneda" | "puc" | "estado"
  >("nombre", "asc", () => setPagina(1));

  const [drawer, setDrawer]     = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando] = useState<CuentaBancaria | null>(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Banco[]>("/bancos/bancos?solo_activos=true"),
      apiFetch<Moneda[]>("/maestros/monedas"),
    ]).then(([b, m]) => { setBancos(b); setMonedas(m); }).catch(() => {});
    cargar();
  }, []);

  useEffect(() => { cargar(); }, [soloActivas]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await apiFetch<CuentaBancaria[]>(`/bancos/cuentas?solo_activas=${soloActivas}`);
      setLista(data); setPagina(1);
    } finally { setLoading(false); }
  }

  function abrirCrear() { setForm(EMPTY); setEditando(null); setError(""); setDrawer("crear"); }

  function abrirEditar(c: CuentaBancaria) {
    setForm({
      banco_id: c.banco_id, nombre: c.nombre, numero: c.numero, tipo: c.tipo,
      moneda_id: c.moneda_id ?? "",
      cuenta_contable_id: c.cuenta_contable_id ?? "",
      cuenta_contable_display: c.cuenta_contable_id
        ? `${c.cuenta_contable_codigo} — ${c.cuenta_contable_nombre}` : "",
      saldo_inicial: c.saldo_inicial ?? "0",
    });
    setEditando(c); setError(""); setDrawer("editar");
  }

  async function guardar() {
    if (!form.banco_id) { setError("Selecciona un banco"); return; }
    if (!form.nombre.trim() || !form.numero.trim()) { setError("Nombre y número son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      const body = {
        banco_id: form.banco_id, nombre: form.nombre, numero: form.numero, tipo: form.tipo,
        moneda_id: form.moneda_id || null,
        cuenta_contable_id: form.cuenta_contable_id || null,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      };
      if (drawer === "crear") {
        await apiFetch("/bancos/cuentas", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/bancos/cuentas/${editando!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setDrawer(null); await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function toggleActivo(c: CuentaBancaria) {
    try {
      await apiFetch(`/bancos/cuentas/${c.id}`, { method: "PUT", body: JSON.stringify({ activo: !c.activo }) });
      await cargar();
    } catch {}
  }

  const filtradas = lista.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.banco_nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );
  // Se ordena la lista completa antes de paginar.
  const ordenada = ordenarFilas(filtradas, orden, {
    banco:  (c) => c.banco_nombre,
    nombre: (c) => c.nombre,
    numero: (c) => c.numero,
    tipo:   (c) => c.tipo,
    moneda: (c) => c.moneda_codigo,
    puc:    (c) => c.cuenta_contable_codigo,
    estado: (c) => (c.activo ? 1 : 0),
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Cuentas corrientes y de ahorro de la empresa</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva cuenta
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por banco, nombre o número..." className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
          Solo activas
        </label>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-gray-50/70 z-10">
              <tr className="border-b border-gray-100">
                <Th campo="banco"  orden={orden} alternar={alternar}>Banco</Th>
                <Th campo="nombre" orden={orden} alternar={alternar}>Nombre</Th>
                <Th campo="numero" orden={orden} alternar={alternar}>Número</Th>
                <Th campo="tipo"   orden={orden} alternar={alternar}>Tipo</Th>
                <Th campo="moneda" orden={orden} alternar={alternar}>Moneda</Th>
                <Th campo="puc"    orden={orden} alternar={alternar}>Cuenta PUC</Th>
                <Th campo="estado" orden={orden} alternar={alternar}>Estado</Th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-gray-400">Sin registros</td></tr>
              ) : filas.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-[12px]">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-blue-600">{c.banco_nombre ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-[12px] font-mono text-gray-600">{c.numero}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_STYLE[c.tipo] ?? "bg-gray-100 text-gray-500"}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{c.moneda_codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-gray-500">{c.cuenta_contable_codigo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => abrirEditar(c)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => toggleActivo(c)} title={c.activo ? "Inactivar" : "Activar"}
                        className={`p-1.5 rounded-md transition-colors ${c.activo ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                        {c.activo
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
          <span className="text-[11px] text-gray-400">{filtradas.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, filtradas.length)}`} de {filtradas.length}</span>
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
              title={drawer === "crear" ? "Nueva cuenta bancaria" : "Editar cuenta bancaria"}
              onClose={() => setDrawer(null)}
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>}
            />
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className={labelCls}>Banco *</label>
                <select value={form.banco_id} onChange={(e) => setForm(p => ({ ...p, banco_id: e.target.value }))} className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Nombre / descripción *</label>
                <input value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Cta. corriente principal" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Número de cuenta *</label>
                <input value={form.numero} onChange={(e) => setForm(p => ({ ...p, numero: e.target.value }))}
                  placeholder="000-123456789" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                    <option value="CORRIENTE">Corriente</option>
                    <option value="AHORRO">Ahorro</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Moneda</label>
                  <select value={form.moneda_id} onChange={(e) => setForm(p => ({ ...p, moneda_id: e.target.value }))} className={inputCls}>
                    <option value="">— Seleccionar —</option>
                    {monedas.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <CuentaSearch label="Cuenta contable PUC"
                  cuentaId={form.cuenta_contable_id}
                  cuentaDisplay={form.cuenta_contable_display}
                  onChange={(id) => setForm(p => ({ ...p, cuenta_contable_id: id }))} />
                <div>
                  <label className={labelCls}>Saldo inicial</label>
                  <input type="number" min="0" step="0.01" value={form.saldo_inicial}
                    onChange={(e) => setForm(p => ({ ...p, saldo_inicial: e.target.value }))}
                    placeholder="0.00" className={inputCls} />
                </div>
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
