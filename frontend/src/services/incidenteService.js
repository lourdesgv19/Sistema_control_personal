import apiClient from "./api";

export const getTableroIncidentes = async (params = {}) => {
  return (await apiClient.get("/incidentes/tablero", { params })).data;
};

export const resolverIncidente = async (id, data) => {
  return (await apiClient.put(`/incidentes/${id}/resolver`, data)).data;
};
