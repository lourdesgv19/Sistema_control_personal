import axios from "axios";

// 1. Crear la instancia con el nombre 'api'
const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Interceptor de solicitudes (Request)
api.interceptors.request.use(
  (config) => {
    console.log(
      `📡 [HTTP OUT] ${config.method?.toUpperCase()} ${config.baseURL || ""}${config.url}`,
      config.data || "",
    );
    return config;
  },
  (error) => {
    console.error("❌ [HTTP OUT ERROR]", error);
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
