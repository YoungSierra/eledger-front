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

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
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
  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-300";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1";

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center px-4">
      <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8" style={{ maxWidth: "400px" }}>

        {/* Logo */}
        <div className="flex justify-center mb-5">
          <Image
            src={logoSrc}
            alt={empresa?.razon_social ?? "Logo"}
            width={160}
            height={50}
            style={{ objectFit: "contain", width: "auto", height: "56px" }}
            priority
            unoptimized
          />
        </div>

        {/* Título */}
        <div className="text-center mb-5">
          <h1 className="text-[15px] font-semibold text-gray-800">Iniciar sesión</h1>
          {empresa?.razon_social && (
            <p className="text-[12px] text-gray-400 mt-0.5">{empresa.razon_social}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Correo electrónico</label>
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

          <div>
            <label className={labelCls}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-md transition-colors mt-1"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-[10px] text-gray-300 text-center mt-5">
          Emperador Ledger · Sistema Contable
        </p>
      </div>
    </div>
  );
}
