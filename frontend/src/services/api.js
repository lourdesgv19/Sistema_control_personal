import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Genera una clave única por endpoint y sus parámetros de consulta
const generarClaveCache = (config) => {
  const url = config.url || "";
  const params = config.params ? JSON.stringify(config.params) : "";
  return `swr_cache:${url}|${params}`;
};

// Limpia entradas viejas si localStorage alcanza su límite de espacio
const guardarEnCacheSegura = (clave, data) => {
  try {
    localStorage.setItem(
      clave,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    );
  } catch (e) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("swr_cache:"))
      .forEach((k) => localStorage.removeItem(k));
  }
};

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
    // Notificamos que el servidor está online
    window.dispatchEvent(
      new CustomEvent("servidor:estado", { detail: { ok: true } }),
    );

    // Guardamos copia de respaldo para peticiones GET (salvo que se pida omitir caché)
    const esGet = response.config?.method?.toLowerCase() === "get";
    const omitirCache = response.config?.skipCache === true;

    if (esGet && !omitirCache && response.data !== undefined) {
      const clave = generarClaveCache(response.config);
      guardarEnCacheSegura(clave, response.data);
    }

    return response;
  },
  (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";

    const esCaidaServidor =
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error";

    // Notificación inmediata si el backend no responde o hay error de red
    if (esCaidaServidor) {
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );

      // Si es una lectura (GET) y el servidor está caído, devolvemos los últimos datos cacheados
      const esGet = originalRequest?.method?.toLowerCase() === "get";
      const omitirCache = originalRequest?.skipCache === true;

      if (esGet && !omitirCache) {
        const clave = generarClaveCache(originalRequest);
        const guardado = localStorage.getItem(clave);

        if (guardado) {
          try {
            const { data } = JSON.parse(guardado);
            console.warn(
              `📦 [MODO OFFLINE] Mostrando últimos datos guardados para: ${url}`,
            );

            return Promise.resolve({
              data,
              status: 200,
              statusText: "OK (Offline Cache)",
              headers: {},
              config: originalRequest,
              fromCache: true,
            });
          } catch {
            localStorage.removeItem(clave);
          }
        }
      }
    }

    const esRutaLogin =
      url.includes("/auth/login") ||
      url.includes("/api/auth/login") ||
      url.endsWith("/login");

    if (error.response?.status === 401 && !esRutaLogin) {
      console.warn("⚠️ Token expirado o sesión inválida.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Limpiamos también la caché de datos privados al cerrar sesión por seguridad
      Object.keys(localStorage)
        .filter((k) => k.startsWith("swr_cache:"))
        .forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return Promise.reject(error);
  },
);

export { api, api as apiClient };
export default api;
