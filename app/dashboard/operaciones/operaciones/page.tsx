"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";
import { Th, useOrden, ordenarFilas } from "@/components/TablaOrden";

interface ClienteInfo { id: string; nombre: string; nit: string | null; }

interface Operacion {
  id: string; numero: string;
  fecha_apertura: string;
  estado: "ABIERTA" | "EN_CURSO" | "CERRADA" | "CANCELADA";
  piezas: number | null; peso_kg: number | null;
  clientes: ClienteInfo[];
}

interface CotizacionInfo {
  id: string; numero: string; cliente_nombre: string; operacion_id: string | null;
  origen: string; destino: string; tipo_operacion: string;
}

const ESTADO_STYLE: Record<string, string> = {
  ABIERTA:   "bg-blue-50 text-blue-700",
  EN_CURSO:  "bg-amber-50 text-amber-700",
  CERRADA:   "bg-gray-100 text-gray-500",
  CANCELADA: "bg-red-50 text-red-600",
};

const TIPO_STYLE: Record<string, string> = {
  IMPORTACION: "bg-violet-50 text-violet-700",
  EXPORTACION: "bg-indigo-50 text-indigo-700",
};

// Fecha local YYYY-MM-DD (evita el corrimiento de día por UTC de toISOString).
function fechaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Rango por defecto al entrar: un mes hacia atrás hasta hoy.
function rangoPorDefecto() {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setMonth(desde.getMonth() - 1);
  return { desde: fechaLocal(desde), hasta: fechaLocal(hasta) };
}

