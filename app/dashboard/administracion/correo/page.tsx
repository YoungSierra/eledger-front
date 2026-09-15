"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Config {
  id: string;
  host: string;
  puerto: number;
  seguridad: "STARTTLS" | "SSL" | "NINGUNA";
  usuario: string;
  remitente_email: string;
  remitente_nombre: string;
  reply_to: string | null;
  bcc: string | null;
  activo: boolean;
  password_mascara: string | null;
  tiene_password: boolean;
  modificado_en: string | null;
}

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const ayudaCls = "text-[11px] text-gray-400 mb-1.5";

// Los tres proveedores que usan los clientes. Al elegir uno se llenan host,
// puerto y cifrado: es lo que más se equivoca al configurar a mano.
const PRESETS: Record<string, { host: string; puerto: number; seguridad: Config["seguridad"]; nota: string }> = {
  google: {
    host: "smtp.gmail.com", puerto: 587, seguridad: "STARTTLS",
    nota: "Google Workspace / Gmail: la contraseña normal no sirve. Genera una contraseña de aplicación en la cuenta (requiere verificación en dos pasos activa).",
  },
  microsoft: {
    host: "smtp.office365.com", puerto: 587, seguridad: "STARTTLS",
    nota: "Microsoft 365: la contraseña normal no sirve si hay MFA. Genera una contraseña de aplicación y verifica que el buzón tenga habilitado SMTP AUTH.",
  },
  cpanel: {
    host: "mail.midominio.com", puerto: 465, seguridad: "SSL",
    nota: "Hosting propio (cPanel): el servidor suele ser mail.<tu dominio>. Puerto 465 con SSL o 587 con STARTTLS, según lo que habilite tu proveedor.",
  },
};

