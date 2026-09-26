import React, { useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar({ isSidebarOpen, onToggleSidebar }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Menú ajustado a los requerimientos del Sistema de Control de Asistencia
  const navItems = [
    { to: "/dashboard", label: "Dashboard General", icon: LayoutDashboard },
    { to: "/clases", label: "Horarios y Cátedras", icon: CalendarDays },
    { to: "/personal", label: "Gestión de Personal", icon: Users },
    { to: "/alertas", label: "Alertas e Infracciones", icon: AlertTriangle },
    { to: "/reportes", label: "Métricas y Reportes", icon: FileSpreadsheet },
    { to: "/configuracion", label: "Tipos y Configuración", icon: Settings },
  ];

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    console.log("Cerrando sesión del sistema...");
  };

  return (
    <>
      {/* Overlay oscuro para móviles */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 sm:hidden bg-slate-900/50 backdrop-blur-xs"
          onClick={onToggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          bg-white border-r border-slate-200 sm:translate-x-0`}
        aria-label="Barra lateral"
      >
        <div className="h-full px-4 py-5 flex flex-col justify-between overflow-y-auto">
          {/* Navegación Principal */}
          <div>
            <p className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Control de Asistencia
            </p>
            <ul className="space-y-1 font-medium text-sm">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => isSidebarOpen && onToggleSidebar()}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      <IconComponent size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sección Salir */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Modal de confirmación de salida */}
      {showLogoutModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowLogoutModal(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-slate-900">
                ¿Cerrar sesión?
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Se cerrará el acceso actual al panel de control de asistencia.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
