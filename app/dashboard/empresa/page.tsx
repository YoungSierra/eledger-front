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

const inputCls = "w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-300";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1";

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
    <div className="max-w-3xl">

      {/* Encabezado */}
      <div className="mb-5">
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Datos generales y apariencia</p>
      </div>

      {/* Tarjeta logo */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <p className={labelCls}>Logo</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-4 border border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          {form.logo_url ? (
            <Image src={form.logo_url} alt="Logo" width={120} height={40}
              style={{ objectFit: "contain", width: "auto", height: "36px" }} unoptimized />
          ) : (
            <div className="w-16 h-9 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-lg">▣</div>
          )}
          <div>
            <p className="text-[12px] text-gray-600 font-medium">
              {uploading ? "Subiendo..." : "Arrastra o haz clic para cambiar el logo"}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WEBP · máx. 2 MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); }} />
        </div>
      </div>

      {/* Tarjeta datos */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <p className={labelCls}>Identificación</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
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
          <div className="flex items-center gap-2 pt-4">
            <input type="checkbox" id="responsable_iva" name="responsable_iva"
              checked={form.responsable_iva ?? false} onChange={handleChange}
              className="w-3.5 h-3.5 accent-blue-600" />
            <label htmlFor="responsable_iva" className="text-[12px] text-gray-600">Responsable de IVA</label>
          </div>
          <div>
            <label className={labelCls}>Código CIIU (actividad económica)</label>
            <input name="actividad_economica_codigo" value={form.actividad_economica_codigo ?? ""} onChange={handleChange} maxLength={10} placeholder="Ej. 6201" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Descripción actividad económica</label>
            <input name="actividad_economica_descripcion" value={form.actividad_economica_descripcion ?? ""} onChange={handleChange} placeholder="Ej. Actividades de desarrollo de sistemas informáticos" className={inputCls} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <p className={labelCls}>Contacto y ubicación</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
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
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`text-[11px] px-3 py-2 rounded-lg mb-3 border ${
          mensaje.tipo === "ok"
            ? "text-green-700 bg-green-50 border-green-200"
            : "text-red-600 bg-red-50 border-red-200"
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Acción */}
      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
