"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { usePageTitle } from "@/lib/menu-context";

interface Empresa {
  id: string;
  razon_social: string;
  nit: string;
  digito_verif: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  telefono: string | null;
  email: string | null;
  regimen: string | null;
  responsable_iva: boolean;
  logo_url: string | null;
  actividad_economica_codigo: string | null;
  actividad_economica_descripcion: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-[12.5px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-gray-300 transition-shadow";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5";

// Encabezado de sección con icono — todo en una línea
function SectionHead({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 shrink-0">{title}</h2>
      <span className="text-[11px] text-gray-400 truncate min-w-0">· {subtitle}</span>
    </div>
  );
}

const ICO_MARCA = (<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>);
const ICO_ID    = (<><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M10 21v-4h4v4"/></>);
const ICO_MAP   = (<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>);

const cardCls = "bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4";

export default function EmpresaPage() {
  const title = usePageTitle();
  const [form, setForm]       = useState<Partial<Empresa>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Empresa>("/empresa")
      .then((data) => { setForm(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  const subirLogo = useCallback(async (file: File) => {
    setUploading(true);
    setMensaje(null);
    const token = localStorage.getItem("access_token");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API_URL}/empresa/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Error al subir el logo");
      }
      const data = await res.json();
      setForm((prev) => ({ ...prev, logo_url: data.logo_url }));
      setMensaje({ tipo: "ok", texto: "Logo actualizado" });
    } catch (err: unknown) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "Error al subir" });
    } finally {
      setUploading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) subirLogo(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMensaje(null);
    try {
      await apiFetch("/empresa", { method: "PUT", body: JSON.stringify(form) });
      setMensaje({ tipo: "ok", texto: "Cambios guardados" });
    } catch (err: unknown) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-[12px] text-gray-400">Cargando...</p>;

  return (
    <div className="max-w-4xl pb-2">

      {/* Encabezado de página */}
      <div className="mb-6">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Datos generales y apariencia · se usan en documentos, impresiones y en el login.</p>
      </div>

      {/* Marca / Logo */}
      <section className={cardCls}>
        <SectionHead icon={ICO_MARCA} title="Marca" subtitle="Logo que aparece en los documentos y en la pantalla de inicio de sesión" />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-5 border border-dashed rounded-xl px-5 py-4 cursor-pointer transition-colors ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50/60"
          }`}
        >
          <div className="w-32 h-16 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {form.logo_url ? (
              <Image src={form.logo_url} alt="Logo" width={160} height={60}
                style={{ objectFit: "contain", width: "auto", height: "48px" }} unoptimized />
            ) : (
              <span className="text-gray-300 text-2xl">▣</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] text-gray-700 font-medium">
              {uploading ? "Subiendo…" : "Arrastra una imagen o haz clic para cambiar el logo"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG o WEBP · máximo 2 MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); }} />
        </div>
      </section>

      {/* Identificación */}
      <section className={cardCls}>
        <SectionHead icon={ICO_ID} title="Identificación" subtitle="Datos legales y tributarios de la empresa" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Razón social</label>
            <input name="razon_social" value={form.razon_social ?? ""} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>NIT</label>
            <input name="nit" value={form.nit ?? ""} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Dígito verificación</label>
            <input name="digito_verif" value={form.digito_verif ?? ""} onChange={handleChange} maxLength={1} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Régimen</label>
            <select name="regimen" value={form.regimen ?? ""} onChange={handleChange} className={inputCls}>
              <option value="">Seleccionar</option>
              <option value="SIMPLIFICADO">Simplificado</option>
              <option value="COMUN">Común</option>
              <option value="GRAN_CONTRIBUYENTE">Gran contribuyente</option>
            </select>
          </div>
          <label htmlFor="responsable_iva" className="flex items-center gap-2.5 self-end p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer select-none transition-colors">
            <input type="checkbox" id="responsable_iva" name="responsable_iva"
              checked={form.responsable_iva ?? false} onChange={handleChange}
              className="w-4 h-4 accent-blue-600 shrink-0" />
            <span className="text-[12px] text-gray-700 font-medium">Responsable de IVA</span>
          </label>
          <div>
            <label className={labelCls}>Código CIIU (actividad económica)</label>
            <input name="actividad_economica_codigo" value={form.actividad_economica_codigo ?? ""} onChange={handleChange} maxLength={10} placeholder="Ej. 6201" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Descripción actividad económica</label>
            <input name="actividad_economica_descripcion" value={form.actividad_economica_descripcion ?? ""} onChange={handleChange} placeholder="Ej. Actividades de desarrollo de sistemas informáticos" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Contacto y ubicación */}
      <section className={cardCls}>
        <SectionHead icon={ICO_MAP} title="Contacto y ubicación" subtitle="Dirección y datos de contacto de la empresa" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Dirección</label>
            <input name="direccion" value={form.direccion ?? ""} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ciudad</label>
            <input name="ciudad" value={form.ciudad ?? ""} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Departamento</label>
            <input name="departamento" value={form.departamento ?? ""} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input name="telefono" value={form.telefono ?? ""} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input name="email" type="email" value={form.email ?? ""} onChange={handleChange} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Barra de acción */}
      <div className="sticky bottom-0 -mx-1 mt-2 flex items-center justify-end gap-3 bg-[#f4f5f7]/80 backdrop-blur-sm py-3">
        {mensaje && (
          <span className={`text-[11px] px-3 py-1.5 rounded-lg border ${
            mensaje.tipo === "ok" ? "text-green-700 bg-green-50 border-green-200" : "text-red-600 bg-red-50 border-red-200"
          }`}>
            {mensaje.texto}
          </span>
        )}
        <button onClick={handleSubmit} disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12.5px] font-medium rounded-lg transition-colors shadow-sm">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
