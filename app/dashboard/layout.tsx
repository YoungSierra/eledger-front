"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch, logout } from "@/lib/api";
import { MenuContext, GrupoMenu } from "@/lib/menu-context";

interface UsuarioActual {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  permisos: string[];
}


const MODULO_ICONS: Record<string, React.ReactNode> = {
  administracion: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  contabilidad:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  cxc:            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  cxp:            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  inventario:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  compras:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  facturacion:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  bancos:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>,
  operaciones:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a1 1 0 0 0-.6 1.6L4 11l-1 4 4-1 2.8 2.8a1 1 0 0 0 1.6-.6z"/></svg>,
  reportes:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
};

// Agrupa los módulos bajo etiquetas de sección
const SECCIONES_SIDEBAR: { label: string; modulos: string[] }[] = [
  { label: "Sistema",      modulos: ["administracion"] },
  { label: "Finanzas",     modulos: ["contabilidad", "cxc", "cxp", "bancos"] },
  { label: "Comercial",    modulos: ["compras", "inventario", "facturacion"] },
  { label: "Operaciones",  modulos: ["operaciones"] },
  { label: "Análisis",     modulos: ["reportes"] },
];

function buildBreadcrumb(pathname: string): string {
  const parts = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " ")).join(" › ");
}

const IDLE_MS = 3_600_000; // 1 hora
const WARN_MS = 30_000; // aviso 30 s antes de cerrar

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario]     = useState<UsuarioActual | null>(null);
  const [grupos, setGrupos]       = useState<GrupoMenu[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modal de perfil
  const [perfilOpen, setPerfilOpen]   = useState(false);
  const [pNombre, setPNombre]         = useState("");
  const [pApellido, setPApellido]     = useState("");
  const [pPwActual, setPPwActual]     = useState("");
  const [pPwNuevo, setPPwNuevo]       = useState("");
  const [pPwNuevo2, setPPwNuevo2]     = useState("");
  const [pSaving, setPSaving]         = useState(false);
  const [pError, setPError]           = useState("");
  const [pOk, setPOk]                 = useState("");

  // Idle timeout
  const [idleWarning, setIdleWarning]     = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(0);
  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // TRM
  const [trmExiste, setTrmExiste]       = useState(true);
  const [trmValor, setTrmValor]         = useState<number | null>(null);
  const [trmPuedeEditar, setTrmPuede]   = useState(false);
  const [trmModal, setTrmModal]         = useState(false);
  const [trmInput, setTrmInput]         = useState("");
  const [trmSaving, setTrmSaving]       = useState(false);
  const [trmError, setTrmError]         = useState("");

  useEffect(() => {
    apiFetch<UsuarioActual>("/auth/me")
      .then((u) => {
        setUsuario(u);
        return apiFetch<GrupoMenu[]>("/menu");
      })
      .then(setGrupos)
      .catch(() => router.push("/login"));
  }, [router]);

  // Verificar TRM en cada cambio de ruta
  useEffect(() => {
    if (!usuario) return;
    apiFetch<{ existe: boolean; tasa: string | null; sugerida: string | null; puede_editar: boolean }>("/trm/hoy")
      .then((res) => {
        setTrmExiste(res.existe);
        setTrmPuede(res.puede_editar);
        setTrmValor(res.tasa ? parseFloat(res.tasa) : null);
        if (!res.existe) {
          setTrmInput(res.sugerida ? String(res.sugerida) : "");
          if (res.puede_editar) setTrmModal(true);
        }
      })
      .catch(() => {});
  }, [usuario, pathname]);

  // Temporizador de inactividad
  useEffect(() => {
    if (!usuario) return;

    function resetTimers() {
      setIdleWarning(false);
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      if (idleTimer.current)    clearTimeout(idleTimer.current);
      if (warnTimer.current)    clearTimeout(warnTimer.current);

      warnTimer.current = setTimeout(() => {
        let secs = Math.floor(WARN_MS / 1000);
        setIdleCountdown(secs);
        setIdleWarning(true);
        countdownRef.current = setInterval(() => {
          secs -= 1;
          setIdleCountdown(secs);
          if (secs <= 0 && countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
        }, 1000);
      }, IDLE_MS - WARN_MS);

      idleTimer.current = setTimeout(() => {
        logout();
        router.push("/login");
      }, IDLE_MS);
    }

    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
      if (idleTimer.current)   clearTimeout(idleTimer.current);
      if (warnTimer.current)   clearTimeout(warnTimer.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [usuario, router]);

  // Expandir automáticamente el módulo de la ruta activa
  useEffect(() => {
    if (!grupos.length) return;
    const grupo = grupos.find((g) => g.opciones.some((op) => pathname === op.ruta));
    if (grupo) setCollapsed((prev) => ({ ...prev, [grupo.modulo_codigo]: true }));
  }, [pathname, grupos]);

  if (!usuario) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center">
        <span className="text-[11px] text-gray-400">Cargando...</span>
      </div>
    );
  }

  const visibleGroups = grupos;
  const breadcrumb = buildBreadcrumb(pathname);

  function toggle(modulo: string) {
    setCollapsed((prev) => ({ ...prev, [modulo]: !prev[modulo] }));
  }

  function abrirPerfil() {
    if (!usuario) return;
    setPNombre(usuario.nombre);
    setPApellido(usuario.apellido);
    setPPwActual(""); setPPwNuevo(""); setPPwNuevo2("");
    setPError(""); setPOk("");
    setPerfilOpen(true);
  }

  async function guardarPerfil() {
    if (!pNombre.trim() || !pApellido.trim()) { setPError("Nombre y apellido son requeridos"); return; }
    setPSaving(true); setPError(""); setPOk("");
    try {
      const u = await apiFetch<UsuarioActual>("/auth/me/perfil", {
        method: "PUT", body: JSON.stringify({ nombre: pNombre.trim(), apellido: pApellido.trim() }),
      });
      setUsuario((prev) => prev ? { ...prev, nombre: u.nombre, apellido: u.apellido } : prev);
      setPOk("Nombre actualizado correctamente.");
    } catch (e) { setPError(e instanceof Error ? e.message : "Error"); }
    finally { setPSaving(false); }
  }

  async function guardarTrm() {
    if (!trmInput || isNaN(parseFloat(trmInput))) { setTrmError("Ingresa un valor válido"); return; }
    setTrmSaving(true); setTrmError("");
    try {
      await apiFetch("/trm", { method: "POST", body: JSON.stringify({ tasa: parseFloat(trmInput) }) });
      setTrmExiste(true);
      setTrmValor(parseFloat(trmInput));
      setTrmModal(false);
    } catch (e) { setTrmError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setTrmSaving(false); }
  }

  async function cambiarPassword() {
    if (!pPwActual || !pPwNuevo) { setPError("Completa todos los campos de contraseña"); return; }
    if (pPwNuevo !== pPwNuevo2)  { setPError("Las contraseñas nuevas no coinciden"); return; }
    if (pPwNuevo.length < 6)     { setPError("La contraseña debe tener al menos 6 caracteres"); return; }
    setPSaving(true); setPError(""); setPOk("");
    try {
      await apiFetch("/auth/me/cambiar-password", {
        method: "POST", body: JSON.stringify({ password_actual: pPwActual, password_nuevo: pPwNuevo }),
      });
      setPPwActual(""); setPPwNuevo(""); setPPwNuevo2("");
      setPOk("Contraseña actualizada correctamente.");
    } catch (e) { setPError(e instanceof Error ? e.message : "Error"); }
    finally { setPSaving(false); }
  }

  return (
    <div className="fixed inset-0 flex bg-[#f4f5f7] overflow-hidden">

      {/* Sidebar */}
      <aside className="shrink-0 flex flex-col transition-all duration-200"
        style={{ background: "#1d4ed8", width: sidebarOpen ? "220px" : "52px", height: "100vh", overflow: "hidden" }}>

        {/* ── Header usuario ───────────────────────────────────────── */}
        <div className="shrink-0" style={{ background: "#1e40af", padding: sidebarOpen ? "14px 12px" : "14px 0" }}>
          {sidebarOpen ? (
            <button onClick={abrirPerfil}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-center rounded-full shrink-0 text-[11px] font-bold text-blue-800"
                style={{ width: 32, height: 32, background: "rgba(255,255,255,0.9)" }}>
                {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[11px] font-semibold truncate leading-tight">{usuario.nombre} {usuario.apellido}</p>
                <p className="text-white/75 text-[9px] truncate leading-tight">{usuario.email}</p>
              </div>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            </button>
          ) : (
            <div className="flex justify-center">
              <button onClick={abrirPerfil} title="Mi perfil"
                className="flex items-center justify-center rounded-full text-[11px] font-bold text-blue-800 hover:scale-105 transition-transform"
                style={{ width: 32, height: 32, background: "rgba(255,255,255,0.9)" }}>
                {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
              </button>
            </div>
          )}
        </div>

        {/* ── Inicio ───────────────────────────────────────────────── */}
        <div className="shrink-0 px-2 pt-3 pb-1">
          <Link
            href="/dashboard"
            title={!sidebarOpen ? "Inicio" : undefined}
            className={`flex items-center gap-2.5 h-9 rounded-lg text-[12px] transition-all ${sidebarOpen ? "px-3" : "justify-center"} ${
              pathname === "/dashboard" ? "bg-white/20 text-white font-semibold" : "text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {sidebarOpen && "Inicio"}
          </Link>
        </div>

        {/* ── Módulos ───────────────────────────────────────────────── */}
        <nav className="flex-1 px-2 pb-4 overflow-y-auto mt-1">
          {visibleGroups.map((group) => {
            const isOpen    = collapsed[group.modulo_codigo] === true;
            const hasActive = group.opciones.some((op) => pathname === op.ruta);
            return (
              <div key={group.modulo_codigo} className="mb-0.5">
                <button
                  title={!sidebarOpen ? group.modulo_nombre : undefined}
                  onClick={() => sidebarOpen ? toggle(group.modulo_codigo) : setSidebarOpen(true)}
                  className={`w-full flex items-center rounded-lg transition-all ${
                    sidebarOpen ? "gap-2.5 px-3 py-2" : "justify-center py-2.5"
                  } ${hasActive ? "bg-white/20 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"}`}
                >
                  <span className={`shrink-0 ${hasActive ? "text-white" : "text-white/80"}`}>
                    {MODULO_ICONS[group.modulo_codigo]}
                  </span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left text-[12px] font-medium">{group.modulo_nombre}</span>
                      <svg className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-90" : ""} ${hasActive ? "text-white/70" : "text-white/50"}`}
                        fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                {sidebarOpen && isOpen && (
                  <div className="ml-3 mt-0.5 mb-1 pl-4 border-l border-white/10 space-y-0.5">
                    {group.opciones.map((op) => {
                      const active = pathname === op.ruta;
                      if (!op.implementada) {
                        return (
                          <span key={op.ruta}
                            className="flex items-center h-7 px-2 rounded-md text-[11px] text-white/20 cursor-default select-none">
                            {op.nombre}
                          </span>
                        );
                      }
                      return (
                        <Link key={op.ruta} href={op.ruta}
                          className={`flex items-center h-7 px-2 rounded-md text-[11px] transition-all ${
                            active ? "bg-white/20 text-white font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}>
                          {op.nombre}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Botón colapsar / expandir */}
        <div className="shrink-0 border-t border-white/10 p-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Colapsar" : "Expandir"}
            className={`w-full flex items-center py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors ${
              sidebarOpen ? "justify-end px-2" : "justify-center"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {sidebarOpen
                ? <><path d="M15 18l-6-6 6-6"/><line x1="4" y1="6" x2="4" y2="18"/></>
                : <><path d="M9 18l6-6-6-6"/><line x1="20" y1="6" x2="20" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </aside>

      {/* Área derecha */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <header className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Inicio</Link>
            {breadcrumb && (
              <>
                <span className="text-gray-300">›</span>
                <span className="text-gray-600 font-medium">{breadcrumb}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Badge TRM */}
            {trmExiste && trmValor && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                TRM $ {trmValor.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
              </span>
            )}
            {!trmExiste && !trmPuedeEditar && (
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Sin TRM hoy — contacta al administrador
              </span>
            )}
            {!trmExiste && trmPuedeEditar && (
              <button onClick={() => setTrmModal(true)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Registrar TRM del día
              </button>
            )}
            <button
              onClick={() => { logout(); router.push("/login"); }}
              title="Cerrar sesión"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto p-5 min-h-0">
          <MenuContext.Provider value={grupos}>
            {children}
          </MenuContext.Provider>
        </main>
      </div>

      {/* ── Modal TRM ────────────────────────────────────────────── */}
      {trmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-gray-800">TRM del día</h2>
                  <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-[11px] text-gray-500">
                No hay TRM registrada para hoy. El valor sugerido viene del Banco de la República.
              </p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  1 USD = ___ COP
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={trmInput}
                    onChange={(e) => setTrmInput(e.target.value)}
                    placeholder="Ej: 4234.50"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                {trmInput && !isNaN(parseFloat(trmInput)) && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    $ {parseFloat(trmInput).toLocaleString("es-CO", { minimumFractionDigits: 2 })} COP por dólar
                  </p>
                )}
              </div>
              {trmError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">{trmError}</p>}
              <p className="text-[9px] text-gray-400">
                Puedes modificar el valor si difiere de la tasa oficial. Quedará registrado con tu usuario.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
              <button onClick={() => setTrmModal(false)}
                className="flex-1 py-2 text-[12px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Después
              </button>
              <button onClick={guardarTrm} disabled={trmSaving || !trmInput}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
                {trmSaving ? "Guardando..." : "Confirmar TRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de perfil ───────────────────────────────────────── */}
      {perfilOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-[14px] font-semibold text-gray-800">Mi perfil</h2>
              <button onClick={() => setPerfilOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {pError && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{pError}</p>}
              {pOk    && <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{pOk}</p>}

              {/* Nombre */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Datos personales</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["Nombre", pNombre, setPNombre], ["Apellido", pApellido, setPApellido]].map(([label, val, set]) => (
                    <div key={label as string}>
                      <label className="block text-[10px] text-gray-500 mb-1">{label as string}</label>
                      <input value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
                <button onClick={guardarPerfil} disabled={pSaving}
                  className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
                  {pSaving ? "Guardando..." : "Guardar nombre"}
                </button>
              </div>

              <div className="border-t border-gray-100" />

              {/* Contraseña */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cambiar contraseña</p>
                <div className="space-y-2">
                  {[["Contraseña actual", pPwActual, setPPwActual], ["Nueva contraseña", pPwNuevo, setPPwNuevo], ["Repetir nueva", pPwNuevo2, setPPwNuevo2]].map(([label, val, set]) => (
                    <div key={label as string}>
                      <label className="block text-[10px] text-gray-500 mb-1">{label as string}</label>
                      <input type="password" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
                <button onClick={cambiarPassword} disabled={pSaving}
                  className="mt-2 w-full py-1.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
                  {pSaving ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Aviso de inactividad ─────────────────────────────────── */}
      {idleWarning && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-gray-800 mb-1">¿Sigues ahí?</h3>
            <p className="text-[12px] text-gray-500 mb-2">
              Tu sesión se cerrará por inactividad en
            </p>
            <p className="text-[32px] font-bold font-mono text-amber-600 mb-5">{idleCountdown}s</p>
            <div className="flex gap-2">
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="flex-1 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cerrar sesión
              </button>
              <button
                onClick={() => {
                  setIdleWarning(false);
                  if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
                  if (idleTimer.current)   clearTimeout(idleTimer.current);
                  if (warnTimer.current)   clearTimeout(warnTimer.current);
                  warnTimer.current = setTimeout(() => {
                    let secs = Math.floor(WARN_MS / 1000);
                    setIdleCountdown(secs);
                    setIdleWarning(true);
                    countdownRef.current = setInterval(() => {
                      secs -= 1; setIdleCountdown(secs);
                      if (secs <= 0 && countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
                    }, 1000);
                  }, IDLE_MS - WARN_MS);
                  idleTimer.current = setTimeout(() => { logout(); router.push("/login"); }, IDLE_MS);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
                Seguir conectado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
