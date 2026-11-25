import apiClient, { invalidarTodaLaCache } from "./api";

// 1. Resumen de métricas globales (tarjetas superiores)
export const getPersonalResumen = async () =>
  (await apiClient.get("/empleados/resumen-metricas")).data;

// 2. Selectores y listados generales de empleados (cacheado centralmente en api.js + deduplicación en vuelo)
let promesaEnVuelo = null;

export const getEmpleadosActivos = async (forzarRefresco = false) => {
  if (promesaEnVuelo && !forzarRefresco) {
    return promesaEnVuelo;
  }

  promesaEnVuelo = apiClient
    .get("/empleados/activos", { forceRefresh: forzarRefresco })
    .then((res) => (Array.isArray(res.data) ? res.data : []))
    .catch((err) => {
      console.error("Error al obtener empleados activos:", err);
      return [];
    })
    .finally(() => {
      promesaEnVuelo = null;
    });

  return promesaEnVuelo;
};

// Mantenemos la firma exportada para compatibilidad con componentes existentes
export const invalidarCacheEmpleados = () => {
  invalidarTodaLaCache();
};

// 3. Paginación de empleados
export const getEmpleadosPaginados = async (
  q = "",
  categoriaId = null,
  estado = "TODOS",
  page = 0,
  size = 15,
) => {
  const pageSegura = Number.isNaN(Number(page))
    ? 0
    : Math.max(0, parseInt(page, 10) || 0);

  const params = {
    q,
    estado,
    page: pageSegura,
    size: Number(size) || 15,
  };

  if (categoriaId) {
    params.categoriaId = categoriaId;
  }

  return (await apiClient.get("/empleados", { params })).data;
};

export const getEmpleadoById = async (id) =>
  (await apiClient.get(`/empleados/${id}`)).data;

// 4. Operaciones CRUD de Empleados
export const createEmpleado = async (data) =>
  (await apiClient.post("/empleados", data)).data;

export const updateEmpleado = async (id, data) =>
  (await apiClient.put(`/empleados/${id}`, data)).data;

export const deleteEmpleado = async (id) =>
  (await apiClient.delete(`/empleados/${id}`)).data;

export const reactivarEmpleado = async (id) =>
  (await apiClient.patch(`/empleados/${id}/reactivar`)).data;

// 5. Métricas del empleado
export const getMetricasEmpleado = async (empleadoId) =>
  (await apiClient.get(`/empleados/${empleadoId}/metricas`)).data;

// 6. Horarios (apuntando al controlador de horarios /api/horarios)
export const getHorariosPaginados = async (
  q = "",
  categoriaId = null,
  empleadoId = null,
  page = 0,
  size = 15,
) => {
  const params = { q, page, size };
  if (categoriaId) params.categoriaId = categoriaId;
  if (empleadoId) params.empleadoId = empleadoId;
  return (await apiClient.get("/horarios/paginados", { params })).data;
};

export const getEmpleadoHorarios = async (empleadoId) =>
  (await apiClient.get(`/horarios/empleado/${empleadoId}`)).data;

export const addEmpleadoHorario = async (empleadoId, data) =>
  (await apiClient.post(`/horarios/empleado/${empleadoId}`, data)).data;

export const removeEmpleadoHorario = async (horarioId) =>
  (await apiClient.delete(`/horarios/${horarioId}`)).data;
