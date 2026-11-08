import apiClient from "./api";

export const getUsuariosPaginados = async (
  q = "",
  rol = "TODOS",
  estado = "TODOS",
  page = 0,
  size = 10,
) => {
  const pageSegura = Number.isNaN(Number(page))
    ? 0
    : Math.max(0, parseInt(page, 10) || 0);

  const params = {
    q: q.trim() || undefined,
    rol: rol || "TODOS",
    estado: estado || "TODOS",
    page: pageSegura,
    size: Number(size) || 10,
  };

  return (await apiClient.get("/usuarios", { params })).data;
};

export const getEmpleadosSinUsuario = async () => {
  return (await apiClient.get("/usuarios/empleados-disponibles")).data;
};

export const getUsuarioResumen = async () => {
  return (await apiClient.get("/usuarios/resumen-metricas")).data;
};

export const getUsuarioPorEmpleado = async (empleadoId) => {
  return (await apiClient.get(`/usuarios/empleado/${empleadoId}`)).data;
};

export const createUsuario = async (payload) => {
  return (await apiClient.post("/usuarios", payload)).data;
};

export const resetPasswordUsuario = async (usuarioId) => {
  return (await apiClient.post(`/usuarios/${usuarioId}/reset-password`)).data;
};

export const toggleEstadoUsuario = async (usuarioId, activo) => {
  return (
    await apiClient.patch(`/usuarios/${usuarioId}/estado?activo=${activo}`)
  ).data;
};
