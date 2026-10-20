import React, { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";
import apiClient from "../../services/api";

export default function BandaConexion() {
  const [online, setOnline] = useState(navigator.onLine);
  const [serverOk, setServerOk] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const estabaDesconectado = useRef(false);

  const verificarServidor = useCallback(async () => {
    if (!navigator.onLine) {
      setServerOk(false);
      estabaDesconectado.current = true;
      return;
    }
    setVerificando(true);
    try {
      await apiClient.get("/configuracion/categorias", {
        timeout: 2500,
        headers: { "Cache-Control": "no-cache" },
      });

      setServerOk(true);
      if (estabaDesconectado.current) {
        estabaDesconectado.current = false;
        window.dispatchEvent(new CustomEvent("conexion:restaurada"));
      }
    } catch (err) {
      if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error" ||
        !err.response
      ) {
        setServerOk(false);
        estabaDesconectado.current = true;
      } else {
        setServerOk(true);
        if (estabaDesconectado.current) {
          estabaDesconectado.current = false;
          window.dispatchEvent(new CustomEvent("conexion:restaurada"));
        }
      }
    } finally {
      setVerificando(false);
    }
  }, []);

  // 1. Efecto de monitoreo de salud de red y servidor
  useEffect(() => {
    verificarServidor();

    const handleOnline = () => {
      setOnline(true);
      verificarServidor();
    };
    const handleOffline = () => {
      setOnline(false);
      estabaDesconectado.current = true;
    };

    const handleServidorEstado = (e) => {
      const ok = e.detail?.ok;
      setServerOk(ok);
      if (ok && estabaDesconectado.current) {
        estabaDesconectado.current = false;
        window.dispatchEvent(new CustomEvent("conexion:restaurada"));
      } else if (!ok) {
        estabaDesconectado.current = true;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("servidor:estado", handleServidorEstado);

    const intervalo = setInterval(() => {
      if (!serverOk && navigator.onLine) {
        verificarServidor();
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("servidor:estado", handleServidorEstado);
      clearInterval(intervalo);
    };
  }, [serverOk, verificarServidor]);

  // 2. Efecto SSE (Server-Sent Events) para actualización en TIEMPO REAL ante cambios en la BD
  useEffect(() => {
    if (!online || !serverOk) return;

    const baseUrl = apiClient.defaults.baseURL || "http://localhost:8080/api";
    const sseUrl = `${baseUrl.replace(/\/$/, "")}/stream/eventos`;

    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener("actualizacion", (event) => {
      try {
        const payload = JSON.parse(event.data);
        // Dispara el evento específico y también "conexion:restaurada" para que todas las vistas
        // que ya tienen el listener recarguen sus tablas y KPIs automáticamente sin tocar F5
        window.dispatchEvent(
          new CustomEvent("datos:actualizados", { detail: payload }),
        );
        window.dispatchEvent(
          new CustomEvent("conexion:restaurada", { detail: payload }),
        );
      } catch (e) {
        window.dispatchEvent(new CustomEvent("datos:actualizados"));
        window.dispatchEvent(new CustomEvent("conexion:restaurada"));
      }
    });

    eventSource.onerror = () => {
      // Si se corta el stream, el navegador reintenta reconectar automáticamente
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [online, serverOk]);

  if (online && serverOk) return null;

  const sinInternet = !online;

  return (
    <div className="w-full bg-rose-600 border-b border-rose-700 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-xs transition-all duration-300">
      <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
        {sinInternet ? (
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-rose-200" />
        ) : (
          <ServerCrash className="w-4 h-4 shrink-0 animate-pulse text-rose-200" />
        )}
        <span>
          {sinInternet
            ? "Sin conexión a Internet. Verifique su red wifi o cable."
            : "No hay conexión con el servidor."}
        </span>
      </div>

      <button
        type="button"
        onClick={verificarServidor}
        disabled={verificando}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition disabled:opacity-50 text-[11px] cursor-pointer"
      >
        <RefreshCw className={`w-3 h-3 ${verificando ? "animate-spin" : ""}`} />
        <span>{verificando ? "Verificando..." : "Reintentar"}</span>
      </button>
    </div>
  );
}
