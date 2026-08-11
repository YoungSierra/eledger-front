"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

/* Rastreo de embarques marítimos. Es la consulta del día a día: hacen
   seguimiento dos o tres veces por semana y los clientes preguntan por su
   propio número, que puede ser el BL, el booking, el DO o el contenedor. */

interface Resultado {
  operacion_id: string; operacion_numero: string; operacion_estado: string;
  coincide_por: string; valor: string; documento: string;
  buque: string | null; viaje: string | null;
  etd: string | null; eta: string | null; fecha_arribo: string | null;
  clientes: string[];
}

const DOC_COLOR: Record<string, string> = {
  MBL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  HBL: "bg-blue-50 text-blue-700 border-blue-200",
  CONTENEDOR: "bg-teal-50 text-teal-700 border-teal-200",
};

const ESTADO_OP: Record<string, string> = {
  ABIERTA: "bg-blue-50 text-blue-700",
  EN_CURSO: "bg-amber-50 text-amber-700",
  CERRADA: "bg-gray-100 text-gray-500",
  CANCELADA: "bg-red-50 text-red-600",
};

export default function TrackingPage() {
  const title = usePageTitle() || "Rastreo de embarques";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function buscar() {
    if (q.trim().length < 2) { setError("Escribe al menos 2 caracteres"); return; }
    setCargando(true); setError("");
    try {
      setRes(await apiFetch<Resultado[]>(`/operaciones/maritimo/buscar?q=${encodeURIComponent(q.trim())}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo buscar");
      setRes(null);
    } finally { setCargando(false); }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Busca por número de BL, booking, DO, referencia del cliente o contenedor
        </p>
      </div>

      <div className="flex gap-2 mb-4 shrink-0 max-w-2xl">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
          placeholder="SHZ7974397 · TRHU1350240 · KCSSZP26030259…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={buscar} disabled={cargando}
          className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 shrink-0">{error}</div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {res === null ? (
          <p className="text-[12px] text-gray-400 text-center py-12">
            Escribe un número y pulsa Buscar.
          </p>
        ) : res.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-gray-500">Sin resultados para <strong>{q}</strong></p>
            <p className="text-[11px] text-gray-400 mt-1">
              Se busca en número de BL, booking, DO, referencia del cliente y contenedor.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-5xl">
            <p className="text-[11px] text-gray-400">{res.length} resultado(s)</p>
            {res.map((r, i) => (
              <button key={i} onClick={() => router.push(`/dashboard/operaciones/operaciones/${r.operacion_id}`)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-blue-300 hover:bg-blue-50/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${DOC_COLOR[r.documento] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {r.documento}
                      </span>
                      <span className="font-mono font-semibold text-[13px] text-gray-800">{r.valor}</span>
                      <span className="text-[10px] text-gray-400">coincide por {r.coincide_por}</span>
                    </div>
                    <p className="text-[12px] text-gray-600 mt-1">
                      {r.buque ?? "—"}{r.viaje ? ` · viaje ${r.viaje}` : ""}
                    </p>
                    {r.clientes.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{r.clientes.join(" · ")}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-mono text-[12px] font-semibold text-blue-700">{r.operacion_numero}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_OP[r.operacion_estado] ?? "bg-gray-100 text-gray-500"}`}>
                        {r.operacion_estado.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      ETD {r.etd ?? "—"} · ETA {r.eta ?? "—"}
                    </p>
                    {r.fecha_arribo && (
                      <p className="text-[11px] text-green-700 font-semibold mt-0.5">Arribó {r.fecha_arribo}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
