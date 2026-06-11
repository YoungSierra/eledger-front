"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Evento { fecha_hora: string; tipo: string; descripcion: string; notificado_cliente: boolean; }
interface Hawb { numero_hawb: string; vuelo: string | null; fecha_vuelo: string | null; piezas: number | null; peso_cargable_kg: string | null; estado: string; }
interface Mawb { numero_mawb: string; vuelo: string | null; fecha_vuelo: string | null; estado: string; }
interface Operacion {
  id: string; numero: string; fecha_apertura: string; estado: string;
  origen: string; destino: string; tipo_operacion: string;
  piezas: number | null; peso_kg: string | null;
  hawbs: Hawb[]; mawbs: Mawb[]; eventos: Evento[];
}

const PASO: Record<string, number> = { ABIERTA: 1, EN_CURSO: 2, CERRADA: 3 };
const PASOS = ["Abierta", "En curso", "Cerrada"];

const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  ABIERTA:   { dot: "bg-blue-500",  text: "text-blue-600",  label: "Abierta"  },
  EN_CURSO:  { dot: "bg-amber-500", text: "text-amber-600", label: "En curso" },
  CERRADA:   { dot: "bg-green-500", text: "text-green-600", label: "Cerrada"  },
  CANCELADA: { dot: "bg-red-400",   text: "text-red-500",   label: "Cancelada" },
  BORRADOR:  { dot: "bg-gray-400",  text: "text-gray-500",  label: "Borrador"  },
  EMITIDA:   { dot: "bg-green-500", text: "text-green-600", label: "Emitida"   },
};

export default function PortalOperacionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [op, setOp] = useState<Operacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState("");

  useEffect(() => { params.then(({ id }) => setId(id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    apiFetch<Operacion>(`/portal/operaciones/${id}`)
      .then(setOp).catch(() => router.push("/portal"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !op) return (
    <div className="py-24 flex justify-center">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );

  const paso = PASO[op.estado] ?? 0;
  const s    = STATUS[op.estado] ?? STATUS.ABIERTA;

  return (
    <div className="space-y-8">

      {/* Back */}
      <button onClick={() => router.push("/portal")}
        className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-800 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Mis operaciones
      </button>

      {/* Encabezado */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[24px] font-bold text-blue-600 tracking-tight">{op.numero}</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <span className={`text-[12px] font-semibold ${s.text}`}>{s.label}</span>
          </div>
        </div>
        <p className="text-[14px] text-gray-600 flex items-center gap-2">
          <span className="font-semibold text-gray-700">{op.origen}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          <span className="font-semibold text-gray-700">{op.destino}</span>
          <span className="text-gray-400">· {op.tipo_operacion}</span>
        </p>
        <p className="text-[12px] text-gray-400 mt-1">
          Apertura: {new Date(op.fecha_apertura + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Progreso */}
      {op.estado !== "CANCELADA" && (
        <div className="border border-gray-200 rounded-xl p-5 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-4">Estado del embarque</p>
          <div className="flex items-start">
            {PASOS.map((label, i) => {
              const cerrada = op.estado === "CERRADA";
              const done    = cerrada ? true : i < paso;
              const activo  = cerrada ? false : i === paso - 1;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      activo  ? `${s.dot} border-transparent`
                      : done  ? "bg-green-500 border-transparent"
                              : "bg-white border-gray-300"
                    }`}>
                      {!activo && done && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                      {activo && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={`text-[11px] text-center leading-tight ${
                      activo ? `font-bold ${s.text}` : done ? "text-gray-400" : "text-gray-300"
                    }`}>{label}</span>
                  </div>
                  {i < PASOS.length - 1 && (
                    <div className={`flex-1 h-px mb-6 mx-1 ${done ? "bg-green-200" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalles: MAWB + HAWB */}
      {(op.mawbs.length > 0 || op.hawbs.length > 0 || op.piezas) && (
        <div className="border border-gray-200 rounded-xl bg-white divide-y divide-gray-100">
          <p className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-600">Detalles del embarque</p>
          {op.piezas && (
            <div className="px-5 py-3 flex justify-between text-[13px]">
              <span className="text-gray-500">Piezas</span>
              <span className="font-semibold text-gray-800">{op.piezas}</span>
            </div>
          )}
          {op.peso_kg && (
            <div className="px-5 py-3 flex justify-between text-[13px]">
              <span className="text-gray-500">Peso</span>
              <span className="font-semibold text-gray-800">{parseFloat(op.peso_kg).toFixed(2)} kg</span>
            </div>
          )}
          {op.mawbs.map((m) => (
            <div key={m.numero_mawb} className="px-5 py-3 flex justify-between text-[13px]">
              <span className="text-gray-500">MAWB</span>
              <div className="text-right">
                <p className="font-mono font-bold text-blue-600">{m.numero_mawb}</p>
                {m.vuelo && <p className="text-[11px] text-gray-400">{m.vuelo}{m.fecha_vuelo ? ` · ${m.fecha_vuelo}` : ""}</p>}
              </div>
            </div>
          ))}
          {op.hawbs.map((h) => (
            <div key={h.numero_hawb} className="px-5 py-3 flex justify-between text-[13px]">
              <span className="text-gray-500">HAWB</span>
              <div className="text-right">
                <p className="font-mono font-bold text-blue-600">{h.numero_hawb}</p>
                {(h.piezas || h.peso_cargable_kg) && (
                  <p className="text-[11px] text-gray-400">
                    {[h.piezas ? `${h.piezas} pzs` : null, h.peso_cargable_kg ? `${parseFloat(h.peso_cargable_kg).toFixed(2)} kg` : null].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-5">Historial de estado</p>
        {op.eventos.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-8">Sin eventos registrados aún.</p>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />
            <div className="space-y-6">
              {op.eventos.map((ev, i) => (
                <div key={i} className="flex gap-5">
                  {/* Dot */}
                  <div className={`w-[15px] h-[15px] rounded-full shrink-0 z-10 mt-0.5 border-2 border-white ring-2 ${
                    i === 0 ? "bg-gray-900 ring-gray-900" : "bg-gray-300 ring-gray-300"
                  }`} />
                  {/* Contenido */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <p className={`text-[13px] leading-snug ${i === 0 ? "font-semibold text-blue-600" : "text-gray-600"}`}>
                        {ev.descripcion}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">{ev.fecha_hora}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[11px] text-gray-400">{ev.tipo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
