import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Search,
  Users,
  LogOut,
  Clock,
  TrendingDown,
  UserX,
  AlertCircle,
  Eye,
  RefreshCw,
  Loader2,
  GraduationCap,
  Briefcase,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  getTableroIncidentes,
  resolverIncidente,
} from "../services/incidenteService";
import ModalJustificarIncidente from "../components/incidentes/ModalJustificarIncidente";
import { useAuth } from "../context/AuthContext";

const ITEMS_POR_PAGINA = 15;
const STORAGE_KEY = "tablero_incidentes_filtros_v1";

function formatearFechaVisual(fechaIso) {
  if (!fechaIso) return "";
  const partes = String(fechaIso).split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaIso;
}

export default function TableroIncidentesDiarios() {
  const { tienePermiso } = useAuth();
  const puedeJustificar = tienePermiso("INCIDENTES_JUSTIFICAR");

  // Recuperar filtros guardados en sessionStorage o usar defaults
  const filtrosGuardados = useMemo(() => {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  const hoyIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Estados persistentes
  const [modoFiltroFecha, setModoFiltroFecha] = useState(
    () => filtrosGuardados?.modoFiltroFecha || "DIA",
  );
  const [fechaDesde, setFechaDesde] = useState(
    () => filtrosGuardados?.fechaDesde || hoyIso,
  );
  const [fechaHasta, setFechaHasta] = useState(
    () => filtrosGuardados?.fechaHasta || hoyIso,
  );
  const [paginaActual, setPaginaActual] = useState(
    () => filtrosGuardados?.paginaActual || 1,
  );
  const [busqueda, setBusqueda] = useState(
    () => filtrosGuardados?.busqueda || "",
  );
  const [severidad, setSeveridad] = useState(
    () => filtrosGuardados?.severidad || "",
  );
  const [categoria, setCategoria] = useState(
    () => filtrosGuardados?.categoria || "",
  );
  const [estado, setEstado] = useState(() => filtrosGuardados?.estado || "");
  const [filtroRapido, setFiltroRapido] = useState(
    () => filtrosGuardados?.filtroRapido || "TODOS",
  );

  // Estados volátiles de datos
  const [loading, setLoading] = useState(true);
  const [tableroData, setTableroData] = useState(null);
  const [incidentes, setIncidentes] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  // Modales
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoSoloLectura, setModoSoloLectura] = useState(false);

  // Guardar en sessionStorage cada vez que el usuario modifica un filtro o fecha
  useEffect(() => {
    const estadoAGuardar = {
      modoFiltroFecha,
      fechaDesde,
      fechaHasta,
      paginaActual,
      busqueda,
      severidad,
      categoria,
      estado,
      filtroRapido,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estadoAGuardar));
  }, [
    modoFiltroFecha,
    fechaDesde,
    fechaHasta,
    paginaActual,
    busqueda,
    severidad,
    categoria,
    estado,
    filtroRapido,
  ]);

  const cargarDatos = useCallback(
    async (pageIndex) => {
      setLoading(true);
      try {
        const params = {
          fechaDesde: fechaDesde,
          fechaHasta: modoFiltroFecha === "DIA" ? fechaDesde : fechaHasta,
          severidad: severidad || undefined,
          categoria: categoria || undefined,
          estado: estado || undefined,
          busqueda: busqueda.trim() || undefined,
          page: pageIndex,
          size: ITEMS_POR_PAGINA,
        };

        const data = await getTableroIncidentes(params);
        setTableroData(data);

        if (data && data.incidentesPaginados) {
          setIncidentes(data.incidentesPaginados.content || []);
          setTotalPaginas(data.incidentesPaginados.totalPages || 1);
          setTotalElementos(data.incidentesPaginados.totalElements || 0);
          setPaginaActual((data.incidentesPaginados.number || 0) + 1);
        } else {
          setIncidentes([]);
          setTotalPaginas(1);
          setTotalElementos(0);
        }
      } catch (err) {
        console.error("Error al cargar incidentes:", err);
        setIncidentes([]);
      } finally {
        setLoading(false);
      }
    },
    [
      fechaDesde,
      fechaHasta,
      modoFiltroFecha,
      severidad,
      categoria,
      estado,
      busqueda,
    ],
  );

  // Debounce para llamadas a la API
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos(paginaActual - 1);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    fechaDesde,
    fechaHasta,
    modoFiltroFecha,
    severidad,
    categoria,
    estado,
    busqueda,
    paginaActual,
    cargarDatos,
  ]);

  const handleCambiarPagina = (nuevaPagina) => {
    setPaginaActual(nuevaPagina);
  };

  const handleResolver = async (id, payload) => {
    try {
      await resolverIncidente(id, payload);
      cargarDatos(paginaActual - 1);
    } catch (err) {
      console.error("Error al registrar justificación:", err);
    }
  };

  const abrirModalJustificar = (inc, soloLectura = false) => {
    setIncidenteSeleccionado(inc);
    setModoSoloLectura(soloLectura);
    setModalAbierto(true);
  };

  const metricas = tableroData?.metricas || {
    salidasEnClase: 0,
    llegadasTarde: 0,
    retirosPrevios: 0,
    salidasExcesivas: 0,
    ausencias: 0,
    marcasAbiertas: 0,
    total: 0,
  };

  const getIconoCargo = (legajo) => {
    if (legajo?.toLowerCase().includes("doc"))
      return <GraduationCap className="w-4 h-4 text-purple-600" />;
    if (legajo?.toLowerCase().includes("gen"))
      return <Wrench className="w-4 h-4 text-amber-600" />;
    return <Briefcase className="w-4 h-4 text-sky-600" />;
  };

  const handleResetFiltros = () => {
    setSeveridad("");
    setCategoria("");
    setEstado("");
    setBusqueda("");
    setFiltroRapido("TODOS");
    setPaginaActual(1);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. CABECERA CON SELECTOR DÍA vs RANGO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Tablero de Incidentes
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 tracking-wide font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {modoFiltroFecha === "DIA"
                  ? formatearFechaVisual(fechaDesde)
                  : `${formatearFechaVisual(fechaDesde)} → ${formatearFechaVisual(fechaHasta)}`}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor consolidado de infracciones, desvíos de asistencia y
            auditoría de justificaciones.
          </p>
        </div>

        {/* CONTROLES DE FECHA */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Alternador Día / Rango */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setModoFiltroFecha("DIA");
                setFechaHasta(fechaDesde);
                setPaginaActual(1);
              }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                modoFiltroFecha === "DIA"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Un Día
            </button>
            <button
              type="button"
              onClick={() => {
                setModoFiltroFecha("RANGO");
                setPaginaActual(1);
              }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                modoFiltroFecha === "RANGO"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rango
            </button>
          </div>

          {/* Selectores de Fecha */}
          {modoFiltroFecha === "DIA" ? (
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white focus-within:bg-white focus-within:border-indigo-500 transition shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 select-none">
                Fecha:
              </span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setFechaHasta(e.target.value);
                  setPaginaActual(1);
                }}
                className="outline-none text-slate-800 text-xs font-semibold font-mono bg-transparent cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white focus-within:bg-white focus-within:border-indigo-500 transition shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 select-none">
                Desde:
              </span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPaginaActual(1);
                }}
                className="outline-none text-slate-800 text-xs font-semibold font-mono bg-transparent cursor-pointer"
              />
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 select-none">
                Hasta:
              </span>
              <input
                type="date"
                value={fechaHasta}
                min={fechaDesde}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPaginaActual(1);
                }}
                className="outline-none text-slate-800 text-xs font-semibold font-mono bg-transparent cursor-pointer"
              />
            </div>
          )}

          {/* Presentes (visible cuando se evalúa un día puntual) */}
          {modoFiltroFecha === "DIA" && (
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-950 select-none shadow-2xs"
              title={`${tableroData?.presentesActuales || 0} ingresaron al establecimiento de ${tableroData?.presentesTotales || 0} esperados`}
            >
              <Users className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Presentes:{" "}
                <strong className="text-indigo-700 font-extrabold text-[13px]">
                  {tableroData?.presentesActuales || 0}/
                  {tableroData?.presentesTotales || 0}
                </strong>
              </span>
            </div>
          )}

          <button
            onClick={() => cargarDatos(paginaActual - 1)}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. TARJETAS KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => {
            setCategoria("SALIDAS_EN_CLASE");
            setFiltroRapido("SALIDAS_EN_CLASE");
            setPaginaActual(1);
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            categoria === "SALIDAS_EN_CLASE"
              ? "bg-rose-600 text-white border-rose-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                categoria === "SALIDAS_EN_CLASE"
                  ? "text-rose-100 font-bold"
                  : "text-rose-600 font-bold"
              }
            >
              Salidas en Clase
            </span>
            <LogOut
              className={`w-4 h-4 ${categoria === "SALIDAS_EN_CLASE" ? "text-white" : "text-rose-500"}`}
            />
          </div>
          <div className="text-2xl font-black mt-2">
            {metricas.salidasEnClase}
          </div>
          <div
            className={`text-[10px] mt-0.5 ${categoria === "SALIDAS_EN_CLASE" ? "text-rose-100" : "text-slate-400"}`}
          >
            Críticas docente
          </div>
        </div>

        <div
          onClick={() => {
            setCategoria("LLEGADAS_TARDE");
            setFiltroRapido("LLEGADAS_TARDE");
            setPaginaActual(1);
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            categoria === "LLEGADAS_TARDE"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                categoria === "LLEGADAS_TARDE"
                  ? "text-amber-100 font-bold"
                  : "text-amber-600 font-bold"
              }
            >
              Llegadas Tarde
            </span>
            <Clock
              className={`w-4 h-4 ${categoria === "LLEGADAS_TARDE" ? "text-white" : "text-amber-500"}`}
            />
          </div>
          <div className="text-2xl font-black mt-2">
            {metricas.llegadasTarde}
          </div>
          <div
            className={`text-[10px] mt-0.5 ${categoria === "LLEGADAS_TARDE" ? "text-amber-100" : "text-slate-400"}`}
          >
            Fuera de tolerancia
          </div>
        </div>

        <div
          onClick={() => {
            setCategoria("RETIROS_PREVIOS");
            setFiltroRapido("RETIROS_PREVIOS");
            setPaginaActual(1);
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            categoria === "RETIROS_PREVIOS"
              ? "bg-amber-800 text-white border-amber-800 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-amber-600"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                categoria === "RETIROS_PREVIOS"
                  ? "text-amber-200 font-bold"
                  : "text-amber-800 font-bold"
              }
            >
              Retiros Previos
            </span>
            <LogOut
              className={`w-4 h-4 ${categoria === "RETIROS_PREVIOS" ? "text-white" : "text-amber-700"}`}
            />
          </div>
          <div className="text-2xl font-black mt-2">
            {metricas.retirosPrevios}
          </div>
          <div
            className={`text-[10px] mt-0.5 ${categoria === "RETIROS_PREVIOS" ? "text-amber-200" : "text-slate-400"}`}
          >
            Antes de fin de turno
          </div>
        </div>

        <div
          onClick={() => {
            setCategoria("SALIDAS_EXCESIVAS");
            setFiltroRapido("SALIDAS_EXCESIVAS");
            setPaginaActual(1);
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            categoria === "SALIDAS_EXCESIVAS"
              ? "bg-sky-600 text-white border-sky-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                categoria === "SALIDAS_EXCESIVAS"
                  ? "text-sky-100 font-bold"
                  : "text-sky-600 font-bold"
              }
            >
              Salidas Excesivas
            </span>
            <TrendingDown
              className={`w-4 h-4 ${categoria === "SALIDAS_EXCESIVAS" ? "text-white" : "text-sky-500"}`}
            />
          </div>
          <div className="text-2xl font-black mt-2">
            {metricas.salidasExcesivas}
          </div>
          <div
            className={`text-[10px] mt-0.5 ${categoria === "SALIDAS_EXCESIVAS" ? "text-sky-100" : "text-slate-400"}`}
          >
            Tiempo excedido
          </div>
        </div>

        <div
          onClick={() => {
            setCategoria("AUSENCIAS");
            setFiltroRapido("AUSENCIAS");
            setPaginaActual(1);
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            categoria === "AUSENCIAS"
              ? "bg-slate-900 text-white border-slate-900 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                categoria === "AUSENCIAS"
                  ? "text-slate-200 font-bold"
                  : "text-slate-700 font-bold"
              }
            >
              Ausencias
            </span>
            <UserX
              className={`w-4 h-4 ${categoria === "AUSENCIAS" ? "text-white" : "text-slate-600"}`}
            />
          </div>
          <div className="text-2xl font-black mt-2">{metricas.ausencias}</div>
          <div
            className={`text-[10px] mt-0.5 ${categoria === "AUSENCIAS" ? "text-slate-300" : "text-slate-400"}`}
          >
            Sin marcación en día
          </div>
        </div>

        <div
          onClick={() => {
            setCategoria("MARCAS_ABIERTAS");
            setFiltroRapido("MARCAS_ABIERTAS");
            setPaginaActual(1);
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            categoria === "MARCAS_ABIERTAS"
              ? "bg-orange-600 text-white border-orange-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-orange-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                categoria === "MARCAS_ABIERTAS"
                  ? "text-orange-100 font-bold"
                  : "text-orange-600 font-bold"
              }
            >
              Marcas Abiertas
            </span>
            <AlertCircle
              className={`w-4 h-4 ${categoria === "MARCAS_ABIERTAS" ? "text-white" : "text-orange-500"}`}
            />
          </div>
          <div className="text-2xl font-black mt-2">
            {metricas.marcasAbiertas}
          </div>
          <div
            className={`text-[10px] mt-0.5 ${categoria === "MARCAS_ABIERTAS" ? "text-orange-100" : "text-slate-400"}`}
          >
            Sin fichada de egreso
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empleado, legajo o descripción..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800"
            />
          </div>

          <select
            value={severidad}
            onChange={(e) => {
              setSeveridad(e.target.value);
              setPaginaActual(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
          >
            <option value="">Severidad: Todas</option>
            <option value="CRÍTICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
          </select>

          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setFiltroRapido(e.target.value || "TODOS");
              setPaginaActual(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
          >
            <option value="">Categoría: Todas</option>
            <option value="SALIDAS_EN_CLASE">
              Salidas en Horario de Clase
            </option>
            <option value="LLEGADAS_TARDE">Llegadas Tarde</option>
            <option value="RETIROS_PREVIOS">Retiros Anticipados</option>
            <option value="SALIDAS_EXCESIVAS">
              Exceso Salidas Intermedias
            </option>
            <option value="AUSENCIAS">Ausencias sin Registro</option>
            <option value="MARCAS_ABIERTAS">
              Marcación Abierta (Falta de Salida)
            </option>
          </select>

          <div className="flex items-center gap-2">
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
            >
              <option value="">Auditoría: Todos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="JUSTIFICADA">Justificadas</option>
              <option value="OBSERVADA">Observadas</option>
              <option value="RECHAZADA">Rechazadas</option>
            </select>

            {(severidad || categoria || estado || busqueda) && (
              <button
                onClick={handleResetFiltros}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap cursor-pointer"
              >
                Restablecer
              </button>
            )}
          </div>
        </div>

        {/* Píldoras rápidas */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs font-semibold">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1">
            Filtros directos:
          </span>
          <button
            onClick={() => {
              setCategoria("");
              setFiltroRapido("TODOS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              filtroRapido === "TODOS"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({metricas.total})
          </button>
          <button
            onClick={() => {
              setCategoria("SALIDAS_EN_CLASE");
              setFiltroRapido("SALIDAS_EN_CLASE");
              setPaginaActual(1);
            }}
            className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
              filtroRapido === "SALIDAS_EN_CLASE"
                ? "bg-rose-600 text-white border-rose-600"
                : "border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
            }`}
          >
            Críticas: Salidas en Clase ({metricas.salidasEnClase})
          </button>
          <button
            onClick={() => {
              setCategoria("LLEGADAS_TARDE");
              setFiltroRapido("LLEGADAS_TARDE");
              setPaginaActual(1);
            }}
            className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
              filtroRapido === "LLEGADAS_TARDE"
                ? "bg-amber-600 text-white border-amber-600"
                : "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
            }`}
          >
            Tardanzas & Retiros (
            {metricas.llegadasTarde + metricas.retirosPrevios})
          </button>
          <button
            onClick={() => {
              setCategoria("SALIDAS_EXCESIVAS");
              setFiltroRapido("SALIDAS_EXCESIVAS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
              filtroRapido === "SALIDAS_EXCESIVAS"
                ? "bg-sky-600 text-white border-sky-600"
                : "border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100"
            }`}
          >
            Salidas Excesivas ({metricas.salidasExcesivas})
          </button>
          <button
            onClick={() => {
              setCategoria("AUSENCIAS");
              setFiltroRapido("AUSENCIAS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
              filtroRapido === "AUSENCIAS"
                ? "bg-slate-800 text-white border-slate-800"
                : "border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            Ausencias ({metricas.ausencias})
          </button>
          <button
            onClick={() => {
              setCategoria("MARCAS_ABIERTAS");
              setFiltroRapido("MARCAS_ABIERTAS");
              setPaginaActual(1);
            }}
            className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
              filtroRapido === "MARCAS_ABIERTAS"
                ? "bg-orange-600 text-white border-orange-600"
                : "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
            }`}
          >
            Marcaciones Abiertas ({metricas.marcasAbiertas})
          </button>
        </div>
      </div>

      {/* 4. TABLA CON FECHA VISIBLE EN DD/MM/AAAA */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Lista de Incidentes ({totalElementos})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Información esencial para auditoría
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Severidad</th>
                <th className="px-6 py-3.5">Empleado</th>
                <th className="px-6 py-3.5">Detalle del Incidente</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Consultando incidentes del período...
                  </td>
                </tr>
              ) : incidentes.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-12 text-slate-400 italic"
                  >
                    No se registran incidentes para los filtros aplicados en
                    este período.
                  </td>
                </tr>
              ) : (
                incidentes.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">
                        {formatearFechaVisual(inc.fecha)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {inc.hora ? inc.hora.substring(0, 5) : "-"} hs
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          inc.severidad === "CRÍTICA"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : inc.severidad === "ALTA"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {inc.severidad}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {getIconoCargo(inc.empleado?.nroLegajo || "")}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {inc.empleado
                              ? `${inc.empleado.apellido}, ${inc.empleado.nombre}`
                              : "Desconocido"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {inc.empleado?.nroLegajo} •{" "}
                            {inc.empleado?.rolSistema || "Empleado"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            inc.severidad === "CRÍTICA"
                              ? "bg-rose-500"
                              : "bg-sky-500"
                          }`}
                        />
                        <span>{inc.tipo}</span>
                      </div>
                      <div
                        className="text-[11px] text-slate-500 truncate mt-0.5"
                        title={inc.detalle}
                      >
                        {inc.detalle}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {inc.estado === "JUSTIFICADA" ? (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ JUSTIFICADA
                          </span>
                          {inc.resolucionMotivo && (
                            <span
                              className="block text-[10px] text-slate-400 truncate max-w-[140px]"
                              title={inc.resolucionMotivo}
                            >
                              {inc.resolucionMotivo}
                            </span>
                          )}
                        </div>
                      ) : inc.estado === "OBSERVADA" ? (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ✓ OBSERVADA
                          </span>
                          {inc.resolucionMotivo && (
                            <span
                              className="block text-[10px] text-slate-400 truncate max-w-[140px]"
                              title={inc.resolucionMotivo}
                            >
                              {inc.resolucionMotivo}
                            </span>
                          )}
                        </div>
                      ) : inc.estado === "RECHAZADA" ? (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ✓ RECHAZADA
                          </span>
                          {inc.resolucionMotivo && (
                            <span
                              className="block text-[10px] text-slate-400 truncate max-w-[140px]"
                              title={inc.resolucionMotivo}
                            >
                              {inc.resolucionMotivo}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {puedeJustificar ? (
                          inc.estado === "PENDIENTE" ? (
                            <button
                              onClick={() => abrirModalJustificar(inc, false)}
                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Justificar
                            </button>
                          ) : (
                            <button
                              onClick={() => abrirModalJustificar(inc, false)}
                              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Editar
                            </button>
                          )
                        ) : (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold cursor-not-allowed select-none"
                            title="Requiere permiso INCIDENTES_JUSTIFICAR"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            {inc.estado === "PENDIENTE"
                              ? "Justificar"
                              : "Editar"}
                          </span>
                        )}

                        <button
                          onClick={() => abrirModalJustificar(inc, true)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                          title="Ver detalle del incidente"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINACIÓN */}
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
            incidentes
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleCambiarPagina(Math.max(paginaActual - 1, 1))}
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
                  onClick={() => handleCambiarPagina(num)}
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
                handleCambiarPagina(Math.min(paginaActual + 1, totalPaginas))
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

      {/* 6. MODAL DE RESOLUCIÓN */}
      <ModalJustificarIncidente
        incidente={incidenteSeleccionado}
        isOpen={modalAbierto}
        readOnly={modoSoloLectura || !puedeJustificar}
        onClose={() => {
          setModalAbierto(false);
          setIncidenteSeleccionado(null);
        }}
        onGuardar={handleResolver}
      />
    </div>
  );
}
