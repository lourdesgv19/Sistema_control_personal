import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Users,
  Activity,
  Layers,
  X,
  Loader2,
  Maximize2,
} from "lucide-react";
import {
  getAuditoriaMovimientosPaginados,
  getAuditoriaMetricas,
} from "../services/seguridadService";
import SelectorAccionFiltro from "../components/comunes/SelectorAccionFiltro";

// Formato de 24 horas sin AM/PM
const formatearFecha24hs = (fechaIso) => {
  if (!fechaIso) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(fechaIso));
};

// Colores de badges según el módulo de la acción
const getBadgeAccionPorModulo = (modulo) => {
  switch (modulo?.toUpperCase()) {
    case "PERSONAL":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FICHAJES":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "CONFIGURACION":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "USUARIOS":
    case "SEGURIDAD":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "AUDITORIA":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function PanelAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetricas, setLoadingMetricas] = useState(true);

  // Paginación desde Servidor
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Métricas
  const [metricas, setMetricas] = useState(null);

  // Modal para detalle completo de distribución
  const [modalMetricas, setModalMetricas] = useState({
    isOpen: false,
    titulo: "",
    tipo: "", // 'acciones' | 'usuarios'
    items: [],
  });

  // Consulta de métricas filtradas por el rango de fechas
  const cargarMetricas = useCallback(async () => {
    setLoadingMetricas(true);
    try {
      const params = {};
      if (fechaInicio) params.fechaInicio = fechaInicio;
      if (fechaFin) params.fechaFin = fechaFin;

      const data = await getAuditoriaMetricas(params);

      if (data) {
        setMetricas({
          totalMovimientos: data.totalMovimientos || 0,
          totalUsuariosActivos: data.totalUsuariosActivos || 0,
          accionMasFrecuente:
            data.totalMovimientos > 0 ? data.accionMasFrecuente || "-" : "-",
          distribucionAcciones: Array.isArray(data.distribucionAcciones)
            ? data.distribucionAcciones
            : [],
          actividadUsuarios: Array.isArray(data.actividadUsuarios)
            ? data.actividadUsuarios
            : [],
          accionesDisponibles: Array.isArray(data.accionesDisponibles)
            ? data.accionesDisponibles
            : [],
        });
      }
    } catch (err) {
      console.error("Error al cargar métricas de auditoría filtradas:", err);
      // En caída del servidor, no limpiamos a ceros destructivos para no perder la visual previa
    } finally {
      setLoadingMetricas(false);
    }
  }, [fechaInicio, fechaFin]);

  // Consulta paginada de registros en el backend
  const cargarAuditoria = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const params = {
          page,
          size: 15,
          username: filtroUsuario.trim() || undefined,
          accion: filtroAccion || undefined,
          fechaInicio: fechaInicio || undefined,
          fechaFin: fechaFin || undefined,
        };

        const res = await getAuditoriaMovimientosPaginados(params);
        if (res && res.content) {
          setLogs(res.content);
          setTotalPaginas(res.totalPages || 1);
          setTotalElementos(res.totalElements || 0);
          setPaginaActual(res.number + 1);
        }
      } catch (err) {
        console.error("Error al consultar auditoría:", err);
      } finally {
        setLoading(false);
      }
    },
    [filtroUsuario, filtroAccion, fechaInicio, fechaFin],
  );

  const recargarTodo = useCallback(() => {
    cargarAuditoria(paginaActual - 1);
    cargarMetricas();
  }, [cargarAuditoria, cargarMetricas, paginaActual]);

  // Recarga reactiva con debounce de filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      recargarTodo();
    }, 300);
    return () => clearTimeout(timer);
  }, [recargarTodo]);

  // AUTO-RECUPERACIÓN: Al restaurarse la conexión tras reiniciar el backend
  useEffect(() => {
    const handleRecuperacion = () => {
      recargarTodo();
    };

    window.addEventListener("conexion:restaurada", handleRecuperacion);
    return () => {
      window.removeEventListener("conexion:restaurada", handleRecuperacion);
    };
  }, [recargarTodo]);

  const limpiarFiltros = () => {
    setFiltroUsuario("");
    setFiltroAccion("");
    setFechaInicio("");
    setFechaFin("");
    setPaginaActual(1);
  };

  const hayFiltrosActivos =
    Boolean(filtroUsuario) ||
    Boolean(filtroAccion) ||
    Boolean(fechaInicio) ||
    Boolean(fechaFin);

  const abrirModalDetalle = (tipo) => {
    if (!metricas) return;
    if (tipo === "acciones") {
      setModalMetricas({
        isOpen: true,
        titulo: "Distribución Completa de Movimientos",
        tipo: "acciones",
        items: metricas.distribucionAcciones || [],
      });
    } else {
      setModalMetricas({
        isOpen: true,
        titulo: "Actividad Completa por Operador",
        tipo: "usuarios",
        items: metricas.actividadUsuarios || [],
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. CABECERA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <History className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Auditoría & Trazabilidad de Movimientos
            </h1>
            <p className="text-xs text-slate-500">
              Control cronológico e inmutable de operaciones, cambios de
              privilegios y accesos.
            </p>
          </div>
        </div>

        <button
          onClick={recargarTodo}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS GLOBALES / FILTRADAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Movimientos
            </span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metricas ? metricas.totalMovimientos : "..."}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {fechaInicio || fechaFin
              ? "En el rango seleccionado"
              : "Acciones registradas en el sistema"}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Operadores Activos
            </span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metricas ? metricas.totalUsuariosActivos : "..."}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {fechaInicio || fechaFin
              ? "Con actividad en el período"
              : "Usuarios con actividad registrada"}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Operación Más Frecuente
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            className="text-lg font-bold text-slate-800 mt-2 truncate"
            title={metricas?.accionMasFrecuente}
          >
            {metricas ? metricas.accionMasFrecuente : "..."}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Mayor volumen de registros
          </div>
        </div>
      </div>

      {/* 3. GRÁFICOS: TOP 5 CON DETALLE EN MODAL */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top 5 Movimientos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Top 5 Movimientos Realizados
                </span>
                {(fechaInicio || fechaFin) && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Período Filtrado
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => abrirModalDetalle("acciones")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                Ver todos ({metricas.distribucionAcciones?.length || 0})
              </button>
            </div>

            <div className="space-y-3">
              {metricas.distribucionAcciones?.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Sin registros de acciones en este período.
                </div>
              ) : (
                metricas.distribucionAcciones.slice(0, 5).map((item) => (
                  <div key={item.etiqueta} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="truncate pr-2">{item.etiqueta}</span>
                      <span className="text-indigo-600 font-mono font-bold">
                        {item.cantidad} ({item.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.porcentaje, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top 5 Operadores */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Top 5 Operadores con Más Cambios
                </span>
                {(fechaInicio || fechaFin) && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Período Filtrado
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => abrirModalDetalle("usuarios")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                Ver todos ({metricas.actividadUsuarios?.length || 0})
              </button>
            </div>

            <div className="space-y-3">
              {metricas.actividadUsuarios?.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Sin actividad de operadores en este período.
                </div>
              ) : (
                metricas.actividadUsuarios.slice(0, 5).map((item) => (
                  <div key={item.etiqueta} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="font-mono text-slate-800 truncate pr-2">
                        {item.etiqueta}
                      </span>
                      <span className="text-purple-600 font-mono font-bold">
                        {item.cantidad} ({item.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.porcentaje, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filtros de Búsqueda</span>
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filtro Usuario */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario..."
              value={filtroUsuario}
              onChange={(e) => {
                setFiltroUsuario(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Filtro Acción */}
          <div className="w-full">
            <SelectorAccionFiltro
              acciones={metricas?.accionesDisponibles || []}
              valorSeleccionado={filtroAccion}
              onSeleccionar={(nuevaAccion) => {
                setFiltroAccion(nuevaAccion);
                setPaginaActual(1);
              }}
            />
          </div>

          {/* Fecha Inicio (Desde) */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus-within:border-indigo-500">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 select-none">
              Desde:
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full outline-none text-slate-700 text-xs bg-transparent cursor-pointer"
              title="Fecha inicial (Desde)"
            />
          </div>

          {/* Fecha Fin (Hasta) */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus-within:border-indigo-500">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 select-none">
              Hasta:
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full outline-none text-slate-700 text-xs bg-transparent cursor-pointer"
              title="Fecha límite (Hasta)"
            />
          </div>
        </div>
      </div>

      {/* 5. TABLA PAGINADA DE REGISTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Fecha & Hora (24hs)</th>
                <th className="px-6 py-3.5">Usuario Operador</th>
                <th className="px-6 py-3.5">Acción</th>
                <th className="px-6 py-3.5">Módulo</th>
                <th className="px-6 py-3.5">Detalle del Movimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Consultando auditoría en el servidor...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-12 text-slate-400 italic"
                  >
                    No se encontraron registros de auditoría con los filtros
                    aplicados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap font-medium">
                      {formatearFecha24hs(log.fechaHora)}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.username}
                      {log.rol && (
                        <span className="block text-[10px] font-normal text-slate-400 uppercase tracking-wide">
                          {log.rol}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${getBadgeAccionPorModulo(
                          log.modulo,
                        )}`}
                      >
                        {log.accion}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                      {log.modulo}
                    </td>

                    <td
                      className="px-6 py-4 text-slate-600 max-w-md truncate"
                      title={log.descripcion}
                    >
                      {log.descripcion}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 6. CONTROL DE PAGINACIÓN */}
        <div className="bg-white px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Mostrando{" "}
            <span className="font-bold text-slate-800">
              {totalElementos === 0 ? 0 : (paginaActual - 1) * 15 + 1}
            </span>{" "}
            a{" "}
            <span className="font-bold text-slate-800">
              {Math.min(paginaActual * 15, totalElementos)}
            </span>{" "}
            de{" "}
            <span className="font-bold text-slate-800">{totalElementos}</span>{" "}
            movimientos
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

      {/* 7. MODAL DETALLE COMPLETO */}
      {modalMetricas.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    modalMetricas.tipo === "acciones"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                      : "bg-purple-50 border-purple-200 text-purple-600"
                  }`}
                >
                  {modalMetricas.tipo === "acciones" ? (
                    <BarChart2 className="w-4 h-4" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {modalMetricas.titulo}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Total: {modalMetricas.items.length} registros computados
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModalMetricas({
                    isOpen: false,
                    titulo: "",
                    tipo: "",
                    items: [],
                  })
                }
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
              {modalMetricas.items.map((item) => (
                <div key={item.etiqueta} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-800 truncate pr-3">
                      {item.etiqueta}
                    </span>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        modalMetricas.tipo === "acciones"
                          ? "text-indigo-600"
                          : "text-purple-600"
                      }`}
                    >
                      {item.cantidad} op. ({item.porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        modalMetricas.tipo === "acciones"
                          ? "bg-indigo-600"
                          : "bg-purple-600"
                      }`}
                      style={{ width: `${Math.min(item.porcentaje, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setModalMetricas({
                    isOpen: false,
                    titulo: "",
                    tipo: "",
                    items: [],
                  })
                }
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
