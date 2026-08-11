"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/* Marítimo de una operación: MBL, contenedores y HBL.
   Va en componente aparte porque la página de la operación ya es grande y esto
   es un bloque independiente con sus propios modales. */

// ── Tipos ───────────────────────────────────────────────────────────────────

interface Catalogo { id: string; codigo_iata: string; nombre: string; modalidad: string; }

interface Mbl {
  id: string; numero_bl: string; booking_no: string | null;
  naviera_id: string | null; naviera_nombre: string | null;
  buque: string | null; viaje: string | null;
  puerto_embarque_id: string | null; puerto_descarga_id: string | null;
  puerto_embarque: string | null; puerto_descarga: string | null;
  place_of_receipt: string | null; place_of_delivery: string | null;
  termino: string | null; tipo_carga: string; tipo_pago_flete: string;
  freight_to_be_paid_at: string | null; num_originales: number | null;
  fecha_emision: string | null; lugar_emision: string | null;
  shipped_on_board: string | null; etd: string | null; eta: string | null;
  fecha_arribo: string | null; free_days: number | null;
  peso_bruto_kg: string | null; tara_kg: string | null; cbm: string | null;
  bultos_cantidad: number | null; bultos_clase: string | null;
  descripcion_mercancia: string | null; agente_destino: string | null;
  export_references: string | null; referencia_cliente: string | null;
  notas: string | null;
  total_hbls: number; total_contenedores: number;
}

interface Contenedor {
  id: string; numero: string; sello: string | null; tipo: string | null;
  mbl_id: string | null; mbl_numero: string | null;
  tara_kg: string | null; peso_bruto_kg: string | null; cbm: string | null;
  fecha_devolucion: string | null; notas: string | null;
  hbls_numeros: string[];
}

interface HblCont { contenedor_id: string; numero: string; sello: string | null; tipo: string | null; piezas: number | null; peso_kg: string | null; cbm: string | null; }
interface Cargo { orden: number; concepto: string; tarifa: string | null; unidad: string | null; moneda: string; valor: string | null; pago: string; }

interface Hbl {
  id: string; numero_hbl: string; booking_no: string | null;
  mbl_id: string | null; mbl_numero: string | null;
  cotizacion_id: string | null; cotizacion_numero: string | null; cliente_nombre: string | null;
  origen: string; estado: string;
  emisor_id: string | null; emisor_texto: string | null; emisor_nombre: string | null;
  do_numero: string | null; referencia_cliente: string | null; export_references: string | null;
  shipper_texto: string | null; consignee_texto: string | null; notify_texto: string | null;
  consignee_a_la_orden: boolean; agente_entrega: string | null;
  buque: string | null; viaje: string | null;
  puerto_embarque_id: string | null; puerto_descarga_id: string | null;
  place_of_receipt: string | null; place_of_delivery: string | null;
  termino: string | null; tipo_carga: string; tipo_pago_flete: string;
  num_originales: number | null; declared_value: string | null;
  fecha_emision: string | null; lugar_emision: string | null;
  shipped_on_board: string | null; etd: string | null; eta: string | null; fecha_arribo: string | null;
  say_total: string | null; marcas: string | null; descripcion_mercancia: string | null;
  bultos_cantidad: number | null; bultos_clase: string | null;
  peso_bruto_kg: string | null; cbm: string | null; notas: string | null;
  emitido_por_nombre: string | null; anulado_por_nombre: string | null; anulado_motivo: string | null;
  contenedores: HblCont[]; cargos: Cargo[];
}

interface Carpeta { operacion_id: string; mbls: Mbl[]; hbls: Hbl[]; contenedores: Contenedor[]; }
interface Cotizacion { id: string; numero: string; }

// ── Estilos compartidos ─────────────────────────────────────────────────────

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const td = "px-3 py-2 text-[12px] text-gray-700";
const th = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400";

const ESTADO_HBL: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-600 border-gray-200",
  EMITIDA: "bg-green-50 text-green-700 border-green-200",
  ANULADA: "bg-red-50 text-red-600 border-red-200",
};

