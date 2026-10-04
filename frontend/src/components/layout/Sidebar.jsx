import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ModalAlerta from "../comunes/ModalAlerta";
import { getEmpleados } from "../../services/empleadoService";

export default function Sidebar() {
  const { user, logout, tienePermiso } = useAuth();
  const [modalLogout, setModalLogout] = useState(false);
  const [incompletosCount, setIncompletosCount] = useState(0);
  const navigate = useNavigate();

  // Consultar colaboradores con datos faltantes para mostrar la alerta
  useEffect(() => {
    let montado = true;
    const verificarIncompletos = async () => {
      try {
        const emps = await getEmpleados();
        if (montado && Array.isArray(emps)) {
          const faltanDatos = emps.filter(
            (e) =>
              !e.dni ||
              !e.nroLegajo ||
              (Array.isArray(e.categorias) &&
                e.categorias.length === 0 &&
                !e.categoria),
          ).length;
          setIncompletosCount(faltanDatos);
        }
      } catch (err) {
        // En caso de error de red o no autorizado se ignora silenciosamente
      }
    };

    if (tienePermiso("PERSONAL_VER")) {
      verificarIncompletos();
    }

    const interval = setInterval(() => {
      if (tienePermiso("PERSONAL_VER")) verificarIncompletos();
    }, 45000); // Chequeo periódico cada 45s

    return () => {
      montado = false;
      clearInterval(interval);
    };
  }, [tienePermiso]);

  const menuItems = [
    {
      to: "/dashboard",
      label: "Dashboard General",
      icon: LayoutDashboard,
      permiso: "DASHBOARD_VER",
    },
    {
      to: "/personal",
      label: "Gestión de Personal",
      icon: Users,
      permiso: "PERSONAL_VER",
      badgeCount: incompletosCount,
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
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#eef2ff] text-[#4b35e6]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* CÍRCULO ROJO / BADGE DE ALERTA DE DATOS PENDIENTES */}
                  {item.badgeCount > 0 && (
                    <span
                      title={`${item.badgeCount} empleado(s) con datos incompletos`}
                      className="ml-2 px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-500 rounded-full shrink-0 shadow-xs animate-pulse flex items-center justify-center min-w-[18px]"
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Perfil Dinámico + Cerrar Sesión */}
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
