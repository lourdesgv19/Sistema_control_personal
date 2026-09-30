import { Fingerprint } from "lucide-react";
import React, { useState, useEffect } from "react";

export default function Header() {
  const [online, setOnline] = useState(navigator.onLine);
  const [serverOk, setServerOk] = useState(true);

  useEffect(() => {
    const handleServidorEstado = (e) => {
      if (typeof e.detail?.ok === "boolean") {
        setServerOk(e.detail.ok);
      }
    };

    const handleRestaurada = () => {
      setServerOk(true);
      setOnline(true);
    };

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("servidor:estado", handleServidorEstado);
    window.addEventListener("conexion:restaurada", handleRestaurada);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("servidor:estado", handleServidorEstado);
      window.removeEventListener("conexion:restaurada", handleRestaurada);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const todoConectado = online && serverOk;

  return (
    <header className="w-full shrink-0 z-20 font-sans bg-white border-b border-slate-200 px-8 py-4.5 flex items-center justify-between shadow-2xs">
      {/* Logo e Identidad del sistema */}
      <div className="flex items-center gap-3">
        {/* Ícono de huella biométrica con contenedor estilizado */}
        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm shadow-indigo-200 shrink-0">
          <Fingerprint size={22} className="stroke-[2.2]" />
        </div>

        {/* Título principal y subtítulo descriptivo */}
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-900 tracking-tight leading-none">
            Sistema de <span className="text-indigo-600">Control</span>
          </span>
          <span className="text-xs text-slate-500 font-medium mt-1">
            Gestión de Personal & Asistencia Biométrica
          </span>
        </div>
      </div>
    </header>
  );
}
