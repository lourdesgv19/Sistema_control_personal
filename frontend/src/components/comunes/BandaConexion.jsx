import React, { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";

export default function BandaConexion() {
  const [online, setOnline] = useState(navigator.onLine);
  const [serverOk, setServerOk] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const estabaDesconectado = useRef(false);

  const verificarServidor = useCallback(async () => {
    if (!navigator.onLine) {
      setOnline(false);
      setServerOk(false);
      estabaDesconectado.current = true;
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );
      return;
    }

    setVerificando(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      // Petición GET simple (sin headers custom para que el navegador no envíe preflight OPTIONS)
      const res = await fetch(
        `http://localhost:8080/api/public/ping?_t=${Date.now()}`,
        {
          method: "GET",
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      // Si el servidor HTTP de Java responde (200, o incluso 401/404), significa que Spring Boot ESTÁ VIVO
      const estaVivo = res.status < 500;

      setServerOk(estaVivo);
      setOnline(true);
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: estaVivo } }),
      );

      if (estaVivo && estabaDesconectado.current) {
        estabaDesconectado.current = false;
        window.dispatchEvent(new CustomEvent("conexion:restaurada"));
      } else if (!estaVivo) {
        estabaDesconectado.current = true;
      }
    } catch (err) {
      // Error real de red / servidor apagado
      setServerOk(false);
      estabaDesconectado.current = true;
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );
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
      window.dispatchEvent(
        new CustomEvent("servidor:estado", { detail: { ok: false } }),
      );
    };

    const handleServidorEstado = (e) => {
      const ok = e.detail?.ok;
      if (typeof ok === "boolean") {
        setServerOk(ok);
        if (ok && estabaDesconectado.current) {
          estabaDesconectado.current = false;
          window.dispatchEvent(new CustomEvent("conexion:restaurada"));
        } else if (!ok) {
          estabaDesconectado.current = true;
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("servidor:estado", handleServidorEstado);

    // Sondeo periódico cada 4 segundos
    const intervalo = setInterval(() => {
      if (navigator.onLine) {
        verificarServidor();
      }
    }, 4000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("servidor:estado", handleServidorEstado);
      clearInterval(intervalo);
    };
  }, [verificarServidor]);

  // Si hay internet y el backend responde, la banda se desmonta inmediatamente
  if (online && serverOk) return null;

  const sinInternet = !online;

  return (
    <div className="w-full bg-[#e11d48] border-b border-rose-700 text-white text-xs font-semibold px-8 py-3 flex items-center justify-between shadow-sm z-50 shrink-0 animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
        {sinInternet ? (
          <WifiOff className="w-4 h-4 shrink-0 text-white" />
        ) : (
          <ServerCrash className="w-4 h-4 shrink-0 text-white" />
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
        className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition disabled:opacity-50 text-xs font-semibold cursor-pointer"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${verificando ? "animate-spin" : ""}`}
        />
        <span>{verificando ? "Verificando..." : "Reintentar conexión"}</span>
      </button>
    </div>
  );
}
