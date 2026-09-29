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
      // Endpoint liviano para ping
      await apiClient.get("/configuracion/categorias", {
        timeout: 2500,
        headers: { "Cache-Control": "no-cache" },
      });

      setServerOk(true);
      // Si venía de una desconexión, avisa a las vistas que recarguen datos silenciosamente
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

    // Sondeo de respaldo cada 5 segundos únicamente si está caído
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
            : "No hay conexión con el servidor (Spring Boot fuera de línea)."}
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
