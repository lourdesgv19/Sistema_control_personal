import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  UploadCloud,
  Users,
  LayoutDashboard,
  Clock,
  AlertTriangle,
  FileBarChart2,
  Settings,
  ShieldCheck,
  LogOut,
  User,
  History,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ModalAlerta from "../comunes/ModalAlerta";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [modalLogout, setModalLogout] = useState(false);

  // Ítems exactos de tu sistema según tu captura
  const menuItems = [
    {
      to: "/fichajes",
      label: "Importar lista de fichajes",
      icon: UploadCloud,
    },
    {
      to: "/personal",
      label: "Gestión de Personal",
      icon: Users,
    },
    {
      to: "/dashboard",
      label: "Dashboard General",
      icon: LayoutDashboard,
    },
    {
      to: "/horarios-catedras",
      label: "Horarios y Cátedras",
      icon: Clock,
    },
    {
      to: "/alertas",
      label: "Alertas e Infracciones",
      icon: AlertTriangle,
    },
    {
      to: "/reportes",
      label: "Métricas y Reportes",
      icon: FileBarChart2,
    },
    {
      to: "/configuracion", // o "/tipos-configuracion" según tu ruta
      label: "Tipos y Configuración",
      icon: Settings,
    },
    {
      to: "/usuarios",
      label: "Usuarios y Seguridad",
      icon: ShieldCheck,
    },
    {
      to: "/auditoria",
      label: "Auditoría de Movimientos",
      icon: History,
      permiso: "AUDITORIA_VER",
    },
  ];

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-full font-sans shrink-0 select-none">
        <div>
          {/* Título de sección idéntico a la captura */}
          <div className="px-6 pt-6 pb-4">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
              Control de Asistencia
            </span>
          </div>

          {/* Menú de navegación */}
          <nav className="px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#eef2ff] text-[#4b35e6]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 stroke-[1.8] shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Zona Inferior: Perfil del Usuario + Cerrar Sesión */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* Tarjeta de usuario conectado */}
          <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200/60 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <User className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-slate-800 block truncate">
                {user?.nombre || user?.username || "Administrador"}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                {user?.rol || "OPERADOR"}
              </span>
            </div>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            type="button"
            onClick={() => setModalLogout(true)}
            className="flex items-center gap-2 text-rose-600 hover:text-rose-700 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors cursor-pointer w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Modal de confirmación para cerrar sesión */}
      <ModalAlerta
        isOpen={modalLogout}
        tipo="danger"
        titulo="¿Cerrar Sesión?"
        mensaje="¿Está seguro de que desea salir del sistema de control de asistencia?"
        textoConfirmar="Sí, salir"
        textoCancelar="Cancelar"
        mostrarCancelar={true}
        onConfirmar={() => {
          setModalLogout(false);
          logout();
        }}
        onCancelar={() => setModalLogout(false)}
      />
    </>
  );
}
