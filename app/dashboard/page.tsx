"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { MenuContext, usePageTitle } from "@/lib/menu-context";

interface Operacion {
  id: string; numero: string; cotizacion_id: string;
  fecha_apertura: string;
  estado: "ABIERTA" | "EN_CURSO" | "CERRADA" | "CANCELADA";
  piezas: number | null; peso_kg: string | null;
}

interface Cotizacion {
  id: string; numero: string; cliente_nombre: string;
  fecha: string; fecha_vigencia: string;
  origen: string; destino: string;
  tipo_operacion: "IMPORTACION" | "EXPORTACION";
  estado: "BORRADOR" | "ENVIADA" | "APROBADA" | "RECHAZADA" | "VENCIDA";
}

const ESTADO_OP: Record<string, string> = {
  ABIERTA:   "bg-blue-50 text-blue-700",
  EN_CURSO:  "bg-amber-50 text-amber-700",
  CERRADA:   "bg-gray-100 text-gray-500",
  CANCELADA: "bg-red-50 text-red-600",
};

const ESTADO_COT: Record<string, string> = {
  BORRADOR:  "bg-gray-100 text-gray-500",
  ENVIADA:   "bg-blue-50 text-blue-700",
  APROBADA:  "bg-green-50 text-green-700",
  RECHAZADA: "bg-red-50 text-red-600",
  VENCIDA:   "bg-amber-50 text-amber-600",
};

