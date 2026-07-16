"use client";

/**
 * Sello de estado para impresiones de documentos.
 * Si el documento NO está EMITIDA (borrador o anulado), muestra su estado como
 * marca de agua diagonal centrada en la página. Si está EMITIDA, no muestra nada.
 * Tamaño acotado para que la marca rotada NO se desborde de la hoja al imprimir/PDF.
 */
export default function DraftWatermark({ estado }: { estado?: string | null }) {
  if (!estado || estado === "EMITIDA") return null;
  const color = estado === "ANULADA" ? "rgba(220, 38, 38, 0.13)" : "rgba(100, 116, 139, 0.15)";
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 9999,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-32deg)",
          transformOrigin: "center",
          fontSize: 82,
          fontWeight: 800,
          letterSpacing: 4,
          color,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          userSelect: "none",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {estado}
      </span>
    </div>
  );
}
