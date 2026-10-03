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
        label: "Asignar turnos o clases",
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
    descripcion: "Mantenimiento de tablas maestras y catálogos institucionales",
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
        codigo: "CONFIG_EDITAR_MATERIAS_TURNOS",
        label: "Gestionar cátedras y moldes de horario",
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
