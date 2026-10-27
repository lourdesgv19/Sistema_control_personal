/**
 * Utilidades de diseño, mapeo cromático y badges para el módulo de Auditoría & Trazabilidad.
 */

export const getBadgeAccionPorModulo = (modulo, accion = "") => {
  const mod = (modulo || "").toUpperCase().trim();
  const acc = (accion || "").toUpperCase().trim();

  // 1. MATERIAS (Cátedras, Comisiones, Aulas, Departamentos) -> Púrpura / Violeta
  if (
    mod === "MATERIAS" ||
    mod === "MATERIA" ||
    mod === "CATEDRAS" ||
    acc.includes("MATERIA") ||
    acc.includes("CATEDRA") ||
    acc.includes("COMISION")
  ) {
    return "bg-purple-50 text-purple-700 border-purple-300";
  }

  // 2. HORARIOS (Turnos, Franjas, Asignaciones de tiempo, Tolerancias) -> Ámbar / Naranja
  if (
    mod === "HORARIOS" ||
    mod === "HORARIO" ||
    mod === "TURNOS" ||
    mod === "TURNO" ||
    acc.includes("HORARIO") ||
    acc.includes("TURNO") ||
    acc.includes("FRANJA")
  ) {
    return "bg-amber-50 text-amber-800 border-amber-300";
  }

  // 3. PERSONAL (Empleados, Legajos, Cargos, Categorías) -> Verde Esmeralda
  if (
    mod === "PERSONAL" ||
    mod === "EMPLEADOS" ||
    mod === "EMPLEADO" ||
    mod === "CARGOS" ||
    mod === "CATEGORIAS" ||
    acc.includes("PERSONAL") ||
    acc.includes("EMPLEADO") ||
    acc.includes("DOCENTE") ||
    acc.includes("LEGAJO") ||
    acc.includes("CARGO") ||
    acc.includes("CATEGORIA")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-300";
  }

  // 4. FICHAJES & BIOMETRÍA (Marcas, Relojes, Desvíos, Incidentes) -> Azul Cian
  if (
    mod === "FICHAJES" ||
    mod === "BIOMETRIA" ||
    mod === "INCIDENTES" ||
    acc.includes("FICHAJE") ||
    acc.includes("MARCA") ||
    acc.includes("INCIDENTE") ||
    acc.includes("JUSTIF")
  ) {
    return "bg-cyan-50 text-cyan-700 border-cyan-300";
  }

  // 5. USUARIOS & SEGURIDAD (Login, Cuentas, Contraseñas, Permisos) -> Rosa / Rojo
  if (
    mod === "USUARIOS" ||
    mod === "SEGURIDAD" ||
    mod === "AUTH" ||
    acc.includes("USER") ||
    acc.includes("USUARIO") ||
    acc.includes("PASSWORD") ||
    acc.includes("LOGIN") ||
    acc.includes("AUTH") ||
    acc.includes("ROL") ||
    acc.includes("PERMISO")
  ) {
    return "bg-rose-50 text-rose-700 border-rose-300";
  }

  // 6. AUDITORÍA & REPORTES -> Índigo
  if (
    mod === "AUDITORIA" ||
    mod === "REPORTES" ||
    acc.includes("AUDIT") ||
    acc.includes("REPORTE") ||
    acc.includes("EXPORT") ||
    acc.includes("PDF")
  ) {
    return "bg-indigo-50 text-indigo-700 border-indigo-300";
  }

  // 7. Licencias y Excepciones -> Rosa
  if (
    mod === "EXCEPCION" ||
    mod === "EXCEPCIONES" ||
    mod === "LICENCIA" ||
    acc.includes("LICEN") ||
    acc.includes("EXCEP") ||
    acc.includes("LICENCIA") ||
    acc.includes("EXCEPCIONES")
  ) {
    return "bg-blue-50 text-blue-700 border-blue-300";
  }

  // Por defecto (Gris Pizarra)
  return "bg-slate-100 text-slate-700 border-slate-300";
};

// Formato de fecha y hora 24hs (sin AM/PM)
export const formatearFecha24hs = (fechaIso) => {
  if (!fechaIso) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(fechaIso));
};
