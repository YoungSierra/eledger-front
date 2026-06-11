"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface OpcionMenu { nombre: string; ruta: string; implementada: boolean; }
interface GrupoMenu  { modulo_codigo: string; modulo_nombre: string; opciones: OpcionMenu[]; }

// ── Datos fake ────────────────────────────────────────────────────────────────

const KPI = [
  { label: "Operaciones activas", value: "6",  sub: "4 en curso · 2 abiertas",     color: "text-blue-600",   bg: "bg-blue-50   border-blue-200",   dot: "bg-blue-500"   },
  { label: "Cotizaciones mes",    value: "11", sub: "3 pendientes de aprobación",  color: "text-violet-600", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  { label: "HAWBs emitidos",      value: "18", sub: "↑ 20% vs mes anterior",       color: "text-amber-600",  bg: "bg-amber-50  border-amber-200",  dot: "bg-amber-500"  },
  { label: "MAWBs del mes",       value: "7",  sub: "5 ya cerrados",               color: "text-green-600",  bg: "bg-green-50  border-green-200",  dot: "bg-green-500"  },
];

const OPS_RECIENTES = [
  { numero: "OP-2026001", cliente: "CENTAK ANDINA SAS",          ruta: "BOG → SAL", estado: "EN_CURSO",  fecha: "01 jun" },
  { numero: "OP-2026002", cliente: "TECEP S.A.",                 ruta: "BOG → MIA", estado: "ABIERTA",   fecha: "02 jun" },
  { numero: "OP-2026003", cliente: "INVERSIONES GARCIA LTDA",    ruta: "BOG → GUA", estado: "EN_CURSO",  fecha: "01 jun" },
  { numero: "OP-2026004", cliente: "DISTRIBUIDORA ANDINA S.A.S", ruta: "BOG → PTY", estado: "CERRADA",   fecha: "28 may" },
  { numero: "OP-2026005", cliente: "CENTAK ANDINA SAS",          ruta: "BOG → LIM", estado: "ABIERTA",   fecha: "03 jun" },
  { numero: "OP-2026006", cliente: "CIMPA COLOMBIA SAS",         ruta: "BOG → BOG", estado: "EN_CURSO",  fecha: "03 jun" },
  { numero: "OP-2026007", cliente: "GRUPO TEXTIL NORTE",         ruta: "BOG → MIA", estado: "ABIERTA",   fecha: "04 jun" },
  { numero: "OP-2026008", cliente: "TECEP S.A.",                 ruta: "BOG → SAL", estado: "CERRADA",   fecha: "04 jun" },
  { numero: "OP-2026009", cliente: "INVERSIONES GARCIA LTDA",    ruta: "BOG → PTY", estado: "EN_CURSO",  fecha: "05 jun" },
  { numero: "OP-2026010", cliente: "CENTAK ANDINA SAS",          ruta: "BOG → GUA", estado: "ABIERTA",   fecha: "05 jun" },
];

const COTS_RECIENTES = [
  { numero: "COT-2026018", cliente: "CIMPA COLOMBIA SAS",        estado: "APROBADA",  valor: "USD 1.240", fecha: "04 jun" },
  { numero: "COT-2026017", cliente: "TECEP S.A.",                estado: "ENVIADA",   valor: "USD 980",   fecha: "03 jun" },
  { numero: "COT-2026016", cliente: "CENTAK ANDINA SAS",         estado: "BORRADOR",  valor: "USD 1.560", fecha: "02 jun" },
  { numero: "COT-2026015", cliente: "GRUPO TEXTIL NORTE",        estado: "RECHAZADA", valor: "USD 720",   fecha: "01 jun" },
  { numero: "COT-2026014", cliente: "DISTRIBUIDORA ANDINA S.A.S",estado: "APROBADA",  valor: "USD 2.100", fecha: "01 jun" },
  { numero: "COT-2026013", cliente: "INVERSIONES GARCIA LTDA",   estado: "ENVIADA",   valor: "USD 850",   fecha: "31 may" },
  { numero: "COT-2026012", cliente: "TECEP S.A.",                estado: "VENCIDA",   valor: "USD 430",   fecha: "30 may" },
  { numero: "COT-2026011", cliente: "CENTAK ANDINA SAS",         estado: "APROBADA",  valor: "USD 3.200", fecha: "29 may" },
  { numero: "COT-2026010", cliente: "CIMPA COLOMBIA SAS",        estado: "BORRADOR",  valor: "USD 670",   fecha: "28 may" },
  { numero: "COT-2026009", cliente: "GRUPO TEXTIL NORTE",        estado: "RECHAZADA", valor: "USD 910",   fecha: "27 may" },
];

const OPS_SEMANA = [
  { label: "S1", ops: 2, hawbs: 5 },
  { label: "S2", ops: 3, hawbs: 8 },
  { label: "S3", ops: 2, hawbs: 6 },
  { label: "S4", ops: 4, hawbs: 11 },
  { label: "S5", ops: 3, hawbs: 9 },
  { label: "S6", ops: 6, hawbs: 18 },
];

const DESTINOS = [
  { label: "El Salvador (SAL)", value: 7,  color: "#2563eb" },
  { label: "Miami (MIA)",       value: 5,  color: "#7c3aed" },
  { label: "Guatemala (GUA)",   value: 4,  color: "#d97706" },
  { label: "Panamá (PTY)",      value: 3,  color: "#059669" },
  { label: "Lima (LIM)",        value: 2,  color: "#dc2626" },
];

const CONVERSION = [
  { label: "Enviadas",   value: 11, color: "#2563eb", pct: 100 },
  { label: "Aprobadas",  value: 7,  color: "#059669", pct: 64  },
  { label: "Rechazadas", value: 2,  color: "#dc2626", pct: 18  },
  { label: "Vencidas",   value: 1,  color: "#d97706", pct: 9   },
];

const ALERTAS = [
  { nivel: "warn", texto: "OP-2026002 sin eventos en 3 días",    accion: "Revisar" },
  { nivel: "warn", texto: "3 cotizaciones próximas a vencer",     accion: "Ver"     },
  { nivel: "info", texto: "TRM actual: $3.565 — Banco República", accion: null      },
  { nivel: "ok",   texto: "OP-2026004 entregada exitosamente",     accion: null      },
];

const ESTADO_OP:  Record<string, string> = { ABIERTA: "bg-blue-50 text-blue-700", EN_CURSO: "bg-amber-50 text-amber-700", CERRADA: "bg-gray-100 text-gray-500" };
const ESTADO_COT: Record<string, string> = { BORRADOR: "bg-gray-100 text-gray-500", ENVIADA: "bg-blue-50 text-blue-700", APROBADA: "bg-green-50 text-green-700", RECHAZADA: "bg-red-50 text-red-600", VENCIDA: "bg-amber-50 text-amber-600" };

// ── Gráfica de barras SVG ─────────────────────────────────────────────────────

function BarChart() {
  const maxOps   = Math.max(...OPS_SEMANA.map((d) => d.ops));
  const maxHawbs = Math.max(...OPS_SEMANA.map((d) => d.hawbs));
  // viewBox fijo; preserveAspectRatio="none" estira para llenar el contenedor
  const W = 200; const H = 100; const barW = 13; const gap = 3; const groupW = barW * 2 + gap;
  const colW = groupW + 8;
  const padB = 14;
  return (
    <svg
      viewBox={`0 0 ${OPS_SEMANA.length * colW + 4} ${H + padB}`}
      className="w-full h-full"
      style={{ display: "block" }}
    >
      {[0, 0.33, 0.66, 1].map((t) => (
        <line key={t} x1={0} x2={OPS_SEMANA.length * colW + 4} y1={H - t * H} y2={H - t * H} stroke="#f1f5f9" strokeWidth="1"/>
      ))}
      {OPS_SEMANA.map((d, i) => {
        const x  = 2 + i * colW;
        const hO = (d.ops   / maxOps)   * H;
        const hH = (d.hawbs / maxHawbs) * H;
        return (
          <g key={d.label}>
            <rect x={x}             y={H - hO} width={barW} height={hO} rx="2" fill="#2563eb" opacity="0.85"/>
            <rect x={x + barW + gap} y={H - hH} width={barW} height={hH} rx="2" fill="#d97706" opacity="0.75"/>
            <text x={x + barW} y={H + padB - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Dona SVG ──────────────────────────────────────────────────────────────────

function DonutChart() {
  const total = DESTINOS.reduce((s, d) => s + d.value, 0);
  const R = 38; const cx = 48; const cy = 48; let angle = -90;
  const slices = DESTINOS.map((d) => {
    const pct = d.value / total; const start = angle; angle += pct * 360; const end = angle;
    const s = (a: number) => ({ x: cx + R * Math.cos((a * Math.PI) / 180), y: cy + R * Math.sin((a * Math.PI) / 180) });
    const lg = end - start > 180 ? 1 : 0;
    return { ...d, path: `M ${s(start).x} ${s(start).y} A ${R} ${R} 0 ${lg} 1 ${s(end).x} ${s(end).y} L ${cx} ${cy} Z` };
  });
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 96 96" className="shrink-0" style={{ width: 68, height: 68 }}>
        {slices.map((s) => <path key={s.label} d={s.path} fill={s.color} opacity="0.9"/>)}
        <circle cx={cx} cy={cy} r={22} fill="white"/>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#94a3b8">total</text>
      </svg>
      <div className="space-y-1.5 min-w-0 flex-1">
        {DESTINOS.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }}/>
            <span className="text-[10px] text-gray-600 truncate flex-1">{d.label}</span>
            <span className="text-[11px] font-bold text-gray-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const title = usePageTitle();
  const [accesos, setAccesos] = useState({ cotizaciones: true, operaciones: true, facturas: true, ordenes: true, movimientos: true, terceros: true });

  useEffect(() => {
    // TODO: restaurar tras preview
    // apiFetch<GrupoMenu[]>("/menu").then((grupos) => {
    //   const tiene = (modulo: string, rutaFragment: string) =>
    //     grupos.find((g) => g.modulo_codigo === modulo)
    //       ?.opciones.some((o) => o.ruta.includes(rutaFragment) && o.implementada) ?? false;
    //   setAccesos({
    //     cotizaciones: tiene("operaciones",  "/cotizaciones"),
    //     operaciones:  tiene("operaciones",  "/operaciones/operaciones"),
    //     facturas:     tiene("facturacion",  "/facturacion/facturas"),
    //     ordenes:      tiene("compras",      "/compras/ordenes"),
    //     movimientos:  tiene("inventario",   "/inventario/movimientos"),
    //     terceros:     tiene("contabilidad", "/contabilidad/terceros"),
    //   });
    // }).catch(() => {});
  }, []);

  const hayAccesos = Object.values(accesos).some(Boolean);

  return (
    <div className="h-full flex flex-col gap-3">

      {/* Bienvenida */}
      <div className="shrink-0">
        <h1 className="text-[16px] font-bold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Resumen operativo — Universal Cargo Colombia S.A.S</p>
      </div>

      {/* Layout: izquierda + derecha */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">

        {/* ── Columna izquierda ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* KPIs 2×2 — altura fija */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {KPI.map(({ label, value, sub, color, bg, dot }) => (
              <div key={label} className={`border rounded-xl p-3 ${bg}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${dot}`}/>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                </div>
                <p className={`text-[28px] font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Barras + Dona */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Actividad semanal</p>
                <div className="flex gap-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-blue-600"/>Ops</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-amber-500"/>HAWBs</span>
                </div>
              </div>
              <div className="h-36">
                <BarChart />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Destinos del mes</p>
              <DonutChart />
            </div>
          </div>

          {/* Conversión + Alertas — altura natural, sin stretch */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Conversión cotizaciones</p>
              <div className="space-y-2">
                {CONVERSION.map((c) => (
                  <div key={c.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-gray-600">{c.label}</span>
                      <span className="text-[11px] font-bold text-gray-800">{c.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }}/>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 pt-0.5">Aprobación: <span className="font-bold text-green-600">64%</span></p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Alertas y avisos</p>
              <div className="space-y-2">
                {ALERTAS.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                      a.nivel === "warn" ? "bg-amber-500" : a.nivel === "ok" ? "bg-green-500" : "bg-blue-400"
                    }`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-600 leading-snug">{a.texto}</p>
                      {a.accion && <button className="text-[10px] text-blue-600 font-semibold hover:underline">{a.accion} →</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accesos rápidos */}
          {hayAccesos && (
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-3">
                {accesos.cotizaciones && (
                  <Link href="/dashboard/operaciones/cotizaciones/nueva"
                    className="group flex items-center gap-3 bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 rounded-xl px-4 py-3 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center shrink-0 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">Nueva cotización</p>
                      <p className="text-[10px] text-gray-400">Crear cotización de carga</p>
                    </div>
                  </Link>
                )}
                {accesos.operaciones && (
                  <Link href="/dashboard/operaciones/operaciones"
                    className="group flex items-center gap-3 bg-white border border-amber-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl px-4 py-3 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a1 1 0 0 0-.6 1.6L4 11l-1 4 4-1 2.8 2.8a1 1 0 0 0 1.6-.6z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">Operaciones</p>
                      <p className="text-[10px] text-gray-400">Ver operaciones activas</p>
                    </div>
                  </Link>
                )}
                {accesos.facturas && (
                  <Link href="/dashboard/facturacion/facturas"
                    className="group flex items-center gap-3 bg-white border border-violet-100 hover:border-violet-300 hover:bg-violet-50 rounded-xl px-4 py-3 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center shrink-0 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">Facturas de venta</p>
                      <p className="text-[10px] text-gray-400">Ver facturas emitidas</p>
                    </div>
                  </Link>
                )}
                {accesos.ordenes && (
                  <Link href="/dashboard/compras/ordenes"
                    className="group flex items-center gap-3 bg-white border border-green-100 hover:border-green-300 hover:bg-green-50 rounded-xl px-4 py-3 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-green-100 group-hover:bg-green-200 flex items-center justify-center shrink-0 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">Órdenes de compra</p>
                      <p className="text-[10px] text-gray-400">Ver órdenes activas</p>
                    </div>
                  </Link>
                )}
                {accesos.movimientos && (
                  <Link href="/dashboard/inventario/movimientos"
                    className="group flex items-center gap-3 bg-white border border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50 rounded-xl px-4 py-3 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 group-hover:bg-cyan-200 flex items-center justify-center shrink-0 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">Movimientos</p>
                      <p className="text-[10px] text-gray-400">Inventario · movimientos</p>
                    </div>
                  </Link>
                )}
                {accesos.terceros && (
                  <Link href="/dashboard/contabilidad/terceros"
                    className="group flex items-center gap-3 bg-white border border-rose-100 hover:border-rose-300 hover:bg-rose-50 rounded-xl px-4 py-3 transition-all shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center shrink-0 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">Terceros</p>
                      <p className="text-[10px] text-gray-400">Clientes y proveedores</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Columna derecha: ops + cotizaciones ────────────────────────── */}
        <div className="grid grid-rows-2 gap-3 min-h-0">

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Operaciones activas</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {OPS_RECIENTES.map((op) => (
                <div key={op.numero} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-800 truncate">
                      {op.numero} <span className="font-normal text-gray-500">· {op.cliente}</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${ESTADO_OP[op.estado]}`}>{op.estado}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{op.ruta} · {op.fecha}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Cotizaciones recientes</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {COTS_RECIENTES.map((c) => (
                <div key={c.numero} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-800 truncate">
                      {c.numero} <span className="font-normal text-gray-500">· {c.cliente}</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${ESTADO_COT[c.estado]}`}>{c.estado}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{c.fecha}</span>
                    <span className="text-[10px] font-bold text-gray-600">{c.valor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
