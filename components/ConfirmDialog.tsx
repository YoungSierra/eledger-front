"use client";

interface ConfirmDialogProps {
  open: boolean;
  titulo?: string;
  mensaje: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open, titulo = "Confirmar", mensaje, confirmLabel = "Confirmar",
  cancelLabel = "Cancelar", danger = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={danger ? "#dc2626" : "#2563eb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {danger
                ? <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>}
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-gray-800">{titulo}</h3>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{mensaje}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">{cancelLabel}</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-[12px] font-medium text-white rounded-lg ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
