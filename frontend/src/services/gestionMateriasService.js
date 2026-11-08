import api from "./api";

export const getResumenMaterias = (fechaInicio, fechaFin) =>
  api.get(`/materias/resumen?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);

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
  return api.get(`/materias/calendario-semanal?${params.toString()}`);
};

export const postNuevaMateria = (payload) => api.post("/materias", payload);

export const getCatalogoMateriasAgrupadas = () =>
  api.get("/materias/catalogo-agrupado");

export const desvincularDocenteMateria = (idMateria) =>
  api.patch(`/materias/${idMateria}/desvincular-docente`);

export const desvincularComisionMateria = (idMateria, idHorario, diaSemana) => {
  const params = new URLSearchParams();
  if (idHorario) params.append("idHorario", idHorario);
  if (diaSemana) params.append("diaSemana", diaSemana);
  return api.delete(`/materias/${idMateria}/comisiones?${params.toString()}`);
};

export const getImpactoBajaMateria = (idMateria) =>
  api.get(`/materias/${idMateria}/impacto-baja`);

export const deleteMateriaEnCascada = (idMateria) =>
  api.delete(`/materias/${idMateria}/cascada`);

export const reactivarMateria = (idMateria) =>
  api.patch(`/materias/${idMateria}/reactivar`);
