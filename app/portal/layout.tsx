"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, logout } from "@/lib/api";

interface PortalMe { nombre: string; email: string; cliente: string; nit: string; }

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<PortalMe | null>(null);

  useEffect(() => {
    apiFetch<PortalMe>("/portal/me").then(setMe).catch(() => router.push("/login"));
  }, [router]);

  if (!me) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  );

  const ini = me.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar único */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-6">

          {/* Izquierda: logo + nombre */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Universal Cargo" className="h-8 object-contain" />
            <div className="w-px h-7 bg-gray-200" />
            <div>
              <p className="text-[12px] font-bold text-blue-700 tracking-wide leading-tight">UNIVERSAL CARGO COLOMBIA S.A.S</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Portal de seguimiento</p>
            </div>
          </div>

          {/* Derecha: cliente + usuario + salir */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-semibold text-gray-800 leading-tight">{me.cliente}</p>
              <p className="text-[10px] text-gray-400">NIT {me.nit}</p>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{ini}</div>
              <div className="hidden sm:block text-right">
                <p className="text-[11px] font-medium text-gray-700 leading-tight">{me.nombre}</p>
                <p className="text-[10px] text-gray-400">{me.email}</p>
              </div>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <button onClick={() => { logout(); router.push("/login"); }}
              title="Cerrar sesión"
              className="text-gray-400 hover:text-red-500 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-7">
        {children}
      </main>

      <footer className="text-center py-4 text-[10px] text-gray-400 border-t border-gray-200 bg-white">
        Universal Cargo Colombia S.A.S · Portal de seguimiento
      </footer>
    </div>
  );
}
