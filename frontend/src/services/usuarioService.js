import apiClient from "./api";

// Obtener usuarios paginados desde el backend
export const getUsuariosPaginados = async (
  q = "",
  rol = "TODOS",
  estado = "TODOS",
  page = 0,
  size = 10,
) => {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (rol) params.append("rol", rol);
  if (estado) params.append("estado", estado);
  params.append("page", page);
  params.append("size", size);

  return (await apiClient.get(`/usuarios?${params.toString()}`)).data;
};

// Resumen de métricas
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
