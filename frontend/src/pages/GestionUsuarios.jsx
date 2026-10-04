import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  ShieldAlert,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getUsuariosPaginados,
  createUsuario,
  resetPasswordUsuario,
  toggleEstadoUsuario,
  getUsuarioResumen,
} from "../services/usuarioService";
import { getEmpleados } from "../services/empleadoService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalCrearUsuario from "../components/usuarios/ModalCrearUsuario";
import ModalMatrizPermisos from "../components/usuarios/ModalMatrizPermisos";
import { useAuth } from "../context/AuthContext";

const ITEMS_POR_PAGINA = 10;

export default function GestionUsuarios() {
  const { user, tienePermiso } = useAuth(); // Sesión actual y verificador de permisos

  // Facultades evaluadas por PBAC
  const puedeGestionarAccesos = tienePermiso("USUARIOS_GESTIONAR_ACCESOS");
  const puedeResetPassword = tienePermiso("USUARIOS_RESET_PASSWORD");
  const puedeSuspender = tienePermiso("USUARIOS_SUSPENDER");

  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Paginación desde Servidor
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  // Métricas desde Servidor
  const [resumenGlobal, setResumenGlobal] = useState({
    total: 0,
    administradores: 0,
    auditores: 0,
    inactivos: 0,
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroRol, setFiltroRol] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalPermisos, setModalPermisos] = useState({
    isOpen: false,
    usuario: null,
  });
  const [modalAlerta, setModalAlerta] = useState({
    isOpen: false,
    tipo: "info",
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    textoCancelar: "Cancelar",
    mostrarCancelar: false,
    onConfirmar: () => {},
  });

  const mostrarAviso = (tipo, titulo, mensaje) => {
    setModalAlerta({
      isOpen: true,
      tipo,
      titulo,
      mensaje,
      textoConfirmar: "Aceptar",
      mostrarCancelar: false,
      onConfirmar: () => setModalAlerta((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Apertura de gestión de permisos
  const abrirModalPermisos = (u) => {
    if (!puedeGestionarAccesos) return;
    setModalPermisos({
      isOpen: true,
      usuario: u,
    });
  };

  // 1. Cargar métricas globales del backend
  const cargarResumenGlobal = useCallback(async () => {
    try {
      const data = await getUsuarioResumen();
      if (data) setResumenGlobal(data);
    } catch (err) {
      console.error("Error al cargar resumen de métricas:", err);
    }
  }, []);

  // 2. Cargar nómina de empleados para el select del modal de asignación
  const cargarEmpleadosCatalogo = useCallback(async () => {
    try {
      const emps = await getEmpleados();
      setEmpleados(Array.isArray(emps) ? emps : []);
    } catch (err) {
      console.error("Error al cargar nómina de empleados:", err);
    }
  }, []);

  // 3. Consulta paginada al backend
  const cargarUsuariosServidor = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const res = await getUsuariosPaginados(
          searchTerm,
          filtroRol,
          filtroEstado,
          page,
          ITEMS_POR_PAGINA,
        );
        if (res && res.content) {
          setUsuarios(res.content);
          setTotalPaginas(res.totalPages || 1);
          setTotalElementos(res.totalElements || 0);
          setPaginaActual(res.number + 1);
        } else {
          setUsuarios(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        console.error("Error al cargar usuarios paginados:", err);
        mostrarAviso(
          "danger",
          "Error",
          "No se pudo obtener la lista de usuarios.",
        );
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filtroRol, filtroEstado],
  );

  // Carga inicial
  useEffect(() => {
    cargarResumenGlobal();
    cargarEmpleadosCatalogo();
  }, [cargarResumenGlobal, cargarEmpleadosCatalogo]);

  // Debounce de búsqueda y cambio de filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarUsuariosServidor(paginaActual - 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [cargarUsuariosServidor, paginaActual]);

  // Colaboradores sin usuario creado (para el modal)
  const empleadosSinUsuario = useMemo(() => {
    const idsConUsuario = new Set(
      usuarios.map((u) => u.empleadoId).filter(Boolean),
    );
    return empleados.filter(
      (e) => e.activo !== false && !idsConUsuario.has(e.id),
    );
  }, [empleados, usuarios]);

  // Handlers
  const handleCrearUsuario = async (payload) => {
    if (!puedeGestionarAccesos) return;
    try {
      await createUsuario(payload);
      setModalCrear(false);
      await Promise.all([
        cargarUsuariosServidor(paginaActual - 1),
        cargarResumenGlobal(),
      ]);
      mostrarAviso(
        "success",
        "Usuario Habilitado",
        "El acceso fue creado con éxito y su contraseña predeterminada fue generada.",
      );
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error al crear usuario",
        err.response?.data?.message || "No se pudo crear el usuario.",
      );
    }
  };

  const handleResetPassword = (usuario) => {
    if (!puedeResetPassword) return;
    setModalAlerta({
      isOpen: true,
      tipo: "warning",
      titulo: "¿Restablecer Contraseña?",
      mensaje: `¿Desea restablecer la clave del usuario ${usuario.username}? Se reasignará la fórmula predeterminada (apellido + 2 primeros dígitos del DNI).`,
      textoConfirmar: "Sí, restablecer",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await resetPasswordUsuario(usuario.id);
          mostrarAviso(
            "success",
            "Clave Restablecida",
            "La contraseña del usuario volvió al formato predeterminado.",
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            "No se pudo restablecer la contraseña.",
          );
        }
      },
    });
  };

  const handleToggleEstado = (usuario) => {
    if (!puedeSuspender) return;
    const nuevoEstado = !usuario.activo;
    setModalAlerta({
      isOpen: true,
      tipo: nuevoEstado ? "info" : "danger",
      titulo: nuevoEstado ? "¿Habilitar Usuario?" : "¿Suspender Acceso?",
      mensaje: `¿Desea ${nuevoEstado ? "habilitar" : "suspender"} el acceso al sistema para ${usuario.username}?`,
      textoConfirmar: nuevoEstado ? "Sí, habilitar" : "Sí, suspender",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await toggleEstadoUsuario(usuario.id, nuevoEstado);
          await Promise.all([
            cargarUsuariosServidor(paginaActual - 1),
            cargarResumenGlobal(),
          ]);
          mostrarAviso(
            "success",
            "Estado Actualizado",
            `El usuario ahora está ${nuevoEstado ? "Activo" : "Suspendido"}.`,
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            "No se pudo modificar el estado del usuario.",
          );
        }
      },
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. CABECERA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
            <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestión de Usuarios & Seguridad
            </h1>
            <p className="text-xs text-slate-500">
              Control de credenciales, asignación de roles y restablecimiento de
              claves predeterminadas.
            </p>
          </div>
        </div>

        {/* Botón Nuevo Usuario: Controlado por USUARIOS_GESTIONAR_ACCESOS */}
        {puedeGestionarAccesos ? (
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition self-start md:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            Habilitar Nuevo Usuario
          </button>
        ) : (
          <span
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold border border-slate-200 cursor-not-allowed select-none"
            title="Requiere permiso USUARIOS_GESTIONAR_ACCESOS"
          >
            <Lock className="w-3.5 h-3.5" />
            Creación de Accesos Restringida
          </span>
        )}
      </div>

      {/* 2. TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* TOTAL CUENTAS */}
        <button
          type="button"
          onClick={() => {
            setFiltroEstado("TODOS");
            setFiltroRol("TODOS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filtroEstado === "TODOS" && filtroRol === "TODOS"
              ? "bg-slate-50/90 border-slate-700 ring-4 ring-slate-400/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between w-full text-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Cuentas
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.total}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Usuarios registrados
            </div>
          </div>
        </button>

        {/* ADMINISTRADORES ACTIVOS */}
        <button
          type="button"
          onClick={() => {
            setFiltroRol("ADMINISTRADOR");
            setFiltroEstado("ACTIVOS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filtroRol === "ADMINISTRADOR" && filtroEstado === "ACTIVOS"
              ? "bg-purple-50/90 border-purple-500 ring-4 ring-purple-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Administradores
            </span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.administradores}
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">
              Activos con control total
            </div>
          </div>
        </button>

        {/* AUDITORES ACTIVOS */}
        <button
          type="button"
          onClick={() => {
            setFiltroRol("AUDITOR");
            setFiltroEstado("ACTIVOS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filtroRol === "AUDITOR" && filtroEstado === "ACTIVOS"
              ? "bg-indigo-50/90 border-indigo-500 ring-4 ring-indigo-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-indigo-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Auditores
            </span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.auditores}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              Activos para fichajes
            </div>
          </div>
        </button>

        {/* CUENTAS SUSPENDIDAS */}
        <button
          type="button"
          onClick={() => {
            setFiltroEstado("INACTIVOS");
            setFiltroRol("TODOS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filtroEstado === "INACTIVOS"
              ? "bg-rose-50/90 border-rose-500 ring-4 ring-rose-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-rose-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Cuentas Suspendidas
            </span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.inactivos}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              Sin acceso al panel
            </div>
          </div>
        </button>
      </div>

      {/* 3. FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por usuario o nombre del empleado..."
            className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <select
            value={filtroRol}
            onChange={(e) => {
              setFiltroRol(e.target.value);
              setPaginaActual(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500 font-medium"
          >
            <option value="TODOS">Todos los roles</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="AUDITOR">Auditores / RRHH</option>
            <option value="CONSULTA">Consulta / Empleado</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPaginaActual(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white font-medium text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Suspendidos</option>
          </select>
        </div>
      </div>

      {/* 4. TABLA DE USUARIOS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
            <tr>
              <th className="px-6 py-3.5 tracking-wider">Usuario / Login</th>
              <th className="px-6 py-3.5 tracking-wider">
                Colaborador Vinculado
              </th>
              <th className="px-6 py-3.5 tracking-wider">Rol en Sistema</th>
              <th className="px-6 py-3.5 tracking-wider">Estado Acceso</th>
              <th className="px-6 py-3.5 tracking-wider text-right">
                Acciones de Seguridad
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                  Cargando usuarios del servidor...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-slate-400 italic"
                >
                  No se encontraron usuarios registrados con los filtros
                  aplicados.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const badgeRol =
                  u.rol === "ADMINISTRADOR" || u.rol === "ADMIN"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : u.rol === "AUDITOR" || u.rol === "RECURSOS_HUMANOS"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                const esAdminRaiz = u.username === "admin";
                const esUsuarioActual =
                  (u.id || u.idUsuario) === user?.idUsuario;

                return (
                  <tr
                    key={u.id || u.idUsuario}
                    className={`transition-colors ${
                      u.activo === false
                        ? "bg-slate-50/60 opacity-75"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        {u.username}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">
                        {u.nombreCompleto || "Sin Empleado Asociado"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${badgeRol}`}
                      >
                        {u.rol}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          u.activo !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.activo !== false
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        ></span>
                        {u.activo !== false ? "HABILITADO" : "SUSPENDIDO"}
                      </span>
                    </td>

                    {/* Acciones de Seguridad con PBAC */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {/* 1. Reset Clave (Requiere USUARIOS_RESET_PASSWORD) */}
                        {puedeResetPassword ? (
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Restablecer a contraseña predeterminada"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            Reset Clave
                          </button>
                        ) : (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-300 border border-slate-200 rounded-lg text-xs font-semibold cursor-not-allowed select-none"
                            title="Requiere permiso USUARIOS_RESET_PASSWORD"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Clave
                          </span>
                        )}

                        {/* 2. Permisos (Requiere USUARIOS_GESTIONAR_ACCESOS y no ser admin raíz) */}
                        {puedeGestionarAccesos ? (
                          <button
                            onClick={() => abrirModalPermisos(u)}
                            disabled={esAdminRaiz}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              esAdminRaiz
                                ? "El usuario raíz posee todos los permisos"
                                : "Gestionar permisos"
                            }
                          >
                            Permisos
                          </button>
                        ) : (
                          <span
                            className="px-2.5 py-1 bg-slate-50 text-slate-300 border border-slate-200 rounded-lg text-xs font-semibold cursor-not-allowed select-none"
                            title="Requiere permiso USUARIOS_GESTIONAR_ACCESOS"
                          >
                            Permisos
                          </span>
                        )}

                        {/* 3. Suspender / Reactivar (Requiere USUARIOS_SUSPENDER y no ser admin raíz ni usuario actual) */}
                        {!esAdminRaiz && !esUsuarioActual ? (
                          puedeSuspender ? (
                            u.activo !== false ? (
                              <button
                                onClick={() => handleToggleEstado(u)}
                                className="p-1.5 hover:text-rose-600 transition cursor-pointer"
                                title="Suspender acceso"
                              >
                                <XCircle className="w-4 h-4 text-rose-500" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleEstado(u)}
                                className="p-1.5 hover:text-emerald-600 transition cursor-pointer"
                                title="Reactivar acceso"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              </button>
                            )
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed select-none"
                              title="Requiere permiso USUARIOS_SUSPENDER"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )
                        ) : (
                          <span
                            className="p-1.5 text-slate-300 cursor-not-allowed select-none"
                            title="Cuenta protegida del sistema o sesión actual"
                          >
                            <Lock className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 5. PAGINACIÓN DESDE EL SERVIDOR */}
        <div className="bg-white px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Mostrando{" "}
            <span className="font-bold text-slate-800">
              {totalElementos === 0
                ? 0
                : (paginaActual - 1) * ITEMS_POR_PAGINA + 1}
            </span>{" "}
            a{" "}
            <span className="font-bold text-slate-800">
              {Math.min(paginaActual * ITEMS_POR_PAGINA, totalElementos)}
            </span>{" "}
            de{" "}
            <span className="font-bold text-slate-800">{totalElementos}</span>{" "}
            usuarios
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
              disabled={paginaActual === 1 || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
              (num) => (
                <button
                  key={num}
                  onClick={() => setPaginaActual(num)}
                  disabled={loading}
                  className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer ${
                    paginaActual === num
                      ? "bg-[#4b35e6] text-white shadow-xs"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {num}
                </button>
              ),
            )}

            <button
              onClick={() =>
                setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))
              }
              disabled={paginaActual === totalPaginas || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Página Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CREAR USUARIO */}
      <ModalCrearUsuario
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onSubmit={handleCrearUsuario}
        empleadosSinUsuario={empleadosSinUsuario}
      />

      {/* MODAL DE GESTIÓN DE PERMISOS */}
      <ModalMatrizPermisos
        isOpen={modalPermisos.isOpen}
        usuario={modalPermisos.usuario}
        onClose={() => setModalPermisos({ isOpen: false, usuario: null })}
        onExito={() => cargarUsuariosServidor(paginaActual - 1)}
        mostrarAviso={mostrarAviso}
      />

      {/* MODAL ALERTA CENTRALIZADO */}
      <ModalAlerta
        isOpen={modalAlerta.isOpen}
        tipo={modalAlerta.tipo}
        titulo={modalAlerta.titulo}
        mensaje={modalAlerta.mensaje}
        textoConfirmar={modalAlerta.textoConfirmar}
        textoCancelar={modalAlerta.textoCancelar}
        mostrarCancelar={modalAlerta.mostrarCancelar}
        onConfirmar={modalAlerta.onConfirmar}
        onCancelar={() =>
          setModalAlerta((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
