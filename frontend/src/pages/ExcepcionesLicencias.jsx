import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Building,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Stethoscope,
  Briefcase,
  Palmtree,
  User,
} from "lucide-react";
import {
  getPanelExcepciones,
  createExcepcion,
  updateExcepcion,
  dictaminarExcepcion,
  deleteExcepcion,
} from "../services/excepcionLicenciaService";
import { getEmpleados } from "../services/empleadoService";
import { useAuth } from "../context/AuthContext";
import ModalCrearExcepcion from "../components/excepciones/ModalCrearExcepcion";
import ModalFichaDetalleLicencia from "../components/excepciones/ModalFichaDetalleLicencia";
import { formatearFechaVisual } from "../utils/fechasFichaUtils";

export default function ExcepcionesLicencias() {
  const { tienePermiso } = useAuth();
  const puedeCrear = tienePermiso("EXCEPCIONES_CREAR");
  const puedeDictaminar = tienePermiso("EXCEPCIONES_DICTAMINAR");
  const puedeEliminar = tienePermiso("EXCEPCIONES_ELIMINAR");

  const [loading, setLoading] = useState(true);
  const [panelData, setPanelData] = useState(null);
  const [empleados, setEmpleados] = useState([]);

  // Pestaña activa: "DESGLOSE" | "LISTADO" | "ASUETOS"
  const [tabPrincipal, setTabPrincipal] = useState("DESGLOSE");

  // Filtro seleccionado desde las tarjetas KPI: "TODOS" | "EN_CURSO" | "PROXIMA" | "FINALIZADA" | "PENDIENTES_RRHH"
  const [filtroKpi, setFiltroKpi] = useState("TODOS");

  // Filtros de barra
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");

  // Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [licenciaEditando, setLicenciaEditando] = useState(null);
  const [licenciaFicha, setLicenciaFicha] = useState(null);
  const [desglosesAbiertos, setDesglosesAbiertos] = useState({});

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPanelExcepciones({
        busqueda: busqueda.trim(),
        estado: filtroEstado,
        tipo: filtroTipo,
        categoria: filtroCategoria,
      });
      setPanelData(data);

      if (data?.desgloseAgentes?.length > 0) {
        const defaultOpen = {};
        data.desgloseAgentes.slice(0, 3).forEach((ag) => {
          defaultOpen[ag.idEmpleado || "INSTITUCIONAL"] = true;
        });
        setDesglosesAbiertos((prev) => ({ ...defaultOpen, ...prev }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroEstado, filtroTipo, filtroCategoria]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    getEmpleados()
      .then((res) => setEmpleados(Array.isArray(res) ? res : []))
      .catch(() => setEmpleados([]));
  }, []);

  const toggleDesglose = (key) => {
    setDesglosesAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const alternarTodosDesgloses = () => {
    const todosAbiertos = panelData?.desgloseAgentes?.every(
      (ag) => desglosesAbiertos[ag.idEmpleado || "INSTITUCIONAL"],
    );
    const nuevo = {};
    panelData?.desgloseAgentes?.forEach((ag) => {
      nuevo[ag.idEmpleado || "INSTITUCIONAL"] = !todosAbiertos;
    });
    setDesglosesAbiertos(nuevo);
  };

  const abrirModalNuevo = (idEmpleadoPrefill = null, esAsueto = false) => {
    setLicenciaEditando(
      esAsueto
        ? { esInstitucional: true, tipo: "FERIADO_ASUETO" }
        : idEmpleadoPrefill
          ? { idEmpleado: idEmpleadoPrefill, esInstitucional: false }
          : null,
    );
    setModalCrearAbierto(true);
  };

  const abrirModalEditar = (lic) => {
    setLicenciaEditando(lic);
    setModalCrearAbierto(true);
  };

  const handleGuardar = async (payload, idAEditar) => {
    if (idAEditar) {
      await updateExcepcion(idAEditar, payload);
    } else {
      await createExcepcion(payload);
    }
    await cargarDatos();
  };

  const handleDictaminar = async (id, nuevoEstado) => {
    await dictaminarExcepcion(id, nuevoEstado);
    await cargarDatos();
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Seguro de anular esta licencia o excepción?")) {
      await deleteExcepcion(id);
      await cargarDatos();
    }
  };

  // Manejo de clic en tarjetas KPI como filtro
  const handleSeleccionarKpi = (tipoKpi) => {
    setFiltroKpi((prev) => (prev === tipoKpi ? "TODOS" : tipoKpi));
  };

  const metricas = panelData || {
    enCursoHoy: 0,
    proximas: 0,
    finalizadas: 0,
    pendientesRrhh: 0,
    totalRegistros: 0,
    desgloseAgentes: [],
    listadoDetallado: [],
  };

  // Filtrar registros detallados según tarjeta KPI seleccionada
  const listadoFiltrado = useMemo(() => {
    const list = metricas.listadoDetallado || [];
    if (filtroKpi === "TODOS") return list;
    if (filtroKpi === "EN_CURSO")
      return list.filter((l) => l.condicionTemporal === "EN_CURSO");
    if (filtroKpi === "PROXIMA")
      return list.filter((l) => l.condicionTemporal === "PROXIMA");
    if (filtroKpi === "FINALIZADA")
      return list.filter((l) => l.condicionTemporal === "FINALIZADA");
    if (filtroKpi === "PENDIENTES_RRHH")
      return list.filter((l) => l.estado === "PENDIENTE_RRHH");
    return list;
  }, [metricas.listadoDetallado, filtroKpi]);

  // Filtrar desglose por agente según tarjeta KPI seleccionada
  const desgloseAgentesFiltrado = useMemo(() => {
    if (filtroKpi === "TODOS") return metricas.desgloseAgentes || [];
    return (metricas.desgloseAgentes || [])
      .map((ag) => {
        const licenciasFiltradas = ag.licencias.filter((l) => {
          if (filtroKpi === "EN_CURSO")
            return l.condicionTemporal === "EN_CURSO";
          if (filtroKpi === "PROXIMA") return l.condicionTemporal === "PROXIMA";
          if (filtroKpi === "FINALIZADA")
            return l.condicionTemporal === "FINALIZADA";
          if (filtroKpi === "PENDIENTES_RRHH")
            return l.estado === "PENDIENTE_RRHH";
          return true;
        });
        return {
          ...ag,
          licencias: licenciasFiltradas,
          totalRegistros: licenciasFiltradas.length,
        };
      })
      .filter((ag) => ag.licencias.length > 0);
  }, [metricas.desgloseAgentes, filtroKpi]);

  // Lista de asuetos filtrados
  const asuetosFiltrados = useMemo(() => {
    const institucionales = (metricas.listadoDetallado || []).filter(
      (l) => l.esInstitucional,
    );
    if (filtroKpi === "TODOS") return institucionales;
    if (filtroKpi === "EN_CURSO")
      return institucionales.filter((l) => l.condicionTemporal === "EN_CURSO");
    if (filtroKpi === "PROXIMA")
      return institucionales.filter((l) => l.condicionTemporal === "PROXIMA");
    if (filtroKpi === "FINALIZADA")
      return institucionales.filter(
        (l) => l.condicionTemporal === "FINALIZADA",
      );
    if (filtroKpi === "PENDIENTES_RRHH")
      return institucionales.filter((l) => l.estado === "PENDIENTE_RRHH");
    return institucionales;
  }, [metricas.listadoDetallado, filtroKpi]);

  const getIconoTipo = (tipo) => {
    switch (tipo) {
      case "LICENCIA_MEDICA":
        return <Stethoscope className="w-3.5 h-3.5 text-rose-500" />;
      case "VACACIONES":
        return <Palmtree className="w-3.5 h-3.5 text-sky-600" />;
      case "CAMBIO_HORARIO":
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case "COMISION_SERVICIO":
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
      case "FERIADO_ASUETO":
        return <Building className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  const getEstiloPildoraTipo = (tipo) => {
    switch (tipo) {
      case "LICENCIA_MEDICA":
        return "bg-rose-50 border-rose-200 text-rose-700";
      case "CAMBIO_HORARIO":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "COMISION_SERVICIO":
        return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "VACACIONES":
        return "bg-sky-50 border-sky-200 text-sky-700";
      case "FERIADO_ASUETO":
        return "bg-purple-50 border-purple-200 text-purple-700";
      default:
        return "bg-slate-100 border-slate-200 text-slate-800";
    }
  };

  const getAvatarIniciales = (nombre = "") => {
    if (!nombre) return "AG";
    const partes = nombre.trim().split(" ").filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. HEADER SUPERIOR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400">
              Fecha de referencia:{" "}
              <strong className="text-slate-700 font-mono">
                27 de oct de 2026
              </strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Excepciones y Licencias
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Control de licencias médicas, vacaciones anuales ordinarias,
            comisiones de servicio y asuetos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {puedeCrear && (
            <button
              type="button"
              onClick={() => abrirModalNuevo()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Registrar Licencia / Excepción
            </button>
          )}
        </div>
      </div>

      {/* 2. TARJETAS KPI SELECCIONABLES (FILTROS EN TIEMPO REAL) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* EN CURSO HOY */}
        <button
          type="button"
          onClick={() => handleSeleccionarKpi("EN_CURSO")}
          className={`p-4 rounded-2xl transition cursor-pointer text-left border ${
            filtroKpi === "EN_CURSO"
              ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              EN CURSO HOY
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metricas.enCursoHoy}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            Vigentes en la fecha actual
          </span>
        </button>

        {/* PRÓXIMAS */}
        <button
          type="button"
          onClick={() => handleSeleccionarKpi("PROXIMA")}
          className={`p-4 rounded-2xl transition cursor-pointer text-left border ${
            filtroKpi === "PROXIMA"
              ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              PRÓXIMAS
            </span>
            <Clock className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metricas.proximas}
          </div>
          <span className="text-[10px] text-sky-700 font-medium">
            Programadas por iniciar
          </span>
        </button>

        {/* FINALIZADAS */}
        <button
          type="button"
          onClick={() => handleSeleccionarKpi("FINALIZADA")}
          className={`p-4 rounded-2xl transition cursor-pointer text-left border ${
            filtroKpi === "FINALIZADA"
              ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              FINALIZADAS
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {metricas.finalizadas}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Historial concluido
          </span>
        </button>

        {/* PENDIENTES RRHH */}
        <button
          type="button"
          onClick={() => handleSeleccionarKpi("PENDIENTES_RRHH")}
          className={`p-4 rounded-2xl transition cursor-pointer text-left border ${
            filtroKpi === "PENDIENTES_RRHH"
              ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              PENDIENTES RRHH
            </span>
            <span className="w-3.5 h-3.5 rounded-full border border-amber-500 text-amber-600 flex items-center justify-center text-[9px] font-bold">
              !
            </span>
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2 font-mono">
            {metricas.pendientesRrhh}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">
            Requieren dictamen
          </span>
        </button>

        {/* TOTAL REGISTROS */}
        <button
          type="button"
          onClick={() => handleSeleccionarKpi("TODOS")}
          className={`p-4 rounded-2xl transition cursor-pointer text-left border ${
            filtroKpi === "TODOS"
              ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm"
              : "bg-white border-indigo-200 hover:border-indigo-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              TOTAL REGISTROS
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-2 font-mono">
            {metricas.totalRegistros}
          </div>
          <span className="text-[10px] text-indigo-600 font-medium">
            Ver todos los casos
          </span>
        </button>
      </div>

      {/* 3. PESTAÑAS PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto w-fit">
          {[
            {
              key: "DESGLOSE",
              label: `Desglose por Agente (${desgloseAgentesFiltrado.length})`,
            },
            {
              key: "LISTADO",
              label: `Listado Detallado (${listadoFiltrado.length})`,
            },
            {
              key: "ASUETOS",
              label: "Asuetos & Feriados Institucionales",
            },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTabPrincipal(t.key)}
              className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                tabPrincipal === t.key
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tabPrincipal === "DESGLOSE" && (
          <button
            type="button"
            onClick={alternarTodosDesgloses}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer w-fit"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Desglosar todos los agentes</span>
          </button>
        )}
      </div>

      {/* 4. FILTROS DE BÚSQUEDA */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por agente, legajo, certificado o motivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
        >
          <option value="TODOS">Estado: Todos los casos</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="PENDIENTE_RRHH">Pendientes de RRHH</option>
          <option value="RECHAZADA">Rechazadas</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
        >
          <option value="TODOS">Tipo: Todos</option>
          <option value="LICENCIA_MEDICA">Licencias Médicas</option>
          <option value="VACACIONES">Vacaciones</option>
          <option value="CAMBIO_HORARIO">Cambios de Horario</option>
          <option value="COMISION_SERVICIO">Comisiones de Servicio</option>
          <option value="FERIADO_ASUETO">Feriados y Asuetos</option>
          <option value="OTRA_FRANQUICIA">Otras / Franquicias</option>
        </select>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
        >
          <option value="TODAS">Categoría: Todas</option>
          <option value="INSTITUCIONAL">Institucional</option>
          <option value="Docente">Docentes</option>
          <option value="Administrativo">Administrativos</option>
          <option value="Servicios Generales">Servicios Generales</option>
        </select>
      </div>

      {/* 5. VISTA 1: DESGLOSE POR AGENTE */}
      {tabPrincipal === "DESGLOSE" && (
        <div className="space-y-4">
          {desgloseAgentesFiltrado.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs italic">
              No se registran licencias ni excepciones para el filtro aplicado.
            </div>
          ) : (
            desgloseAgentesFiltrado.map((agente) => {
              const key = agente.idEmpleado || "INSTITUCIONAL";
              const isExpanded = !!desglosesAbiertos[key];

              return (
                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all border-l-4 border-l-indigo-600"
                >
                  {/* CABECERA COMPLETA INTERACTIVA */}
                  <div
                    onClick={() => toggleDesglose(key)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40 hover:bg-slate-100/70 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
                        {agente.esInstitucional ? (
                          <Building className="w-5 h-5 text-purple-600" />
                        ) : (
                          agente.iniciales
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-slate-900 text-sm">
                            {agente.nombreCompleto}
                          </h3>
                          <span className="px-2 py-0.2 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                            {agente.rolArea}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {agente.esInstitucional
                            ? agente.departamento
                            : `#${agente.nroLegajo} • ${agente.departamento || "Agente Registrado"}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
                      {agente.cantEnCursoHoy > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                          ● {agente.cantEnCursoHoy} en curso hoy
                        </span>
                      )}
                      {agente.cantPendientesRrhh > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                          ⚠ {agente.cantPendientesRrhh} pendiente RRHH
                        </span>
                      )}
                      {agente.cantProximas > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[10px]">
                          {agente.cantProximas} próxima
                        </span>
                      )}
                      {agente.cantFinalizadas > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[10px]">
                          {agente.cantFinalizadas} finalizada
                        </span>
                      )}

                      <div className="text-right pl-2 border-l border-slate-200 text-xs">
                        <div className="font-bold text-slate-800">
                          {agente.totalDias} días totales
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {agente.totalRegistros} registros
                        </div>
                      </div>

                      {/* Botón visual que refleja el estado */}
                      <div className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-1 shadow-2xs">
                        <span>Desglose ({agente.licencias.length})</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CONTENIDO INTERNO DESPLEGADO */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 space-y-3 bg-white">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">
                        <span>
                          Desglose de Licencias y Excepciones (
                          {agente.licencias.length})
                        </span>
                        {!agente.esInstitucional && puedeCrear && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalNuevo(agente.idEmpleado);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold cursor-pointer"
                          >
                            + Agregar licencia para este agente
                          </button>
                        )}
                      </div>

                      {agente.licencias.map((lic) => {
                        const esPendiente = lic.estado === "PENDIENTE_RRHH";
                        const esRechazada = lic.estado === "RECHAZADA";

                        return (
                          <div
                            key={lic.id}
                            className={`p-4 rounded-2xl border transition space-y-2 ${
                              esPendiente
                                ? "bg-amber-50/40 border-amber-300"
                                : esRechazada
                                  ? "bg-rose-50/40 border-rose-200"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold border border-slate-200">
                                  {getIconoTipo(lic.tipo)}
                                  <span>{lic.tipoEtiqueta}</span>
                                </span>
                                <span className="font-mono text-slate-600 text-[11px]">
                                  {formatearFechaVisual(lic.fechaInicio)} al{" "}
                                  {formatearFechaVisual(lic.fechaFin)} (
                                  {lic.diasDuracion}{" "}
                                  {lic.diasDuracion === 1 ? "día" : "días"})
                                </span>
                                <span
                                  className={`px-2 py-0.2 rounded-md font-bold text-[10px] ${
                                    lic.estado === "APROBADA"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : esPendiente
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {lic.estado === "PENDIENTE_RRHH"
                                    ? "Pendiente de RRHH"
                                    : lic.estado}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {esPendiente && puedeDictaminar && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDictaminar(lic.id, "APROBADA")
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Aprobar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDictaminar(lic.id, "RECHAZADA")
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Rechazar
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setLicenciaFicha(lic)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver Ficha
                                </button>

                                {puedeCrear && (
                                  <button
                                    type="button"
                                    onClick={() => abrirModalEditar(lic)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                    title="Editar esta licencia"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {puedeEliminar && (
                                  <button
                                    type="button"
                                    onClick={() => handleEliminar(lic.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Anular registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-0.2 rounded-md text-[10px]">
                                {lic.textoProgreso}
                              </span>
                              <span>{lic.detalleVigencia}</span>
                            </div>

                            {lic.condicionTemporal === "EN_CURSO" && (
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 max-w-md">
                                <div
                                  className="bg-amber-500 h-full rounded-full transition-all"
                                  style={{
                                    width: `${lic.porcentajeProgreso}%`,
                                  }}
                                />
                              </div>
                            )}

                            <div className="text-[11px] text-slate-600 pt-0.5">
                              <strong>Motivo / Dictamen:</strong>{" "}
                              {lic.motivoDictamen}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. VISTA 2: LISTADO DETALLADO (DISEÑO DE LA CAPTURA) */}
      {tabPrincipal === "LISTADO" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-6 py-4">AGENTE / EMPLEADO</th>
                <th className="px-4 py-4">TIPO DE LICENCIA</th>
                <th className="px-4 py-4">PERÍODO (DESDE - HASTA)</th>
                <th className="px-4 py-4">CONTADOR & ESTADO DINÁMICO</th>
                <th className="px-6 py-4">MOTIVO / CONSTANCIA</th>
                <th className="px-4 py-4">DICTAMEN RRHH</th>
                <th className="px-6 py-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {listadoFiltrado.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-slate-400 italic"
                  >
                    No se registran licencias para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                listadoFiltrado.map((lic) => (
                  <tr
                    key={lic.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Agente / Empleado con avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs shrink-0">
                          {lic.esInstitucional ? (
                            <Building className="w-4 h-4 text-purple-600" />
                          ) : (
                            getAvatarIniciales(lic.nombreEmpleado)
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {lic.nombreEmpleado}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {lic.esInstitucional
                              ? "Alcance General a la Institución"
                              : `${lic.legajoEmpleado ? `#${lic.legajoEmpleado} • ` : ""}${lic.rolArea}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tipo de Licencia */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${getEstiloPildoraTipo(
                          lic.tipo,
                        )}`}
                      >
                        {getIconoTipo(lic.tipo)}
                        <span>{lic.tipoEtiqueta}</span>
                      </span>
                    </td>

                    {/* Período */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-[11px]">
                        {formatearFechaVisual(lic.fechaInicio)} al{" "}
                        {formatearFechaVisual(lic.fechaFin)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Duración: {lic.diasDuracion}{" "}
                        {lic.diasDuracion === 1 ? "día" : "días"}
                      </div>
                    </td>

                    {/* Contador & Estado Dinámico */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            lic.condicionTemporal === "FINALIZADA"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : lic.diasDuracion === 1 &&
                                  lic.condicionTemporal === "EN_CURSO"
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {lic.textoProgreso}
                        </span>
                        <div className="text-[11px] font-bold text-slate-800 leading-tight">
                          {lic.condicionTemporal === "EN_CURSO"
                            ? `En curso: van ${lic.diasTranscurridos} de ${lic.diasDuracion} días`
                            : lic.condicionTemporal === "FINALIZADA"
                              ? "Completada"
                              : "Programada"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {lic.condicionTemporal === "EN_CURSO"
                            ? `Restan ${lic.diasRestantes} días para que finalice`
                            : lic.condicionTemporal === "FINALIZADA"
                              ? `Concluyó el ${formatearFechaVisual(lic.fechaFin)}`
                              : `Inicia el ${formatearFechaVisual(lic.fechaInicio)}`}
                        </div>
                      </div>
                    </td>

                    {/* Motivo / Constancia */}
                    <td className="px-6 py-4 max-w-xs">
                      <div
                        className="text-slate-600 text-xs truncate font-medium"
                        title={lic.motivoDictamen}
                      >
                        {lic.motivoDictamen}
                      </div>
                    </td>

                    {/* Dictamen RRHH */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${
                          lic.estado === "APROBADA"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : lic.estado === "PENDIENTE_RRHH"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {lic.estado === "PENDIENTE_RRHH"
                          ? "Pendiente RRHH"
                          : lic.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLicenciaFicha(lic)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Ver Ficha Detallada"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {puedeCrear && (
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(lic)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() => handleEliminar(lic.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. VISTA 3: ASUETOS & FERIADOS INSTITUCIONALES (DISEÑO DE LA CAPTURA) */}
      {tabPrincipal === "ASUETOS" && (
        <div className="space-y-4">
          {/* Cabecera institucional */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-slate-200 rounded-3xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Calendario Institucional de Feriados y Asuetos de la
                  Institución
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Fechas donde se suspenden automáticamente las actividades
                académicas y administrativas sin registrar inasistencia.
              </p>
            </div>

            {puedeCrear && (
              <button
                type="button"
                onClick={() => abrirModalNuevo(null, true)}
                className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Agregar Feriado / Asueto
              </button>
            )}
          </div>

          {/* Grilla de Tarjetas en 2 Columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {asuetosFiltrados.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl text-xs italic">
                No hay asuetos o feriados institucionales registrados bajo este
                filtro.
              </div>
            ) : (
              asuetosFiltrados.map((lic) => (
                <div
                  key={lic.id}
                  className="bg-white border border-purple-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-purple-300 transition"
                >
                  <div className="space-y-2">
                    {/* Badge superior y fecha */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                        {lic.textoProgreso}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatearFechaVisual(lic.fechaInicio)}
                      </span>
                    </div>

                    {/* Título en negrita */}
                    <h4 className="font-black text-slate-900 text-sm leading-snug">
                      {lic.motivoDictamen}
                    </h4>

                    {/* Detalle temporal */}
                    <p className="text-[11px] text-slate-500">
                      {lic.detalleVigencia}
                    </p>
                  </div>

                  {/* Pie de tarjeta con acciones */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-700 text-[11px]">
                      Aplica a toda la Institución
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLicenciaFicha(lic)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                        title="Ver detalle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {puedeCrear && (
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(lic)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {puedeEliminar && (
                        <button
                          type="button"
                          onClick={() => handleEliminar(lic.id)}
                          className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] transition cursor-pointer ml-1"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 8. MODALES */}
      <ModalCrearExcepcion
        isOpen={modalCrearAbierto}
        onClose={() => {
          setModalCrearAbierto(false);
          setLicenciaEditando(null);
        }}
        empleados={empleados}
        licenciaEditando={licenciaEditando}
        onGuardar={handleGuardar}
      />

      <ModalFichaDetalleLicencia
        licencia={licenciaFicha}
        isOpen={!!licenciaFicha}
        onClose={() => setLicenciaFicha(null)}
      />
    </div>
  );
}