export default function OperacionesPage() {
  const title = usePageTitle();
  const router = useRouter();
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [cotsPorOp, setCotsPorOp] = useState<Record<string, CotizacionInfo[]>>({});
  const [estado, setEstado]       = useState("");
  const [busqueda, setBusqueda]   = useState("");
  const [fechaDesde, setFechaDesde] = useState(() => rangoPorDefecto().desde);
  const [fechaHasta, setFechaHasta] = useState(() => rangoPorDefecto().hasta);
  const [loading, setLoading]     = useState(true);
  const [pagina, setPagina]       = useState(1);
  const porPagina                 = 20;
  const { orden, alternar } = useOrden<
    "numero" | "cliente" | "ruta" | "apertura" | "estado" | "piezas" | "peso"
  >("apertura", "desc", () => setPagina(1));

  // El query solo corre al montar y al pulsar Buscar/Enter (no al cambiar filtros).
  useEffect(() => { cargar(); }, []);

  function aplicarAtajo(atajo: string) {
    const hoy = new Date();
    const fmt = fechaLocal;
    if (atajo === "hoy") {
      setFechaDesde(fmt(hoy)); setFechaHasta(fmt(hoy));
    } else if (atajo === "semana") {
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
      setFechaDesde(fmt(lunes)); setFechaHasta(fmt(hoy));
    } else if (atajo === "mes") {
      setFechaDesde(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`);
      setFechaHasta(fmt(hoy));
    } else if (atajo === "anio") {
      setFechaDesde(`${hoy.getFullYear()}-01-01`); setFechaHasta(fmt(hoy));
    } else {
      setFechaDesde(""); setFechaHasta("");
    }
  }

  async function cargar() {
    setLoading(true);
    setPagina(1);
    try {
      const params = new URLSearchParams();
      if (estado)     params.set("estado", estado);
      if (busqueda)   params.set("busqueda", busqueda);
      if (fechaDesde) params.set("fecha_desde", fechaDesde);
      if (fechaHasta) params.set("fecha_hasta", fechaHasta);
      const [ops, cotsList] = await Promise.all([
        apiFetch<Operacion[]>(`/operaciones/operaciones?${params}`),
        apiFetch<CotizacionInfo[]>("/operaciones/cotizaciones"),
      ]);
      setOperaciones(ops);
      const mapa: Record<string, CotizacionInfo[]> = {};
      cotsList.forEach((c) => {
        if (!c.operacion_id) return;
        (mapa[c.operacion_id] ??= []).push(c);
      });
      setCotsPorOp(mapa);
    } catch {
      // apiFetch redirige a /login si la sesión expiró
    } finally { setLoading(false); }
  }

  // Cliente y ruta viven en la cotización, así que se ordena por el valor ya
  // cruzado — el mismo que se pinta en la fila.
  const ordenada = ordenarFilas(operaciones, orden, {
    numero:   (o) => o.numero,
    cliente:  (o) => o.clientes?.[0]?.nombre,
    ruta:     (o) => {
      const c = cotsPorOp[o.id]?.[0];
      return c ? `${c.origen} ${c.destino}` : null;
    },
    apertura: (o) => o.fecha_apertura,
    estado:   (o) => o.estado,
    piezas:   (o) => o.piezas,
    peso:     (o) => (o.peso_kg === null ? null : Number(o.peso_kg)),
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenada.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = ordenada.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Operaciones logísticas</p>
        </div>
      </div>

      {/* Filtros — una sola fila */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") cargar(); }}
            placeholder="Buscar por número de operación..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0">
          <option value="">Todos los estados</option>
          <option value="ABIERTA">Abierta</option>
          <option value="EN_CURSO">En curso</option>
          <option value="CERRADA">Cerrada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <div className="w-px h-5 bg-gray-200 shrink-0" />
        <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0" />
        <span className="text-[11px] text-gray-400 shrink-0">—</span>
        <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0" />
        <div className="flex gap-1 shrink-0">
          {[
            { k: "hoy",    l: "Hoy" },
            { k: "semana", l: "Sem." },
            { k: "mes",    l: "Mes" },
            { k: "anio",   l: "Año" },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => aplicarAtajo(k)}
              className="px-2 py-1 text-[10px] font-medium rounded border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
              {l}
            </button>
          ))}
          {(fechaDesde || fechaHasta || busqueda) && (
            <button onClick={() => { setBusqueda(""); aplicarAtajo("limpiar"); }} title="Limpiar filtros"
              className="px-2 py-1 text-[10px] font-medium rounded border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
              ✕
            </button>
          )}
        </div>
        <button onClick={() => cargar()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Buscar
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <Th campo="numero"   orden={orden} alternar={alternar}>Operación</Th>
                <Th campo="cliente"  orden={orden} alternar={alternar}>Cliente</Th>
                <Th campo="ruta"     orden={orden} alternar={alternar}>Ruta</Th>
                <Th campo="apertura" orden={orden} alternar={alternar}>Apertura</Th>
                <Th campo="estado"   orden={orden} alternar={alternar} align="center">Estado</Th>
                <Th campo="piezas"   orden={orden} alternar={alternar} align="right">Piezas</Th>
                <Th campo="peso"     orden={orden} alternar={alternar} align="right">Peso kg</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-gray-400">Cargando...</td></tr>
              ) : filas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="text-[12px] text-gray-400">No hay operaciones</p>
                    <p className="text-[11px] text-gray-300 mt-1">Las operaciones se crean al aprobar una cotización</p>
                  </td>
                </tr>
              ) : filas.map((op) => {
                const cotsOp = cotsPorOp[op.id] ?? [];
                const cot = cotsOp[0];
                return (
                  <tr key={op.id}
                    onClick={() => router.push(`/dashboard/operaciones/operaciones/${op.id}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-blue-700">{op.numero}</span>
                        {cot && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${TIPO_STYLE[cot.tipo_operacion] ?? "bg-gray-100 text-gray-500"}`}>
                            {cot.tipo_operacion === "IMPORTACION" ? "IMP" : "EXP"}
                          </span>
                        )}
                      </div>
                      {cotsOp.length > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {cotsOp.length === 1 ? cotsOp[0].numero : `${cotsOp.length} cotizaciones`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">
                      {op.clientes && op.clientes.length > 0 ? (
                        op.clientes.length === 1 ? op.clientes[0].nombre : (
                          <span>{op.clientes[0].nombre} <span className="text-[10px] text-gray-400 font-normal">+{op.clientes.length - 1}</span></span>
                        )
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {cot ? (
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                          <span>{cot.origen}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 shrink-0">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                          <span>{cot.destino}</span>
                        </div>
                      ) : <span className="text-gray-300 text-[12px]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">{op.fecha_apertura}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_STYLE[op.estado] ?? "bg-gray-100 text-gray-500"}`}>
                        {op.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-gray-600">{op.piezas ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-[12px] text-gray-600">
                      {op.peso_kg != null ? Number(op.peso_kg).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {operaciones.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, operaciones.length)}`} de {operaciones.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(1)} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
            <span className="px-3 py-1 text-[11px] text-gray-700 font-medium">{paginaActual} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaActual === totalPaginas} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
