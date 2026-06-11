"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { MontoInput } from "@/components/MontoInput";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Tercero { id: string; nit: string; razon_social: string; tipo_tercero: string; }
interface Moneda  { id: string; codigo: string; decimales: number; es_funcional: boolean; }
interface BanCuenta {
  id: string; nombre: string; numero: string; tipo: string;
  banco_nombre: string | null;
  cuenta_contable_id: string | null;
  cuenta_contable_codigo: string | null;
  cuenta_contable_nombre: string | null;
  activo: boolean;
}
interface RetCatalogo {
  id: string; tipo: string; nombre: string; porcentaje: string;
  aplica_venta: boolean;
  cuenta_ventas_id: string | null;
  cuenta_ventas_codigo: string | null;
  cuenta_ventas_nombre: string | null;
}
interface FacturaPendiente {
  id: string; numero: string; fecha: string;
  fecha_vencimiento: string | null;
  total: string; aplicado: string; saldo: string;
  dias_vencimiento: number | null;
}
interface Recibo {
  id: string; numero: string; fecha: string;
  tercero_nit: string | null; tercero_nombre: string | null;
  total: string; saldo: string;
  estado: "borrador" | "contabilizado" | "anulado";
}
interface ListResponse { items: Recibo[]; total: number; pagina: number; por_pagina: number; }

interface RetForm {
  _key: string; tipo: string; concepto: string;
  base: string; porcentaje: string; valor: string;
  cuenta_id: string; cuenta_display: string;
}
interface AplicacionForm {
  factura_id: string; checked: boolean; valor: string;
}
interface AplicacionPendiente {
  id: string; factura_id: string; numero: string; fecha: string;
  fecha_vencimiento: string | null; total: string; saldo_original: string; valor: string;
}
interface ReciboDetalle {
  id: string; numero: string; fecha: string;
  tercero_id: string; tercero_nit: string | null; tercero_nombre: string | null;
  ban_cuenta_id: string | null; moneda_id: string; descripcion: string | null;
  subtotal: string; total_retenciones: string;
  retenciones: { tipo: string; concepto: string; base: string | null; porcentaje: string | null; valor: string; cuenta_id: string; cuenta_codigo: string | null; cuenta_nombre: string | null; }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number, decs = 2) {
  return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: decs, maximumFractionDigits: decs });
}
function dec(v: string) { return parseFloat(v) || 0; }

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  contabilizado: "bg-green-50 text-green-700 border border-green-200",
  anulado:       "bg-red-50 text-red-600 border border-red-200",
};

// ─── Tercero search ───────────────────────────────────────────────────────────

