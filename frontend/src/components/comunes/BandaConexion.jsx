import React, { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";
import { invalidarTodaLaCache } from "../../services/api"; // Ajustar ruta según tu carpeta (ej. ../services/api)

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export default function BandaConexion() {
  const [online, setOnline] = useState(navigator.onLine);
  const [serverOk, setServerOk] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const estabaDesconectado = useRef(false);

  // Ping nativo liviano: responde en memoria, sin JWT ni consultas a MySQL
  const verificarServidor = useCallback(async () => {
    if (!navigator.onLine) {
      setOnline(false);
      setServerOk(false);
      estabaDesconectado.current = true;
      return;
    }

    setVerificando(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(`${API_BASE}/public/ping?_t=${Date.now()}`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const estaVivo = res.status < 500;
      setServerOk(estaVivo);
      setOnline(true);

      if (estaVivo && estabaDesconectado.current) {
        estabaDesconectado.current = false;
        invalidarTodaLaCache();
        window.dispatchEvent(new CustomEvent("conexion:restaurada"));
      } else if (!estaVivo) {
        estabaDesconectado.current = true;
      }
    } catch {
      setServerOk(false);
      estabaDesconectado.current = true;
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
      setServerOk(false);
      estabaDesconectado.current = true;
    };

    const handleServidorEstado = (e) => {
      const ok = e.detail?.ok;
      if (typeof ok === "boolean") {
        setServerOk(ok);
        if (ok && estabaDesconectado.current) {
          estabaDesconectado.current = false;
          invalidarTodaLaCache();
          window.dispatchEvent(new CustomEvent("conexion:restaurada"));
        } else if (!ok) {
          estabaDesconectado.current = true;
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("servidor:estado", handleServidorEstado);

    const intervalo = setInterval(() => {
      if (!serverOk && navigator.onLine) {
        verificarServidor();
      }
    }, 4000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("servidor:estado", handleServidorEstado);
      clearInterval(intervalo);
    };
  }, [serverOk, verificarServidor]);

  // Listener de SSE (Server-Sent Events) en segundo plano
  useEffect(() => {
    if (!online || !serverOk) return;

    const sseUrl = `${API_BASE}/stream/eventos`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener("actualizacion", (event) => {
      // Limpiamos caché ANTES de avisar a las vistas activas para que sus refetches vayan al backend
      invalidarTodaLaCache();
      try {
        const payload = JSON.parse(event.data);
        window.dispatchEvent(
          new CustomEvent("datos:actualizados", { detail: payload }),
        );
      } catch {
        window.dispatchEvent(new CustomEvent("datos:actualizados"));
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [online, serverOk]);

  if (online && serverOk) return null;

  const sinInternet = !online;

  return (
    <aside
      aria-label="Estado de red y servidor"
      className="sticky top-0 left-0 right-0 z-[9999] transition-all duration-300 text-xs font-semibold px-4 py-2.5 shadow-md flex items-center justify-between text-white bg-rose-600 border-b border-rose-700"
    >
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
        <span>{verificando ? "Verificando..." : "Reintentar conexión"}</span>
      </button>
    </aside>
  );
}
