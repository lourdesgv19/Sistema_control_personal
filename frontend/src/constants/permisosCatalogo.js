export const MODULOS_PERMISOS = [
  {
    id: "PERSONAL",
    nombre: "Gestión de Personal",
    descripcion:
      "Control de altas, bajas, datos personales y legajos biométricos",
    permisos: [
      {
        codigo: "PERSONAL_VER",
        label: "Ver colaboradores y cronograma",
        accion: "VER",
      },
      {
        codigo: "PERSONAL_CREAR",
        label: "Dar de alta empleados",
        accion: "CREAR",
      },
      {
        codigo: "PERSONAL_EDITAR",
        label: "Modificar datos y legajos",
        accion: "EDITAR",
      },
      {
        codigo: "PERSONAL_ELIMINAR",
        label: "Baja lógica y desactivación",
        accion: "ELIMINAR",
        critico: true,
      },
      {
        codigo: "FICHAS_COMPORTAMIENTO_VER",
        label: "Ver ficha de comportamiento",
        accion: "VER",
      },
    ],
  },
  {
    id: "HORARIOS",
    nombre: "Gestión de Horarios & Clases",
    descripcion: "Asignación de turnos laborales y comisiones docentes",
    permisos: [
      {
        codigo: "HORARIOS_VER",
        label: "Ver turnos y horarios asignados",
        accion: "VER",
      },
      {
        codigo: "HORARIOS_CREAR",
        label: "Asignar nuevos turnos y cátedras",
        accion: "CREAR",
      },
      {
        codigo: "HORARIOS_EDITAR",
        label: "Modificar turnos o franjas horarias",
        accion: "EDITAR",
      },
      {
        codigo: "HORARIOS_ELIMINAR",
        label: "Eliminar bloques horarios asignados",
        accion: "ELIMINAR",
        critico: true,
      },
    ],
  },
  {
    id: "MATERIAS",
    nombre: "Gestión de Materias & Cátedras",
    descripcion: "Administración de materias, catálogo y comisiones",
    permisos: [
      {
        codigo: "MATERIAS_VER",
        label: "Ver catálogo de materias",
        accion: "VER",
      },
      {
        codigo: "MATERIAS_CREAR",
        label: "Crear materias académicas",
        accion: "CREAR",
      },
      {
        codigo: "MATERIAS_EDITAR",
        label: "Modificar materias y aulas",
        accion: "EDITAR",
      },
      {
        codigo: "MATERIAS_ELIMINAR",
        label: "Baja lógica de materias",
        accion: "ELIMINAR",
        critico: true,
      },
      {
        codigo: "MATERIAS_CALENDARIO_VER",
        label: "Ver calendario semanal de clases",
        accion: "VER",
      },
    ],
  },
  {
    id: "EXCEPCIONES",
    nombre: "Excepciones & Licencias",
    descripcion: "Ausencias justificadas, licencias médicas y asuetos",
    permisos: [
      {
        codigo: "EXCEPCIONES_VER",
        label: "Ver licencias y excepciones",
        accion: "VER",
      },
      {
        codigo: "EXCEPCIONES_CREAR",
        label: "Registrar solicitudes y licencias",
        accion: "CREAR",
      },
      {
        codigo: "EXCEPCIONES_EDITAR",
        label: "Aprobar, dictaminar o rectificar",
        accion: "EDITAR",
      },
      {
        codigo: "EXCEPCIONES_ELIMINAR",
        label: "Anular o eliminar licencias",
        accion: "ELIMINAR",
        critico: true,
      },
    ],
  },
  {
    id: "FICHAJES",
    nombre: "Fichajes & Biometría",
    descripcion: "Ingesta de marcaciones y vinculación de huellas/IDs",
    permisos: [
      {
        codigo: "FICHAJES_VER",
        label: "Ver marcaciones y registros",
        accion: "VER",
      },
      {
        codigo: "FICHAJES_CREAR",
        label: "Importar lotes y vincular IDs",
        accion: "CREAR",
      },
      {
        codigo: "FICHAJES_EDITAR",
        label: "Modificar vinculaciones biométricas",
        accion: "EDITAR",
      },
      {
        codigo: "FICHAJES_ELIMINAR",
        label: "Eliminar lotes importados",
        accion: "ELIMINAR",
        critico: true,
      },
    ],
  },
  {
    id: "CONFIGURACION",
    nombre: "Configuración del Sistema",
    descripcion: "Mantenimiento de tablas de categorías, cargos y turnos molde",
    permisos: [
      { codigo: "CONFIG_VER", label: "Ver tablas maestras", accion: "VER" },
      {
        codigo: "CONFIG_CREAR",
        label: "Crear categorías, cargos y turnos",
        accion: "CREAR",
      },
      {
        codigo: "CONFIG_EDITAR",
        label: "Modificar tablas maestras",
        accion: "EDITAR",
      },
      {
        codigo: "CONFIG_ELIMINAR",
        label: "Eliminar o desactivar registros maestros",
        accion: "ELIMINAR",
        critico: true,
      },
    ],
  },
  {
    id: "USUARIOS",
    nombre: "Usuarios & Seguridad",
    descripcion: "Administración de cuentas y privilegios",
    permisos: [
      {
        codigo: "USUARIOS_VER",
        label: "Ver cuentas de usuario",
        accion: "VER",
      },
      {
        codigo: "USUARIOS_CREAR",
        label: "Crear usuarios en el sistema",
        accion: "CREAR",
      },
      {
        codigo: "USUARIOS_EDITAR",
        label: "Modificar roles y claves",
        accion: "EDITAR",
        critico: true,
      },
      {
        codigo: "USUARIOS_ELIMINAR",
        label: "Suspender o dar de baja cuentas",
        accion: "ELIMINAR",
        critico: true,
      },
    ],
  },
  {
    id: "INCIDENTES",
    nombre: "Incidentes Diarios",
    descripcion: "Auditoría de desvíos e infracciones horarias",
    permisos: [
      {
        codigo: "INCIDENTES_VER",
        label: "Ver tablero de incidentes",
        accion: "VER",
      },
      {
        codigo: "INCIDENTES_EDITAR",
        label: "Justificar y dictaminar incidentes",
        accion: "EDITAR",
        critico: true,
      },
    ],
  },
  {
    id: "AUDITORIA",
    nombre: "Auditoría del Sistema",
    descripcion: "Supervisión de trazabilidad de acciones",
    permisos: [
      {
        codigo: "AUDITORIA_VER",
        label: "Ver registros inmutables de auditoría",
        accion: "VER",
        critico: true,
      },
    ],
  },
];
