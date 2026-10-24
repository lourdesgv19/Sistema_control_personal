import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

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

api.interceptors.response.use(
  (response) => {
    // Si la llamada fue exitosa, notificamos que el servidor está online
    window.dispatchEvent(
      new CustomEvent("servidor:estado", { detail: { ok: true } }),
    );
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";

    // Notificación inmediata si el backend no responde o hay error de red
    if (
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error"
    ) {
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );
    }

    const esRutaLogin =
      url.includes("/auth/login") ||
      url.includes("/api/auth/login") ||
      url.endsWith("/login");

    if (error.response?.status === 401 && !esRutaLogin) {
      console.warn("⚠️ Token expirado o sesión inválida.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return Promise.reject(error);
  },
);

export { api, api as apiClient };
export default api;
