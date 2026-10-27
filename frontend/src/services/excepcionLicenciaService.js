import apiClient from "./api";

export const getPanelExcepciones = async (params = {}) => {
  return (await apiClient.get("/excepciones-licencias/panel", { params })).data;
};

export const createExcepcion = async (data) => {
  return (await apiClient.post("/excepciones-licencias", data)).data;
};

export const dictaminarExcepcion = async (
  id,
  nuevoEstado,
  observaciones = "",
) => {
  return (
    await apiClient.patch(`/excepciones-licencias/${id}/dictaminar`, {
      nuevoEstado,
      observaciones,
    })
  ).data;
};

export const deleteExcepcion = async (id) => {
  return (await apiClient.delete(`/excepciones-licencias/${id}`)).data;
};

export const updateExcepcion = async (id, data) => {
  return (await apiClient.put(`/excepciones-licencias/${id}`, data)).data;
};
