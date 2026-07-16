"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login } from "@/lib/api";

interface EmpresaPublica {
  razon_social: string;
  logo_url: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const FEATURES: { icon: React.ReactNode; texto: string }[] = [
  {
    texto: "Reportes y operación en tiempo real",
    icon: (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  },
  {
    texto: "Cartera, pagos y facturación",
    icon: (<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>),
  },
  {
    texto: "Contabilidad y estados financieros",
    icon: (<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>),
  },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [empresa, setEmpresa]   = useState<EmpresaPublica | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/empresa/publica`)
      .then((r) => r.json())
      .then(setEmpresa)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      router.push(data.es_cliente ? "/portal" : "/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  const logoSrc = empresa?.logo_url ?? "/logo.png";
  const razon = empresa?.razon_social ?? "";

  const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5";
  const inputCls = "w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-800 bg-gray-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 placeholder-gray-300 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#f4f6f9] to-[#e7ebf1]">
      <div className="w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden"
        style={{ maxWidth: "880px" }}>

        {/* ── Panel de marca ─────────────────────────────────────── */}
        <div className="relative hidden md:flex flex-col p-9 overflow-hidden text-white
          bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af]">
          {/* Adornos de luz */}
          <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-white/5 blur-3xl" />

          <div className="relative w-full bg-white rounded-xl px-6 py-4 shadow-sm flex justify-center">
            <Image src={logoSrc} alt={razon || "Logo"} width={240} height={64}
              style={{ objectFit: "contain", width: "auto", height: "56px" }} priority unoptimized />
          </div>

          <div className="relative mt-8">
            <h2 className="text-[20px] font-semibold leading-snug">Gestión Operativa y Contable</h2>
            <p className="mt-2.5 text-[12px] text-white/75 italic whitespace-nowrap">
              Todo tu negocio en una sola plataforma.
            </p>
          </div>

          <ul className="relative mt-7 space-y-3">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </span>
                <span className="text-[12.5px] text-white/85">{f.texto}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-auto pt-7 flex items-center gap-2 text-white/45">
            <span className="w-6 h-[1px] bg-white/25" />
            <span className="text-[11px] font-medium tracking-wide">Emperador Ledger</span>
          </div>
        </div>

        {/* ── Panel de formulario ────────────────────────────────── */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          {/* Logo compacto solo en móvil */}
          <div className="md:hidden flex justify-center mb-6">
            <Image src={logoSrc} alt={razon || "Logo"} width={150} height={48}
              style={{ objectFit: "contain", width: "auto", height: "48px" }} priority unoptimized />
          </div>

          <div className="mb-6">
            <h1 className="text-[22px] font-bold text-gray-800">Iniciar sesión</h1>
            <p className="text-[12.5px] text-gray-400 mt-1">Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Correo electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="usuario@empresa.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors mt-1"
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <p className="text-[10px] text-gray-300 text-center mt-7">
            Emperador Ledger · Sistema Contable
          </p>
        </div>
      </div>
    </div>
  );
}
