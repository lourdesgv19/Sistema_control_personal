export const MODULOS_PERMISOS = [
  {
    id: "PERSONAL",
    nombre: "Gestión de Personal",
    descripcion:
      "Control de altas, bajas, datos personales y legajos biométricos",
    permisos: [
      {
        codigo: "PERSONAL_VER",
        label: "Ver padrón de colaboradores",
        critico: false,
      },
      {
        codigo: "PERSONAL_CREAR",
        label: "Crear nuevos colaboradores",
        critico: false,
      },
      {
        codigo: "PERSONAL_EDITAR",
        label: "Modificar datos personales y legajos",
        critico: false,
      },
      {
        codigo: "PERSONAL_BAJA_REACTIVAR",
        label: "Baja lógica y reactivación",
        critico: true,
      },
    ],
  },
  {
    id: "INCIDENTES",
    nombre: "Incidentes & Auditoría Diaria",
    descripcion:
      "Supervisión de infracciones, desvíos y auditoría de justificaciones",
    permisos: [
      {
        codigo: "INCIDENTES_VER",
        label: "Visualizar tablero y métricas de incidentes diarios",
        critico: false,
      },
      {
        codigo: "INCIDENTES_JUSTIFICAR",
        label: "Justificar, observar o rechazar incidentes de asistencia",
        critico: true,
      },
    ],
  },
  {
    id: "HORARIOS",
    nombre: "Gestión de Horarios & Clases",
    descripcion:
      "Asignación de turnos laborales, cátedras docentes y cronogramas",
    permisos: [
      {
        codigo: "HORARIOS_VER",
        label: "Ver cronogramas y turnos asignados",
        critico: false,
      },
      {
        codigo: "HORARIOS_GESTIONAR",
        label: "Asignar turnos o clases a colaboradores",
        critico: false,
      },
      {
        codigo: "HORARIOS_EDITAR",
        label: "Modificar turnos o clases existentes",
        critico: false,
      },
      {
        codigo: "HORARIOS_ELIMINAR",
        label: "Eliminar bloques horarios o cátedras",
        critico: true,
      },
    ],
  },
  {
    id: "MATERIAS",
    nombre: "Gestión de Materias & Liquidación",
    descripcion:
      "Administración de cátedras, calendario de clases y liquidación docente",
    permisos: [
      {
        codigo: "MATERIAS_VER",
        label: "Ver calendario semanal y catálogo de materias",
        critico: false,
      },
      {
        codigo: "MATERIAS_CREAR",
        label: "Dar de alta nuevas cátedras y asignaturas",
        critico: false,
      },
      {
        codigo: "MATERIAS_EDITAR",
        label: "Modificar datos de materias y tarifas",
        critico: false,
      },
      {
        codigo: "MATERIAS_ELIMINAR",
        label: "Baja lógica y reactivación de materias",
        critico: true,
      },
      {
        codigo: "LIQUIDACION_DOCENTE",
        label: "Visualizar y exportar liquidaciones a docentes",
        critico: true,
      },
    ],
  },
  {
    id: "FICHAJES",
    nombre: "Fichajes & Biometría",
    descripcion: "Importación masiva de marcaciones y vinculación con lectores",
    permisos: [
      {
        codigo: "FICHAJES_VER",
        label: "Ver marcaciones y lotes",
        critico: false,
      },
      {
        codigo: "FICHAJES_IMPORTAR",
        label: "Subir archivos de reloj (CSV)",
        critico: false,
      },
      {
        codigo: "FICHAJES_VINCULAR",
        label: "Vincular IDs biométricos huérfanos",
        critico: false,
      },
      {
        codigo: "FICHAJES_ELIMINAR_LOTE",
        label: "Eliminar lotes importados",
        critico: true,
      },
    ],
  },
  {
    id: "CONFIGURACION",
    nombre: "Configuración del Sistema",
    descripcion:
      "Mantenimiento de tablas maestras de categorías, cargos y turnos",
    permisos: [
      {
        codigo: "CONFIG_VER",
        label: "Ver tablas de configuración",
        critico: false,
      },
      {
        codigo: "CONFIG_EDITAR_CATEGORIAS",
        label: "Gestionar categorías de personal",
        critico: false,
      },
      {
        codigo: "CONFIG_EDITAR_CARGOS",
        label: "Gestionar cargos y puestos",
        critico: false,
      },
      {
        codigo: "CONFIG_EDITAR_TURNOS",
        label: "Gestionar moldes y plantillas de horario",
        critico: false,
      },
    ],
  },
  {
    id: "USUARIOS",
    nombre: "Usuarios & Seguridad",
    descripcion:
      "Privilegios reservados exclusivamente para el Administrador General",
    permisos: [
      {
        codigo: "USUARIOS_VER",
        label: "Listar usuarios del sistema",
        critico: false,
      },
      {
        codigo: "USUARIOS_GESTIONAR_ACCESOS",
        label: "Otorgar o modificar permisos",
        critico: true,
      },
      {
        codigo: "USUARIOS_RESET_PASSWORD",
        label: "Restablecer claves por defecto",
        critico: true,
      },
      {
        codigo: "USUARIOS_SUSPENDER",
        label: "Bloquear o habilitar cuentas",
        critico: true,
      },
    ],
  },
  {
    id: "AUDITORIA",
    nombre: "Auditoría & Trazabilidad",
    descripcion:
      "Supervisión de registros de actividad, métricas y movimientos del sistema",
    permisos: [
      {
        codigo: "AUDITORIA_VER",
        label: "Visualizar panel de movimientos y métricas",
        critico: true,
      },
    ],
  },
];