const ACCESOS = [
  {
    modulo: "operaciones", fragmento: "/operaciones/cotizaciones",
    href: "/dashboard/operaciones/cotizaciones/nueva",
    titulo: "Nueva cotización", sub: "Crear cotización de carga",
    marco: "border-blue-100 hover:border-blue-300 hover:bg-blue-50",
    chip: "bg-blue-100 group-hover:bg-blue-200", stroke: "#2563eb",
    icon: (<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  },
  {
    modulo: "facturacion", fragmento: "/facturacion/facturas",
    href: "/dashboard/facturacion/facturas",
    titulo: "Facturas de venta", sub: "Ver facturas emitidas",
    marco: "border-violet-100 hover:border-violet-300 hover:bg-violet-50",
    chip: "bg-violet-100 group-hover:bg-violet-200", stroke: "#7c3aed",
    icon: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
  },
  {
    modulo: "compras", fragmento: "/compras/ordenes",
    href: "/dashboard/compras/ordenes",
    titulo: "Órdenes de compra", sub: "Ver órdenes activas",
    marco: "border-green-100 hover:border-green-300 hover:bg-green-50",
    chip: "bg-green-100 group-hover:bg-green-200", stroke: "#059669",
    icon: (<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>),
  },
  {
    modulo: "inventario", fragmento: "/inventario/movimientos",
    href: "/dashboard/inventario/movimientos",
    titulo: "Movimientos", sub: "Inventario · movimientos",
    marco: "border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50",
    chip: "bg-cyan-100 group-hover:bg-cyan-200", stroke: "#0891b2",
    icon: (<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>),
  },
  {
    modulo: "contabilidad", fragmento: "/contabilidad/terceros",
    href: "/dashboard/contabilidad/terceros",
    titulo: "Terceros", sub: "Clientes y proveedores",
    marco: "border-rose-100 hover:border-rose-300 hover:bg-rose-50",
    chip: "bg-rose-100 group-hover:bg-rose-200", stroke: "#e11d48",
    icon: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  },
  {
    modulo: "cxc", fragmento: "/cxc/recibos",
    href: "/dashboard/cxc/recibos",
    titulo: "Recibos de caja", sub: "Registrar un recaudo",
    marco: "border-amber-100 hover:border-amber-300 hover:bg-amber-50",
    chip: "bg-amber-100 group-hover:bg-amber-200", stroke: "#d97706",
    icon: (<><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>),
  },
];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// La API entrega fechas como YYYY-MM-DD. Se parte el string en vez de usar
// new Date(iso), que las interpreta como UTC y en Colombia (UTC-5) muestra el
// día anterior.
function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MESES[m - 1]}`;
}

function fechaLocal(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

const PALETA = ["#2563eb", "#7c3aed", "#d97706", "#059669", "#dc2626"];

const COLOR_ESTADO_COT: Record<string, string> = {
  ENVIADA: "#2563eb", APROBADA: "#059669", RECHAZADA: "#dc2626",
  VENCIDA: "#d97706", BORRADOR: "#94a3b8",
};

const DIAS_ALERTA = 30;

interface FilaAntiguedad {
  id: string; numero: string; ruta: string; dias: number;
  estado: Operacion["estado"];
}

// Cuánto lleva abierta cada operación activa, la más vieja arriba. A este
// volumen esto sí responde una pregunta diaria ("¿cuál se está quedando
// quieta?"), al revés que una serie de tiempo, que con 1-4 operaciones por
// semana solo dibuja ruido.
function Antiguedad({ datos, big = false }: { datos: FilaAntiguedad[]; big?: boolean }) {
  const max = Math.max(1, ...datos.map((d) => d.dias));
  if (datos.length === 0) {
    return <p className="text-[11px] text-gray-400">No hay operaciones activas.</p>;
  }
  return (
    <div className={big ? "space-y-3" : "space-y-2"}>
      {datos.map((d) => {
        const alerta = d.dias > DIAS_ALERTA;
        return (
          <Link key={d.id} href={`/dashboard/operaciones/operaciones/${d.id}`}
            className="block group">
            <div className="flex justify-between items-center gap-2 mb-1">
              <span className={`text-gray-600 truncate ${big ? "text-[14px]" : "text-[10px]"}`}>
                <span className="font-bold text-gray-800 group-hover:text-blue-600">{d.numero}</span>
                {d.ruta && <span> · {d.ruta}</span>}
              </span>
              <span className={`font-bold shrink-0 ${big ? "text-[14px]" : "text-[10px]"} ${alerta ? "text-amber-600" : "text-gray-600"}`}>
                {d.dias}d
              </span>
            </div>
            <div className={`bg-gray-100 rounded-full overflow-hidden ${big ? "h-3" : "h-1.5"}`}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(d.dias / max) * 100}%`, background: alerta ? "#d97706" : "#2563eb" }}/>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function DonutChart({ datos, big = false }: { datos: { label: string; value: number; color: string }[]; big?: boolean }) {
  const total = datos.reduce((s, d) => s + d.value, 0);
  const R = 38, cx = 48, cy = 48;
  let angle = -90;
  const slices = datos.map((d) => {
    const pct = total ? d.value / total : 0;
    const start = angle; angle += pct * 360; const end = angle;
    const p = (a: number) => ({ x: cx + R * Math.cos((a * Math.PI) / 180), y: cy + R * Math.sin((a * Math.PI) / 180) });
    const lg = end - start > 180 ? 1 : 0;
    return { ...d, path: `M ${p(start).x} ${p(start).y} A ${R} ${R} 0 ${lg} 1 ${p(end).x} ${p(end).y} L ${cx} ${cy} Z` };
  });
  return (
    <div className={`flex items-center ${big ? "gap-10" : "gap-3"}`}>
      <svg viewBox="0 0 96 96" className="shrink-0" style={{ width: big ? 240 : 68, height: big ? 240 : 68 }}>
        {total === 0
          ? <circle cx={cx} cy={cy} r={R} fill="#f1f5f9"/>
          : slices.map((s) => <path key={s.label} d={s.path} fill={s.color} opacity="0.9"/>)}
        <circle cx={cx} cy={cy} r={22} fill="white"/>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#94a3b8">total</text>
      </svg>
      <div className={`min-w-0 flex-1 ${big ? "space-y-3" : "space-y-1.5"}`}>
        {datos.length === 0 && <p className="text-[10px] text-gray-400">Sin datos</p>}
        {datos.map((d) => (
          <div key={d.label} className={`flex items-center ${big ? "gap-3" : "gap-1.5"}`}>
            <div className={`rounded-full shrink-0 ${big ? "w-3 h-3" : "w-2 h-2"}`} style={{ background: d.color }}/>
            <span className={`text-gray-600 truncate flex-1 ${big ? "text-[15px]" : "text-[10px]"}`}>{d.label}</span>
            <span className={`font-bold text-gray-800 ${big ? "text-[18px]" : "text-[11px]"}`}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversionBars({ datos, aprobacion, big = false }: {
  datos: { label: string; value: number; color: string; pct: number }[];
  aprobacion: number | null; big?: boolean;
}) {
  return (
    <div className={big ? "space-y-4" : "space-y-2"}>
      {datos.map((c) => (
        <div key={c.label}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-gray-600 ${big ? "text-[15px]" : "text-[11px]"}`}>{c.label}</span>
            <span className={`font-bold text-gray-800 ${big ? "text-[16px]" : "text-[11px]"}`}>{c.value}</span>
          </div>
          <div className={`bg-gray-100 rounded-full overflow-hidden ${big ? "h-3" : "h-1.5"}`}>
            <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }}/>
          </div>
        </div>
      ))}
      <p className={`text-gray-500 pt-0.5 ${big ? "text-[13px]" : "text-[10px]"}`}>
        Aprobación: <span className="font-bold text-green-600">{aprobacion === null ? "—" : `${aprobacion}%`}</span>
      </p>
    </div>
  );
}

const ExpandIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

const ZOOM_TITULO: Record<string, string> = {
  antiguedad: "Antigüedad de operaciones activas",
  dona: "Destinos por operación",
  conversion: "Conversión de cotizaciones",
};

export default function DashboardPage() {
  const title = usePageTitle();
  const grupos = useContext(MenuContext);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [empresa, setEmpresa] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Operacion[]>("/operaciones/operaciones"),
      apiFetch<Cotizacion[]>("/operaciones/cotizaciones"),
    ])
      .then(([ops, cots]) => { setOperaciones(ops); setCotizaciones(cots); })
      .catch(() => {})   // apiFetch redirige a /login si la sesión expiró
      .finally(() => setLoading(false));

    // El core es agnóstico de empresa: el nombre sale de la BD, no del código.
    apiFetch<{ razon_social: string } | null>("/empresa/publica")
      .then((e) => setEmpresa(e?.razon_social ?? ""))
      .catch(() => {});
  }, []);

  const tiene = (modulo: string, fragmento: string) =>
    grupos.find((g) => g.modulo_codigo === modulo)
      ?.opciones.some((o) => o.ruta.includes(fragmento) && o.implementada) ?? false;
  const accesos = ACCESOS.filter((a) => tiene(a.modulo, a.fragmento));

  // Cotización de cada operación: da cliente y ruta, que la operación no lleva.
  const porCotizacion = new Map(cotizaciones.map((c) => [c.id, c]));

  const activas = operaciones
    .filter((o) => o.estado === "ABIERTA" || o.estado === "EN_CURSO")
    .sort((a, b) => b.fecha_apertura.localeCompare(a.fecha_apertura));
  const enCurso = activas.filter((o) => o.estado === "EN_CURSO").length;
  const abiertas = activas.filter((o) => o.estado === "ABIERTA").length;

  const recientes = [...cotizaciones]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 20);
  const porAprobar = cotizaciones.filter((c) => c.estado === "ENVIADA").length;

  // Mes en curso, en hora local (no UTC).
  const hoy = new Date();
  const esteMes = (iso: string) => {
    const d = fechaLocal(iso);
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
  };
  const cotsMes = cotizaciones.filter((c) => esteMes(c.fecha));
  const opsMes = operaciones.filter((o) => esteMes(o.fecha_apertura));
  const kgMes = opsMes.reduce((s, o) => s + Number(o.peso_kg ?? 0), 0);
  const piezasMes = opsMes.reduce((s, o) => s + (o.piezas ?? 0), 0);

  // Tasa de aprobación sobre las cotizaciones ya decididas: las que siguen en
  // BORRADOR o ENVIADA no son ni éxito ni fracaso todavía.
  const decididas = cotizaciones.filter((c) =>
    c.estado === "APROBADA" || c.estado === "RECHAZADA" || c.estado === "VENCIDA");
  const aprobadas = cotizaciones.filter((c) => c.estado === "APROBADA").length;
  const aprobacion = decididas.length
    ? Math.round((aprobadas / decididas.length) * 100) : null;

  const kpis = [
    {
      label: "Operaciones activas", value: String(activas.length), hex: "#2563eb",
      sub: `${enCurso} en curso · ${abiertas} abiertas`,
      icon: (<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>),
    },
    {
      label: "Cotizaciones del mes", value: String(cotsMes.length), hex: "#7c3aed",
      sub: `${porAprobar} pendiente${porAprobar === 1 ? "" : "s"} de aprobación`,
      icon: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
    },
    {
      label: "Kg movilizados (mes)", value: Math.round(kgMes).toLocaleString("es-CO"), hex: "#d97706",
      sub: `${opsMes.length} operación${opsMes.length === 1 ? "" : "es"} · ${piezasMes} pieza${piezasMes === 1 ? "" : "s"}`,
      icon: (<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>),
    },
    {
      label: "Tasa de aprobación", value: aprobacion === null ? "—" : `${aprobacion}%`, hex: "#059669",
      sub: `${aprobadas} de ${decididas.length} decididas`,
      icon: (<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>),
    },
  ];

  // Series de las gráficas — todas salen de los mismos dos fetches.
  const medianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const antiguedad: FilaAntiguedad[] = activas
    .map((o) => {
      const c = porCotizacion.get(o.cotizacion_id);
      return {
        id: o.id,
        numero: o.numero,
        ruta: c ? `${c.origen} → ${c.destino}` : "",
        dias: Math.round((medianoche.getTime() - fechaLocal(o.fecha_apertura).getTime()) / 86400000),
        estado: o.estado,
      };
    })
    .sort((a, b) => b.dias - a.dias);
  const estancadas = antiguedad.filter((d) => d.dias > DIAS_ALERTA).length;

  const conteoDestino = new Map<string, number>();
  operaciones.forEach((o) => {
    const c = porCotizacion.get(o.cotizacion_id);
    if (!c) return;
    conteoDestino.set(c.destino, (conteoDestino.get(c.destino) ?? 0) + 1);
  });
  const destinos = [...conteoDestino.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value], i) => ({ label, value, color: PALETA[i % PALETA.length] }));

  const maxEstado = Math.max(1, ...["ENVIADA", "APROBADA", "RECHAZADA", "VENCIDA"]
    .map((e) => cotizaciones.filter((c) => c.estado === e).length));
  const conversion = ["ENVIADA", "APROBADA", "RECHAZADA", "VENCIDA"].map((e) => {
    const value = cotizaciones.filter((c) => c.estado === e).length;
    return {
      label: e.charAt(0) + e.slice(1).toLowerCase(),
      value, color: COLOR_ESTADO_COT[e],
      pct: Math.round((value / maxEstado) * 100),
    };
  });

  return (
    <div className="flex flex-col gap-3 lg:h-full">

      <div className="shrink-0">
        <h1 className="text-[22px] font-bold text-gray-800 tracking-tight">{title || "Resumen operativo"}</h1>
        <p className="text-[12.5px] text-gray-500 mt-0.5">
          Estado de la operación{empresa && ` · ${empresa}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:flex-1 lg:min-h-0">

        {/* ── Izquierda: KPIs + accesos ───────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:min-h-0">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {kpis.map(({ label, value, sub, hex, icon }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl shadow p-4"
                style={{ borderTop: `3px solid ${hex}` }}>
                <div className="flex items-start justify-between">
                  <p className="text-[30px] font-bold leading-none" style={{ color: hex }}>
                    {loading ? "—" : value}
                  </p>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${hex}1a`, color: hex }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                  </span>
                </div>
                <p className="text-[11.5px] font-semibold text-gray-700 mt-2.5">{label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{loading ? "" : sub}</p>
              </div>
            ))}
          </div>

          {/* Antigüedad — crece para consumir el alto sobrante de la columna */}
          <div className="bg-white border border-gray-200 rounded-xl shadow flex flex-col overflow-hidden lg:flex-1 lg:min-h-0">
            <div className="px-3 pt-3 pb-2 shrink-0 flex items-center justify-between cursor-pointer"
              onClick={() => setZoom("antiguedad")}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Antigüedad de operaciones activas</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                {estancadas > 0 && (
                  <span className="text-amber-600 font-semibold">{estancadas} &gt; {DIAS_ALERTA} días</span>
                )}
                <ExpandIcon />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-3 pb-3">
              {loading
                ? <p className="text-[11px] text-gray-400">Cargando…</p>
                : <Antiguedad datos={antiguedad} />}
            </div>
          </div>

          {/* Destinos + Conversión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <div onClick={() => setZoom("dona")}
              className="bg-white border border-gray-200 rounded-xl p-3 shadow cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Destinos</p>
                <ExpandIcon />
              </div>
              <DonutChart datos={destinos} />
            </div>
            <div onClick={() => setZoom("conversion")}
              className="bg-white border border-gray-200 rounded-xl p-3 shadow cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Conversión cotizaciones</p>
                <ExpandIcon />
              </div>
              <ConversionBars datos={conversion} aprobacion={aprobacion} />
            </div>
          </div>

          {accesos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              {accesos.map((a) => (
                <Link key={a.href} href={a.href}
                  className={`group flex items-center gap-3 bg-white border relative rounded-xl px-4 py-3 transition-all shadow ${a.marco}`}>
                  <span className="absolute top-2 right-2 text-amber-400" title="Acceso rápido">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${a.chip}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={a.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{a.icon}</svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-gray-800">{a.titulo}</p>
                    <p className="text-[10px] text-gray-500">{a.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Derecha: operaciones + cotizaciones ─────────────────────────── */}
        <div className="flex flex-col gap-3 lg:grid lg:grid-rows-2 lg:min-h-0">

          <div className="bg-white border border-gray-200 rounded-xl shadow flex flex-col overflow-hidden min-h-0 max-h-[65vh] lg:max-h-none">
            <div className="px-4 py-3 border-b border-gray-200 shrink-0 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Operaciones activas</p>
              <Link href="/dashboard/operaciones/operaciones" className="text-[10px] text-blue-600 font-semibold hover:underline">Ver todas →</Link>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {loading ? (
                <p className="px-4 py-3 text-[11px] text-gray-400">Cargando…</p>
              ) : activas.length === 0 ? (
                <p className="px-4 py-3 text-[11px] text-gray-400">No hay operaciones abiertas ni en curso.</p>
              ) : activas.map((op) => {
                const cot = porCotizacion.get(op.cotizacion_id);
                return (
                  <Link key={op.id} href={`/dashboard/operaciones/operaciones/${op.id}`}
                    className="block px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-gray-800 truncate">
                        {op.numero}
                        {cot && <span className="font-normal text-gray-500"> · {cot.cliente_nombre}</span>}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${ESTADO_OP[op.estado]}`}>{op.estado}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {cot ? `${cot.origen} → ${cot.destino} · ` : ""}{fechaCorta(op.fecha_apertura)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow flex flex-col overflow-hidden min-h-0 max-h-[65vh] lg:max-h-none">
            <div className="px-4 py-3 border-b border-gray-200 shrink-0 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">Cotizaciones recientes</p>
              <Link href="/dashboard/operaciones/cotizaciones" className="text-[10px] text-blue-600 font-semibold hover:underline">Ver todas →</Link>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {loading ? (
                <p className="px-4 py-3 text-[11px] text-gray-400">Cargando…</p>
              ) : recientes.length === 0 ? (
                <p className="px-4 py-3 text-[11px] text-gray-400">No hay cotizaciones registradas.</p>
              ) : recientes.map((c) => (
                <Link key={c.id} href={`/dashboard/operaciones/cotizaciones/${c.id}`}
                  className="block px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-800 truncate">
                      {c.numero} <span className="font-normal text-gray-500">· {c.cliente_nombre}</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${ESTADO_COT[c.estado]}`}>{c.estado}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-500 truncate">{c.origen} → {c.destino}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{fechaCorta(c.fecha)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom de gráficas */}
      {zoom && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-6" onClick={() => setZoom(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-gray-800">{ZOOM_TITULO[zoom]}</h3>
              <button onClick={() => setZoom(null)} title="Cerrar" className="text-gray-400 hover:text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {zoom === "antiguedad" && (
              <div className="max-h-[70vh] overflow-y-auto"><Antiguedad datos={antiguedad} big /></div>
            )}
            {zoom === "dona" && <DonutChart datos={destinos} big />}
            {zoom === "conversion" && <ConversionBars datos={conversion} aprobacion={aprobacion} big />}
          </div>
        </div>
      )}
    </div>
  );
}
