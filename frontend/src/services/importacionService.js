import apiClient from "./api";

export const getHistorialImportaciones = async () => {
  return (await apiClient.get("/importacion/historial")).data;
};

// Padrón paginado y filtrado en base de datos
export const getMarcacionesPaginadas = async (q = "", page = 0, size = 25) => {
  return (
    await apiClient.get("/importacion/fichajes", { params: { q, page, size } })
  ).data;
};

// Conteo ligero de identificadores huérfanos
export const getSinVincularCount = async () => {
  return (await apiClient.get("/importacion/sin-vincular-count")).data;
};

export const getPendientesVinculacion = async () => {
  return (await apiClient.get("/importacion/pendientes-vinculacion")).data;
};

// Consulta filtrada en BD para el modal del ojito
export const getFichajesPorImportacion = async (
  importacionId,
  nombre = "",
  fecha = "",
) => {
  const params = {};
  if (nombre) params.nombre = nombre;
  if (fecha) params.fecha = fecha;
  return (
    await apiClient.get(`/importacion/historial/${importacionId}/fichajes`, {
      params,
    })
  ).data;
};

export const uploadArchivoFichajes = async (archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return (
    await apiClient.post("/importacion/fichajes", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const deleteHistorialImportacion = async (id) => {
  return (await apiClient.delete(`/importacion/historial/${id}`)).data;
};

export const previsualizarVinculaciones = async (archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);
  return (
    await apiClient.post("/importacion/previsualizar-vinculaciones", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const guardarVinculaciones = async (asignaciones) => {
  return (
    await apiClient.post("/importacion/guardar-vinculaciones", asignaciones)
  ).data;
};
