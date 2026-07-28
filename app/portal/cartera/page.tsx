"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface CarteraItem {
  numero: string; tipo: string; fecha: string; fecha_vencimiento: string | null;
  total: string; saldo: string; dias_vencimiento: number | null;
}
interface Cartera {
  corriente: string; vencido: string; a_favor: string; total_adeudado: string;
  items: CarteraItem[];
}

function fmt(v: string | number) { return parseFloat(String(v)).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
const TIPO: Record<string, string> = { FACTURA: "Factura", NOTA_DEBITO: "Nota débito" };

export default function PortalCarteraPage() {
  const [data, setData] = useState<Cartera | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  useEffect(() => {
    apiFetch<Cartera>("/portal/cartera").then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-[13px] text-gray-400">Cargando...</div>;
  if (!data) return <div className="py-16 text-center text-[13px] text-gray-400">No se pudo cargar la cartera</div>;

  const totalPags = Math.max(1, Math.ceil(data.items.length / POR_PAGINA));
  const pageActual = Math.min(pagina, totalPags);
  const visibles = data.items.slice((pageActual - 1) * POR_PAGINA, pageActual * POR_PAGINA);

  const cards = [
    { label: "Corriente", value: data.corriente, color: "#059669" },
    { label: "Vencido", value: data.vencido, color: "#dc2626" },
    { label: "A favor", value: data.a_favor, color: "#2563eb", paren: true },
    { label: "Total adeudado", value: data.total_adeudado, color: "#1e293b" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-blue-600">Mi cartera</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Saldos pendientes de pago con Universal Cargo</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{c.label}</p>
            <p className="text-[20px] font-bold font-mono mt-1" style={{ color: c.color }}>
              {c.paren && parseFloat(c.value) ? `(${fmt(c.value)})` : fmt(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-[13px] font-semibold text-gray-700">Documentos pendientes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase text-gray-400">Documento</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase text-gray-400">Fecha</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase text-gray-400">Vence</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase text-gray-400">Total</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase text-gray-400">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Sin saldos pendientes 🎉</td></tr>
              )}
              {visibles.map((it, i) => {
                const vencida = it.dias_vencimiento !== null && it.dias_vencimiento < 0;
                return (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-medium text-gray-800">{it.numero}</span>
                      {it.tipo !== "FACTURA" && <span className="ml-1.5 text-[10px] text-gray-400">{TIPO[it.tipo] ?? it.tipo}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{it.fecha}</td>
                    <td className="px-4 py-2.5">
                      <span className={vencida ? "text-red-600 font-medium" : "text-gray-500"}>{it.fecha_vencimiento ?? "—"}</span>
                      {it.dias_vencimiento !== null && (
                        <span className={`ml-1 text-[10px] ${vencida ? "text-red-400" : "text-gray-400"}`}>
                          {vencida ? `(${Math.abs(it.dias_vencimiento)}d venc.)` : `(${it.dias_vencimiento}d)`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">${fmt(it.total)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800">${fmt(it.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.items.length > POR_PAGINA && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">
              {`${(pageActual - 1) * POR_PAGINA + 1}–${Math.min(pageActual * POR_PAGINA, data.items.length)}`} de {data.items.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPagina(1)} disabled={pageActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">«</button>
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pageActual === 1} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">‹</button>
              <span className="px-3 py-1 text-[11px] font-medium text-gray-700">{pageActual} / {totalPags}</span>
              <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pageActual === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">›</button>
              <button onClick={() => setPagina(totalPags)} disabled={pageActual === totalPags} className="px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