function TerceroSearch({ display, onChange, disabled = false }: {
  display: string; onChange: (id: string, label: string) => void; disabled?: boolean;
}) {
  const [q, setQ] = useState(display);
  const [results, setResults] = useState<Tercero[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQ(display); }, [display]);

  async function buscar(val: string) {
    if (disabled) return;
    setQ(val);
    if (val.length < 2) { setResults([]); setOpen(false); return; }
    try {
      const r = await apiFetch<Tercero[]>(`/terceros?busqueda=${encodeURIComponent(val)}&tipo_tercero=CLIENTE&solo_activos=true`);
      setResults(r); setOpen(true);
    } catch { setResults([]); }
  }

  return (
    <div className="relative">
      <input value={q} onChange={e => buscar(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente por nombre o NIT…"
        disabled={disabled}
        className={inp} />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(t => (
            <button key={t.id} onMouseDown={() => { onChange(t.id, `${t.nit} — ${t.razon_social}`); setOpen(false); setQ(`${t.nit} — ${t.razon_social}`); }}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50">
              <span className="font-medium text-gray-700">{t.nit}</span>
              <span className="text-gray-500 ml-2">{t.razon_social}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RecibosPage() {
  usePageTitle();
  const searchParams = useSearchParams();

  const [rows, setRows]         = useState<Recibo[]>([]);
  const [total, setTotal]       = useState(0);
  const [pagina, setPagina]     = useState(1);
  const POR_PAGINA = 50;

  const [modalOpen, setModalOpen]           = useState(false);
  const [reciboId, setReciboId]             = useState<string | null>(null);
  const [reciboNumero, setReciboNumero]     = useState<string>("");
  const [reciboEstado, setReciboEstado]     = useState<string>("");
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [soloLectura, setSoloLectura]       = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [contabilizando, setContabilizando] = useState(false);
  const [error, setError]                   = useState("");
  const [printId, setPrintId]               = useState<string | null>(null);

  // Catálogos
  const [monedas, setMonedas]     = useState<Moneda[]>([]);
  const [cuentasBan, setCuentasBan] = useState<BanCuenta[]>([]);
  const [retCatalogo, setRetCatalogo] = useState<RetCatalogo[]>([]);

  // Facturas pendientes del cliente seleccionado
  const [facturas, setFacturas]   = useState<FacturaPendiente[]>([]);
  const [loadingFac, setLoadingFac] = useState(false);

  // Campos del formulario
  const [fecha, setFecha]             = useState(new Date().toISOString().slice(0, 10));
  const [terceroId, setTerceroId]     = useState("");
  const [terceroDisplay, setTerceroDisplay] = useState("");
  const [banCuentaId, setBanCuentaId]     = useState("");
  const [monedaId, setMonedaId]           = useState("");
  const [valorRecibidoInput, setValorRecibidoInput] = useState("");
  const [descripcion, setDescripcion]     = useState("");
  const [retenciones, setRetenciones] = useState<RetForm[]>([]);
  const [aplicaciones, setAplicaciones] = useState<AplicacionForm[]>([]);

  const decimalesFuncional = monedas.find(m => m.es_funcional)?.decimales ?? 2;

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const cargar = useCallback(async (p = pagina) => {
    try {
      const r = await apiFetch<ListResponse>(`/cxc?tipo=RECIBO&pagina=${p}&por_pagina=${POR_PAGINA}`);
      setRows(r.items); setTotal(r.total); setPagina(p);
    } catch {}
  }, [pagina]);

  useEffect(() => {
    cargar(1);
    apiFetch<Moneda[]>("/maestros/monedas?solo_activas=true").then(setMonedas).catch(() => {});
    apiFetch<BanCuenta[]>("/bancos/cuentas?solo_activas=true").then(d => setCuentasBan(d.filter(c => c.activo))).catch(() => {});
    apiFetch<RetCatalogo[]>("/maestros/retenciones?solo_activas=true").then(d => setRetCatalogo(d.filter(c => c.aplica_venta))).catch(() => {});

    const tid = searchParams.get("tercero_id");
    const tdisplay = searchParams.get("tercero_display");
    if (tid) {
      abrirModal({ id: tid, display: tdisplay || "" });
      window.history.replaceState(null, "", "/dashboard/cxc/recibos");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const func = monedas.find(m => m.es_funcional);
    if (func && !monedaId) setMonedaId(func.id);
  }, [monedas]);

  // ── Cargar facturas al cambiar cliente ──────────────────────────────────────

  useEffect(() => {
    if (reciboId) return;  // en modo edición abrirDetalle ya carga facturas y aplicaciones
    setFacturas([]); setAplicaciones([]);
    if (!terceroId) return;
    setLoadingFac(true);
    apiFetch<FacturaPendiente[]>(`/cxc/facturas-pendientes?tercero_id=${terceroId}`)
      .then(facs => {
        setFacturas(facs);
        setAplicaciones(facs.map(f => ({ factura_id: f.id, checked: false, valor: "" })));
      })
      .catch(() => {})
      .finally(() => setLoadingFac(false));
  }, [terceroId, reciboId]);

  // ── Cálculos en tiempo real ──────────────────────────────────────────────────

  const totalRetenciones = retenciones.reduce((s, r) => {
    const v = dec(r.valor) || Math.round(dec(r.base) * dec(r.porcentaje) / 100 * 10000) / 10000;
    return s + v;
  }, 0);

  const valorRecibido  = dec(valorRecibidoInput);
  const presupuesto    = valorRecibido + totalRetenciones;   // total disponible para aplicar
  const totalAplicado  = aplicaciones.filter(a => a.checked || dec(a.valor) > 0).reduce((s, a) => s + dec(a.valor), 0);
  const disponible     = presupuesto - totalAplicado;        // lo que falta por aplicar
  const reciboCuadra   = valorRecibido > 0 && Math.abs(disponible) < 0.01;

  // ── Al hacer check sin valor ─────────────────────────────────────────────────

  function toggleCheck(idx: number, checked: boolean) {
    const fac = facturas[idx];
    setAplicaciones(prev => {
      const next = [...prev];
      if (checked) {
        const yaEscrito = dec(next[idx].valor);
        if (yaEscrito > 0) {
          // Tiene valor escrito → solo marca el check, no sobreescribe
          next[idx] = { ...next[idx], checked: true };
        } else {
          // Sin valor → auto-calcula con lo que queda disponible
          const yaAplicado = prev.reduce((s, a, i) => i === idx ? s : s + dec(a.valor), 0);
          const disp = presupuesto - yaAplicado;
          const aplicar = Math.min(disp, dec(fac.saldo));
          next[idx] = { ...next[idx], checked: true, valor: aplicar > 0 ? String(aplicar) : "" };
        }
      } else {
        next[idx] = { ...next[idx], checked: false, valor: "" };
      }
      return next;
    });
  }

  function setValorAplicacion(idx: number, val: string, saldoMax: number) {
    const num = dec(val);
    const limitado = num > saldoMax ? String(saldoMax) : val;
    setAplicaciones(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], valor: limitado };  // checked no se toca
      return next;
    });
  }

  // ── Retenciones ──────────────────────────────────────────────────────────────

  function agregarRetencion() {
    setRetenciones(prev => [...prev, {
      _key: Math.random().toString(36).slice(2),
      tipo: "", concepto: "", base: "", porcentaje: "", valor: "",
      cuenta_id: "", cuenta_display: "",
    }]);
  }

  function seleccionarRetCatalogo(idx: number, catId: string) {
    const cat = retCatalogo.find(c => c.id === catId);
    if (!cat) return;
    setRetenciones(prev => {
      const next = [...prev];
      const base = dec(next[idx].base);
      const valor = base > 0 ? String(Math.round(base * dec(cat.porcentaje) / 100 * 10000) / 10000) : "";
      next[idx] = {
        ...next[idx],
        tipo: cat.tipo, concepto: cat.nombre,
        porcentaje: cat.porcentaje, valor,
        cuenta_id: cat.cuenta_ventas_id || "",
        cuenta_display: cat.cuenta_ventas_codigo
          ? `${cat.cuenta_ventas_codigo} — ${cat.cuenta_ventas_nombre}`
          : "",
      };
      return next;
    });
  }

  function setBaseRetencion(idx: number, val: string) {
    setRetenciones(prev => {
      const next = [...prev];
      const pct = dec(next[idx].porcentaje);
      const valor = pct > 0 ? String(Math.round(dec(val) * pct / 100 * 10000) / 10000) : next[idx].valor;
      next[idx] = { ...next[idx], base: val, valor };
      return next;
    });
  }

  function quitarRetencion(key: string) {
    setRetenciones(prev => prev.filter(r => r._key !== key));
  }

  // ── Abrir / cerrar modal ─────────────────────────────────────────────────────

  function abrirModal(prefill?: { id: string; display: string }) {
    setReciboId(null);
    setReciboNumero("");
    setSoloLectura(false);
    setFecha(new Date().toISOString().slice(0, 10));
    setTerceroId(prefill?.id || ""); setTerceroDisplay(prefill?.display || "");
    setBanCuentaId("");
    const func = monedas.find(m => m.es_funcional);
    setMonedaId(func?.id || "");
    setValorRecibidoInput(""); setDescripcion("");
    setRetenciones([]); setAplicaciones([]); setFacturas([]);
    setError("");
    setModalOpen(true);
  }

  function cerrarModal() { if (!saving && !contabilizando) setModalOpen(false); }

  async function contabilizar() {
    setContabilizando(true); setError("");
    try {
      const id = await guardarInterno();
      if (!id) return;
      await apiFetch(`/cxc/${id}/contabilizar`, { method: "POST" });
      setModalOpen(false);
      cargar(1);
      setPrintId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al contabilizar");
    } finally {
      setContabilizando(false);
    }
  }

  async function abrirDetalle(recibo: Recibo) {
    setReciboId(recibo.id);
    setReciboNumero(recibo.numero);
    setReciboEstado(recibo.estado);
    setSoloLectura(recibo.estado !== "borrador");
    setError("");
    setLoadingDetalle(true);
    setModalOpen(true);
    try {
      const [doc, apps] = await Promise.all([
        apiFetch<ReciboDetalle>(`/cxc/${recibo.id}`),
        apiFetch<AplicacionPendiente[]>(`/cxc/${recibo.id}/aplicaciones-pendientes`),
      ]);

      setFecha(doc.fecha);
      setTerceroId(doc.tercero_id);
      setTerceroDisplay(`${doc.tercero_nit || ""} — ${doc.tercero_nombre || ""}`);
      setBanCuentaId(doc.ban_cuenta_id || "");
      setMonedaId(doc.moneda_id);
      setValorRecibidoInput(doc.subtotal);
      setDescripcion(doc.descripcion || "");

      setRetenciones(doc.retenciones.map(r => ({
        _key: Math.random().toString(36).slice(2),
        tipo: r.tipo, concepto: r.concepto,
        base: r.base || "", porcentaje: r.porcentaje || "", valor: r.valor,
        cuenta_id: r.cuenta_id,
        cuenta_display: r.cuenta_codigo ? `${r.cuenta_codigo} — ${r.cuenta_nombre}` : "",
      })));

      const appsMap = new Map(apps.map(a => [a.factura_id, a]));

      let todasFacs: FacturaPendiente[];
      if (recibo.estado !== "borrador") {
        // Solo lectura: mostrar únicamente las facturas aplicadas en este recibo
        todasFacs = apps.map(a => ({
          id: a.factura_id, numero: a.numero, fecha: a.fecha,
          fecha_vencimiento: a.fecha_vencimiento,
          total: a.total, aplicado: String(dec(a.total) - dec(a.saldo_original)), saldo: a.saldo_original, dias_vencimiento: null,
        }));
      } else {
        // Borrador: facturas pendientes del cliente + las ya aplicadas (pueden tener saldo=0)
        const facs = await apiFetch<FacturaPendiente[]>(`/cxc/facturas-pendientes?tercero_id=${doc.tercero_id}&excluir_recibo_id=${recibo.id}`);
        const facsExtra = apps
          .filter(a => !facs.some(f => f.id === a.factura_id))
          .map(a => ({
            id: a.factura_id, numero: a.numero, fecha: a.fecha,
            fecha_vencimiento: a.fecha_vencimiento,
            total: a.total, aplicado: String(dec(a.total) - dec(a.saldo_original)), saldo: a.saldo_original, dias_vencimiento: null,
          }));
        todasFacs = [...facs, ...facsExtra];
      }

      setFacturas(todasFacs);
      setAplicaciones(todasFacs.map(f => {
        const ap = appsMap.get(f.id);
        return { factura_id: f.id, checked: !!ap, valor: ap ? ap.valor : "" };
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el recibo");
    } finally {
      setLoadingDetalle(false);
    }
  }

  // ── Guardar ──────────────────────────────────────────────────────────────────

  function buildPayload(apls: AplicacionForm[], rets: RetForm[]) {
    return {
      fecha, tercero_id: terceroId,
      ban_cuenta_id: banCuentaId,
      moneda_id: monedaId,
      valor_recibido: valorRecibido,
      descripcion: descripcion || null,
      retenciones: rets.map(r => ({
        tipo: r.tipo, concepto: r.concepto,
        base: dec(r.base), porcentaje: dec(r.porcentaje),
        valor: Math.round(dec(r.base) * dec(r.porcentaje) / 100 * 10000) / 10000,
        cuenta_id: r.cuenta_id,
      })),
      aplicaciones: apls.map(a => ({ factura_id: a.factura_id, valor: dec(a.valor) })),
    };
  }

  async function guardarInterno(): Promise<string | null> {
    if (!terceroId) { setError("Selecciona un cliente"); return null; }
    if (!banCuentaId) { setError("Selecciona la cuenta bancaria"); return null; }
    if (!valorRecibido || valorRecibido <= 0) { setError("Ingresa el valor recibido en banco"); return null; }
    const rets = retenciones.filter(r => dec(r.base) > 0);
    if (rets.some(r => !r.concepto))  { setError("Selecciona el tipo para todas las retenciones"); return null; }
    if (rets.some(r => !r.cuenta_id)) { setError("Una o más retenciones no tienen cuenta contable configurada en el catálogo. Ve a Contabilidad → Retenciones y asigna la cuenta de ventas."); return null; }
    const apls = aplicaciones.filter(a => (a.checked || dec(a.valor) > 0));
    if (apls.length === 0) { setError("Selecciona al menos una factura a aplicar"); return null; }
    if (!reciboCuadra) { setError(`Aún quedan $${fmt(disponible, decimalesFuncional)} sin aplicar`); return null; }

    const payload = buildPayload(apls, rets);
    if (reciboId) {
      await apiFetch(`/cxc/${reciboId}/recibo`, { method: "PUT", body: JSON.stringify(payload) });
      return reciboId;
    } else {
      const nuevo = await apiFetch<{ id: string }>("/cxc/recibo", { method: "POST", body: JSON.stringify(payload) });
      return nuevo.id;
    }
  }

  async function guardar() {
    setSaving(true); setError("");
    try {
      const id = await guardarInterno();
      if (id) { setModalOpen(false); cargar(1); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">Recibos de caja</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Pagos recibidos de clientes aplicados a facturas</p>
        </div>
        <button onClick={abrirModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo recibo
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {(["Número","Fecha","Cliente"] as string[]).map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
              <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-[12px] text-gray-400">Sin recibos registrados</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 font-mono text-[11px] text-blue-700">{r.numero}</td>
                <td className="px-3 py-2.5 text-gray-600">{r.fecha}</td>
                <td className="px-3 py-2.5">
                  <p className="text-gray-800 font-medium truncate max-w-[220px]">{r.tercero_nombre}</p>
                  <p className="text-gray-400 text-[10px]">{r.tercero_nit}</p>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-800">${fmt(r.total, decimalesFuncional)}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${ESTADO_BADGE[r.estado]}`}>
                    {r.estado}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {r.estado === "borrador" && (
                    <button onClick={() => abrirDetalle(r)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Editar
                    </button>
                  )}
                  {(r.estado === "contabilizado" || r.estado === "anulado") && (
                    <button onClick={() => abrirDetalle(r)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Ver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {total > POR_PAGINA && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">{total} registros</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(total / POR_PAGINA) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => cargar(p)}
                  className={`w-7 h-7 rounded text-[11px] ${p === pagina ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal nuevo / editar recibo ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full flex flex-col" style={{ maxWidth: 1140, maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-gray-800">
                    {reciboId ? (soloLectura ? "Recibo de caja" : "Editar recibo de caja") : "Nuevo recibo de caja"}
                  </h2>
                  {soloLectura && reciboEstado && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[reciboEstado] ?? ""}`}>
                      {reciboEstado.charAt(0).toUpperCase() + reciboEstado.slice(1)}
                    </span>
                  )}
                </div>
                {soloLectura && reciboNumero && (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{reciboNumero}</p>
                )}
              </div>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Cabecera del recibo */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Cliente</label>
                  <TerceroSearch display={terceroDisplay} disabled={soloLectura}
                    onChange={(id, label) => { setTerceroId(id); setTerceroDisplay(label); }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Fecha</label>
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={soloLectura} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Moneda</label>
                    <select value={monedaId} onChange={e => setMonedaId(e.target.value)} disabled={soloLectura} className={inp}>
                      {monedas.map(m => <option key={m.id} value={m.id}>{m.codigo}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Cuenta bancaria destino</label>
                  <select value={banCuentaId} onChange={e => setBanCuentaId(e.target.value)} disabled={soloLectura} className={inp}>
                    <option value="">— Seleccionar —</option>
                    {cuentasBan.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.banco_nombre} — {c.nombre} ({c.numero})
                        {c.cuenta_contable_codigo ? ` · ${c.cuenta_contable_codigo}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Descripción</label>
                  <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    disabled={soloLectura} placeholder="Ej. Pago facturas mayo" className={inp} />
                </div>
              </div>
            </div>

            {/* Cuerpo: panel izquierdo + panel derecho */}
            <div className="flex-1 flex overflow-hidden min-h-0">

              {loadingDetalle && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl z-10">
                  <p className="text-[12px] text-gray-400">Cargando recibo…</p>
                </div>
              )}
              {/* Panel izquierdo — Montos */}
              <div className="shrink-0 border-r border-gray-100 p-5 flex flex-col gap-4 overflow-y-auto" style={{ width: 400 }}>

                <div>
                  <label className={lbl}>Valor recibido en banco</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium">$</span>
                    <MontoInput value={valorRecibidoInput} onChange={setValorRecibidoInput}
                      decimales={decimalesFuncional} disabled={soloLectura}
                      className="w-full pl-6 pr-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] font-semibold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Retenciones */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={lbl.replace("mb-1", "mb-0")}>Retenciones</span>
                    {!soloLectura && (
                      <button onClick={agregarRetencion}
                        disabled={valorRecibido <= 0}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-300 disabled:cursor-not-allowed">+ Agregar</button>
                    )}
                  </div>
                  {retenciones.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic">Sin retenciones</p>
                  )}
                  {retenciones.map((r, i) => {
                    const valorCalc = Math.round(dec(r.base) * dec(r.porcentaje) / 100 * 10000) / 10000;
                    return (
                      <div key={r._key} className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5">
                        {/* Tipo */}
                        <div className="flex items-center gap-1.5">
                          <select value=""
                            onChange={e => seleccionarRetCatalogo(i, e.target.value)}
                            disabled={soloLectura}
                            className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700">
                            <option value="">{r.concepto || "— Tipo de retención —"}</option>
                            {retCatalogo.filter(c => c.aplica_venta).map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                          {!soloLectura && (
                            <button onClick={() => quitarRetencion(r._key)}
                              className="text-gray-300 hover:text-red-400 shrink-0">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                        {/* Base */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 w-16 shrink-0">Base</span>
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                            <MontoInput value={r.base} onChange={v => setBaseRetencion(i, v)}
                              decimales={decimalesFuncional} disabled={soloLectura}
                              className="w-full pl-5 pr-2 py-1 border border-gray-200 rounded text-[11px] text-right bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                        {/* Valor calculado */}
                        {r.concepto && dec(r.base) > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400">{r.porcentaje}% retenido</span>
                            <span className="font-semibold text-orange-600">${fmt(valorCalc, decimalesFuncional)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Totales resumen */}
                <div className="mt-auto pt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-gray-500">
                    <span>Valor recibido</span>
                    <span className="font-medium">${fmt(valorRecibido, decimalesFuncional)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>+ Retenciones</span>
                    <span className="font-medium">${fmt(totalRetenciones, decimalesFuncional)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 border-t pt-1.5">
                    <span>Total a aplicar</span>
                    <span className="font-medium">${fmt(presupuesto, decimalesFuncional)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Aplicado</span>
                    <span className="font-medium">${fmt(totalAplicado, decimalesFuncional)}</span>
                  </div>
                  {!soloLectura && (
                    <>
                      <div className={`flex justify-between pt-1.5 border-t font-bold text-[12px] ${reciboCuadra ? "text-green-700" : disponible < 0 ? "text-red-600" : "text-blue-700"}`}>
                        <span>Disponible</span>
                        <span>${fmt(disponible, decimalesFuncional)}</span>
                      </div>
                      {disponible < 0 && <p className="text-[10px] text-red-500">Aplicado supera el total</p>}
                      {reciboCuadra && <p className="text-[10px] text-green-600 font-medium">✓ Listo para guardar</p>}
                    </>
                  )}
                </div>
              </div>

              {/* Panel derecho — Facturas */}
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {soloLectura ? "Facturas aplicadas" : "Facturas pendientes del cliente"}
                </p>

                {!terceroId && (
                  <p className="text-[12px] text-gray-400 italic">Selecciona un cliente para ver sus facturas pendientes</p>
                )}
                {terceroId && loadingFac && (
                  <p className="text-[12px] text-gray-400">Cargando facturas…</p>
                )}
                {terceroId && !loadingFac && facturas.length === 0 && (
                  <p className="text-[12px] text-gray-400 italic">
                    {soloLectura ? "Este recibo no tiene facturas aplicadas" : "Este cliente no tiene facturas con saldo pendiente"}
                  </p>
                )}

                {facturas.length > 0 && (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-[10px] font-semibold text-gray-400 uppercase">Factura</th>
                        <th className="text-left py-2 text-[10px] font-semibold text-gray-400 uppercase w-28">Vence</th>
                        <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase">Total</th>
                        <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase">Aplicado</th>
                        {!soloLectura && <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase">Saldo</th>}
                        {!soloLectura && <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase w-36">Aplicar</th>}
                        {!soloLectura && <th className="w-8"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((f, i) => {
                        const ap = aplicaciones[i];
                        const vencida = f.dias_vencimiento !== null && f.dias_vencimiento < 0;
                        return (
                          <tr key={f.id} className={`border-b border-gray-50 ${(ap?.checked || dec(ap?.valor) > 0) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                            <td className="py-2.5">
                              <p className="font-mono font-medium text-gray-800">{f.numero}</p>
                              <p className="text-[10px] text-gray-400">{f.fecha}</p>
                            </td>
                            <td className="py-2.5 w-28">
                              <span className={`text-[11px] ${vencida ? "text-red-600 font-medium" : "text-gray-600"}`}>
                                {f.fecha_vencimiento || "—"}
                              </span>
                              {f.dias_vencimiento !== null && (
                                <p className={`text-[10px] ${vencida ? "text-red-400" : "text-gray-400"}`}>
                                  {vencida ? `${Math.abs(f.dias_vencimiento)}d venc.` : `${f.dias_vencimiento}d`}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 text-right text-gray-600">${fmt(f.total, decimalesFuncional)}</td>
                            <td className="py-2.5 text-right text-gray-400">
                              {soloLectura
                                ? (dec(ap?.valor) > 0 ? `$${fmt(ap.valor, decimalesFuncional)}` : "—")
                                : (dec(f.aplicado) > 0 ? `$${fmt(f.aplicado, decimalesFuncional)}` : "—")}
                            </td>
                            {!soloLectura && <td className="py-2.5 text-right font-medium text-gray-800">${fmt(f.saldo, decimalesFuncional)}</td>}
                            {!soloLectura && (
                              <td className="py-2.5 pl-3 w-36">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                                  <MontoInput
                                    value={ap?.valor || ""}
                                    onChange={v => setValorAplicacion(i, v, dec(f.saldo))}
                                    decimales={decimalesFuncional}
                                    disabled={ap?.checked || false}
                                    placeholder={fmt(f.saldo, decimalesFuncional)}
                                    className={`w-full pl-5 pr-2 py-1 border rounded text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                      ap?.checked ? "border-blue-200 bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-200 bg-white"
                                    }`}
                                  />
                                </div>
                              </td>
                            )}
                            {!soloLectura && (
                              <td className="py-2.5 pr-1 w-8 text-center">
                                <input type="checkbox" checked={ap?.checked || false}
                                  onChange={e => toggleCheck(i, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded accent-blue-600" />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50">
              <div className="flex-1">
                {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg inline-block">{error}</p>}
              </div>
              <div className="flex gap-2">
                {soloLectura ? (
                  <>
                    <button onClick={cerrarModal}
                      className="px-4 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      Cerrar
                    </button>
                    <button onClick={() => window.open(`/recibo/${reciboId}`, "_blank")}
                      className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      Imprimir
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={cerrarModal} disabled={saving || contabilizando}
                      className="px-4 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={guardar} disabled={saving || contabilizando || !reciboCuadra || !terceroId || !banCuentaId}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
                      {saving ? "Guardando…" : reciboId ? "Actualizar borrador" : "Guardar borrador"}
                    </button>
                    {reciboId && (
                      <button onClick={contabilizar} disabled={saving || contabilizando || !reciboCuadra}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
                        {contabilizando ? "Contabilizando…" : "Contabilizar"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal imprimir tras contabilizar ── */}
      {printId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-[13px] font-semibold text-gray-800 mb-1">Recibo contabilizado</p>
            <p className="text-[12px] text-gray-500 mb-5">¿Deseas imprimir el recibo?</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setPrintId(null)}
                className="px-4 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Ahora no
              </button>
              <button onClick={() => { window.open(`/recibo/${printId}`, "_blank"); setPrintId(null); }}
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