export default function CorreoPage() {
  const title = usePageTitle();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const [host, setHost] = useState("");
  const [puerto, setPuerto] = useState(587);
  const [seguridad, setSeguridad] = useState<Config["seguridad"]>("STARTTLS");
  const [usuario, setUsuario] = useState("");
  const [remitenteEmail, setRemitenteEmail] = useState("");
  const [remitenteNombre, setRemitenteNombre] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [bcc, setBcc] = useState("");
  const [activo, setActivo] = useState(false);
  const [destinatarioPrueba, setDestinatarioPrueba] = useState("");
  // null = no se tocó, se conserva la guardada. String = reemplazar.
  const [password, setPassword] = useState<string | null>(null);
  const [mascara, setMascara] = useState<string | null>(null);
  const [tienePassword, setTienePassword] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [nota, setNota] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const d = await apiFetch<Config | null>("/correo/config");
      if (d) {
        setHost(d.host);
        setPuerto(d.puerto);
        setSeguridad(d.seguridad);
        setUsuario(d.usuario);
        setRemitenteEmail(d.remitente_email);
        setRemitenteNombre(d.remitente_nombre);
        setReplyTo(d.reply_to ?? "");
        setBcc(d.bcc ?? "");
        setActivo(d.activo);
        setMascara(d.password_mascara);
        setTienePassword(d.tiene_password);
      }
    } catch {
      // apiFetch redirige a /login si la sesión expiró
    } finally { setLoading(false); }
  }

  function aplicarPreset(clave: string) {
    const p = PRESETS[clave];
    if (!p) { setNota(""); return; }
    setHost(p.host);
    setPuerto(p.puerto);
    setSeguridad(p.seguridad);
    setNota(p.nota);
  }

  async function guardar() {
    setSaving(true); setError(""); setOk(""); setPrueba(null);
    try {
      const d = await apiFetch<Config>("/correo/config", {
        method: "PUT",
        body: JSON.stringify({
          host, puerto, seguridad, usuario,
          remitente_email: remitenteEmail,
          remitente_nombre: remitenteNombre,
          reply_to: replyTo || null,
          bcc: bcc || null,
          activo,
          ...(password !== null ? { password } : {}),
        }),
      });
      setMascara(d.password_mascara);
      setTienePassword(d.tiene_password);
      setPassword(null);
      setVerPassword(false);
      setOk("Configuración guardada.");
      setTimeout(() => setOk(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function probar() {
    setProbando(true); setPrueba(null);
    try {
      setPrueba(await apiFetch<{ ok: boolean; mensaje: string }>("/correo/config/prueba", {
        method: "POST",
        body: JSON.stringify({ destinatario: destinatarioPrueba || null }),
      }));
    } catch (e) {
      setPrueba({ ok: false, mensaje: e instanceof Error ? e.message : "Error" });
    } finally { setProbando(false); }
  }

  return (
    <div className="h-full flex flex-col max-w-2xl">
      <div className="mb-5 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Buzón desde el que salen las notificaciones a los clientes
        </p>
      </div>

      {loading ? (
        <p className="text-[12px] text-gray-400 text-center py-10">Cargando...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-5">
          {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {ok && <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{ok}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Correo remitente</label>
              <p className={ayudaCls}>Dirección desde la que salen los correos</p>
              <input value={remitenteEmail} onChange={(e) => setRemitenteEmail(e.target.value)}
                className={inputCls} placeholder="operaciones@universalcargo.com.co" autoComplete="off" />
            </div>
            <div>
              <label className={labelCls}>Nombre visible</label>
              <p className={ayudaCls}>Lo que ve el cliente como remitente</p>
              <input value={remitenteNombre} onChange={(e) => setRemitenteNombre(e.target.value)}
                className={inputCls} placeholder="Universal Cargo — Operaciones" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700 mb-3">Servidor de salida (SMTP)</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Proveedor</label>
                <p className={ayudaCls}>Llena servidor, puerto y cifrado con los valores típicos</p>
                <select className={inputCls} defaultValue="" onChange={(e) => aplicarPreset(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  <option value="google">Google Workspace / Gmail</option>
                  <option value="microsoft">Microsoft 365 / Outlook</option>
                  <option value="cpanel">Hosting propio (cPanel)</option>
                </select>
                {nota && (
                  <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-2">{nota}</p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Servidor</label>
                  <input value={host} onChange={(e) => setHost(e.target.value)} className={inputCls} placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className={labelCls}>Puerto</label>
                  <input type="number" value={puerto} onChange={(e) => setPuerto(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cifrado</label>
                  <select value={seguridad} onChange={(e) => setSeguridad(e.target.value as Config["seguridad"])} className={inputCls}>
                    <option value="STARTTLS">STARTTLS</option>
                    <option value="SSL">SSL/TLS</option>
                    <option value="NINGUNA">Ninguno</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Usuario</label>
                <p className={ayudaCls}>Normalmente el mismo correo remitente</p>
                <input value={usuario} onChange={(e) => setUsuario(e.target.value)} className={inputCls}
                  placeholder="operaciones@universalcargo.com.co" autoComplete="off" />
              </div>

              <div>
                <label className={labelCls}>Contraseña</label>
                <p className={ayudaCls}>
                  Se guarda cifrada y no se puede volver a leer. En Google Workspace y Microsoft 365
                  debe ser una <strong>contraseña de aplicación</strong>, no la del usuario.
                  {tienePassword && !verPassword && <> Actual: <span className="font-mono text-gray-600">{mascara}</span></>}
                </p>
                {tienePassword && !verPassword ? (
                  <button type="button" onClick={() => { setVerPassword(true); setPassword(""); }}
                    className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 hover:bg-gray-50">
                    Reemplazar contraseña
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input type="password" value={password ?? ""} onChange={(e) => setPassword(e.target.value)}
                      className={inputCls} placeholder="Contraseña de aplicación" autoComplete="new-password" />
                    {tienePassword && (
                      <button type="button" onClick={() => { setVerPassword(false); setPassword(null); }}
                        className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-500 hover:bg-gray-50 shrink-0">
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Correo de respuesta <span className="font-normal normal-case tracking-normal text-gray-400">(opcional)</span></label>
              <p className={ayudaCls}>Si las respuestas deben llegar a otra dirección</p>
              <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className={inputCls} placeholder="comercial@universalcargo.com.co" />
            </div>
            <div>
              <label className={labelCls}>Copia oculta interna <span className="font-normal normal-case tracking-normal text-gray-400">(opcional)</span></label>
              <p className={ayudaCls}>Varias direcciones separadas por coma</p>
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} className={inputCls} placeholder="archivo@universalcargo.com.co" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4" />
              <span className="text-[12px] font-medium text-gray-700">Envío de correo activo</span>
            </label>
            <p className="text-[11px] text-gray-400 mt-1">
              Si está inactivo, la bitácora de operaciones no ofrece la opción de notificar al cliente.
            </p>
          </div>

          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Para que los correos no caigan en spam, el dominio debe tener configurados
            los registros <strong>SPF, DKIM y DMARC</strong>. Lo revisa quien administra el dominio.
          </p>

          {prueba && (
            <p className={`text-[11px] rounded-lg px-3 py-2 border ${
              prueba.ok ? "text-green-700 bg-green-50 border-green-200" : "text-red-600 bg-red-50 border-red-200"
            }`}>{prueba.mensaje}</p>
          )}

          <div className="flex items-end gap-2 pt-1">
            <button onClick={guardar} disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <div className="flex-1">
              <label className={labelCls}>Enviar prueba a</label>
              <input value={destinatarioPrueba} onChange={(e) => setDestinatarioPrueba(e.target.value)}
                className={inputCls} placeholder="Vacío = tu propio correo" />
            </div>
            <button onClick={probar} disabled={probando || !tienePassword}
              title={!tienePassword ? "Guarda primero la contraseña" : undefined}
              className="px-4 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 text-[12px] font-medium rounded-lg transition-colors">
              {probando ? "Enviando..." : "Enviar prueba"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
