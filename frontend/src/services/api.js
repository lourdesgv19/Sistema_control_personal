import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const CACHE_PREFIX = "swr_cache:";
let servidorDisponible = true;

// Genera una clave única por endpoint y sus parámetros de consulta
const generarClaveCache = (config) => {
  const url = config.url || "";
  // Ordenamos las claves de params para evitar falsos misses por orden de propiedades
  const paramsOrdenados = config.params
    ? JSON.stringify(
        Object.keys(config.params)
          .sort()
          .reduce((acc, k) => {
            if (config.params[k] !== undefined && config.params[k] !== "") {
              acc[k] = config.params[k];
            }
            return acc;
          }, {}),
      )
    : "";
  return `${CACHE_PREFIX}${url}|${paramsOrdenados}`;
};

// Elimina toda la caché almacenada (al mutar datos, recibir SSE o cerrar sesión)
export const invalidarTodaLaCache = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignorar errores de acceso a storage
  }
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
  } catch {
    invalidarTodaLaCache();
    try {
      localStorage.setItem(
        clave,
        JSON.stringify({
          timestamp: Date.now(),
          data,
        }),
      );
    } catch {
      // Si el payload supera el límite total de localStorage, continuar sin cachear
    }
  }
};

const leerDeCache = (clave) => {
  try {
    const guardado = localStorage.getItem(clave);
    if (!guardado) return null;
    const parsed = JSON.parse(guardado);
    return parsed?.data !== undefined ? parsed.data : null;
  } catch {
    localStorage.removeItem(clave);
    return null;
  }
};

// Listeners globales para invalidar caché ante cambios reales o reconexión
if (typeof window !== "undefined") {
  window.addEventListener("datos:actualizados", () => {
    invalidarTodaLaCache();
  });

  window.addEventListener("conexion:restaurada", () => {
    servidorDisponible = true;
    invalidarTodaLaCache();
  });

  window.addEventListener("servidor:estado", (e) => {
    if (typeof e.detail?.ok === "boolean") {
      servidorDisponible = e.detail.ok;
    }
  });
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const metodo = (config.method || "get").toLowerCase();

    // Si es una escritura (POST, PUT, PATCH, DELETE), invalidamos caché inmediatamente
    if (["post", "put", "patch", "delete"].includes(metodo)) {
      // Excluimos endpoints de lectura que puedan usar POST si los hubiera, o limpiamos todo
      if (!config.skipInvalidate) {
        invalidarTodaLaCache();
      }
      return config;
    }

    // Estrategia CACHE-FIRST para GET:
    // Si tenemos datos cacheados y no se pidió forzar red (forceRefresh), respondemos sin ir al backend.
    // Si el servidor está offline, servimos caché incluso si se pidió forceRefresh.
    const estaOffline = !navigator.onLine || !servidorDisponible;
    const omitirCache = config.skipCache === true;
    const forzarRed = config.forceRefresh === true && !estaOffline;

    if (metodo === "get" && !omitirCache && !forzarRed) {
      const clave = generarClaveCache(config);
      const dataCacheada = leerDeCache(clave);

      if (dataCacheada !== null) {
        // Usamos un adapter personalizado para resolver la promesa sin disparar petición de red
        config.adapter = () =>
          Promise.resolve({
            data: dataCacheada,
            status: 200,
            statusText: estaOffline
              ? "OK (Offline Cache)"
              : "OK (Memory/Local Cache)",
            headers: {},
            config,
            fromCache: true,
          });
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    // Si la respuesta vino de red real (no de nuestro adapter de caché), marcamos servidor online y guardamos
    if (!response.fromCache) {
      servidorDisponible = true;
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: true } }),
      );

      const esGet = response.config?.method?.toLowerCase() === "get";
      const omitirCache = response.config?.skipCache === true;

      if (esGet && !omitirCache && response.data !== undefined) {
        const clave = generarClaveCache(response.config);
        guardarEnCacheSegura(clave, response.data);
      }
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

    if (esCaidaServidor) {
      servidorDisponible = false;
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );

      // Respaldo de emergencia: si falló una petición GET que intentó ir a red, devolvemos caché si existe
      const esGet = originalRequest?.method?.toLowerCase() === "get";
      const omitirCache = originalRequest?.skipCache === true;

      if (esGet && !omitirCache) {
        const clave = generarClaveCache(originalRequest);
        const dataCacheada = leerDeCache(clave);

        if (dataCacheada !== null) {
          return Promise.resolve({
            data: dataCacheada,
            status: 200,
            statusText: "OK (Offline Fallback)",
            headers: {},
            config: originalRequest,
            fromCache: true,
          });
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
      invalidarTodaLaCache();
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return Promise.reject(error);
  },
);

export { api, api as apiClient };
export default api;
