"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ─── Interfaces ────────────────────────────────────────────────────────────

interface Empleado {
  tipo_documento: string; numero_documento: string;
  primer_nombre: string; otros_nombres: string; primer_apellido: string; segundo_apellido: string;
  cargo: string;
  salario_basico: string; dias_trabajados: string;
  sueldo: string; auxilio_transporte: string; horas_extra: string; bonificaciones: string; comisiones: string;
  salud: string; pension: string; fondo_solidaridad: string; retencion_fuente: string;
}
interface EmpleadoResp extends Empleado {
  id: string; orden: number; total_devengado: string; total_deducciones: string; neto: string;
}
interface Evento { id: string; tipo: string; estado: string | null; mensaje: string | null; creado_en: string; }
interface Periodo {
  id: string; numero: string; tipo: string;
  periodo_pago_inicio: string; periodo_pago_fin: string; fecha_generacion: string;
  total_devengado: string; total_deducciones: string; total_neto: string;
  notas: string | null; estado: "borrador" | "generado" | "enviado" | "aceptado" | "rechazado" | "anulado";
  cune: string | null; dian_estado: string | null; dian_mensaje: string | null; xml_key: string | null;
  empleados: EmpleadoResp[]; eventos: Evento[];
}
interface ListItem {
  id: string; numero: string; tipo: string;
  periodo_pago_inicio: string; periodo_pago_fin: string; fecha_generacion: string;
  empleados_count: number; total_devengado: string; total_deducciones: string; total_neto: string;
  estado: Periodo["estado"]; dian_estado: string | null; creado_en: string;
}
interface ListResponse { items: ListItem[]; total: number; pagina: number; por_pagina: number; }

// ─── Constantes / helpers ────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  borrador:      "bg-amber-50 text-amber-700 border border-amber-200",
  generado:      "bg-blue-50 text-blue-700 border border-blue-200",
  enviado:       "bg-indigo-50 text-indigo-700 border border-indigo-200",
  aceptado:      "bg-green-50 text-green-700 border border-green-200",
  rechazado:     "bg-red-50 text-red-600 border border-red-200",
  anulado:       "bg-gray-100 text-gray-500 border border-gray-200",
};
const TIPO_DOCS = ["CC", "CE", "TI", "PA", "NIT"];
const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const cel = "w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] text-gray-800 bg-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500";
const celTxt = "w-full px-1.5 py-1 border border-gray-200 rounded text-[11px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: string | number, decs = 2) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-CO", { minimumFractionDigits: decs, maximumFractionDigits: decs });
}
function hoy() { return new Date().toISOString().slice(0, 10); }
function num(v: string) { return parseFloat(v) || 0; }

function empVacio(): Empleado {
  return {
    tipo_documento: "CC", numero_documento: "", primer_nombre: "", otros_nombres: "",
    primer_apellido: "", segundo_apellido: "", cargo: "",
    salario_basico: "", dias_trabajados: "", sueldo: "", auxilio_transporte: "",
    horas_extra: "", bonificaciones: "", comisiones: "",
    salud: "", pension: "", fondo_solidaridad: "", retencion_fuente: "",
  };
}
function devEmp(e: Empleado) { return num(e.sueldo) + num(e.auxilio_transporte) + num(e.horas_extra) + num(e.bonificaciones) + num(e.comisiones); }
function dedEmp(e: Empleado) { return num(e.salud) + num(e.pension) + num(e.fondo_solidaridad) + num(e.retencion_fuente); }

// ─── Modal ────────────────────────────────────────────────────────────────

