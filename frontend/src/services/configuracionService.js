import apiClient from "./api";

// ==========================================
// 1. CATEGORÍAS DE PERSONAL
// ==========================================
export const getCategorias = async () =>
  (await apiClient.get("/configuracion/categorias")).data;

export const createCategoria = async (data) =>
  (await apiClient.post("/configuracion/categorias", data)).data;

export const updateCategoria = async (id, data) =>
  (await apiClient.put(`/configuracion/categorias/${id}`, data)).data;

export const deleteCategoria = async (id) =>
  (await apiClient.delete(`/configuracion/categorias/${id}`)).data;

export const reactivarCategoria = async (id) =>
  (await apiClient.patch(`/configuracion/categorias/${id}/activar`)).data;

// ==========================================
// 2. CATÁLOGO DE CARGOS Y PUESTOS
// ==========================================
export const getCargos = async () =>
  (await apiClient.get("/configuracion/cargos")).data;

export const createCargo = async (data) =>
  (await apiClient.post("/configuracion/cargos", data)).data;

export const updateCargo = async (id, data) =>
  (await apiClient.put(`/configuracion/cargos/${id}`, data)).data;

export const deleteCargo = async (id) =>
  (await apiClient.delete(`/configuracion/cargos/${id}`)).data;

export const reactivarCargo = async (id) =>
  (await apiClient.patch(`/configuracion/cargos/${id}/reactivar`)).data;

// ==========================================
// 3. TABLA DE HORARIOS PREESTABLECIDOS
// ==========================================
export const getHorarios = async () =>
  (await apiClient.get("/configuracion/horarios")).data;

export const createHorario = async (data) =>
  (await apiClient.post("/configuracion/horarios", data)).data;

export const updateHorario = async (id, data) =>
  (await apiClient.put(`/configuracion/horarios/${id}`, data)).data;

export const deleteHorario = async (id) =>
  (await apiClient.delete(`/configuracion/horarios/${id}`)).data;

export const reactivarHorario = async (id) =>
  (await apiClient.patch(`/configuracion/horarios/${id}/reactivar`)).data;

// ==========================================
// 4. MATERIAS
// ==========================================
export const getMaterias = async () =>
  (await apiClient.get("/configuracion/materias")).data;
export const createMateria = async (data) =>
  (await apiClient.post("/configuracion/materias", data)).data;
export const updateMateria = async (id, data) =>
  (await apiClient.put(`/configuracion/materias/${id}`, data)).data;
export const deleteMateria = async (id) =>
  (await apiClient.delete(`/configuracion/materias/${id}`)).data;
export const reactivarMateria = async (id) =>
  (await apiClient.patch(`/configuracion/materias/${id}/reactivar`)).data;
