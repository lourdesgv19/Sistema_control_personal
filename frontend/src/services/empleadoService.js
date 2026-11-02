import apiClient from "./api";

// 1. Resumen de métricas globales (tarjetas superiores)
export const getPersonalResumen = async () =>
  (await apiClient.get("/empleados/resumen-metricas")).data;

// 2. Selectores y listados generales de empleados
let cacheEmpleadosActivos = null;
let ultimaCargaEmpleados = 0;
let promesaEnVuelo = null;
const TIEMPO_CACHE_MS = 60000; // 60 segundos de gracia

export const getEmpleadosActivos = async (forzarRefresco = false) => {
  const ahora = Date.now();

  // Si hay datos en caché válidos y no se pide forzar, retornamos la caché
  if (
    !forzarRefresco &&
    cacheEmpleadosActivos &&
    ahora - ultimaCargaEmpleados < TIEMPO_CACHE_MS
  ) {
    return cacheEmpleadosActivos;
  }

  // Si ya hay una petición HTTP en curso, nos sumamos a la misma sin duplicar
  if (promesaEnVuelo) {
    return promesaEnVuelo;
  }

  promesaEnVuelo = apiClient
    .get("/empleados/activos")
    .then((res) => {
      cacheEmpleadosActivos = Array.isArray(res.data) ? res.data : [];
      ultimaCargaEmpleados = Date.now();
      return cacheEmpleadosActivos;
    })
    .catch((err) => {
      console.error("Error al obtener empleados activos:", err);
      return cacheEmpleadosActivos || [];
    })
    .finally(() => {
      promesaEnVuelo = null;
    });

  return promesaEnVuelo;
};

// Limpiar la caché únicamente cuando se crea, edita o elimina un empleado
export const invalidarCacheEmpleados = () => {
  cacheEmpleadosActivos = null;
  ultimaCargaEmpleados = 0;
};

// 3. Paginación de empleados
export const getEmpleadosPaginados = async (
  q = "",
  categoriaId = null,
  estado = "TODOS",
  page = 0,
  size = 15,
) => {
  // Asegura que page sea un número entero y nunca NaN
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
