"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Config {
  id: string;
  proveedor: "DATAICO" | "PTH_APIFE" | "PTH_SIECOM" | "PTH_FACTUS" | "DIAN_DIRECTO";
  nombre_pth: string | null;
  ambiente: "PRUEBAS" | "PRODUCCION";
  activo: boolean;
  account_id: string | null;
  base_url: string | null;
  test_prefix: string | null;
  test_resolution_number: string | null;
  auth_token_mascara: string | null;
  tiene_token: boolean;
  client_id: string | null;
  username: string | null;
  numbering_range_id: string | null;
  client_secret_mascara: string | null;
  password_mascara: string | null;
  tiene_client_secret: boolean;
  tiene_password: boolean;
  modificado_en: string | null;
}

/** Campo de secreto: se guarda cifrado y solo se muestra enmascarado. */
function Secreto({ label, placeholder, valor, setValor, mascara, tiene, ver, setVer }: {
  label: string; placeholder: string;
  valor: string | null; setValor: (v: string | null) => void;
  mascara: string | null; tiene: boolean; ver: boolean; setVer: (v: boolean) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <p className={ayudaCls}>
        Se guarda cifrado y no se puede volver a leer.
        {tiene && !ver && <> Actual: <span className="font-mono text-gray-600">{mascara}</span></>}
      </p>
      {tiene && !ver ? (
        <button type="button" onClick={() => { setVer(true); setValor(""); }}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 hover:bg-gray-50">
          Reemplazar
        </button>
      ) : (
        <div className="flex gap-2">
          <input type="password" value={valor ?? ""} onChange={(e) => setValor(e.target.value)}
            className={inputCls} placeholder={placeholder} autoComplete="new-password" />
          {tiene && (
            <button type="button" onClick={() => { setVer(false); setValor(null); }}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-500 hover:bg-gray-50 shrink-0">
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1";
const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";
const ayudaCls = "text-[11px] text-gray-400 mb-1.5";

const PROVEEDORES = [
  { v: "DATAICO", l: "Dataico" },
  { v: "PTH_APIFE", l: "API-FE" },
  { v: "PTH_SIECOM", l: "Siecom" },
  { v: "PTH_FACTUS", l: "Factus" },
  { v: "DIAN_DIRECTO", l: "DIAN directo" },
];

export default function FacturacionElectronicaPage() {
  const title = usePageTitle();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const [proveedor, setProveedor] = useState<Config["proveedor"]>("DATAICO");
  const [nombrePth, setNombrePth] = useState("");
  const [ambiente, setAmbiente] = useState<Config["ambiente"]>("PRUEBAS");
  const [activo, setActivo] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [testPrefix, setTestPrefix] = useState("");
  const [testResolution, setTestResolution] = useState("");
  // null = no se tocó, se conserva el guardado. String = reemplazar.
  const [token, setToken] = useState<string | null>(null);
  const [mascara, setMascara] = useState<string | null>(null);
  const [tieneToken, setTieneToken] = useState(false);
  const [verToken, setVerToken] = useState(false);
  // Factus (OAuth2)
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [numberingRange, setNumberingRange] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [secretMascara, setSecretMascara] = useState<string | null>(null);
  const [passwordMascara, setPasswordMascara] = useState<string | null>(null);
  const [tieneSecret, setTieneSecret] = useState(false);
  const [tienePassword, setTienePassword] = useState(false);
  const [verSecret, setVerSecret] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const d = await apiFetch<Config | null>("/facturacion/config-electronica");
      if (d) {
        setProveedor(d.proveedor);
        setNombrePth(d.nombre_pth ?? "");
        setAmbiente(d.ambiente);
        setActivo(d.activo);
        setAccountId(d.account_id ?? "");
        setBaseUrl(d.base_url ?? "");
        setTestPrefix(d.test_prefix ?? "");
        setTestResolution(d.test_resolution_number ?? "");
        setMascara(d.auth_token_mascara);
        setTieneToken(d.tiene_token);
        setClientId(d.client_id ?? "");
        setUsername(d.username ?? "");
        setNumberingRange(d.numbering_range_id ?? "");
        setSecretMascara(d.client_secret_mascara);
        setPasswordMascara(d.password_mascara);
        setTieneSecret(d.tiene_client_secret);
        setTienePassword(d.tiene_password);
      }
    } catch {
      // apiFetch redirige a /login si la sesión expiró
    } finally { setLoading(false); }
  }

  async function guardar() {
    setSaving(true); setError(""); setOk(""); setPrueba(null);
    try {
      const d = await apiFetch<Config>("/facturacion/config-electronica", {
        method: "PUT",
        body: JSON.stringify({
          proveedor, nombre_pth: nombrePth || null, ambiente, activo,
          account_id: accountId || null,
          base_url: baseUrl || null,
          test_prefix: testPrefix || null,
          test_resolution_number: testResolution || null,
          ...(token !== null ? { auth_token: token } : {}),
          client_id: clientId || null,
          username: username || null,
          numbering_range_id: numberingRange || null,
          ...(clientSecret !== null ? { client_secret: clientSecret } : {}),
          ...(password !== null ? { password } : {}),
        }),
      });
      setMascara(d.auth_token_mascara);
      setTieneToken(d.tiene_token);
      setToken(null);
      setVerToken(false);
      setSecretMascara(d.client_secret_mascara);
      setPasswordMascara(d.password_mascara);
      setTieneSecret(d.tiene_client_secret);
      setTienePassword(d.tiene_password);
      setClientSecret(null); setPassword(null);
      setVerSecret(false); setVerPassword(false);
      setOk("Configuración guardada.");
      setTimeout(() => setOk(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  async function probar() {
    setProbando(true); setPrueba(null);
    try {
      setPrueba(await apiFetch<{ ok: boolean; mensaje: string }>(
        "/facturacion/config-electronica/probar", { method: "POST" }));
    } catch (e) {
      setPrueba({ ok: false, mensaje: e instanceof Error ? e.message : "Error" });
    } finally { setProbando(false); }
  }

  const esDataico = proveedor === "DATAICO";
  const esFactus = proveedor === "PTH_FACTUS";

  return (
    <div className="h-full flex flex-col max-w-2xl">
      <div className="mb-5 shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Proveedor tecnológico y credenciales para transmitir documentos a la DIAN
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
              <label className={labelCls}>Proveedor</label>
              <p className={ayudaCls}>Quién transmite a la DIAN</p>
              <select value={proveedor} onChange={(e) => setProveedor(e.target.value as Config["proveedor"])} className={inputCls}>
                {PROVEEDORES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ambiente</label>
              <p className={ayudaCls}>Pruebas no afecta la DIAN real</p>
              <select value={ambiente} onChange={(e) => setAmbiente(e.target.value as Config["ambiente"])} className={inputCls}>
                <option value="PRUEBAS">Pruebas / habilitación</option>
                <option value="PRODUCCION">Producción</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Nombre del proveedor tecnológico</label>
            <p className={ayudaCls}>Aparece en el pie de la factura impresa. Ej: DATAICO S.A.S</p>
            <input value={nombrePth} onChange={(e) => setNombrePth(e.target.value)} className={inputCls} placeholder="DATAICO S.A.S" />
          </div>

          {esDataico && (
            <>
              <div className="border-t border-gray-100 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700 mb-3">Credenciales Dataico</p>

                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Account ID</label>
                    <p className={ayudaCls}>Header <code className="text-gray-500">Dataico_account_id</code>. En Dataico: Opciones → Configuración</p>
                    <input value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} placeholder="00000000-0000-0000-0000-000000000000" />
                  </div>

                  <div>
                    <label className={labelCls}>Auth-Token</label>
                    <p className={ayudaCls}>
                      Se guarda cifrado y no se puede volver a leer.
                      {tieneToken && !verToken && <> Actual: <span className="font-mono text-gray-600">{mascara}</span></>}
                    </p>
                    {tieneToken && !verToken ? (
                      <button type="button"
                        onClick={() => { setVerToken(true); setToken(""); }}
                        className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-600 hover:bg-gray-50">
                        Reemplazar token
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input type="password" value={token ?? ""} onChange={(e) => setToken(e.target.value)}
                          className={inputCls} placeholder="Pegar el Auth-Token de Dataico" autoComplete="new-password" />
                        {tieneToken && (
                          <button type="button" onClick={() => { setVerToken(false); setToken(null); }}
                            className="px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-500 hover:bg-gray-50 shrink-0">
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>URL base <span className="font-normal normal-case tracking-normal text-gray-400">(opcional)</span></label>
                    <p className={ayudaCls}>
                      Vacío = producción (<code className="text-gray-500">api.dataico.com</code>).
                      Dataico entrega la URL de habilitación al onboarding.
                    </p>
                    <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputCls}
                      placeholder="https://api.dataico.com/direct/dataico_api/v2" />
                  </div>

                  {ambiente === "PRUEBAS" && (
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-1">Numeración de pruebas (SETP)</p>
                      <p className={ayudaCls}>
                        Solo para ambiente PRUEBAS. Es la numeración de habilitación registrada en tu cuenta Dataico
                        (Ventas → Facturas → Asociar Numeración). En producción se usa la resolución real del sistema.
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Prefijo</label>
                          <input value={testPrefix} onChange={(e) => setTestPrefix(e.target.value)} className={inputCls} placeholder="SETP" />
                        </div>
                        <div className="col-span-2">
                          <label className={labelCls}>N.º de resolución</label>
                          <input value={testResolution} onChange={(e) => setTestResolution(e.target.value)} className={inputCls} placeholder="18760000001" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {esFactus && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700 mb-3">Credenciales Factus</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Client ID</label>
                    <p className={ayudaCls}>Lo entrega Factus al vincularte.</p>
                    <input value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}
                      placeholder="00000000-0000-0000-0000-000000000000" />
                  </div>
                  <div>
                    <label className={labelCls}>Usuario</label>
                    <p className={ayudaCls}>Correo de la cuenta.</p>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls}
                      placeholder="correo@empresa.com" autoComplete="off" />
                  </div>
                </div>

                <Secreto label="Client Secret" placeholder="Pegar el Client Secret de Factus"
                  valor={clientSecret} setValor={setClientSecret} mascara={secretMascara}
                  tiene={tieneSecret} ver={verSecret} setVer={setVerSecret} />

                <Secreto label="Contraseña" placeholder="Contraseña de la cuenta Factus"
                  valor={password} setValor={setPassword} mascara={passwordMascara}
                  tiene={tienePassword} ver={verPassword} setVer={setVerPassword} />

                <div>
                  <label className={labelCls}>Rango de numeración</label>
                  <p className={ayudaCls}>
                    ID del rango ya asociado en tu cuenta Factus — él asigna el consecutivo.
                    Usa <strong>Probar conexión</strong> para ver los disponibles.
                  </p>
                  <input value={numberingRange} onChange={(e) => setNumberingRange(e.target.value)} className={inputCls} placeholder="389" />
                </div>

                <div>
                  <label className={labelCls}>URL base <span className="font-normal normal-case tracking-normal text-gray-400">(opcional)</span></label>
                  <p className={ayudaCls}>
                    Vacío = según el ambiente: <code className="text-gray-500">api-sandbox.factus.com.co</code> en pruebas,
                    <code className="text-gray-500"> api.factus.com.co</code> en producción.
                  </p>
                  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputCls}
                    placeholder="https://api-sandbox.factus.com.co" />
                </div>

                <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  El municipio del emisor sale de <strong>Empresa → Contacto y ubicación</strong>, y el del cliente
                  de su ficha en Terceros. No se configura aquí.
                </p>
              </div>
            </div>
          )}

          {!esDataico && !esFactus && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Solo Dataico y Factus tienen integración implementada. Los demás proveedores están en el diseño pero aún no se pueden configurar.
            </p>
          )}

          <div className="border-t border-gray-100 pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4" />
              <span className="text-[12px] font-medium text-gray-700">Integración activa</span>
            </label>
            <p className="text-[11px] text-gray-400 mt-1">
              Al activarla, las facturas se transmiten al proveedor. Requiere Account ID y Auth-Token.
            </p>
          </div>

          {prueba && (
            <p className={`text-[11px] rounded-lg px-3 py-2 border ${
              prueba.ok ? "text-green-700 bg-green-50 border-green-200" : "text-red-600 bg-red-50 border-red-200"
            }`}>{prueba.mensaje}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={guardar} disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={probar} disabled={probando || !tieneToken}
              title={!tieneToken ? "Guarda primero el Auth-Token" : undefined}
              className="px-4 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 text-[12px] font-medium rounded-lg transition-colors">
              {probando ? "Probando..." : "Probar conexión"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
