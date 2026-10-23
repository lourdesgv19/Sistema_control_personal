import apiClient from "./api";

export const getLiquidacionDocente = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, val);
    }
  });
  const res = await apiClient.get(`/liquidacion-docente?${query.toString()}`);
  return res.data;
};

export const descargarLiquidacionCsv = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, val);
    }
  });
  const res = await apiClient.get(
    `/liquidacion-docente/exportar-csv?${query.toString()}`,
    {
      responseType: "blob",
    },
  );

  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Liquidacion_Docente_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
