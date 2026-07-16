// ─────────────────────────────────────────────────────────────────────────
// Ayuda del sistema — fuente única de verdad.
//
// Cada TemaAyuda alimenta DOS vistas:
//   1. El manual navegable  (/dashboard/ayuda)
//   2. El panel contextual  (botón ? del toolbar, según la pantalla actual)
//
// La coincidencia contextual se hace por `ruta` (el pathname de la pantalla).
// IMPORTANTE: los títulos y el orden de los temas replican EXACTAMENTE el menú
// del sistema (adm_opcion). Si el menú cambia, ajustar aquí para que coincidan.
// Estilo: conciso y directo, útil para cualquier rol.
// ─────────────────────────────────────────────────────────────────────────

export type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "pasos"; items: string[] }
  | { tipo: "campos"; items: { campo: string; desc: string }[] }
  | { tipo: "nota"; texto: string }
  | { tipo: "aviso"; texto: string };

export interface TemaAyuda {
  id: string;        // ej. "admin.empresa"
  titulo: string;    // debe coincidir con el nombre en el menú del sistema
  ruta?: string;     // pathname para el panel contextual (opcional)
  resumen: string;   // una línea, se muestra en la cabecera del panel
  captura?: string;  // ruta a la imagen principal (ej. "/ayuda/admin.empresa.png").
                     // Solo se muestra en el manual, NO en el panel contextual.
  bloques: Bloque[];
}

