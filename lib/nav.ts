export interface NavItem {
  label: string;
  href: string;
  implemented: boolean;
}

export interface NavGroup {
  label: string;
  modulo: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Administración",
    modulo: "administracion",
    items: [
      { label: "Empresa",            href: "/dashboard/empresa",  implemented: true  },
      { label: "Usuarios",           href: "/dashboard/usuarios", implemented: true  },
      { label: "Períodos contables", href: "/dashboard/periodos", implemented: false },
      { label: "Roles y permisos",   href: "/dashboard/roles",    implemented: true  },
    ],
  },
  {
    label: "Contabilidad",
    modulo: "contabilidad",
    items: [
      { label: "Plan de cuentas",  href: "/dashboard/contabilidad/cuentas",         implemented: false },
      { label: "Centros de costo", href: "/dashboard/contabilidad/centros-costo",   implemented: false },
      { label: "Terceros",         href: "/dashboard/contabilidad/terceros",         implemented: true  },
      { label: "Asientos",         href: "/dashboard/contabilidad/asientos",         implemented: false },
    ],
  },
  {
    label: "Cuentas por Cobrar",
    modulo: "cxc",
    items: [
      { label: "Facturas clientes",  href: "/dashboard/cxc/facturas",   implemented: false },
      { label: "Recibos de caja",    href: "/dashboard/cxc/recibos",    implemented: false },
      { label: "Notas crédito",      href: "/dashboard/cxc/notas",      implemented: false },
      { label: "Anticipos",          href: "/dashboard/cxc/anticipos",  implemented: false },
    ],
  },
  {
    label: "Cuentas por Pagar",
    modulo: "cxp",
    items: [
      { label: "Facturas proveedor",    href: "/dashboard/cxp/facturas",    implemented: false },
      { label: "Comprobantes de pago",  href: "/dashboard/cxp/comprobantes",implemented: false },
      { label: "Notas crédito",         href: "/dashboard/cxp/notas",       implemented: false },
      { label: "Anticipos proveedor",   href: "/dashboard/cxp/anticipos",   implemented: false },
    ],
  },
  {
    label: "Inventario",
    modulo: "inventario",
    items: [
      { label: "Productos",    href: "/dashboard/inventario/productos",   implemented: false },
      { label: "Bodegas",      href: "/dashboard/inventario/bodegas",     implemented: false },
      { label: "Movimientos",  href: "/dashboard/inventario/movimientos", implemented: false },
    ],
  },
  {
    label: "Compras",
    modulo: "compras",
    items: [
      { label: "Órdenes de compra", href: "/dashboard/compras/ordenes",    implemented: false },
      { label: "Recepciones",       href: "/dashboard/compras/recepciones",implemented: false },
    ],
  },
  {
    label: "Facturación",
    modulo: "facturacion",
    items: [
      { label: "Facturas de venta",   href: "/dashboard/facturacion/facturas",     implemented: false },
      { label: "Cotizaciones",        href: "/dashboard/facturacion/cotizaciones",  implemented: false },
      { label: "Remisiones",          href: "/dashboard/facturacion/remisiones",    implemented: false },
      { label: "Devoluciones",        href: "/dashboard/facturacion/devoluciones",  implemented: false },
      { label: "Factura electrónica", href: "/dashboard/facturacion/electronica",   implemented: false },
    ],
  },
  {
    label: "Bancos",
    modulo: "bancos",
    items: [
      { label: "Cuentas bancarias", href: "/dashboard/bancos/cuentas",       implemented: false },
      { label: "Extractos",         href: "/dashboard/bancos/extractos",      implemented: false },
      { label: "Conciliación",      href: "/dashboard/bancos/conciliacion",   implemented: false },
      { label: "Chequeras",         href: "/dashboard/bancos/chequeras",      implemented: false },
    ],
  },
  {
    label: "Operaciones",
    modulo: "operaciones",
    items: [
      { label: "Cotizaciones de carga",  href: "/dashboard/operaciones/cotizaciones", implemented: true  },
      { label: "Operaciones",            href: "/dashboard/operaciones/operaciones",  implemented: false },
      { label: "Aerolíneas",             href: "/dashboard/operaciones/aerolineas",   implemented: true  },
      { label: "Aeropuertos",            href: "/dashboard/operaciones/aeropuertos",  implemented: true  },
      { label: "Conceptos tarifarios",   href: "/dashboard/operaciones/conceptos",    implemented: true  },
    ],
  },
  {
    label: "Reportes",
    modulo: "reportes",
    items: [
      { label: "Balance general",        href: "/dashboard/reportes/balance",     implemented: true  },
      { label: "Estado de resultados",   href: "/dashboard/reportes/resultados",  implemented: true  },
      { label: "Flujo de efectivo",      href: "/dashboard/reportes/flujo",       implemented: false },
      { label: "Cambios en patrimonio",  href: "/dashboard/reportes/patrimonio",  implemented: false },
      { label: "Libro mayor",            href: "/dashboard/reportes/mayor",       implemented: true  },
      { label: "Balanza de comprobación",href: "/dashboard/reportes/balanza",     implemented: false },
      { label: "Auxiliar por tercero",    href: "/dashboard/reportes/auxiliar",    implemented: true  },
      { label: "Cartera por edades",     href: "/dashboard/reportes/cartera",     implemented: false },
      { label: "Inventario valorado",    href: "/dashboard/reportes/inventario",  implemented: false },
    ],
  },
];
