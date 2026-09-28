import apiClient from "./api";

export const getEmpleados = async () =>
  (await apiClient.get("/empleados")).data;

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

// Obtiene todos los bloques de horario del empleado
export const getEmpleadoHorarios = async (empleadoId) =>
  (await apiClient.get(`/empleados/${empleadoId}/horarios`)).data;

// Asigna uno o múltiples días con una misma franja horaria (con o sin materia/cátedra)
export const addEmpleadoHorario = async (empleadoId, data) =>
  (await apiClient.post(`/empleados/${empleadoId}/horarios`, data)).data;

// Elimina un bloque de horario por su ID
export const removeEmpleadoHorario = async (horarioId) =>
  (await apiClient.delete(`/empleados/horarios/${horarioId}`)).data;
