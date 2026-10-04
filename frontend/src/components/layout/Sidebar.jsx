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
  History,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ModalAlerta from "../comunes/ModalAlerta";
import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const { user, logout, tienePermiso } = useAuth();
  const [modalLogout, setModalLogout] = useState(false);
  const navigate = useNavigate();

  // Cada opción del menú está vinculada estrictamente a su permiso de visualización
  const menuItems = [
    {
      to: "/dashboard",
      label: "Dashboard General",
      icon: LayoutDashboard,
      permiso: "DASHBOARD_VER", // O PERM_ADMIN_TOTAL
    },
    {
      to: "/personal",
      label: "Gestión de Personal",
      icon: Users,
      permiso: "PERSONAL_VER",
    },
    {
      to: "/horarios-catedras",
      label: "Horarios y Cátedras",
      icon: Clock,
      permiso: "CONFIG_VER",
    },
    {
      to: "/fichajes",
      label: "Fichajes y Biometría",
      icon: UploadCloud,
      permiso: "FICHAJES_VER",
    },
    {
      to: "/alertas",
      label: "Alertas e Infracciones",
      icon: AlertTriangle,
      permiso: "ALERTAS_VER",
    },
    {
      to: "/reportes",
      label: "Métricas y Reportes",
      icon: FileBarChart2,
      permiso: "REPORTES_VER",
    },
    {
      to: "/configuracion",
      label: "Tipos y Configuración",
      icon: Settings,
      permiso: "CONFIG_VER",
    },
    {
      to: "/usuarios",
      label: "Usuarios y Accesos",
      icon: ShieldCheck,
      permiso: "USUARIOS_VER",
    },
    {
      to: "/auditoria",
      label: "Auditoría de Movimientos",
      icon: History,
      permiso: "AUDITORIA_VER",
    },
  ];

  // Solo se renderizan los enlaces para los cuales el usuario tiene el permiso específico o PERM_ADMIN_TOTAL
  const menuVisible = menuItems.filter(
    (item) => item.permiso && tienePermiso(item.permiso),
  );

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-full font-sans shrink-0 select-none">
        <div>
          <div className="px-6 pt-6 pb-4">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
              Control de Asistencia
            </span>
          </div>

          <nav className="px-3 space-y-1">
            {menuVisible.map((item) => {
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

        {/* Zona Inferior: Perfil Dinámico + Cerrar Sesión */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <div
            onClick={() => navigate("/perfil")}
            title="Ir a mi perfil"
            className="flex items-center justify-between p-2 rounded-xl border border-slate-200/70 hover:bg-slate-50 cursor-pointer transition"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <User className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {user?.nombre || user?.username || "Usuario"}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  {user?.rol || "OPERADOR"}
                </span>
              </div>
            </div>

            {/* Aviso visual en el sidebar si la contraseña aún es la provisoria */}
            {user?.debeCambiarPassword && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                <AlertCircle className="w-3 h-3" />
                Clave
              </span>
            )}
          </div>

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
