import apiClient from "./api";

// Paginado para la tabla de Gestión de Personal
export const getEmpleadosPaginados = async (
  q = "",
  categoriaId = null,
  estado = "TODOS",
  page = 0,
  size = 15,
) => {
  const params = { q, estado, page, size };
  if (categoriaId) params.categoriaId = categoriaId;
  return (await apiClient.get("/empleados", { params })).data;
};

export const getEmpleados = async () =>
  (await apiClient.get("/empleados/activos")).data;

// Para dropdowns y selectores de modales (sin paginar, solo activos)
export const getEmpleadosActivos = async () =>
  (await apiClient.get("/empleados/activos")).data;

export const getEmpleadoById = async (id) =>
  (await apiClient.get(`/empleados/${id}`)).data;

export const createEmpleado = async (data) =>
  (await apiClient.post("/empleados", data)).data;

export const updateEmpleado = async (id, data) =>
  (await apiClient.put(`/empleados/${id}`, data)).data;

export const deleteEmpleado = async (id) =>
  (await apiClient.delete(`/empleados/${id}`)).data;

export const reactivarEmpleado = async (id) =>
  (await apiClient.patch(`/empleados/${id}/reactivar`)).data;

export const getMetricasEmpleado = async (empleadoId) =>
  (await apiClient.get(`/empleados/${empleadoId}/metricas`)).data;

export const getEmpleadoHorarios = async (empleadoId) =>
  (await apiClient.get(`/empleados/${empleadoId}/horarios`)).data;

export const addEmpleadoHorario = async (empleadoId, data) =>
  (await apiClient.post(`/empleados/${empleadoId}/horarios`, data)).data;

export const removeEmpleadoHorario = async (horarioId) =>
  (await apiClient.delete(`/empleados/horarios/${horarioId}`)).data;

export const getPersonalResumen = async () =>
  (await apiClient.get("/empleados/resumen-metricas")).data;