function fmt(v: string | number | null | undefined, dec = 2) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : n.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">{titulo}</p>
      {children}
    </div>
  );
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function MaritimoTab({ operacionId, bloqueada, cotizaciones }: {
  operacionId: string; bloqueada: boolean; cotizaciones: Cotizacion[];
}) {
  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [navieras, setNavieras] = useState<Catalogo[]>([]);
  const [puertos, setPuertos] = useState<Catalogo[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const [mblModal, setMblModal] = useState<Partial<Mbl> | null>(null);
  const [contModal, setContModal] = useState<Partial<Contenedor> | null>(null);
  const [hblModal, setHblModal] = useState<(Partial<Hbl> & { _conts?: HblCont[] }) | null>(null);
  const [anularId, setAnularId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    try {
      setCarpeta(await apiFetch<Carpeta>(`/operaciones/operaciones/${operacionId}/maritimo`));
    } catch { /* sesión */ }
  }, [operacionId]);

  useEffect(() => {
    cargar();
    // Los catálogos son multimodales: se filtra por MARITIMA en el cliente.
    apiFetch<Catalogo[]>("/operaciones/aerolineas?solo_activas=true")
      .then((d) => setNavieras(d.filter((x) => x.modalidad === "MARITIMA"))).catch(() => {});
    apiFetch<Catalogo[]>("/operaciones/aeropuertos?solo_activos=true")
      .then((d) => setPuertos(d.filter((x) => x.modalidad === "MARITIMA"))).catch(() => {});
  }, [cargar]);

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(""), 4000);
    return () => clearTimeout(t);
  }, [ok]);

  async function llamar(fn: () => Promise<unknown>, mensaje: string) {
    setSaving(true); setError("");
    try {
      await fn();
      await cargar();
      setOk(mensaje);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la operación");
      return false;
    } finally { setSaving(false); }
  }

  const puertoOpts = (
    <>
      <option value="">— Puerto —</option>
      {puertos.map((p) => <option key={p.id} value={p.id}>{p.codigo_iata} · {p.nombre}</option>)}
    </>
  );

  if (!carpeta) return <p className="text-[12px] text-gray-400 py-8 text-center">Cargando…</p>;

  const sinPuertos = puertos.length === 0;

  return (
    <div className="space-y-5">
      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{error}</div>}
      {ok && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          {ok}
        </div>
      )}
      {sinPuertos && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
          No hay puertos cargados. Agrégalos en <strong>Operaciones → Aeropuertos</strong> con modalidad <strong>MARÍTIMA</strong>.
        </div>
      )}

      {/* ── MBL ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
            MBL — Bill of Lading maestro ({carpeta.mbls.length})
          </span>
          {!bloqueada && (
            <button onClick={() => setMblModal({ tipo_carga: "FCL", tipo_pago_flete: "PREPAID" })}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">+ Agregar MBL</button>
          )}
        </div>
        {carpeta.mbls.length === 0 ? (
          <p className="px-4 py-5 text-[12px] text-gray-400 text-center">Sin MBL registrado.</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {["N.º BL", "Naviera", "Buque / Viaje", "Ruta", "ETD / ETA", "Carga", "HBL", "Cont."].map((h) => <th key={h} className={th}>{h}</th>)}
              <th className={th} />
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {carpeta.mbls.map((m) => (
                <tr key={m.id} className="hover:bg-blue-50/20">
                  <td className={`${td} font-mono font-semibold text-blue-700`}>
                    {m.numero_bl}
                    {m.booking_no && m.booking_no !== m.numero_bl && (
                      <span className="block text-[10px] text-gray-400 font-sans">bkg {m.booking_no}</span>
                    )}
                  </td>
                  <td className={td}>{m.naviera_nombre ?? "—"}</td>
                  <td className={td}>{m.buque ?? "—"}{m.viaje ? ` · ${m.viaje}` : ""}</td>
                  <td className={`${td} text-[11px] text-gray-500`}>
                    {m.puerto_embarque ?? m.place_of_receipt ?? "—"} → {m.puerto_descarga ?? m.place_of_delivery ?? "—"}
                  </td>
                  <td className={`${td} text-[11px]`}>{m.etd ?? "—"} / {m.eta ?? "—"}</td>
                  <td className={td}>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{m.tipo_carga}</span>
                    {m.free_days != null && <span className="ml-1.5 text-[10px] text-gray-400">{m.free_days} días libres</span>}
                  </td>
                  <td className={`${td} text-center`}>{m.total_hbls}</td>
                  <td className={`${td} text-center`}>{m.total_contenedores}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    {!bloqueada && <>
                      <button onClick={() => setMblModal(m)} className="text-[11px] text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => llamar(() => apiFetch(`/operaciones/operaciones/${operacionId}/mbl/${m.id}`, { method: "DELETE" }), "MBL eliminado")}
                        className="ml-2 text-[11px] text-red-500 hover:underline">Borrar</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Contenedores ────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
            Contenedores ({carpeta.contenedores.length})
          </span>
          {!bloqueada && (
            <button onClick={() => setContModal({})} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">+ Agregar contenedor</button>
          )}
        </div>
        {carpeta.contenedores.length === 0 ? (
          <p className="px-4 py-5 text-[12px] text-gray-400 text-center">Sin contenedores.</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {["Número", "Sello", "Tipo", "MBL", "Peso bruto", "Tara", "CBM", "Devolución", "En HBL"].map((h) => <th key={h} className={th}>{h}</th>)}
              <th className={th} />
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {carpeta.contenedores.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/20">
                  <td className={`${td} font-mono font-semibold`}>{c.numero}</td>
                  <td className={`${td} font-mono text-[11px] text-gray-500`}>{c.sello ?? "—"}</td>
                  <td className={td}>{c.tipo ?? "—"}</td>
                  <td className={`${td} font-mono text-[11px] text-gray-500`}>{c.mbl_numero ?? "—"}</td>
                  <td className={`${td} text-right font-mono`}>{fmt(c.peso_bruto_kg)}</td>
                  <td className={`${td} text-right font-mono text-gray-400`}>{fmt(c.tara_kg)}</td>
                  <td className={`${td} text-right font-mono`}>{fmt(c.cbm)}</td>
                  <td className={`${td} text-[11px]`}>{c.fecha_devolucion ?? "—"}</td>
                  <td className={`${td} text-[11px] text-gray-500`}>{c.hbls_numeros.join(", ") || "—"}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    {!bloqueada && <>
                      <button onClick={() => setContModal(c)} className="text-[11px] text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => llamar(() => apiFetch(`/operaciones/operaciones/${operacionId}/contenedores/${c.id}`, { method: "DELETE" }), "Contenedor eliminado")}
                        className="ml-2 text-[11px] text-red-500 hover:underline">Borrar</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── HBL ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
            HBL — Bill of Lading hijo ({carpeta.hbls.length})
          </span>
          {!bloqueada && (
            <button onClick={() => setHblModal({ origen: "RECIBIDO", tipo_carga: "FCL", tipo_pago_flete: "PREPAID", _conts: [] })}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">+ Agregar HBL</button>
          )}
        </div>
        {carpeta.hbls.length === 0 ? (
          <p className="px-4 py-5 text-[12px] text-gray-400 text-center">Sin HBL registrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {carpeta.hbls.map((h) => (
              <div key={h.id} className="px-4 py-3 hover:bg-blue-50/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-[13px] text-blue-700">{h.numero_hbl}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${ESTADO_HBL[h.estado]}`}>{h.estado}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${h.origen === "EMITIDO" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {h.origen}
                      </span>
                      {h.consignee_a_la_orden && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">A la orden</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {h.mbl_numero && <>bajo {h.mbl_numero} · </>}
                      {h.cliente_nombre ?? h.consignee_texto ?? "—"}
                      {h.do_numero && <> · DO {h.do_numero}</>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {h.contenedores.length > 0
                        ? h.contenedores.map((c) => `${c.numero}${c.tipo ? ` (${c.tipo})` : ""}`).join(" · ")
                        : "Sin contenedores asignados"}
                    </p>
                    {h.origen === "RECIBIDO" && (h.emisor_nombre || h.emisor_texto) && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Emitido por {h.emisor_nombre ?? h.emisor_texto}</p>
                    )}
                    {h.estado === "ANULADA" && h.anulado_motivo && (
                      <p className="text-[10px] text-red-500 mt-0.5">Anulado: {h.anulado_motivo}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-gray-500">{h.bultos_cantidad ?? "—"} {h.bultos_clase ?? "bultos"}</p>
                    <p className="text-[11px] font-mono text-gray-700">{fmt(h.peso_bruto_kg)} kg · {fmt(h.cbm)} CBM</p>
                    {!bloqueada && (
                      <div className="mt-1.5 flex gap-2 justify-end">
                        {h.estado !== "ANULADA" && (
                          <button onClick={() => setHblModal({ ...h, _conts: h.contenedores })}
                            className="text-[11px] text-blue-600 hover:underline">
                            {h.estado === "EMITIDA" && h.origen === "EMITIDO" ? "Ver" : "Editar"}
                          </button>
                        )}
                        {h.estado === "BORRADOR" && (
                          <button onClick={() => llamar(() => apiFetch(`/operaciones/operaciones/${operacionId}/hbl/${h.id}/emitir`, { method: "POST" }), `HBL ${h.numero_hbl} emitido`)}
                            className="text-[11px] text-green-700 hover:underline font-semibold">Emitir</button>
                        )}
                        {h.estado !== "ANULADA" && (
                          <button onClick={() => { setAnularId(h.id); setMotivo(""); }}
                            className="text-[11px] text-red-500 hover:underline">Anular</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Modal MBL ───────────────────────────────────────────────────── */}
      {mblModal && (
        <Modal titulo={mblModal.id ? `MBL ${mblModal.numero_bl}` : "Nuevo MBL"} onCerrar={() => setMblModal(null)}
          onGuardar={async () => {
            const body = { ...mblModal };
            delete (body as Record<string, unknown>).id;
            const okey = await llamar(() => apiFetch(
              mblModal.id ? `/operaciones/operaciones/${operacionId}/mbl/${mblModal.id}` : `/operaciones/operaciones/${operacionId}/mbl`,
              { method: mblModal.id ? "PUT" : "POST", body: JSON.stringify(body) },
            ), mblModal.id ? "MBL actualizado" : "MBL creado");
            if (okey) setMblModal(null);
          }} saving={saving}>
          <Bloque titulo="Documento">
            <div className="grid grid-cols-3 gap-2">
              <Campo label="N.º de BL *" v={mblModal.numero_bl} set={(v) => setMblModal({ ...mblModal, numero_bl: v })} />
              <Campo label="Booking" casilla="Booking no." v={mblModal.booking_no} set={(v) => setMblModal({ ...mblModal, booking_no: v })} />
              <div>
                <label className={lbl}>Naviera</label>
                <select className={inp} value={mblModal.naviera_id ?? ""} onChange={(e) => setMblModal({ ...mblModal, naviera_id: e.target.value || null })}>
                  <option value="">— Naviera —</option>
                  {navieras.map((n) => <option key={n.id} value={n.id}>{n.codigo_iata} · {n.nombre}</option>)}
                </select>
              </div>
              <Campo label="Referencias de exportación" casilla="Export references" v={mblModal.export_references} set={(v) => setMblModal({ ...mblModal, export_references: v })} />
              <Campo label="Referencia del cliente" v={mblModal.referencia_cliente} set={(v) => setMblModal({ ...mblModal, referencia_cliente: v })} />
              <Campo label="N.º de originales" tipo="number" casilla="Number of original B(s)/L" v={mblModal.num_originales} set={(v) => setMblModal({ ...mblModal, num_originales: v ? parseInt(v) : null })} />
            </div>
          </Bloque>
          <Bloque titulo="Ruta y buque">
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Buque" casilla="Vessel" v={mblModal.buque} set={(v) => setMblModal({ ...mblModal, buque: v })} />
              <Campo label="Viaje" casilla="Voyage no." v={mblModal.viaje} set={(v) => setMblModal({ ...mblModal, viaje: v })} />
              <Campo label="Lugar de recepción" casilla="Place of receipt" v={mblModal.place_of_receipt} set={(v) => setMblModal({ ...mblModal, place_of_receipt: v })} />
              <div>
                <label className={lbl}>Puerto de embarque</label>
                <select className={inp} value={mblModal.puerto_embarque_id ?? ""} onChange={(e) => setMblModal({ ...mblModal, puerto_embarque_id: e.target.value || null })}>{puertoOpts}</select>
                <span className="block text-[9px] text-gray-300 mt-0.5 italic">Port of loading</span>
              </div>
              <div>
                <label className={lbl}>Puerto de descarga</label>
                <select className={inp} value={mblModal.puerto_descarga_id ?? ""} onChange={(e) => setMblModal({ ...mblModal, puerto_descarga_id: e.target.value || null })}>{puertoOpts}</select>
                <span className="block text-[9px] text-gray-300 mt-0.5 italic">Port of discharge</span>
              </div>
              <Campo label="Lugar de entrega" casilla="Place of delivery" v={mblModal.place_of_delivery} set={(v) => setMblModal({ ...mblModal, place_of_delivery: v })} />
            </div>
          </Bloque>
          <Bloque titulo="Fechas y seguimiento">
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Fecha de emisión" tipo="date" casilla="Date of issue of B/L" v={mblModal.fecha_emision} set={(v) => setMblModal({ ...mblModal, fecha_emision: v || null })} />
              <Campo label="Lugar de emisión" casilla="Place of issue of B/L" v={mblModal.lugar_emision} set={(v) => setMblModal({ ...mblModal, lugar_emision: v })} />
              <Campo label="Embarcado a bordo" tipo="date" casilla="Shipped on board date" v={mblModal.shipped_on_board} set={(v) => setMblModal({ ...mblModal, shipped_on_board: v || null })} />
              <Campo label="ETD — zarpe estimado" tipo="date" v={mblModal.etd} set={(v) => setMblModal({ ...mblModal, etd: v || null })} />
              <Campo label="ETA — arribo estimado" tipo="date" v={mblModal.eta} set={(v) => setMblModal({ ...mblModal, eta: v || null })} />
              <Campo label="Arribo real" tipo="date" v={mblModal.fecha_arribo} set={(v) => setMblModal({ ...mblModal, fecha_arribo: v || null })} />
            </div>
          </Bloque>
          <Bloque titulo="Condiciones y carga">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className={lbl}>Tipo de carga</label>
                <select className={inp} value={mblModal.tipo_carga ?? "FCL"} onChange={(e) => setMblModal({ ...mblModal, tipo_carga: e.target.value })}>
                  <option value="FCL">FCL</option><option value="LCL">LCL</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Flete</label>
                <select className={inp} value={mblModal.tipo_pago_flete ?? "PREPAID"} onChange={(e) => setMblModal({ ...mblModal, tipo_pago_flete: e.target.value })}>
                  <option value="PREPAID">PREPAID</option><option value="COLLECT">COLLECT</option>
                </select>
              </div>
              <Campo label="Término" v={mblModal.termino} set={(v) => setMblModal({ ...mblModal, termino: v })} ph="CY-CY" />
              <Campo label="Días libres" tipo="number" casilla="Free days" v={mblModal.free_days} set={(v) => setMblModal({ ...mblModal, free_days: v ? parseInt(v) : null })} />
              <Campo label="Bultos" tipo="number" casilla="No. of packages" v={mblModal.bultos_cantidad} set={(v) => setMblModal({ ...mblModal, bultos_cantidad: v ? parseInt(v) : null })} />
              <Campo label="Clase de bulto" v={mblModal.bultos_clase} set={(v) => setMblModal({ ...mblModal, bultos_clase: v })} ph="ROLLS" />
              <Campo label="Peso bruto kg" casilla="Gross weight" v={mblModal.peso_bruto_kg} set={(v) => setMblModal({ ...mblModal, peso_bruto_kg: v })} />
              <Campo label="Volumen CBM" casilla="Measurement" v={mblModal.cbm} set={(v) => setMblModal({ ...mblModal, cbm: v })} />
            </div>
            <div className="mt-2">
              <label className={lbl}>Descripción de la mercancía</label>
              <textarea rows={2} className={inp} value={mblModal.descripcion_mercancia ?? ""} onChange={(e) => setMblModal({ ...mblModal, descripcion_mercancia: e.target.value })} />
            </div>
            <div className="mt-2">
              <label className={lbl}>Agente en destino</label>
              <textarea rows={2} className={inp} value={mblModal.agente_destino ?? ""} onChange={(e) => setMblModal({ ...mblModal, agente_destino: e.target.value })} />
            </div>
          </Bloque>
        </Modal>
      )}

      {/* ── Modal contenedor ────────────────────────────────────────────── */}
      {contModal && (
        <Modal titulo={contModal.id ? `Contenedor ${contModal.numero}` : "Nuevo contenedor"} onCerrar={() => setContModal(null)} ancho="max-w-2xl"
          onGuardar={async () => {
            const body = { ...contModal };
            delete (body as Record<string, unknown>).id;
            delete (body as Record<string, unknown>).hbls_numeros;
            delete (body as Record<string, unknown>).mbl_numero;
            const okey = await llamar(() => apiFetch(
              contModal.id ? `/operaciones/operaciones/${operacionId}/contenedores/${contModal.id}` : `/operaciones/operaciones/${operacionId}/contenedores`,
              { method: contModal.id ? "PUT" : "POST", body: JSON.stringify(body) },
            ), contModal.id ? "Contenedor actualizado" : "Contenedor creado");
            if (okey) setContModal(null);
          }} saving={saving}>
          <div className="grid grid-cols-3 gap-2">
            <Campo label="Número *" v={contModal.numero} set={(v) => setContModal({ ...contModal, numero: v.toUpperCase() })} ph="TRHU1350240" />
            <Campo label="Sello" v={contModal.sello} set={(v) => setContModal({ ...contModal, sello: v })} />
            <Campo label="Tipo" v={contModal.tipo} set={(v) => setContModal({ ...contModal, tipo: v })} ph="20ST / 40HC" />
            <div>
              <label className={lbl}>MBL</label>
              <select className={inp} value={contModal.mbl_id ?? ""} onChange={(e) => setContModal({ ...contModal, mbl_id: e.target.value || null })}>
                <option value="">— Sin MBL —</option>
                {carpeta.mbls.map((m) => <option key={m.id} value={m.id}>{m.numero_bl}</option>)}
              </select>
            </div>
            <Campo label="Peso bruto kg" v={contModal.peso_bruto_kg} set={(v) => setContModal({ ...contModal, peso_bruto_kg: v })} />
            <Campo label="Tara kg" v={contModal.tara_kg} set={(v) => setContModal({ ...contModal, tara_kg: v })} />
            <Campo label="CBM" v={contModal.cbm} set={(v) => setContModal({ ...contModal, cbm: v })} />
            <Campo label="Devolución vacío" tipo="date" v={contModal.fecha_devolucion} set={(v) => setContModal({ ...contModal, fecha_devolucion: v || null })} />
          </div>
        </Modal>
      )}

      {/* ── Modal HBL ───────────────────────────────────────────────────── */}
      {hblModal && (
        <Modal titulo={hblModal.id ? `HBL ${hblModal.numero_hbl}` : "Nuevo HBL"} onCerrar={() => setHblModal(null)}
          soloLectura={hblModal.estado === "EMITIDA" && hblModal.origen === "EMITIDO"}
          onGuardar={async () => {
            const body: Record<string, unknown> = { ...hblModal };
            delete body.id; delete body._conts; delete body.estado;
            delete body.mbl_numero; delete body.cotizacion_numero; delete body.cliente_nombre;
            delete body.emisor_nombre; delete body.emitido_por_nombre; delete body.anulado_por_nombre;
            delete body.puerto_embarque; delete body.puerto_descarga;
            delete body.shipper_nombre; delete body.consignee_nombre; delete body.anulado_motivo;
            body.contenedores = (hblModal._conts ?? []).map((c) => ({
              contenedor_id: c.contenedor_id, piezas: c.piezas, peso_kg: c.peso_kg, cbm: c.cbm,
            }));
            body.cargos = hblModal.cargos ?? [];
            const okey = await llamar(() => apiFetch(
              hblModal.id ? `/operaciones/operaciones/${operacionId}/hbl/${hblModal.id}` : `/operaciones/operaciones/${operacionId}/hbl`,
              { method: hblModal.id ? "PUT" : "POST", body: JSON.stringify(body) },
            ), hblModal.id ? "HBL actualizado" : "HBL creado");
            if (okey) setHblModal(null);
          }} saving={saving}>
          <Bloque titulo="Documento">
            <div className="grid grid-cols-3 gap-2">
              <Campo label="N.º de HBL *" v={hblModal.numero_hbl} set={(v) => setHblModal({ ...hblModal, numero_hbl: v })} />
              <div>
                <label className={lbl}>Origen</label>
                <select className={inp} value={hblModal.origen ?? "RECIBIDO"} onChange={(e) => setHblModal({ ...hblModal, origen: e.target.value })}>
                  <option value="RECIBIDO">RECIBIDO — lo emite el agente</option>
                  <option value="EMITIDO">EMITIDO — lo emitimos nosotros</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Bajo el MBL</label>
                <select className={inp} value={hblModal.mbl_id ?? ""} onChange={(e) => setHblModal({ ...hblModal, mbl_id: e.target.value || null })}>
                  <option value="">— Sin MBL —</option>
                  {carpeta.mbls.map((m) => <option key={m.id} value={m.id}>{m.numero_bl}</option>)}
                </select>
              </div>
              <Campo label="Booking" casilla="Booking no." v={hblModal.booking_no} set={(v) => setHblModal({ ...hblModal, booking_no: v })} />
              <Campo label="N.º de DO" casilla="Delivery order" v={hblModal.do_numero} set={(v) => setHblModal({ ...hblModal, do_numero: v })} />
              <div>
                <label className={lbl}>Cotización / cliente</label>
                <select className={inp} value={hblModal.cotizacion_id ?? ""} onChange={(e) => setHblModal({ ...hblModal, cotizacion_id: e.target.value || null })}>
                  <option value="">— Sin asociar —</option>
                  {cotizaciones.map((c) => <option key={c.id} value={c.id}>{c.numero}</option>)}
                </select>
              </div>
            </div>
            {hblModal.origen === "RECIBIDO" && (
              <div className="mt-2">
                <label className={lbl}>Emisor (agente en origen)</label>
                <input className={inp} value={hblModal.emisor_texto ?? ""} onChange={(e) => setHblModal({ ...hblModal, emisor_texto: e.target.value })} placeholder="KCS Supply Chain Management Co.,Ltd" />
              </div>
            )}
          </Bloque>
          <Bloque titulo="Partes">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={lbl}>Shipper — embarcador</label>
                <textarea rows={3} className={inp} value={hblModal.shipper_texto ?? ""} onChange={(e) => setHblModal({ ...hblModal, shipper_texto: e.target.value })} />
              </div>
              <div>
                <label className={lbl}>Consignee — consignatario</label>
                <textarea rows={3} className={inp} value={hblModal.consignee_texto ?? ""} onChange={(e) => setHblModal({ ...hblModal, consignee_texto: e.target.value })} />
                <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                  <input type="checkbox" checked={hblModal.consignee_a_la_orden ?? false} onChange={(e) => setHblModal({ ...hblModal, consignee_a_la_orden: e.target.checked })} />
                  <span className="text-[10px] text-gray-500">A la orden (negociable)</span>
                </label>
              </div>
              <div>
                <label className={lbl}>Notify — notificar a</label>
                <textarea rows={3} className={inp} value={hblModal.notify_texto ?? ""} onChange={(e) => setHblModal({ ...hblModal, notify_texto: e.target.value })} />
              </div>
            </div>
          </Bloque>
          <Bloque titulo="Ruta, fechas y carga">
            <div className="grid grid-cols-4 gap-2">
              <Campo label="Buque" casilla="Vessel" v={hblModal.buque} set={(v) => setHblModal({ ...hblModal, buque: v })} />
              <Campo label="Viaje" casilla="Voyage no." v={hblModal.viaje} set={(v) => setHblModal({ ...hblModal, viaje: v })} />
              <div>
                <label className={lbl}>Puerto de embarque</label>
                <select className={inp} value={hblModal.puerto_embarque_id ?? ""} onChange={(e) => setHblModal({ ...hblModal, puerto_embarque_id: e.target.value || null })}>{puertoOpts}</select>
                <span className="block text-[9px] text-gray-300 mt-0.5 italic">Port of loading</span>
              </div>
              <div>
                <label className={lbl}>Puerto de descarga</label>
                <select className={inp} value={hblModal.puerto_descarga_id ?? ""} onChange={(e) => setHblModal({ ...hblModal, puerto_descarga_id: e.target.value || null })}>{puertoOpts}</select>
                <span className="block text-[9px] text-gray-300 mt-0.5 italic">Port of discharge</span>
              </div>
              <Campo label="Fecha de emisión" tipo="date" casilla="Date of issue of B/L" v={hblModal.fecha_emision} set={(v) => setHblModal({ ...hblModal, fecha_emision: v || null })} />
              <Campo label="ETD — zarpe estimado" tipo="date" v={hblModal.etd} set={(v) => setHblModal({ ...hblModal, etd: v || null })} />
              <Campo label="ETA — arribo estimado" tipo="date" v={hblModal.eta} set={(v) => setHblModal({ ...hblModal, eta: v || null })} />
              <Campo label="Arribo real" tipo="date" v={hblModal.fecha_arribo} set={(v) => setHblModal({ ...hblModal, fecha_arribo: v || null })} />
              <Campo label="Bultos" tipo="number" casilla="No. of packages" v={hblModal.bultos_cantidad} set={(v) => setHblModal({ ...hblModal, bultos_cantidad: v ? parseInt(v) : null })} />
              <Campo label="Clase de bulto" v={hblModal.bultos_clase} set={(v) => setHblModal({ ...hblModal, bultos_clase: v })} />
              <Campo label="Peso bruto kg" casilla="Gross weight" v={hblModal.peso_bruto_kg} set={(v) => setHblModal({ ...hblModal, peso_bruto_kg: v })} />
              <Campo label="Volumen CBM" casilla="Measurement" v={hblModal.cbm} set={(v) => setHblModal({ ...hblModal, cbm: v })} />
            </div>
            <div className="mt-2">
              <label className={lbl}>Descripción de la mercancía</label>
              <textarea rows={2} className={inp} value={hblModal.descripcion_mercancia ?? ""} onChange={(e) => setHblModal({ ...hblModal, descripcion_mercancia: e.target.value })} />
            </div>
          </Bloque>
          <Bloque titulo="Contenedores">
            {carpeta.contenedores.length === 0 ? (
              <p className="text-[11px] text-amber-600">Registra primero los contenedores de la operación.</p>
            ) : (
              <div className="space-y-1.5">
                {carpeta.contenedores.map((c) => {
                  const sel = (hblModal._conts ?? []).find((x) => x.contenedor_id === c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={!!sel}
                        onChange={(e) => {
                          const actuales = hblModal._conts ?? [];
                          setHblModal({
                            ...hblModal,
                            _conts: e.target.checked
                              ? [...actuales, { contenedor_id: c.id, numero: c.numero, sello: c.sello, tipo: c.tipo, piezas: null, peso_kg: null, cbm: null }]
                              : actuales.filter((x) => x.contenedor_id !== c.id),
                          });
                        }} />
                      <span className="font-mono w-32">{c.numero}</span>
                      <span className="text-gray-400 w-16">{c.tipo ?? ""}</span>
                      {sel && (
                        <>
                          <input className="w-20 px-2 py-1 border border-gray-200 rounded text-[11px] text-right" placeholder="piezas"
                            value={sel.piezas ?? ""} onChange={(e) => setHblModal({ ...hblModal, _conts: (hblModal._conts ?? []).map((x) => x.contenedor_id === c.id ? { ...x, piezas: e.target.value ? parseInt(e.target.value) : null } : x) })} />
                          <input className="w-24 px-2 py-1 border border-gray-200 rounded text-[11px] text-right" placeholder="peso kg"
                            value={sel.peso_kg ?? ""} onChange={(e) => setHblModal({ ...hblModal, _conts: (hblModal._conts ?? []).map((x) => x.contenedor_id === c.id ? { ...x, peso_kg: e.target.value } : x) })} />
                          <input className="w-20 px-2 py-1 border border-gray-200 rounded text-[11px] text-right" placeholder="CBM"
                            value={sel.cbm ?? ""} onChange={(e) => setHblModal({ ...hblModal, _conts: (hblModal._conts ?? []).map((x) => x.contenedor_id === c.id ? { ...x, cbm: e.target.value } : x) })} />
                        </>
                      )}
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 pt-1">
                  En LCL cada HBL lleva su parte de piezas, peso y CBM del mismo contenedor.
                </p>
              </div>
            )}
          </Bloque>
        </Modal>
      )}

      {/* ── Modal anular ────────────────────────────────────────────────── */}
      {anularId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-[14px] font-semibold text-gray-800 mb-2">Anular HBL</h3>
            <p className="text-[12px] text-gray-500 mb-3">Queda el rastro: el documento no se borra.</p>
            <input className={inp} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo *" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAnularId(null)} className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button disabled={!motivo.trim() || saving}
                onClick={async () => {
                  const okey = await llamar(() => apiFetch(`/operaciones/operaciones/${operacionId}/hbl/${anularId}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) }), "HBL anulado");
                  if (okey) setAnularId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">Anular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Auxiliares ──────────────────────────────────────────────────────────────

/* Etiquetas en español. Se conserva en inglés solo la jerga que se usa así en
   el oficio (Shipper, Consignee, Notify, Booking, ETD/ETA, CBM, FCL/LCL).
   `casilla` muestra el nombre original del recuadro en el BL, para poder parear
   la pantalla con el documento en papel. */
function Campo({ label, v, set, tipo = "text", ph, casilla }: {
  label: string; v: string | number | null | undefined; set: (v: string) => void;
  tipo?: string; ph?: string; casilla?: string;
}) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <input type={tipo} className={inp} value={v ?? ""} placeholder={ph} onChange={(e) => set(e.target.value)} />
      {casilla && <span className="block text-[9px] text-gray-300 mt-0.5 italic">{casilla}</span>}
    </div>
  );
}

function Modal({ titulo, children, onCerrar, onGuardar, saving, ancho = "max-w-4xl", soloLectura }: {
  titulo: string; children: React.ReactNode; onCerrar: () => void;
  onGuardar: () => void; saving: boolean; ancho?: string; soloLectura?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-lg w-full ${ancho} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-[13px] font-semibold text-gray-800">{titulo}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-[18px] leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onCerrar} className="px-4 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            {soloLectura ? "Cerrar" : "Cancelar"}
          </button>
          {!soloLectura && (
            <button onClick={onGuardar} disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
