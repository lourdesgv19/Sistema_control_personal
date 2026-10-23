import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de Peticiones: inyecta el token Bearer si existe
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de Respuestas: gestión de sesión e ignorar rutas de login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";

    // 1. Verificar si la petición que falló corresponde al endpoint de autenticación
    const esRutaLogin =
      url.includes("/auth/login") ||
      url.includes("/api/auth/login") ||
      url.endsWith("/login");

    // 2. Solo despachar logout si el 401 proviene de una sesión en uso, no del formulario de login
    if (error.response?.status === 401 && !esRutaLogin) {
      console.warn(
        "⚠️ Token expirado o sesión inválida. Despachando evento de logout.",
      );
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return Promise.reject(error);
  },
);

// 4. Exportar tanto 'api' como 'default' (y alias 'apiClient' por compatibilidad)
export { api, api as apiClient };
export default api;
