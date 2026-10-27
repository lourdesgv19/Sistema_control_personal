import apiClient from "./api";

// 1. Obtener métricas fijas de las tarjetas KPI superiores
export const getExcepcionesMetricas = async () => {
  return (await apiClient.get("/excepciones-licencias/metricas")).data;
};

// 2. Obtener lista paginada desde MySQL con filtros
export const getExcepcionesPaginadas = async (params = {}) => {
  return (await apiClient.get("/excepciones-licencias/paginado", { params }))
    .data;
};

// 3. Crear licencia o excepción
export const createExcepcion = async (data) => {
  return (await apiClient.post("/excepciones-licencias", data)).data;
};

// 4. Actualizar datos de licencia
export const updateExcepcion = async (id, data) => {
  return (await apiClient.put(`/excepciones-licencias/${id}`, data)).data;
};

// 5. Dictamen RRHH (Aprobar / Rechazar)
export const dictaminarExcepcion = async (
  id,
  nuevoEstado,
  observaciones = "",
) => {
  return (
    await apiClient.patch(`/excepciones-licencias/${id}/dictaminar`, {
      nuevoEstado,
      observaciones,
    })
  ).data;
};

// 6. Baja lógica
export const deleteExcepcion = async (id) => {
  return (await apiClient.delete(`/excepciones-licencias/${id}`)).data;
};

// 7. Reactivación
export const reactivarExcepcion = async (id) => {
  return (await apiClient.patch(`/excepciones-licencias/${id}/reactivar`)).data;
};
