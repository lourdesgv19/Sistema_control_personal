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

export const getEmpleadoClases = async (empleadoId) =>
  (await apiClient.get(`/empleados/${empleadoId}/clases`)).data;
export const addEmpleadoClase = async (empleadoId, data) =>
  (await apiClient.post(`/empleados/${empleadoId}/clases`, data)).data;
export const addEmpleadoClasesMultiples = async (empleadoId, data) =>
  (await apiClient.post(`/empleados/${empleadoId}/clases/multiple`, data)).data;
export const removeEmpleadoClase = async (claseId) =>
  (await apiClient.delete(`/empleados/clases/${claseId}`)).data;
export const getMetricasEmpleado = async (empleadoId) =>
  (await apiClient.get(`/empleados/${empleadoId}/metricas`)).data;
