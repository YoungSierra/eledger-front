"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Cotizacion {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  fecha: string;
  fecha_vigencia: string;
  tipo_operacion: "IMPORTACION" | "EXPORTACION";
  origen: string;
  destino: string;
  estado: "BORRADOR" | "ENVIADA" | "APROBADA" | "RECHAZADA" | "VENCIDA";
}

const ESTADO_STYLE: Record<Cotizacion["estado"], string> = {
  BORRADOR:  "bg-gray-100 text-gray-600",
  ENVIADA:   "bg-blue-50 text-blue-700",
  APROBADA:  "bg-green-50 text-green-700",
  RECHAZADA: "bg-red-50 text-red-600",
  VENCIDA:   "bg-amber-50 text-amber-700",
};

const TIPO_STYLE: Record<string, string> = {
  IMPORTACION: "bg-violet-50 text-violet-700",
  EXPORTACION: "bg-indigo-50 text-indigo-700",
};

export default function CotizacionesPage() {
  const title = usePageTitle();
  const router = useRouter();
  const [lista, setLista]       = useState<Cotizacion[]>([]);
  const [estado, setEstado]     = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading]   = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 20;

  useEffect(() => { cargar(); }, [estado, busqueda, fechaDesde, fechaHasta]);

  function aplicarAtajo(atajo: string) {
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
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
      const data = await apiFetch<Cotizacion[]>(`/operaciones/cotizaciones?${params}`);
      setLista(data);
    } catch {
      // apiFetch redirige a /login si la sesión expiró
    } finally { setLoading(false); }
  }

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = lista.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Gestión de cotizaciones logísticas internacionales</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/operaciones/cotizaciones/nueva")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva cotización
        </button>
      </div>

      {/* Filtros — una sola fila */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número, cliente, origen o destino..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
          <option value="VENCIDA">Vencida</option>
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
          {(fechaDesde || fechaHasta) && (
            <button onClick={() => aplicarAtajo("limpiar")}
              className="px-2 py-1 text-[10px] font-medium rounded border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Número</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Cliente</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Ruta</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Fecha</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Vigencia</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-gray-400">Cargando...</td></tr>
            ) : filas.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-gray-400">Sin cotizaciones</td></tr>
            ) : filas.map((c) => (
              <tr key={c.id}
                onClick={() => router.push(`/dashboard/operaciones/cotizaciones/${c.id}`)}
                className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-blue-600">{c.numero}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${TIPO_STYLE[c.tipo_operacion]}`}>
                      {c.tipo_operacion === "IMPORTACION" ? "IMP" : "EXP"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-800 font-medium">{c.cliente_nombre}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                    <span>{c.origen}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 shrink-0">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span>{c.destino}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-500">{c.fecha}</td>
                <td className="px-4 py-3 text-[12px] text-gray-500">{c.fecha_vigencia}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_STYLE[c.estado]}`}>
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
          <span className="text-[11px] text-gray-400">
            {lista.length === 0 ? "0" : `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, lista.length)}`} de {lista.length}
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
