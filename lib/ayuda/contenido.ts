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
//   Parámetros globales · Parámetros CxP · Facturación electrónica ·
//   Correo saliente
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
            { campo: "Conexiones externas", desc: "Facturación electrónica (proveedor ante la DIAN) y Correo saliente (notificaciones a clientes)." },
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

    // ── 11. Facturación electrónica ───────────────────────────────────────
    {
      id: "admin.facturacion-electronica",
      titulo: "Facturación electrónica",
      ruta: "/dashboard/administracion/facturacion-electronica",
      resumen: "Conexión con el proveedor tecnológico que transmite las facturas a la DIAN.",
      captura: "/ayuda/admin.facturacion-electronica.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "La factura electrónica no se envía directo a la DIAN: la transmite un proveedor tecnológico (PTH). Aquí se eligen el proveedor, sus credenciales y el ambiente. Se configura una vez, al habilitar la facturación.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Proveedor", desc: "Quién transmite a la DIAN (Factus). Según el que elijas cambian las credenciales que pide." },
            { campo: "Ambiente", desc: "Pruebas / habilitación no afecta la DIAN real. Producción emite facturas con validez legal." },
            { campo: "Credenciales", desc: "Las entrega el proveedor al vincularte: Client ID, Client Secret, usuario y contraseña. Los secretos se guardan cifrados y no se pueden volver a leer." },
            { campo: "Rango de numeración", desc: "ID del rango asociado en la cuenta Factus; él asigna el consecutivo. «Probar conexión» muestra los disponibles." },
            { campo: "URL base", desc: "Opcional. Vacío = la que corresponde al ambiente elegido." },
            { campo: "Nombre del proveedor tecnológico", desc: "Aparece en el pie de la factura impresa." },
            { campo: "Integración activa", desc: "Si está apagada, las facturas no se envían a la DIAN." },
          ],
        },
        { tipo: "subtitulo", texto: "Cómo se usa" },
        {
          tipo: "pasos",
          items: [
            "Elige el proveedor y el ambiente.",
            "Pega las credenciales y guarda.",
            "Pulsa «Probar conexión» y verifica que responda bien.",
            "Activa la integración.",
          ],
        },
        {
          tipo: "aviso",
          texto:
            "Pasar a Producción solo cuando el proveedor y la DIAN hayan habilitado la empresa. Lo que se emite en Producción no se puede borrar: se corrige con nota crédito.",
        },
        {
          tipo: "nota",
          texto:
            "La resolución de numeración real se registra en Facturación → Resoluciones DIAN. Los datos de dirección y ciudad que viajan en la factura salen de Empresa.",
        },
      ],
    },

    // ── 12. Correo saliente ───────────────────────────────────────────────
    {
      id: "admin.correo",
      titulo: "Correo saliente",
      ruta: "/dashboard/administracion/correo",
      resumen: "Buzón desde el que salen las notificaciones a los clientes.",
      captura: "/ayuda/admin.correo.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Configura el buzón que usa el sistema para notificar a los clientes desde la bitácora de la operación. El envío nunca es automático: se hace solo cuando el usuario lo marca al registrar el evento.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Correo remitente / Nombre visible", desc: "Dirección desde la que salen los correos y el nombre que ve el cliente." },
            { campo: "Proveedor", desc: "Llena servidor, puerto y cifrado con los valores típicos de Google Workspace, Microsoft 365 o cPanel." },
            { campo: "Servidor / Puerto / Cifrado", desc: "Datos del SMTP de salida. Los entrega el proveedor de correo o quien administre el dominio." },
            { campo: "Usuario y contraseña", desc: "Credenciales del buzón. La contraseña se guarda cifrada y no se puede volver a leer." },
            { campo: "Correo de respuesta", desc: "Opcional: si las respuestas del cliente deben llegar a otra dirección." },
            { campo: "Copia oculta interna", desc: "Opcional: buzones internos que reciben copia de cada notificación, separados por coma." },
            { campo: "Envío activo", desc: "Si está inactivo, la bitácora no ofrece la opción de notificar al cliente." },
          ],
        },
        {
          tipo: "aviso",
          texto:
            "En Google Workspace y Microsoft 365 la contraseña normal NO sirve: hay que generar una contraseña de aplicación desde la configuración de seguridad de la cuenta.",
        },
        {
          tipo: "nota",
          texto:
            "Usa Enviar prueba antes de notificar a un cliente real. Y pide a quien administre el dominio que revise SPF, DKIM y DMARC: sin ellos los correos caen en la bandeja de spam del destinatario.",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO: OPERACIONES
// Orden de los temas = orden del menú:
//   Cotizaciones · Operaciones · Rastreo de embarques · Aerolíneas ·
//   Aeropuertos y puertos · Conceptos tarifarios
// ═══════════════════════════════════════════════════════════════════════════

const OPERACIONES: ModuloAyuda = {
  codigo: "operaciones",
  nombre: "Operaciones",
  descripcion:
    "El ciclo comercial y operativo del embarque: se cotiza, la cotización aprobada abre la operación, y en ella se emiten las guías, se hace el seguimiento y se confirma lo que se va a facturar.",
  temas: [
    // ── Introducción (no es opción del menú; abre el manual) ──────────────
    {
      id: "ope.intro",
      titulo: "Introducción",
      resumen: "El recorrido de un embarque, de la cotización a la factura.",
      bloques: [
        {
          tipo: "pasos",
          items: [
            "Cotizaciones: se arma la oferta con venta, costo y margen, y se envía al cliente.",
            "Al aprobar la cotización se crea sola la operación: la carpeta del embarque.",
            "En la operación se emiten MAWB, HAWB y manifiesto (o MBL/HBL si es marítimo).",
            "La bitácora registra cada novedad y puede notificar al cliente por correo.",
            "Operaciones confirma lo realmente prestado; solo lo confirmado se factura.",
            "Se factura desde la operación y, con todo emitido y confirmado, se cierra.",
          ],
        },
        { tipo: "subtitulo", texto: "Antes de empezar" },
        {
          tipo: "campos",
          items: [
            { campo: "TRM del día", desc: "La registra el administrador al entrar. Si falta, el sistema precarga la sugerida o la última y avisa." },
            { campo: "Clientes", desc: "Se crean en Contabilidad → Terceros, con país, documento y correo bien diligenciados." },
            { campo: "Catálogos", desc: "Aerolíneas, Aeropuertos y puertos, y Conceptos tarifarios." },
          ],
        },
        {
          tipo: "nota",
          texto:
            "Si tu usuario está marcado para ver solo registros propios, solo verás tus clientes y las cotizaciones y operaciones que te corresponden.",
        },
      ],
    },

    // ── 1. Cotizaciones ───────────────────────────────────────────────────
    {
      id: "ope.cotizaciones",
      titulo: "Cotizaciones",
      ruta: "/dashboard/operaciones/cotizaciones",
      resumen: "Ofertas al cliente con venta, costo y margen por concepto.",
      captura: "/ayuda/ope.cotizaciones.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "La cotización es el documento comercial. Cuando el cliente la aprueba, el sistema abre la operación con sus conceptos. Lista filtrable por estado, cliente, NIT y fechas (por defecto, el último mes); el ojo de cada fila la abre.",
        },
        { tipo: "subtitulo", texto: "Encabezado" },
        {
          tipo: "campos",
          items: [
            { campo: "Cliente y asesor", desc: "El asesor se toma de la ficha del cliente; se puede cambiar." },
            { campo: "Fecha y vigencia", desc: "Pasada la vigencia, la cotización queda Vencida sola." },
            { campo: "Tipo de operación e incoterm", desc: "Importación o exportación. El tipo filtra los conceptos que se ofrecen." },
            { campo: "Origen y destino", desc: "Ruta del embarque." },
            { campo: "Piezas y peso kg", desc: "El peso alimenta los conceptos que se cobran por kilo." },
            { campo: "Valor mercancía y moneda", desc: "Base de los conceptos que se cobran por porcentaje (p. ej. seguro)." },
            { campo: "TRM", desc: "Se precarga la del día; editable. Convierte USD a pesos para el margen." },
            { campo: "Notas", desc: "Vienen las condiciones estándar; ajústalas si hace falta. El IVA se indica aquí («+ IVA»)." },
          ],
        },
        { tipo: "subtitulo", texto: "Líneas" },
        {
          tipo: "campos",
          items: [
            { campo: "Sección", desc: "Transporte internacional, gastos en origen, gastos en destino, aduana, transporte terrestre, almacenamiento, seguro. Las vacías no se imprimen." },
            { campo: "Concepto", desc: "Del catálogo de Conceptos tarifarios. Trae el tipo de cálculo y la moneda." },
            { campo: "Valor unitario y costo", desc: "Lo que se cobra al cliente y lo que cobra el proveedor. Por kg se multiplica por el peso; por embarque se cobra una sola vez." },
            { campo: "Mínimo de venta / de costo", desc: "Si el cálculo da menos, se toma el mínimo. El de costo no se imprime." },
            { campo: "Opcional", desc: "No suma al total; sale aparte y solo se cobra si el cliente lo toma." },
          ],
        },
        { tipo: "subtitulo", texto: "Estados y acciones" },
        {
          tipo: "lista",
          items: [
            "Borrador: único estado editable.",
            "Enviada → Aprobada (crea la operación) o Rechazada. Vencida: automático.",
            "Aprobar tiene dos pasos: elegir operación nueva o asociada, y redactar el correo de instrucciones operativas (obligatorio) al responsable operativo, con copias a otros usuarios y adjuntos.",
            "Imprimir cotización: PDF para el cliente, sin costos ni margen.",
            "Mover cotización: la pasa a otra operación abierta o a una nueva; pide motivo.",
          ],
        },
        {
          tipo: "aviso",
          texto:
            "No se pueden agregar líneas hasta completar cliente, fechas, origen y destino. Revisa el margen antes de enviar: se calcula en pesos con la TRM de la cotización.",
        },
      ],
    },

    // ── 2. Operaciones ────────────────────────────────────────────────────
    {
      id: "ope.operaciones",
      titulo: "Operaciones",
      ruta: "/dashboard/operaciones/operaciones",
      resumen: "La carpeta del embarque: guías, seguimiento, confirmación y facturación.",
      captura: "/ayuda/ope.operaciones.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Cada operación nace al aprobar una cotización; no se crea a mano. Puede reunir varias cotizaciones (consolidados). Estados: Abierta → En curso → Cerrada, o Cancelada. El listado muestra el comercial (asesor de la cotización) y el operativo responsable.",
        },
        { tipo: "subtitulo", texto: "Pestañas de la carpeta" },
        {
          tipo: "campos",
          items: [
            { campo: "Datos", desc: "Cliente, ruta, piezas y peso totales, y las cotizaciones que la componen." },
            { campo: "Confirmación", desc: "Operaciones confirma cada concepto con el peso real. El contador muestra lo pendiente. Aquí se agregan cobros no cotizados." },
            { campo: "MAWB", desc: "Guía master de la aerolínea. Se hace primero. El shipper es Universal Cargo; «Cambiar shipper» para los casos en que es otro." },
            { campo: "HAWB", desc: "Guía hija por cliente, amarrada al MAWB: shipper, consignee, vuelo, pesos y mercancía." },
            { campo: "Marítimo", desc: "MBL y HBL con buque, viaje, contenedor, sello, ETD y ETA." },
            { campo: "Manifiesto", desc: "Agrupa las HAWB de un MAWB. Se emite o se anula; no se edita." },
            { campo: "Bitácora", desc: "Novedades del embarque. Opción de enviar el evento al cliente por correo, con adjunto. Aquí queda la instrucción operativa de la aprobación (interna) y, si su correo falló, el botón Reenviar." },
            { campo: "Documentos", desc: "Factura comercial, lista de empaque, certificado de origen, etc.: pendiente, recibido o aprobado." },
          ],
        },
        { tipo: "subtitulo", texto: "Acciones" },
        {
          tipo: "lista",
          items: [
            "Iniciar operación: pasa a En curso.",
            "Hoja de operación: resumen imprimible con cotizado, confirmado, facturado, costos por proveedor y margen.",
            "Facturar operación: factura lo confirmado y los cobros no cotizados aún pendientes. Una factura por cliente; TRM del día editable.",
            "Cerrar operación / Cancelar operación: piden confirmación.",
          ],
        },
        {
          tipo: "aviso",
          texto:
            "Solo se factura lo confirmado. No se puede cerrar con guías o manifiestos en borrador ni con conceptos sin confirmar; el sistema lista lo que falta.",
        },
        {
          tipo: "nota",
          texto:
            "Lo que se envía al cliente desde la bitácora es lo que él ve en su portal: redáctalo pensando en él. La hoja de operación es interna; no se entrega al cliente.",
        },
      ],
    },

    // ── 3. Rastreo de embarques ───────────────────────────────────────────
    {
      id: "ope.tracking",
      titulo: "Rastreo de embarques",
      ruta: "/dashboard/operaciones/tracking",
      resumen: "Encuentra la operación por el número que da el cliente.",
      captura: "/ayuda/ope.tracking.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Búsqueda rápida para el seguimiento diario. Escribe el número que tengas —BL, booking, DO o contenedor— y el sistema muestra la operación, el documento donde coincide, buque, viaje, ETD, ETA y clientes.",
        },
        {
          tipo: "pasos",
          items: [
            "Escribe el número completo o una parte y pulsa Buscar.",
            "Revisa en qué documento coincidió (MBL, HBL o contenedor).",
            "Haz clic en el resultado para abrir la operación.",
          ],
        },
      ],
    },

    // ── 4. Aerolíneas ─────────────────────────────────────────────────────
    {
      id: "ope.aerolineas",
      titulo: "Aerolíneas",
      ruta: "/dashboard/operaciones/aerolineas",
      resumen: "Catálogo de aerolíneas y navieras.",
      captura: "/ayuda/ope.aerolineas.png",
      bloques: [
        {
          tipo: "campos",
          items: [
            { campo: "Código IATA", desc: "Código de la aerolínea (p. ej. AV, LA)." },
            { campo: "Nombre", desc: "Nombre comercial." },
            { campo: "Modalidad", desc: "Aérea, marítima (navieras) o terrestre." },
            { campo: "Estado", desc: "Las inactivas no se ofrecen en las guías." },
          ],
        },
        {
          tipo: "nota",
          texto: "Se usan en MAWB, HAWB y manifiesto. Si no aparece en el selector, créala aquí.",
        },
      ],
    },

    // ── 5. Aeropuertos y puertos ──────────────────────────────────────────
    {
      id: "ope.aeropuertos",
      titulo: "Aeropuertos y puertos",
      ruta: "/dashboard/operaciones/aeropuertos",
      resumen: "Catálogo de puntos de origen y destino.",
      captura: "/ayuda/ope.aeropuertos.png",
      bloques: [
        {
          tipo: "campos",
          items: [
            { campo: "Código IATA", desc: "Código del aeropuerto o puerto (p. ej. BOG, MIA)." },
            { campo: "Nombre, ciudad y país", desc: "Se imprimen en las guías." },
            { campo: "Modalidad", desc: "Aérea, marítima o terrestre." },
            { campo: "Estado", desc: "Los inactivos no se ofrecen en los selectores." },
          ],
        },
      ],
    },

    // ── 6. Conceptos tarifarios ───────────────────────────────────────────
    {
      id: "ope.conceptos",
      titulo: "Conceptos tarifarios",
      ruta: "/dashboard/operaciones/conceptos",
      resumen: "Los cobros que se usan en cotizaciones y facturas.",
      captura: "/ayuda/ope.conceptos.png",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Cada concepto precarga una línea de cotización y define cómo se factura. Filtra por sección, tipo de operación y modalidad.",
        },
        { tipo: "subtitulo", texto: "Campos" },
        {
          tipo: "campos",
          items: [
            { campo: "Nombre y sección", desc: "La sección ubica el concepto en la cotización." },
            { campo: "Tipo de operación y modalidad", desc: "En qué cotizaciones se ofrece. Vacío = en todas." },
            { campo: "Tipo cálculo", desc: "Por kg, por embarque o porcentaje sobre el valor de la mercancía." },
            { campo: "Moneda", desc: "USD o COP." },
            { campo: "Parámetros de facturación", desc: "Cuenta de ingreso, cuenta de devolución, tarifa de IVA, unidad de medida y retenciones que practica el cliente." },
            { campo: "Es valor recibido para tercero", desc: "Dinero que se cobra por cuenta de otro: sin IVA, sin retención y no cuenta en el margen." },
          ],
        },
        {
          tipo: "aviso",
          texto:
            "Los conceptos con sufijo «- G» llevan IVA y los «- NG» no. Elegir el equivocado factura mal el IVA.",
        },
        {
          tipo: "nota",
          texto:
            "Crear o cambiar conceptos afecta la contabilidad: lo hace el administrador. Al cotizar, solo elige el correcto.",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Registro de módulos (agregar aquí los demás módulos a medida que se escriban)
// ═══════════════════════════════════════════════════════════════════════════

export const MODULOS_AYUDA: ModuloAyuda[] = [ADMINISTRACION, OPERACIONES];

// ── Helpers ────────────────────────────────────────────────────────────────

export function todosLosTemas(): TemaAyuda[] {
  return MODULOS_AYUDA.flatMap((m) => m.temas);
}

// Coincidencia exacta o, en pantallas de detalle (…/cotizaciones/123,
// …/operaciones/123/hawb/…), el tema del listado del que cuelgan.
export function getTemaPorRuta(pathname: string): TemaAyuda | null {
  const temas = todosLosTemas().filter((t) => t.ruta);
  return temas.find((t) => t.ruta === pathname)
    ?? temas.filter((t) => pathname.startsWith(t.ruta + "/"))
        .sort((a, b) => b.ruta!.length - a.ruta!.length)[0]
    ?? null;
}

export function getTemaPorId(id: string): TemaAyuda | null {
  return todosLosTemas().find((t) => t.id === id) ?? null;
}

export function getModuloDeTema(id: string): ModuloAyuda | null {
  return MODULOS_AYUDA.find((m) => m.temas.some((t) => t.id === id)) ?? null;
}
