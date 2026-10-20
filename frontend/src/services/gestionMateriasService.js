import api from "./api";

// 1. Resumen de KPIs y liquidación docente (tarjetas superiores)
export const getResumenMaterias = (fechaInicio, fechaFin) =>
  api.get(
    `/gestion-materias/resumen?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
  );

// 2. Calendario semanal con cruce biométrico y filtros de día/docente/búsqueda
export const getCalendarioSemanal = (
  fechaInicio,
  idDocente = "",
  diasSemana = [],
  busqueda = "",
) => {
  const params = new URLSearchParams();
  params.append("fechaInicio", fechaInicio);
  if (idDocente) params.append("idDocente", idDocente);

  if (Array.isArray(diasSemana) && diasSemana.length > 0) {
    params.append("diasSemana", diasSemana.join(","));
  }

  if (busqueda) params.append("busqueda", busqueda);

  return api.get(`/gestion-materias/calendario-semanal?${params.toString()}`);
};

// 3. Alta de nueva materia con asignación semanal
export const postNuevaMateria = (payload) =>
  api.post("/gestion-materias", payload);

// 4. Obtener catálogo de materias agrupadas
export const getCatalogoMateriasAgrupadas = () =>
  api.get("/gestion-materias/catalogo-agrupado");
