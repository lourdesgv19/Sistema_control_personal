import apiClient from "./api";

// Obtener catálogo unificado de permisos desde la base de datos
export const getCatalogoPermisos = async () => {
  return (await apiClient.get("/seguridad/catalogo-permisos")).data;
};

// Obtener permisos efectivos asignados a un usuario
export const getPermisosUsuario = async (usuarioId) => {
  return (await apiClient.get(`/seguridad/usuarios/${usuarioId}/permisos`))
    .data;
};

// Asignar o renovar permisos (soporta sincronización total, incluso si solicitudes es [])
export const asignarPermisosUsuario = async (usuarioId, solicitudes = []) => {
  return (
    await apiClient.post(
      `/seguridad/usuarios/${usuarioId}/permisos`,
      solicitudes,
    )
  ).data;
};

// Revocar un permiso puntual
export const revocarPermisoUsuario = async (usuarioId, codigoPermiso) => {
  return (
    await apiClient.delete(
      `/seguridad/usuarios/${usuarioId}/permisos/${codigoPermiso}`,
    )
  ).data;
};

// Consultar el padrón paginado de auditoría de movimientos
export const getAuditoriaMovimientosPaginados = async (params = {}) => {
  return (await apiClient.get("/seguridad/auditoria", { params })).data;
};

export const getAuditoriaMetricas = async (params = {}) => {
  return (await apiClient.get("/seguridad/auditoria/metricas", { params }))
    .data;
};
