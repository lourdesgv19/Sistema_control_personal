import apiClient from "./api";

export const getFichaComportamiento = async (empleadoId, params = {}) => {
  return (
    await apiClient.get(`/ficha-comportamiento/${empleadoId}`, { params })
  ).data;
};