function Modal({ periodo, onClose, onSaved }: { periodo: Periodo | null; onClose: () => void; onSaved: () => void; }) {
  const soloLectura = !!periodo && periodo.estado !== "borrador";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAnular, setShowAnular] = useState(false);
  const [motivoAnular, setMotivoAnular] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState(periodo?.tipo ?? "NOMINA");
  const [ini, setIni] = useState(periodo?.periodo_pago_inicio ?? hoy());
  const [fin, setFin] = useState(periodo?.periodo_pago_fin ?? hoy());
  const [fechaGen, setFechaGen] = useState(periodo?.fecha_generacion ?? hoy());
  const [notas, setNotas] = useState(periodo?.notas ?? "");
  const [emps, setEmps] = useState<Empleado[]>(
    periodo ? periodo.empleados.map((e) => ({
      tipo_documento: e.tipo_documento, numero_documento: e.numero_documento,
      primer_nombre: e.primer_nombre, otros_nombres: e.otros_nombres ?? "",
      primer_apellido: e.primer_apellido, segundo_apellido: e.segundo_apellido ?? "", cargo: e.cargo ?? "",
      salario_basico: e.salario_basico, dias_trabajados: e.dias_trabajados, sueldo: e.sueldo,
      auxilio_transporte: e.auxilio_transporte, horas_extra: e.horas_extra, bonificaciones: e.bonificaciones,
      comisiones: e.comisiones, salud: e.salud, pension: e.pension, fondo_solidaridad: e.fondo_solidaridad,
      retencion_fuente: e.retencion_fuente,
    })) : []
  );

  const totDev = emps.reduce((s, e) => s + devEmp(e), 0);
  const totDed = emps.reduce((s, e) => s + dedEmp(e), 0);
  const totNeto = totDev - totDed;

  function setEmp(idx: number, ch: Partial<Empleado>) {
    setEmps((prev) => prev.map((e, i) => (i === idx ? { ...e, ...ch } : e)));
  }

  async function descargarPlantilla() {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${BASE_URL}/nomina/plantilla-excel`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { setError("No se pudo descargar la plantilla"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla_nomina.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  async function importarExcel(file: File) {
    setError("");
    const fd = new FormData();
    fd.append("archivo", file);
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${BASE_URL}/nomina/importar-excel`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.detail ?? "Error al importar"); }
      const data = await res.json();
      const nuevos: Empleado[] = data.empleados.map((e: Record<string, unknown>) => ({
        tipo_documento: String(e.tipo_documento ?? "CC"), numero_documento: String(e.numero_documento ?? ""),
        primer_nombre: String(e.primer_nombre ?? ""), otros_nombres: String(e.otros_nombres ?? ""),
        primer_apellido: String(e.primer_apellido ?? ""), segundo_apellido: String(e.segundo_apellido ?? ""),
        cargo: String(e.cargo ?? ""),
        salario_basico: String(e.salario_basico ?? ""), dias_trabajados: String(e.dias_trabajados ?? ""),
        sueldo: String(e.sueldo ?? ""), auxilio_transporte: String(e.auxilio_transporte ?? ""),
        horas_extra: String(e.horas_extra ?? ""), bonificaciones: String(e.bonificaciones ?? ""),
        comisiones: String(e.comisiones ?? ""), salud: String(e.salud ?? ""), pension: String(e.pension ?? ""),
        fondo_solidaridad: String(e.fondo_solidaridad ?? ""), retencion_fuente: String(e.retencion_fuente ?? ""),
      }));
      setEmps((prev) => [...prev, ...nuevos]);
      if (data.avisos?.length) setError(data.avisos.join(" · "));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al importar"); }
  }

  function buildPayload() {
    return {
      tipo, periodo_pago_inicio: ini, periodo_pago_fin: fin, fecha_generacion: fechaGen, notas: notas || null,
      empleados: emps.map((e) => ({
        tipo_documento: e.tipo_documento, numero_documento: e.numero_documento,
        primer_nombre: e.primer_nombre, otros_nombres: e.otros_nombres || null,
        primer_apellido: e.primer_apellido, segundo_apellido: e.segundo_apellido || null, cargo: e.cargo || null,
        salario_basico: e.salario_basico || "0", dias_trabajados: e.dias_trabajados || "0",
        sueldo: e.sueldo || "0", auxilio_transporte: e.auxilio_transporte || "0", horas_extra: e.horas_extra || "0",
        bonificaciones: e.bonificaciones || "0", comisiones: e.comisiones || "0",
        salud: e.salud || "0", pension: e.pension || "0", fondo_solidaridad: e.fondo_solidaridad || "0",
        retencion_fuente: e.retencion_fuente || "0",
      })),
    };
  }

  function validar(): string | null {
    if (fin < ini) return "La fecha fin del período no puede ser anterior a la de inicio";
    if (emps.length === 0) return "Agrega al menos un empleado (o impórtalos desde Excel)";
    const malo = emps.find((e) => !e.numero_documento.trim() || !e.primer_nombre.trim() || !e.primer_apellido.trim());
    if (malo) return "Cada empleado requiere documento, primer nombre y primer apellido";
    return null;
  }

  async function guardar(generar: boolean) {
    const err = validar();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    try {
      let id: string;
      if (periodo) {
        await apiFetch(`/nomina/${periodo.id}`, { method: "PUT", body: JSON.stringify(buildPayload()) });
        id = periodo.id;
      } else {
        const nuevo = await apiFetch<Periodo>(`/nomina`, { method: "POST", body: JSON.stringify(buildPayload()) });
        id = nuevo.id;
      }
      if (generar) await apiFetch(`/nomina/${id}/generar`, { method: "POST" });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function accion(path: string, body?: unknown) {
    setSaving(true); setError("");
    try {
      await apiFetch(`/nomina/${periodo!.id}/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ resize: "both", width: "min(1200px, 97vw)", height: "min(93vh, 46rem)", minWidth: "900px", minHeight: "42rem", maxWidth: "98vw", maxHeight: "96vh" }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[14px] font-bold text-gray-800">
              {soloLectura ? "Nómina electrónica" : periodo ? "Editar nómina" : "Nueva nómina electrónica"}
            </h2>
            {periodo && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] font-mono text-gray-500">{periodo.numero}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[periodo.estado]}`}>
                  {periodo.estado.charAt(0).toUpperCase() + periodo.estado.slice(1)}
                </span>
                {periodo.dian_estado && <span className="text-[10px] text-gray-400">DIAN: {periodo.dian_estado}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-4 overflow-hidden">
          <div className="grid grid-cols-5 gap-3 shrink-0">
            <div>
              <label className={lbl}>Tipo</label>
              <select value={tipo} disabled={soloLectura} onChange={(e) => setTipo(e.target.value)} className={inp}>
                <option value="NOMINA">Nómina individual</option>
                <option value="AJUSTE">Nota de ajuste</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Período desde *</label>
              <input type="date" value={ini} disabled={soloLectura} onChange={(e) => setIni(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Período hasta *</label>
              <input type="date" value={fin} disabled={soloLectura} onChange={(e) => setFin(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Fecha generación *</label>
              <input type="date" value={fechaGen} disabled={soloLectura} onChange={(e) => setFechaGen(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Notas</label>
              <input value={notas} disabled={soloLectura} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional…" className={inp} />
            </div>
          </div>

          {/* Toolbar empleados */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Empleados ({emps.length})</span>
            {!soloLectura && (
              <div className="flex items-center gap-3">
                <button type="button" onClick={descargarPlantilla} className="text-[11px] text-gray-500 hover:text-gray-700 font-medium">Descargar plantilla</button>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold">Importar Excel</button>
                <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importarExcel(f); e.target.value = ""; }} />
                <button type="button" onClick={() => setEmps((p) => [...p, empVacio()])} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">+ Agregar empleado</button>
              </div>
            )}
          </div>

          {/* Tabla empleados */}
          <div className="flex-1 min-h-0 border border-gray-200 rounded-xl overflow-auto">
            <table className="text-[11px]" style={{ minWidth: 1500 }}>
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-gray-500 font-semibold text-[9px] uppercase tracking-wide border-b border-gray-100">
                  <th className="px-2 py-2 text-left" style={{ minWidth: 70 }}>Tipo doc</th>
                  <th className="px-2 py-2 text-left" style={{ minWidth: 110 }}>N° documento</th>
                  <th className="px-2 py-2 text-left" style={{ minWidth: 150 }}>Nombres</th>
                  <th className="px-2 py-2 text-left" style={{ minWidth: 150 }}>Apellidos</th>
                  <th className="px-2 py-2 text-left" style={{ minWidth: 110 }}>Cargo</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 90 }}>Sueldo</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>Aux. transp.</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>H. extra</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>Bonif.</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>Comis.</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>Salud</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>Pensión</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>F. solid.</th>
                  <th className="px-2 py-2 text-right" style={{ minWidth: 80 }}>Ret. fuente</th>
                  <th className="px-2 py-2 text-right bg-gray-100" style={{ minWidth: 90 }}>Neto</th>
                  {!soloLectura && <th className="px-2 py-2 w-8"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {emps.length === 0 ? (
                  <tr><td colSpan={soloLectura ? 15 : 16} className="px-2 py-6 text-center text-gray-400">Sin empleados. Agrega o importa desde Excel.</td></tr>
                ) : emps.map((e, idx) => {
                  const neto = devEmp(e) - dedEmp(e);
                  const NumCell = (campo: keyof Empleado) => soloLectura
                    ? <span className="block text-right font-mono text-gray-600">{fmt(e[campo])}</span>
                    : <input value={e[campo]} onChange={(ev) => setEmp(idx, { [campo]: ev.target.value } as Partial<Empleado>)} className={cel} inputMode="decimal" />;
                  const TxtCell = (campo: keyof Empleado, ph = "") => soloLectura
                    ? <span className="text-gray-700">{e[campo] || "—"}</span>
                    : <input value={e[campo]} onChange={(ev) => setEmp(idx, { [campo]: ev.target.value } as Partial<Empleado>)} placeholder={ph} className={celTxt} />;
                  return (
                    <tr key={idx} className="align-middle">
                      <td className="px-2 py-1.5">
                        {soloLectura ? <span>{e.tipo_documento}</span> : (
                          <select value={e.tipo_documento} onChange={(ev) => setEmp(idx, { tipo_documento: ev.target.value })} className={celTxt}>
                            {TIPO_DOCS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-1.5">{TxtCell("numero_documento", "N° doc")}</td>
                      <td className="px-2 py-1.5">
                        {soloLectura ? <span className="text-gray-700">{e.primer_nombre} {e.otros_nombres}</span> : (
                          <div className="flex gap-1">
                            <input value={e.primer_nombre} onChange={(ev) => setEmp(idx, { primer_nombre: ev.target.value })} placeholder="Primer" className={celTxt} />
                            <input value={e.otros_nombres} onChange={(ev) => setEmp(idx, { otros_nombres: ev.target.value })} placeholder="Otros" className={celTxt} />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {soloLectura ? <span className="text-gray-700">{e.primer_apellido} {e.segundo_apellido}</span> : (
                          <div className="flex gap-1">
                            <input value={e.primer_apellido} onChange={(ev) => setEmp(idx, { primer_apellido: ev.target.value })} placeholder="Primer" className={celTxt} />
                            <input value={e.segundo_apellido} onChange={(ev) => setEmp(idx, { segundo_apellido: ev.target.value })} placeholder="Segundo" className={celTxt} />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">{TxtCell("cargo", "Cargo")}</td>
                      <td className="px-2 py-1.5">{NumCell("sueldo")}</td>
                      <td className="px-2 py-1.5">{NumCell("auxilio_transporte")}</td>
                      <td className="px-2 py-1.5">{NumCell("horas_extra")}</td>
                      <td className="px-2 py-1.5">{NumCell("bonificaciones")}</td>
                      <td className="px-2 py-1.5">{NumCell("comisiones")}</td>
                      <td className="px-2 py-1.5">{NumCell("salud")}</td>
                      <td className="px-2 py-1.5">{NumCell("pension")}</td>
                      <td className="px-2 py-1.5">{NumCell("fondo_solidaridad")}</td>
                      <td className="px-2 py-1.5">{NumCell("retencion_fuente")}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900 bg-gray-50">{fmt(neto)}</td>
                      {!soloLectura && (
                        <td className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => setEmps((p) => p.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500">✕</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end shrink-0">
            <div className="w-72 space-y-1 text-[12px]">
              <div className="flex justify-between text-gray-600"><span>Total devengado</span><span className="font-mono">{fmt(totDev)}</span></div>
              <div className="flex justify-between text-orange-600"><span>Total deducciones</span><span className="font-mono">({fmt(totDed)})</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-[13px] border-t border-gray-200 pt-1.5 mt-1"><span>Neto a pagar</span><span className="font-mono">{fmt(totNeto)}</span></div>
            </div>
          </div>

          {/* Bitácora (solo lectura) */}
          {periodo && periodo.eventos.length > 0 && (
            <div className="shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Bitácora</span>
              <div className="mt-1 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-24 overflow-y-auto">
                {periodo.eventos.map((ev) => (
                  <div key={ev.id} className="px-3 py-1.5 text-[11px] flex items-center gap-2">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{ev.tipo}</span>
                    <span className="text-gray-600 flex-1">{ev.mensaje}</span>
                    <span className="text-gray-500 font-mono text-[10px]">{ev.creado_en.slice(0, 16).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {periodo?.dian_mensaje && (
            <p className="text-[11px] text-gray-500 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">ℹ {periodo.dian_mensaje}</p>
          )}

          {showAnular && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50/40">
              <label className={lbl}>Motivo de anulación *</label>
              <input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="Describe el motivo…" className={inp} />
            </div>
          )}

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex gap-2">
            {periodo && periodo.estado !== "anulado" && !showAnular && (
              <button onClick={() => setShowAnular(true)} className="px-3 py-1.5 text-[12px] font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Anular</button>
            )}
            {showAnular && (
              <button onClick={() => { if (!motivoAnular.trim()) { setError("Ingresa el motivo"); return; } accion("anular", { motivo: motivoAnular }); }} disabled={saving}
                className="px-3 py-1.5 text-[12px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? "Anulando…" : "Confirmar anulación"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-white">
              {soloLectura ? "Cerrar" : "Cancelar"}
            </button>
            {!soloLectura && (
              <>
                <button onClick={() => guardar(false)} disabled={saving} className="px-3 py-1.5 text-[12px] font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-white disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar borrador"}
                </button>
                <button onClick={() => guardar(true)} disabled={saving} className="px-3 py-1.5 text-[12px] font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {saving ? "Procesando…" : "Guardar y generar XML"}
                </button>
              </>
            )}
            {periodo?.estado === "generado" && (
              <button onClick={() => accion("enviar")} disabled={saving} className="px-3 py-1.5 text-[12px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Enviando…" : "Transmitir a DIAN"}
              </button>
            )}
            {periodo?.estado === "rechazado" && (
              <button onClick={() => accion("enviar")} disabled={saving} className="px-3 py-1.5 text-[12px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Reintentando…" : "Reintentar transmisión"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function NominaPage() {
  const title = usePageTitle();
  const [lista, setLista] = useState<ListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  const [loading, setLoading] = useState(false);
  const [fEstado, setFEstado] = useState("");
  const [modo, setModo] = useState<"cerrado" | "crear" | "ver">("cerrado");
  const [activa, setActiva] = useState<Periodo | null>(null);
  const { orden, alternar } = useOrden<"numero" | "periodo" | "empleados" | "devengado" | "neto" | "estado">("periodo", "desc");

  const cargar = useCallback(async (pag = pagina) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ pagina: String(pag), por_pagina: String(porPagina) });
      if (fEstado) p.set("estado", fEstado);
      const data = await apiFetch<ListResponse>(`/nomina?${p}`);
      setLista(data.items); setTotalItems(data.total);
    } finally { setLoading(false); }
  }, [pagina, fEstado]);

  useEffect(() => { cargar(pagina); }, [pagina, fEstado]);

  async function abrir(item: ListItem) {
    const d = await apiFetch<Periodo>(`/nomina/${item.id}`);
    setActiva(d); setModo("ver");
  }
  function cerrar() { setModo("cerrado"); setActiva(null); }

  const ordenada = ordenarFilas(lista, orden, {
    numero:    (d) => d.numero,
    periodo:   (d) => `${d.periodo_pago_fin} ${d.creado_en}`,
    empleados: (d) => d.empleados_count,
    devengado: (d) => Number(d.total_devengado),
    neto:      (d) => Number(d.total_neto),
    estado:    (d) => d.estado,
  });
  const totalPags = Math.max(1, Math.ceil(totalItems / porPagina));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Transmisión de nómina a la DIAN — _eLedger no liquida, solo reporta</p>
        </div>
        <button onClick={() => { setActiva(null); setModo("crear"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva nómina
        </button>
      </div>

      <div className="flex items-end gap-3 mb-4 shrink-0">
        <div>
          <label className={lbl}>Estado</label>
          <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(1); }}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="generado">Generado</option>
            <option value="enviado">Enviado</option>
            <option value="aceptado">Aceptado</option>
            <option value="rechazado">Rechazado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[820px] text-[12px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                <Th campo="numero"    orden={orden} alternar={alternar} className="whitespace-nowrap">Número</Th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400">Tipo</th>
                <Th campo="periodo"   orden={orden} alternar={alternar} className="whitespace-nowrap">Período de pago</Th>
                <Th campo="empleados" orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Empl.</Th>
                <Th campo="devengado" orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Devengado</Th>
                <Th campo="neto"      orden={orden} alternar={alternar} align="right" className="whitespace-nowrap">Neto</Th>
                <Th campo="estado"    orden={orden} alternar={alternar} className="whitespace-nowrap">Estado</Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin nóminas registradas</td></tr>
              ) : ordenada.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5">
                    <button onClick={() => abrir(d)} className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline">{d.numero}</button>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{d.tipo === "AJUSTE" ? "Ajuste" : "Nómina"}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{d.periodo_pago_inicio} → {d.periodo_pago_fin}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600">{d.empleados_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600">{fmt(d.total_devengado)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{fmt(d.total_neto)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[d.estado]}`}>
                      {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => abrir(d)} title="Ver"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {totalItems === 0 ? "0" : `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, totalItems)}`} de {totalItems}
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

      {modo !== "cerrado" && (
        <Modal periodo={activa} onClose={cerrar} onSaved={() => { cerrar(); cargar(1); setPagina(1); }} />
      )}
    </div>
  );
}
