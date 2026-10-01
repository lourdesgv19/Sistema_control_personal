import { Fingerprint, Menu } from "lucide-react";
import React, { useState, useEffect } from "react";

export default function Header({ onMenuClick }) {
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

  return (
    <header className="w-full shrink-0 z-20 font-sans bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 md:py-4.5 flex items-center justify-between shadow-2xs">
      {/* Botón hamburguesa (solo móvil) + Logo e Identidad */}
      <div className="flex items-center gap-3">
        {/* Botón Menú Hamburguesa */}
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6 stroke-[2]" />
        </button>

        {/* Ícono de huella */}
        <div className="p-2 md:p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm shadow-indigo-200 shrink-0">
          <Fingerprint
            size={20}
            className="md:w-[22px] md:h-[22px] stroke-[2.2]"
          />
        </div>

        {/* Título principal */}
        <div className="flex flex-col">
          <span className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none">
            Sistema de <span className="text-indigo-600">Control</span>
          </span>
          <span className="text-[11px] md:text-xs text-slate-500 font-medium mt-0.5 md:mt-1 truncate max-w-[220px] sm:max-w-none">
            Gestión de Personal & Asistencia Biométrica
          </span>
        </div>
      </div>
    </header>
  );
}
