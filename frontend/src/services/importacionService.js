import apiClient from "./api";

// Resumen superior dual (último fichaje de la tabla + última importación)
export const getUltimoRegistroResumen = async () => {
  return (await apiClient.get("/dispositivo/ultimo-registro-resumen")).data;
};

// Padrón del día paginado por backend (Spring Data Pageable)
export const getFichajesDelDiaPaginado = async (
  fecha,
  q = "",
  page = 0,
  size = 15,
) => {
  const pageSegura = Number.isNaN(Number(page))
    ? 0
    : Math.max(0, parseInt(page, 10) || 0);
  return (
    await apiClient.get("/dispositivo/fichajes/dia", {
      params: { fecha, q, page: pageSegura, size },
    })
  ).data;
};

// Historial de lotes con paginación en el backend
export const getHistorialImportacionesPaginado = async (
  estado = "ACTIVOS",
  fecha = "",
  page = 0,
  size = 15,
) => {
  const pageSegura = Number.isNaN(Number(page))
    ? 0
    : Math.max(0, parseInt(page, 10) || 0);
  return (
    await apiClient.get("/importacion/historial/paginado", {
      params: { estado, fecha, page: pageSegura, size },
    })
  ).data;
};

export const getHistorialImportaciones = async () => {
  return (await apiClient.get("/importacion/historial")).data;
};

export const getSinVincularCount = async () => {
  return (await apiClient.get("/importacion/sin-vincular-count")).data;
};

export const getPendientesVinculacion = async () => {
  return (await apiClient.get("/importacion/pendientes-vinculacion")).data;
};

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

export const reactivarHistorialImportacion = async (id) => {
  return (await apiClient.patch(`/importacion/historial/${id}/reactivar`)).data;
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
