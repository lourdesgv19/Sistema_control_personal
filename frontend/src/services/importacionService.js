import apiClient from "./api";

export const uploadArchivoFichajes = async (file) => {
  const formData = new FormData();
  formData.append("archivo", file);

  const response = await apiClient.post("/importacion/fichajes", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// 1. Obtener historial ordenado por fecha
export const getHistorialImportaciones = async () =>
  (await apiClient.get("/importacion/historial")).data;


// 3. Previsualizar coincidencias para vinculación de id_biometrico inicial
export const previsualizarVinculaciones = async (file) => {
  const formData = new FormData();
  formData.append("archivo", file);
  return (
    await apiClient.post("/importacion/previsualizar-vinculaciones", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

// 4. Guardar vinculaciones confirmadas
export const guardarVinculaciones = async (asignaciones) =>
  (await apiClient.post("/importacion/guardar-vinculaciones", asignaciones)).data;