"use client";

import { FacturasProveedorView } from "../facturas/page";

export default function NotasCreditoCxpPage() {
  return (
    <FacturasProveedorView
      tipoFijo="NOTA_CREDITO"
      nuevoLabel="Nueva nota crédito"
      singular="nota crédito"
    />
  );
}
