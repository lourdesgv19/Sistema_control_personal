import React from "react";
import { Menu, Package2 } from "lucide-react";

export default function Header({ onToggleSidebar }) {
  return (
    <header className="fixed top-0 z-50 w-full bg-white border-b border-slate-200">
      <div className="px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Botón hamburguesa (solo móvil) */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex items-center p-2 text-slate-500 rounded-lg sm:hidden hover:bg-slate-100 focus:outline-none"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>

            {/* Logo e Identidad del sistema */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm shadow-indigo-200">
                <Package2 size={20} />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                Control de <span className="text-indigo-600">Asistencia</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
