"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Perfil {
  razon_social: string; nit: string;
  email: string | null; telefono: string | null; direccion: string | null; ciudad: string | null;
  nombre_contacto: string | null; cargo_contacto: string | null;
  telefono_contacto: string | null; email_contacto: string | null;
  usuario_nombre: string; usuario_email: string;
}

const lbl = "block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1";
const inp = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function PortalPerfilPage() {
  const [p, setP] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ telefono: "", direccion: "", ciudad: "", nombre_contacto: "", cargo_contacto: "", telefono_contacto: "", email_contacto: "" });

  useEffect(() => {
    apiFetch<Perfil>("/portal/perfil").then((d) => {
      setP(d);
      setForm({
        telefono: d.telefono ?? "", direccion: d.direccion ?? "", ciudad: d.ciudad ?? "",
        nombre_contacto: d.nombre_contacto ?? "", cargo_contacto: d.cargo_contacto ?? "",
        telefono_contacto: d.telefono_contacto ?? "", email_contacto: d.email_contacto ?? "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setOk(false); }

  async function guardar() {
    setSaving(true); setError(""); setOk(false);
    try {
      const d = await apiFetch<Perfil>("/portal/perfil", { method: "PUT", body: JSON.stringify(form) });
      setP(d); setOk(true); setTimeout(() => setOk(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="py-16 text-center text-[13px] text-gray-400">Cargando...</div>;
  if (!p) return <div className="py-16 text-center text-[13px] text-gray-400">No se pudo cargar el perfil</div>;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-blue-600">Mi perfil</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Datos de tu empresa y contacto</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <p className="text-[14px] font-bold text-gray-800">{p.razon_social}</p>
            <p className="text-[11px] text-gray-400">NIT {p.nit}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-gray-700">{p.usuario_nombre}</p>
            <p className="text-[11px] text-gray-400">{p.usuario_email}</p>
          </div>
        </div>

        {error && <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {ok && <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Datos actualizados correctamente.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Teléfono</label><input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Ciudad</label><input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} className={inp} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Dirección</label><input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} className={inp} /></div>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 pt-2 border-t border-gray-100">Contacto</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Nombre contacto</label><input value={form.nombre_contacto} onChange={(e) => set("nombre_contacto", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Cargo</label><input value={form.cargo_contacto} onChange={(e) => set("cargo_contacto", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Teléfono contacto</label><input value={form.telefono_contacto} onChange={(e) => set("telefono_contacto", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Email contacto</label><input value={form.email_contacto} onChange={(e) => set("email_contacto", e.target.value)} className={inp} /></div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
