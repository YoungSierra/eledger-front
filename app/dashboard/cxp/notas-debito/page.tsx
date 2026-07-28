"use client";

import { FacturasProveedorView } from "../facturas/page";

export default function NotasDebitoCxpPage() {
  return (
    <FacturasProveedorView
      tipoFijo="NOTA_DEBITO"
      nuevoLabel="Nueva nota débito"
      singular="nota débito"
    />
  );
}
