import axios from "axios";

// 1. Crear la instancia con el nombre 'api'
const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
});

// 2. Interceptor de solicitudes (Request)
api.interceptors.response.use(
  (response) => {
    // Notifica que el servidor respondió con éxito
    window.dispatchEvent(
      new CustomEvent("servidor:estado", { detail: { ok: true } }),
    );
    return response;
  },
  (error) => {
    // Si no hubo respuesta o hay error de red (servidor apagado)
    if (
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error"
    ) {
      console.error(
        `💥 [HTTP ERROR NO_RESPONSE] ${error.config?.url}: ${error.message}`,
      );
      // Notifica inmediatamente a la barra de conexión
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );
    }
    return Promise.reject(error);
  },
);

// 3. Interceptor de respuestas (Response)
api.interceptors.response.use(
  (response) => {
    console.log(
      `📥 [HTTP IN ${response.status}] ${response.config.url}`,
      response.data,
    );
    return response;
  },
  (error) => {
    console.error(
      `💥 [HTTP ERROR ${error.response?.status || "NO_RESPONSE"}] ${error.config?.url}:`,
      error.response?.data || error.message,
    );
    return Promise.reject(error);
  },
);

// 4. Exportar tanto 'api' como 'default' (y alias 'apiClient' por compatibilidad)
export { api, api as apiClient };
export default api;
