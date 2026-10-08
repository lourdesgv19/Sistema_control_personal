import api from "./api";

export async function getFichaComportamiento(empleadoId, params = {}) {
  const queryParams = new URLSearchParams();

  if (params.modalidad) queryParams.append("modalidad", params.modalidad);
  if (params.fecha) queryParams.append("fecha", params.fecha);
  if (params.fechaDesde) queryParams.append("fechaDesde", params.fechaDesde);
  if (params.fechaHasta) queryParams.append("fechaHasta", params.fechaHasta);

  const response = await api.get(
    `/ficha-comportamiento/${empleadoId}?${queryParams.toString()}`,
  );
  return response.data;
}
