"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Operacion {
  id: string; numero: string; fecha_apertura: string; estado: string;
  origen: string; destino: string; tipo_operacion: string;
  ultimo_evento: string | null; ultima_fecha: string | null;
  piezas: number | null; peso_kg: string | null;
  hawbs_count: number; mawbs_count: number;
}

const PASO: Record<string, number> = { ABIERTA: 1, EN_CURSO: 2, CERRADA: 3 };
const PASOS = ["Abierta", "En curso", "Cerrada"];

const STATUS: Record<string, { accent: string; badge: string; badgeText: string; dot: string; label: string }> = {
  ABIERTA:   { accent: "border-l-blue-500",  badge: "bg-blue-50 text-blue-700",   badgeText: "text-blue-700",  dot: "bg-blue-500",  label: "Abierta"   },
  EN_CURSO:  { accent: "border-l-amber-500", badge: "bg-amber-50 text-amber-700", badgeText: "text-amber-700", dot: "bg-amber-500", label: "En curso"  },
  CERRADA:   { accent: "border-l-green-500", badge: "bg-green-50 text-green-700", badgeText: "text-green-700", dot: "bg-green-500", label: "Cerrada"   },
  CANCELADA: { accent: "border-l-red-400",   badge: "bg-red-50 text-red-600",     badgeText: "text-red-600",   dot: "bg-red-400",   label: "Cancelada" },
};

function StepBar({ estado }: { estado: string }) {
  const paso     = PASO[estado] ?? 0;
  const s        = STATUS[estado];
  const cerrada  = estado === "CERRADA";

  if (estado === "CANCELADA") return (
    <span className="text-[11px] font-semibold text-red-500">Operación cancelada</span>
  );
  return (
    <div className="flex items-center gap-0 w-full">
      {PASOS.map((label, i) => {
        const done   = cerrada ? true : i < paso;
        const activo = cerrada ? false : i === paso - 1;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                activo  ? `${s.dot} border-transparent`
                : done  ? "bg-green-500 border-transparent"
                        : "bg-white border-gray-300"
              }`}>
                {!activo && done && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
                {activo && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={`text-[10px] font-medium ${activo ? "text-gray-900" : done ? "text-gray-400" : "text-gray-300"}`}>
                {label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-0.5 ${done ? "bg-green-200" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type Filtro = "TODAS" | "ABIERTA" | "EN_CURSO" | "CERRADA";
const FILTRO_LABELS: Record<string, string> = { TODAS: "Todas", EN_CURSO: "En curso", ABIERTA: "Abiertas", CERRADA: "Cerradas" };

export default function PortalPage() {
  const router = useRouter();
  const [ops, setOps]       = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");

  useEffect(() => {
    apiFetch<Operacion[]>("/portal/operaciones")
      .then(setOps).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtradas = filtro === "TODAS" ? ops : ops.filter((o) => o.estado === filtro);

  if (loading) return (
    <div className="py-24 flex justify-center">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-blue-600">Mis operaciones</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {ops.length} operación{ops.length !== 1 ? "es" : ""} registrada{ops.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(["TODAS", "EN_CURSO", "ABIERTA", "CERRADA"] as Filtro[]).map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                filtro === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {FILTRO_LABELS[f]}
              {f !== "TODAS" && <span className="ml-1 opacity-60">{ops.filter((o) => o.estado === f).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-[13px] text-gray-400">No hay operaciones en este estado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map((op) => {
            const s = STATUS[op.estado] ?? STATUS.ABIERTA;
            return (
              <button key={op.id} onClick={() => router.push(`/portal/operaciones/${op.id}`)}
                className={`w-full text-left bg-white rounded-2xl border border-gray-200 border-l-4 ${s.accent} shadow-sm hover:shadow-md transition-all p-5 group flex flex-col justify-start`}>

                {/* Fila superior */}
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="min-w-0">
                    <p className="text-[18px] font-bold text-blue-600 tracking-tight leading-none">{op.numero}</p>
                    <p className="text-[12px] text-gray-500 mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="font-semibold text-gray-700">{op.origen}</span>
                      {" → "}
                      <span className="font-semibold text-gray-700">{op.destino}</span>
                      <span className="text-gray-400"> · {op.tipo_operacion}</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>{s.label}</span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(op.fecha_apertura + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-100 my-4" />

                {/* Progreso */}
                <StepBar estado={op.estado} />

                {/* Último evento */}
                {op.ultimo_evento && (
                  <div className="mt-4 bg-gray-50 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-gray-600 leading-snug">{op.ultimo_evento}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{op.ultima_fecha}</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3.5">
                  <div className="flex gap-1.5">
                    {op.hawbs_count > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{op.hawbs_count} HAWB</span>}
                    {op.mawbs_count > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{op.mawbs_count} MAWB</span>}
                    {op.piezas && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{op.piezas} pzs</span>}
                  </div>
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-700 flex items-center gap-1 transition-colors font-medium">
                    Ver detalle
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