export interface ModuloAyuda {
  codigo: string;    // ej. "administracion"
  nombre: string;    // ej. "Administración"
  descripcion: string;
  temas: TemaAyuda[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO: ADMINISTRACIÓN
// Orden de los temas = orden del menú:
//   Empresa · Roles y permisos · Usuarios · Períodos contables · Monedas ·
//   TRM histórica · Condiciones de pago · Consecutivos · Parámetros CxC ·
//   Parámetros globales · Parámetros CxP
// ═══════════════════════════════════════════════════════════════════════════

const ADMINISTRACION: ModuloAyuda = {
  codigo: "administracion",
  nombre: "Administración",
  descripcion:
    "Donde se configura la base del sistema: identidad de la empresa, accesos, períodos contables y los catálogos y cuentas que usa el resto de los módulos.",
  temas: [
    // ── Introducción (no es opción del menú; abre el manual) ──────────────
    {
      id: "admin.intro",
      titulo: "Introducción",
      resumen: "Qué se configura en Administración y en qué orden conviene hacerlo.",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Administración es la base del sistema. Aquí defines quién entra, con qué permisos, y los catálogos y cuentas que el resto de los módulos usan al operar. La mayoría se configura una vez al inicio y casi no se vuelve a tocar.",
        },
        { tipo: "subtitulo", texto: "Qué encuentras aquí" },
        {
          tipo: "campos",
          items: [
            { campo: "Identidad y acceso", desc: "Empresa, Roles y permisos, Usuarios, Períodos contables." },
            { campo: "Catálogos base", desc: "Monedas, TRM histórica, Condiciones de pago, Consecutivos." },
            { campo: "Cuentas y comportamiento", desc: "Parámetros CxC, Parámetros globales, Parámetros CxP." },
          ],
        },
        {
          tipo: "nota",
          texto:
            "Toda pantalla tiene un botón «?» que abre su ayuda al instante. Estas opciones normalmente las gestiona un usuario administrador.",
        },
      ],
    },

    // ── 1. Empresa ────────────────────────────────────────────────────────
    {
      id: "admin.empresa",
      titulo: "Empresa",
      ruta: "/dashboard/empresa",
      resumen: "Datos de la empresa que se imprimen en los documentos y aparecen en el login.",
      captura: "/ayuda/admin.empresa.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Información legal de tu empresa. Se imprime en facturas, cotizaciones y reportes, y el logo aparece también en la pantalla de inicio de sesión.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Razón social", desc: "Nombre legal de la empresa." },
            { campo: "NIT + dígito de verificación", desc: "Identificación tributaria." },
            { campo: "Dirección, ciudad, departamento", desc: "Domicilio fiscal para los documentos." },
            { campo: "Teléfono y email", desc: "Datos de contacto." },
            { campo: "Régimen y responsable de IVA", desc: "Situación tributaria de la empresa." },
            { campo: "Actividad económica (CIIU)", desc: "Código y descripción; se imprimen en el pie de la factura." },
            { campo: "Logo", desc: "Se usa en impresiones y en el login." },
          ],
        },
        { tipo: "subtitulo", texto: "Cómo se usa" },
        {
          tipo: "lista",
          items: [
            "Edita los campos y guarda al final del formulario.",
            "Para el logo: arrástralo sobre el recuadro o haz clic para elegirlo.",
          ],
        },
      ],
    },

    // ── 2. Roles y permisos ───────────────────────────────────────────────
    {
      id: "admin.roles",
      titulo: "Roles y permisos",
      ruta: "/dashboard/roles",
      resumen: "Perfiles de acceso y qué puede hacer cada uno en cada pantalla.",
      captura: "/ayuda/admin.roles.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Un rol es un perfil de acceso (Contador, Asesor, Facturador…). Defines los permisos una vez en el rol y se los asignas a las personas, en lugar de configurarlos usuario por usuario.",
        },
        { tipo: "subtitulo", texto: "Las seis acciones por opción" },
        {
          tipo: "campos",
          items: [
            { campo: "Ver", desc: "Abrir la pantalla y consultar." },
            { campo: "Crear", desc: "Registrar documentos o registros nuevos." },
            { campo: "Editar", desc: "Modificar lo existente." },
            { campo: "Eliminar", desc: "Inactivar o dar de baja." },
            { campo: "Imprimir", desc: "Generar impresiones y PDF." },
            { campo: "Autorizar", desc: "Aprobar o contabilizar documentos." },
          ],
        },
        { tipo: "subtitulo", texto: "Cómo asignar permisos" },
        {
          tipo: "pasos",
          items: [
            "Crea o selecciona un rol.",
            "Abre «Permisos» de ese rol.",
            "Marca las acciones permitidas por módulo y opción, y guarda.",
          ],
        },
        {
          tipo: "nota",
          texto:
            "El rol «superadmin» tiene todos los permisos automáticamente. Los roles marcados como «cliente» son para el portal externo, no para el dashboard interno.",
        },
      ],
    },

    // ── 3. Usuarios ───────────────────────────────────────────────────────
    {
      id: "admin.usuarios",
      titulo: "Usuarios",
      ruta: "/dashboard/usuarios",
      resumen: "Las personas que acceden al sistema y su nivel de acceso.",
      captura: "/ayuda/admin.usuarios.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Cada persona que entra es un usuario. Inicia sesión con su correo y contraseña, y su rol define qué puede ver y hacer.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Nombre y apellido", desc: "Identifican a la persona." },
            { campo: "Email", desc: "Es el usuario de acceso. Debe ser único." },
            { campo: "Contraseña", desc: "Se define al crear o restablecer. No se puede ver, solo cambiar." },
            { campo: "Rol", desc: "Define los permisos (ver «Roles y permisos»)." },
            { campo: "Es asesor", desc: "Marca al usuario como asesor comercial; así aparece en las cotizaciones." },
            { campo: "Ver solo propios", desc: "Limita al usuario a ver únicamente sus registros. Solo aplica si es asesor." },
            { campo: "Tercero", desc: "Solo para usuarios cliente: los vincula al tercero cuyo portal verán." },
          ],
        },
        { tipo: "subtitulo", texto: "Acciones" },
        {
          tipo: "lista",
          items: [
            "Crear, editar o inactivar un usuario (inactivar no lo elimina, solo le quita el acceso).",
            "Filtrar por «solo activos» y buscar por nombre o correo.",
          ],
        },
        {
          tipo: "aviso",
          texto:
            "Las contraseñas se guardan cifradas y no se pueden consultar. Si un usuario la olvida, se restablece con una nueva.",
        },
      ],
    },

    // ── 4. Períodos contables ─────────────────────────────────────────────
    {
      id: "admin.periodos",
      titulo: "Períodos contables",
      ruta: "/dashboard/periodos",
      resumen: "Controlan en qué meses se puede contabilizar. Cerrarlos protege lo registrado.",
      captura: "/ayuda/admin.periodos.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "La contabilidad se organiza en períodos mensuales. Un documento solo se contabiliza si su período está abierto.",
        },
        { tipo: "subtitulo", texto: "Estados" },
        {
          tipo: "campos",
          items: [
            { campo: "Abierto", desc: "Permite registrar y contabilizar en ese mes." },
            { campo: "Cerrado", desc: "No admite nuevos movimientos. Se puede reabrir con motivo." },
            { campo: "Bloqueado", desc: "Cierre definitivo; no se registran movimientos." },
          ],
        },
        { tipo: "subtitulo", texto: "Acciones" },
        {
          tipo: "lista",
          items: [
            "Crear el período de un mes (las fechas se calculan solas).",
            "Cerrar: pide un motivo y queda registrado.",
            "Reabrir un período cerrado: pide motivo y queda auditado (quién y cuándo).",
          ],
        },
        {
          tipo: "aviso",
          texto:
            "Antes de cerrar un mes, verifica que todos los documentos estén contabilizados: un período cerrado bloquea correcciones hasta reabrirlo.",
        },
      ],
    },

    // ── 5. Monedas ────────────────────────────────────────────────────────
    {
      id: "admin.monedas",
      titulo: "Monedas",
      ruta: "/dashboard/administracion/monedas",
      resumen: "Las monedas con las que opera la empresa: la funcional y las extranjeras.",
      captura: "/ayuda/admin.monedas.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Define las monedas del sistema. Hay una moneda funcional (el peso, en la que se lleva la contabilidad) y las extranjeras que uses, como el dólar.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Código", desc: "Identificador corto (COP, USD…). No se cambia una vez creado." },
            { campo: "Nombre y símbolo", desc: "Cómo se muestra la moneda." },
            { campo: "Decimales", desc: "Cuántos decimales maneja en los montos." },
            { campo: "Es funcional", desc: "Marca la moneda base de la contabilidad (solo una)." },
          ],
        },
        {
          tipo: "nota",
          texto: "Las monedas extranjeras se convierten a la funcional usando la TRM.",
        },
      ],
    },

    // ── 6. TRM histórica ──────────────────────────────────────────────────
    {
      id: "admin.trm",
      titulo: "TRM histórica",
      ruta: "/dashboard/administracion/trm",
      resumen: "Tasa de cambio USD→COP del día e historial. Base de las operaciones en dólares.",
      captura: "/ayuda/admin.trm.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "La TRM convierte dólares a pesos. El sistema la usa para calcular equivalentes en pesos en cotizaciones y documentos en moneda extranjera. Esta pantalla muestra el historial y permite registrar la del día.",
        },
        { tipo: "subtitulo", texto: "Cómo funciona" },
        {
          tipo: "lista",
          items: [
            "Cada día se registra la TRM; el sistema propone el valor del Banco de la República, que puedes ajustar.",
            "En el toolbar hay un indicador: verde si la TRM del día está registrada, ámbar si falta.",
            "Al crear una cotización, la TRM del día se precarga sola.",
          ],
        },
        {
          tipo: "nota",
          texto: "Solo usuarios con permiso de administración pueden registrar la TRM.",
        },
      ],
    },

    // ── 7. Condiciones de pago ────────────────────────────────────────────
    {
      id: "admin.condiciones-pago",
      titulo: "Condiciones de pago",
      ruta: "/dashboard/administracion/condiciones-pago",
      resumen: "Plazos (contado, 30 días…) que calculan el vencimiento de los documentos.",
      captura: "/ayuda/admin.condiciones-pago.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Los plazos de pago que ofreces o recibes. Al elegir una condición en una factura o cotización, el sistema calcula la fecha de vencimiento sumando sus días a la fecha del documento.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Código y nombre", desc: "Identifican la condición (ej. «CONTADO», «30 días»)." },
            { campo: "Días de vencimiento", desc: "Días que se suman a la fecha del documento. 0 = contado." },
            { campo: "% de descuento", desc: "Descuento por pronto pago asociado (opcional)." },
          ],
        },
        {
          tipo: "lista",
          items: ["Crear, editar o activar/desactivar una condición.", "Buscar por código o nombre."],
        },
      ],
    },

    // ── 8. Consecutivos ───────────────────────────────────────────────────
    {
      id: "admin.consecutivos",
      titulo: "Consecutivos",
      ruta: "/dashboard/administracion/consecutivos",
      resumen: "Numeración automática (prefijo + número) de cada tipo de documento.",
      captura: "/ayuda/admin.consecutivos.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Controla la numeración de los documentos. Cada tipo tiene un prefijo y un número que avanza solo, sin saltos.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Prefijo", desc: "Texto antes del número (ej. «RC-»)." },
            { campo: "Número de inicio", desc: "Desde qué número empieza a contar." },
            { campo: "Longitud mínima", desc: "Ceros a la izquierda (ej. longitud 5 → 00001)." },
            { campo: "Número actual y ejemplo", desc: "El sistema muestra en qué va y cómo se verá el próximo." },
          ],
        },
        {
          tipo: "lista",
          items: ["Editar el prefijo, inicio o longitud de un consecutivo.", "Crear un consecutivo personalizado."],
        },
        {
          tipo: "aviso",
          texto:
            "Las facturas de venta electrónicas NO se numeran aquí: usan el rango autorizado en la resolución DIAN.",
        },
      ],
    },

    // ── 9. Parámetros CxC ─────────────────────────────────────────────────
    {
      id: "admin.parametros-cxc",
      titulo: "Parámetros CxC",
      ruta: "/dashboard/administracion/parametros-cxc",
      resumen: "Cuentas contables por defecto para los documentos de Cuentas por Cobrar.",
      captura: "/ayuda/admin.parametros-cxc.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Las cuentas que el sistema usa al generar los asientos de Cuentas por Cobrar (facturas de venta y recibos de caja). Se buscan por código o nombre.",
        },
        { tipo: "subtitulo", texto: "Cuentas" },
        {
          tipo: "campos",
          items: [
            { campo: "Cuenta de clientes", desc: "Donde se registra lo que los clientes deben." },
            { campo: "Cuenta de ingresos", desc: "Ingreso por defecto al facturar." },
            { campo: "Cuenta de IVA", desc: "IVA generado en las ventas." },
          ],
        },
        {
          tipo: "nota",
          texto:
            "En facturación, la cuenta de ingreso puede resolverse con más detalle desde el producto o su familia; esta es el respaldo.",
        },
      ],
    },

    // ── 10. Parámetros globales ───────────────────────────────────────────
    {
      id: "admin.configuracion",
      titulo: "Parámetros globales",
      ruta: "/dashboard/administracion/configuracion",
      resumen: "Interruptores y valores que gobiernan el comportamiento del sistema.",
      captura: "/ayuda/admin.configuracion.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Ajustes que cambian cómo se comporta el sistema. Se editan uno por uno y afectan a todos los usuarios.",
        },
        { tipo: "subtitulo", texto: "Parámetros" },
        {
          tipo: "campos",
          items: [
            { campo: "Permitir corrección de asientos", desc: "Habilita editar asientos manuales publicados (con auditoría)." },
            { campo: "Cierre automático de período", desc: "Si los períodos se cierran solos." },
            { campo: "Días de alerta de vencimiento CxC / CxP", desc: "Anticipación con que se avisa de facturas por vencer." },
            { campo: "Método de valoración de inventario", desc: "PROMEDIO o PEPS: cómo se costea la salida de inventario." },
            { campo: "Permite stock negativo", desc: "Si se puede despachar más de lo que hay en existencia." },
            { campo: "Días de validez de cotización", desc: "Vigencia por defecto de una cotización." },
            { campo: "Factura requiere cotización", desc: "Obliga a que toda factura provenga de una cotización." },
          ],
        },
        {
          tipo: "aviso",
          texto:
            "No cambies el método de valoración de inventario si ya existen movimientos: afecta el costeo histórico.",
        },
      ],
    },

    // ── 11. Parámetros CxP ────────────────────────────────────────────────
    {
      id: "admin.parametros-cxp",
      titulo: "Parámetros CxP",
      ruta: "/dashboard/administracion/parametros-cxp",
      resumen: "Cuentas contables por defecto para los documentos de Cuentas por Pagar.",
      captura: "/ayuda/admin.parametros-cxp.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Las cuentas que el sistema usa en los asientos de Cuentas por Pagar. Se buscan por código o nombre.",
        },
        { tipo: "subtitulo", texto: "Cuentas" },
        {
          tipo: "campos",
          items: [
            { campo: "Cuenta de proveedores", desc: "Se usa en el comprobante de pago (Débito Proveedores / Crédito Banco)." },
            { campo: "Cuenta de mercancías recibidas", desc: "Se usa al recibir mercancía de compras antes de la factura." },
          ],
        },
        {
          tipo: "nota",
          texto:
            "En la causación de facturas de proveedor, la cuenta de proveedores puede venir del concepto de cada línea; este parámetro actúa como respaldo.",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Registro de módulos (agregar aquí los demás módulos a medida que se escriban)
// ═══════════════════════════════════════════════════════════════════════════

export const MODULOS_AYUDA: ModuloAyuda[] = [ADMINISTRACION];

// ── Helpers ────────────────────────────────────────────────────────────────

export function todosLosTemas(): TemaAyuda[] {
  return MODULOS_AYUDA.flatMap((m) => m.temas);
}

export function getTemaPorRuta(pathname: string): TemaAyuda | null {
  return todosLosTemas().find((t) => t.ruta === pathname) ?? null;
}

export function getTemaPorId(id: string): TemaAyuda | null {
  return todosLosTemas().find((t) => t.id === id) ?? null;
}

export function getModuloDeTema(id: string): ModuloAyuda | null {
  return MODULOS_AYUDA.find((m) => m.temas.some((t) => t.id === id)) ?? null;
}
