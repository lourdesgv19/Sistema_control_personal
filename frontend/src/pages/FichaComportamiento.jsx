import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Printer,
  FileSpreadsheet,
  Eye,
  Users,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Palette,
  Lock,
  GraduationCap,
  CalendarOff,
  UserX,
  CalendarCheck,
} from "lucide-react";
import ListaEmpleadosSidebar from "../components/comunes/ListaEmpleadosSidebar";
import ModalJustificarIncidente from "../components/incidentes/ModalJustificarIncidente";
import { getFichaComportamiento } from "../services/fichaComportamientoService";
import { resolverIncidente } from "../services/incidenteService";
import { useAuth } from "../context/AuthContext";
import { useLocation, useSearchParams } from "react-router-dom";
import { generarPdfFichaComportamiento } from "../utils/generadorPdfFicha";
import { exportarFichaACsv } from "../utils/exportadorCsvFicha";
import {
  formatearFechaVisual,
  obtenerNombreDia,
  obtenerNombreMes,
  formatearFechaLarga,
  calcularRangoSemana,
  calcularRangoMes,
  calcularOffsetPrimerDia,
} from "../utils/fechasFichaUtils";

export default function FichaComportamiento() {
  const tablaDetalleRef = useRef(null);
  const { tienePermiso } = useAuth();
  const puedeJustificar = tienePermiso("INCIDENTES_JUSTIFICAR");
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const hoyIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const fechaInicial = location.state?.fecha || hoyIso;
  const modalidadInicial = location.state?.modalidad || "DIARIO";
  const fechaHastaInicial = location.state?.fechaHasta || fechaInicial;

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(() => {
    const empId = location.state?.empleadoId || searchParams.get("empleadoId");
    return empId ? { id: Number(empId) } : null;
  });
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [menuImpresionAbierto, setMenuImpresionAbierto] = useState(false);

  // Modalidades: DIARIO | SEMANAL | MENSUAL | TRIMESTRE | CUATRIMESTRE | RANGO_FECHAS
  const [modalidad, setModalidad] = useState(modalidadInicial);
  const [fechaConsulta, setFechaConsulta] = useState(fechaInicial);
  const [fechaHastaRango, setFechaHastaRango] = useState(fechaHastaInicial);

  const [mesesExpandidos, setMesesExpandidos] = useState({});
  const [diaInspeccionado, setDiaInspeccionado] = useState(null);
  const [modalListaIncidentesAbierto, setModalListaIncidentesAbierto] =
    useState(false);
  const [tabInferior, setTabInferior] = useState("INTERVALOS");

  const [loadingFicha, setLoadingFicha] = useState(false);
  const [fichaData, setFichaData] = useState(null);

  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState(null);
  const [modalJustificarAbierto, setModalJustificarAbierto] = useState(false);
  const [modoSoloLecturaModal, setModoSoloLecturaModal] = useState(false);

  const { inicioSemanaStr, finSemanaStr } = useMemo(
    () => calcularRangoSemana(fechaConsulta),
    [fechaConsulta],
  );
  const { inicioMesStr, finMesStr } = useMemo(
    () => calcularRangoMes(fechaConsulta),
    [fechaConsulta],
  );

  const diasOffsetInicioMes = useMemo(() => {
    if (!fichaData?.diasPeriodo || fichaData.diasPeriodo.length === 0) return 0;
    return calcularOffsetPrimerDia(fichaData.diasPeriodo[0].fecha);
  }, [fichaData]);

  const toggleMes = (mesKey) => {
    setMesesExpandidos((prev) => ({ ...prev, [mesKey]: !prev[mesKey] }));
  };

  const expandirTodos = () => {
    if (!fichaData?.mesesPeriodo) return;
    const allExpanded = {};
    fichaData.mesesPeriodo.forEach((m) => (allExpanded[m.mesKey] = true));
    setMesesExpandidos(allExpanded);
  };

  const colapsarTodos = () => {
    setMesesExpandidos({});
  };

  // Sincronización cuando cambia la navegación (state o query params)
  useEffect(() => {
    const empId = location.state?.empleadoId || searchParams.get("empleadoId");
    if (empId) {
      setEmpleadoSeleccionado({ id: Number(empId) });
    }
    if (location.state?.fecha) {
      setFechaConsulta(location.state.fecha);
      setModalidad(location.state.modalidad || "DIARIO");
      if (location.state.fechaHasta) {
        setFechaHastaRango(location.state.fechaHasta);
      }
      setDiaInspeccionado(null);
    }
  }, [location.state, searchParams]);

  const cargarFicha = useCallback(async () => {
    if (!empleadoSeleccionado?.id) return;
    setLoadingFicha(true);
    try {
      const params = {
        modalidad: modalidad === "RANGO_FECHAS" ? "RANGO_FECHAS" : modalidad,
        fecha: fechaConsulta,
      };
      if (modalidad === "RANGO_FECHAS") {
        params.fechaDesde = fechaConsulta;
        params.fechaHasta = fechaHastaRango;
      }
      const data = await getFichaComportamiento(
        empleadoSeleccionado.id,
        params,
      );
      setFichaData(data);
      setDiaInspeccionado((prev) => {
        if (!prev || !data?.diasPeriodo) return prev;
        return data.diasPeriodo.find((d) => d.fecha === prev.fecha) || prev;
      });
    } catch (err) {
      console.error("Error al cargar ficha de comportamiento:", err);
    } finally {
      setLoadingFicha(false);
    }
  }, [empleadoSeleccionado, modalidad, fechaConsulta, fechaHastaRango]);

  useEffect(() => {
    cargarFicha();
  }, [cargarFicha]);

  useEffect(() => {
    const handleActualizacionTiempoReal = () => {
      cargarFicha();
    };
    window.addEventListener(
      "datos:actualizados",
      handleActualizacionTiempoReal,
    );
    window.addEventListener(
      "conexion:restaurada",
      handleActualizacionTiempoReal,
    );
    return () => {
      window.removeEventListener(
        "datos:actualizados",
        handleActualizacionTiempoReal,
      );
      window.removeEventListener(
        "conexion:restaurada",
        handleActualizacionTiempoReal,
      );
    };
  }, [cargarFicha]);

  const abrirModalJustificarDirecto = (inc, soloLectura = false) => {
    const incidenteCompleto = {
      ...inc,
      motivo: inc.resolucionMotivo || inc.motivo || "",
      observaciones: inc.resolucionObservaciones || inc.observaciones || "",
      empleado: inc.empleado || {
        id: fichaData?.empleadoId || empleadoSeleccionado?.id,
        nombre: empleadoSeleccionado?.nombre || "",
        apellido:
          empleadoSeleccionado?.apellido || fichaData?.nombreCompleto || "",
        nroLegajo:
          fichaData?.nroLegajo || empleadoSeleccionado?.nroLegajo || "",
        rolSistema: fichaData?.rolOArea || "Empleado",
      },
    };
    setIncidenteSeleccionado(incidenteCompleto);
    setModoSoloLecturaModal(soloLectura);
    setModalJustificarAbierto(true);
  };

  const handleGuardarJustificacion = async (id, payload) => {
    try {
      await resolverIncidente(id, payload);
      await cargarFicha();
    } catch (err) {
      console.error("Error al registrar justificación desde la ficha:", err);
    }
  };

  const emitirReportePdf = (modoColor) => {
    setMenuImpresionAbierto(false);
    generarPdfFichaComportamiento({
      fichaData,
      modalidad,
      fechaConsulta,
      fechaHastaRango,
      esColor: modoColor,
    });
  };

  const handleExportarExcel = () => {
    exportarFichaACsv({ fichaData, modalidad, fechaConsulta, fechaHastaRango });
  };

  const moverFecha = (direccion) => {
    const partes = fechaConsulta.split("-");
    const actual = new Date(
      parseInt(partes[0], 10),
      parseInt(partes[1], 10) - 1,
      parseInt(partes[2], 10),
    );

    if (modalidad === "DIARIO") {
      actual.setDate(actual.getDate() + direccion);
    } else if (modalidad === "SEMANAL") {
      actual.setDate(actual.getDate() + direccion * 7);
    } else if (
      modalidad === "MENSUAL" ||
      modalidad === "TRIMESTRE" ||
      modalidad === "CUATRIMESTRE"
    ) {
      actual.setMonth(actual.getMonth() + direccion);
    }
    const y = actual.getFullYear();
    const m = String(actual.getMonth() + 1).padStart(2, "0");
    const d = String(actual.getDate()).padStart(2, "0");
    setFechaConsulta(`${y}-${m}-${d}`);
    setDiaInspeccionado(null);
  };

  const metricas = fichaData?.metricas || {
    primeraEntrada: "--:--",
    ultimoEgreso: "--:--",
    presenciaNetaTexto: "0h 0m",
    salidasIntermediasCantidad: 0,
    salidasIntermediasMinutos: 0,
    totalIncidentes: 0,
    incidentesJustificados: 0,
    horasAFavorTexto: "0h 0m",
    horasEnContraTexto: "0h 0m",
    diasConDeficit: 0,
    diasConHorasExtra: 0,
    clasesDictadasTexto: "0h 0m / 0h 0m (0%)",
  };

  const esDocente = useMemo(() => {
    const turno = fichaData?.etiquetaTurno?.toLowerCase() || "";
    const rol = fichaData?.rolOArea?.toLowerCase() || "";
    return (
      turno.includes("cátedra") ||
      turno.includes("catedra") ||
      rol.includes("profesor") ||
      rol.includes("docente")
    );
  }, [fichaData]);

  // EVALUACIÓN DE LA JORNADA DIARIA
  const estadoJornadaDiaria = useMemo(() => {
    if (modalidad !== "DIARIO") {
      return {
        esSinHorario: false,
        esInasistencia: false,
        esFuturoConHorario: false,
        tieneDatos: true,
      };
    }

    const esFechaFutura = fechaConsulta > hoyIso;
    const franjasTeoricas =
      fichaData?.planificados || fichaData?.planificado || [];
    const tieneHorariosPlanificados =
      Array.isArray(franjasTeoricas) && franjasTeoricas.length > 0;

    const tienePresencia =
      (fichaData?.presenciaReal && fichaData.presenciaReal.length > 0) ||
      (fichaData?.fichajesBrutos && fichaData.fichajesBrutos.length > 0) ||
      (metricas?.presenciaNetaTexto &&
        metricas.presenciaNetaTexto !== "0h 0m" &&
        metricas.presenciaNetaTexto !== "0h 00m");

    const tieneIncidentes =
      Array.isArray(fichaData?.incidentes) &&
      fichaData.incidentes.some((inc) =>
        !inc.fecha ? true : String(inc.fecha).split("T")[0] === fechaConsulta,
      );

    // 1. DÍA FUTURO
    if (esFechaFutura) {
      if (tieneHorariosPlanificados) {
        return {
          esSinHorario: false,
          esInasistencia: false,
          esFuturoConHorario: true,
          tieneDatos: false,
          planificados: franjasTeoricas,
        };
      }
      return {
        esSinHorario: true,
        esInasistencia: false,
        esFuturoConHorario: false,
        tieneDatos: false,
      };
    }

    // 2. DÍA PASADO O DÍA DE HOY
    if (tieneHorariosPlanificados && !tienePresencia) {
      return {
        esSinHorario: false,
        esInasistencia: true,
        esFuturoConHorario: false,
        tieneDatos: false,
        planificados: franjasTeoricas,
      };
    }

    if (!tieneHorariosPlanificados && !tienePresencia && !tieneIncidentes) {
      return {
        esSinHorario: true,
        esInasistencia: false,
        esFuturoConHorario: false,
        tieneDatos: false,
      };
    }

    return {
      esSinHorario: false,
      esInasistencia: false,
      esFuturoConHorario: false,
      tieneDatos: true,
    };
  }, [modalidad, fichaData, metricas, fechaConsulta, hoyIso]);

  useEffect(() => {
    if (
      modalidad === "DIARIO" &&
      estadoJornadaDiaria.esInasistencia &&
      !loadingFicha
    ) {
      setTabInferior("INCIDENTES");
      const timer = setTimeout(() => {
        if (tablaDetalleRef.current) {
          tablaDetalleRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [
    modalidad,
    estadoJornadaDiaria.esInasistencia,
    loadingFicha,
    fechaConsulta,
  ]);

  const renderItemIncidenteInteractivo = (inc, mostrarFecha = false) => {
    const esCritica =
      inc.severidad === "CRÍTICA" || inc.severidad === "CRITICA";
    return (
      <div
        key={inc.id}
        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
          esCritica
            ? "bg-rose-50/80 border-rose-200"
            : "bg-amber-50/80 border-amber-200"
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {mostrarFecha && inc.fecha && (
              <span className="font-mono font-bold text-indigo-900 bg-white/90 border border-slate-200 px-2.5 py-0.5 rounded-md text-[11px]">
                {formatearFechaVisual(inc.fecha)}
              </span>
            )}
            <span className="font-mono font-bold text-slate-700">
              {inc.hora} hs
            </span>
            <span
              className={`font-bold ${esCritica ? "text-rose-950" : "text-amber-950"}`}
            >
              {inc.tipo}
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                esCritica
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-amber-500 text-white shadow-2xs"
              }`}
            >
              {inc.severidad}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1">{inc.detalle}</div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {inc.estado === "JUSTIFICADA" ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ JUSTIFICADA
            </span>
          ) : inc.estado === "OBSERVADA" ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              ✓ OBSERVADA
            </span>
          ) : inc.estado === "RECHAZADA" ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              ✓ RECHAZADA
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-300">
              Pendiente
            </span>
          )}

          {puedeJustificar ? (
            <button
              type="button"
              onClick={() => abrirModalJustificarDirecto(inc, false)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                inc.estado === "PENDIENTE"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
              }`}
            >
              {inc.estado === "PENDIENTE" ? "Justificar" : "Editar"}
            </button>
          ) : (
            <span
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-[11px] font-semibold cursor-not-allowed select-none"
              title="Requiere permiso INCIDENTES_JUSTIFICAR"
            >
              <Lock className="w-3.5 h-3.5" />
              {inc.estado === "PENDIENTE" ? "Justificar" : "Editar"}
            </span>
          )}
          <button
            type="button"
            onClick={() => abrirModalJustificarDirecto(inc, true)}
            className="p-2 bg-white/80 hover:bg-white text-slate-500 hover:text-indigo-600 border border-slate-200/80 rounded-xl transition cursor-pointer"
            title="Ver detalle del incidente"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderCardInspeccionDiaria = () => {
    if (!diaInspeccionado) return null;
    const fechaDiaStr = String(diaInspeccionado.fecha || "").split("T")[0];
    const incidentesDelDia = (fichaData?.incidentes || []).filter((inc) =>
      !inc.fecha ? true : String(inc.fecha).split("T")[0] === fechaDiaStr,
    );

    return (
      <div className="bg-white border-2 border-indigo-500/80 rounded-3xl p-5 shadow-sm space-y-4 transition-all animate-fadeIn">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                JORNADA ESPECÍFICA INSPECCIONADA
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {formatearFechaLarga(diaInspeccionado.fecha)}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFechaConsulta(diaInspeccionado.fecha);
                setModalidad("DIARIO");
                setDiaInspeccionado(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver en Ficha Diaria Completa
            </button>
            <button
              type="button"
              onClick={() => setDiaInspeccionado(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Cerrar inspección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className={`grid grid-cols-2 ${esDocente ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3 text-xs`}
        >
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              1RA ENTRADA - ÚLTIMO EGRESO
            </span>
            <div className="font-mono font-bold text-slate-800 text-xs sm:text-sm mt-1">
              {diaInspeccionado.primeraEntrada !== "--:--"
                ? `${diaInspeccionado.primeraEntrada} hs → ${diaInspeccionado.ultimoEgreso} hs`
                : "--:--"}
            </div>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200/80 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              PRESENCIA NETA
            </span>
            <div className="font-black text-emerald-950 text-sm sm:text-base mt-1">
              {diaInspeccionado.presenciaNetaTexto}
            </div>
          </div>
          <div className="bg-amber-50/50 border border-amber-200/80 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              SALIDAS INTERMEDIAS
            </span>
            <div className="font-bold text-amber-950 text-xs sm:text-sm mt-1">
              {diaInspeccionado.salidasIntermedias} (
              {diaInspeccionado.minutosFuera} min)
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CUMPLIMIENTO
            </span>
            <div className="font-black text-slate-900 text-sm sm:text-base mt-1">
              {diaInspeccionado.porcentajeCumplimiento}%
            </div>
          </div>
          {esDocente && (
            <div className="bg-purple-50/60 border border-purple-200/80 p-3 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                CLASES DICTADAS
              </span>
              <div className="font-black text-purple-950 text-sm sm:text-base mt-1 font-mono">
                {diaInspeccionado.clasesDictadasTexto || "0h 0m / 0h 0m"}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>
              INCIDENCIAS Y DESVÍOS DE LA JORNADA ({incidentesDelDia.length})
            </span>
          </div>
          {incidentesDelDia.length === 0 ? (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Jornada regular sin desvíos ni infracciones horarias
                registradas.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {incidentesDelDia.map((inc) =>
                renderItemIncidenteInteractivo(inc, false),
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              INTERVALOS RECONSTRUIDOS DEL DÍA (
              {diaInspeccionado.presenciaNetaMinutos > 0 ? "1" : "0"})
            </span>
          </div>
          {diaInspeccionado.presenciaNetaMinutos > 0 ? (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs max-w-sm">
              <div>
                <div className="font-bold text-emerald-900 flex items-center gap-1">
                  <span>✓ PRESENCIA</span>
                </div>
                <div className="font-mono text-slate-600 text-[11px] mt-0.5">
                  {diaInspeccionado.primeraEntrada} hs →{" "}
                  {diaInspeccionado.ultimoEgreso} hs
                </div>
              </div>
              <span className="font-bold text-emerald-950">
                {diaInspeccionado.presenciaNetaTexto}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 italic">
              Sin actividad ni intervalos de presencia registrados en este día.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5 font-sans relative">
      <style>{`@media print { body { background: white !important; } .no-print { display: none !important; } .print-full { width: 100% !important; margin: 0 !important; } }`}</style>

      <div className="flex items-center justify-between no-print">
        <button
          type="button"
          onClick={() => setSidebarAbierto(!sidebarAbierto)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          {sidebarAbierto ? (
            <>
              <PanelLeftClose className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Ocultar listado</span>
              <span className="sm:hidden">Ocultar</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
              <span>Ver listado de empleados</span>
            </>
          )}
        </button>
        {!sidebarAbierto && empleadoSeleccionado && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Inspeccionando a:</span>
            <strong className="text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
              {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}
            </strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div
          className={`no-print transition-all duration-300 ${sidebarAbierto ? "lg:col-span-3 block" : "lg:hidden"}`}
        >
          <ListaEmpleadosSidebar
            isOpen={sidebarAbierto}
            onClose={() => setSidebarAbierto(false)}
            empleadoSeleccionadoId={empleadoSeleccionado?.id}
            onSeleccionarEmpleado={(emp) => setEmpleadoSeleccionado(emp)}
          />
        </div>

        <div
          className={`print-full space-y-5 transition-all duration-300 ${sidebarAbierto ? "lg:col-span-9" : "lg:col-span-12"}`}
        >
          {/* BARRA DE MODALIDAD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Modalidad de Reporte:
              </span>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto">
              {[
                { label: "Diario", key: "DIARIO" },
                { label: "Semanal", key: "SEMANAL" },
                { label: "Mensual", key: "MENSUAL" },
                { label: "Trimestre", key: "TRIMESTRE" },
                { label: "Cuatrimestre", key: "CUATRIMESTRE" },
                { label: "Rango de fechas", key: "RANGO_FECHAS" },
              ].map(({ label, key }) => {
                const activo = modalidad === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setModalidad(key);
                      setDiaInspeccionado(null);
                      setModalListaIncidentesAbierto(false);
                      setMesesExpandidos({});
                    }}
                    className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                      activo
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BARRA DE FECHA Y NAVEGACIÓN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-600 text-xs">
                {modalidad === "DIARIO"
                  ? "Jornada:"
                  : modalidad === "SEMANAL"
                    ? "Semana:"
                    : modalidad === "MENSUAL"
                      ? "Mes:"
                      : modalidad === "TRIMESTRE"
                        ? "Trimestre Fijo (3 meses):"
                        : modalidad === "CUATRIMESTRE"
                          ? "Cuatrimestre Fijo (4 meses):"
                          : "Período:"}
              </span>

              {modalidad !== "RANGO_FECHAS" &&
                modalidad !== "TRIMESTRE" &&
                modalidad !== "CUATRIMESTRE" && (
                  <button
                    type="button"
                    onClick={() => moverFecha(-1)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

              {modalidad === "DIARIO" && (
                <div
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector("input");
                    if (input && typeof input.showPicker === "function")
                      input.showPicker();
                  }}
                  className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                >
                  <span className="font-mono font-semibold text-slate-800 text-xs select-none pointer-events-none">
                    {formatearFechaVisual(fechaConsulta)}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="date"
                    value={fechaConsulta}
                    onChange={(e) => {
                      if (e.target.value) setFechaConsulta(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}

              {modalidad === "SEMANAL" && (
                <div
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector("input");
                    if (input && typeof input.showPicker === "function")
                      input.showPicker();
                  }}
                  className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                >
                  <span className="font-mono font-semibold text-slate-800 text-xs select-none pointer-events-none">
                    {formatearFechaVisual(inicioSemanaStr)} →{" "}
                    {formatearFechaVisual(finSemanaStr)}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="date"
                    value={fechaConsulta}
                    onChange={(e) => {
                      if (e.target.value) setFechaConsulta(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}

              {modalidad === "MENSUAL" && (
                <div
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector("input");
                    if (input && typeof input.showPicker === "function")
                      input.showPicker();
                  }}
                  className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                >
                  <span className="font-semibold text-slate-800 text-xs select-none pointer-events-none">
                    {obtenerNombreMes(fechaConsulta)} (
                    {formatearFechaVisual(inicioMesStr)} Al{" "}
                    {formatearFechaVisual(finMesStr)})
                  </span>
                  <CalendarIcon className="w-4 h-4 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="month"
                    value={fechaConsulta.substring(0, 7)}
                    onChange={(e) => {
                      if (e.target.value)
                        setFechaConsulta(`${e.target.value}-01`);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}

              {(modalidad === "TRIMESTRE" || modalidad === "CUATRIMESTRE") && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Desde Mes a Elección
                  </span>
                  <select
                    value={fechaConsulta.substring(0, 7)}
                    onChange={(e) => {
                      if (e.target.value)
                        setFechaConsulta(`${e.target.value}-01`);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={`${hoyIso.substring(0, 4)}-01`}>
                      Enero (contar {modalidad === "TRIMESTRE" ? "3" : "4"}{" "}
                      meses)
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-02`}>
                      Febrero
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-03`}>
                      Marzo
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-04`}>
                      Abril
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-05`}>Mayo</option>
                    <option value={`${hoyIso.substring(0, 4)}-06`}>
                      Junio
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-07`}>
                      Julio
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-08`}>
                      Agosto
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-09`}>
                      Septiembre
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-10`}>
                      Octubre
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-11`}>
                      Noviembre
                    </option>
                    <option value={`${hoyIso.substring(0, 4)}-12`}>
                      Diciembre
                    </option>
                  </select>
                </div>
              )}

              {modalidad === "RANGO_FECHAS" && (
                <div className="flex items-center gap-2">
                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      if (input && typeof input.showPicker === "function")
                        input.showPicker();
                    }}
                    className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-400 uppercase mr-1.5 select-none font-bold pointer-events-none">
                      Desde:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-xs select-none pointer-events-none">
                      {formatearFechaVisual(fechaConsulta)}
                    </span>
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400 ml-2 pointer-events-none" />
                    <input
                      type="date"
                      value={fechaConsulta}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setFechaConsulta(val);
                          if (val > fechaHastaRango) setFechaHastaRango(val);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      if (input && typeof input.showPicker === "function")
                        input.showPicker();
                    }}
                    className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-400 uppercase mr-1.5 select-none font-bold pointer-events-none">
                      Hasta:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-xs select-none pointer-events-none">
                      {formatearFechaVisual(fechaHastaRango)}
                    </span>
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400 ml-2 pointer-events-none" />
                    <input
                      type="date"
                      value={fechaHastaRango}
                      min={fechaConsulta}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) setFechaHastaRango(val);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>
              )}

              {modalidad !== "RANGO_FECHAS" &&
                modalidad !== "TRIMESTRE" &&
                modalidad !== "CUATRIMESTRE" && (
                  <button
                    type="button"
                    onClick={() => moverFecha(1)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              {modalidad === "DIARIO" && (
                <span className="text-slate-400 font-normal">
                  ({obtenerNombreDia(fechaConsulta)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 no-print relative">
              <button
                type="button"
                onClick={handleExportarExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold transition shadow-2xs cursor-pointer text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Exportar CSV
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuImpresionAbierto(!menuImpresionAbierto)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition shadow-2xs cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Imprimir / PDF</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                {menuImpresionAbierto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuImpresionAbierto(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 py-1.5 overflow-hidden animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => emitirReportePdf(false)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer transition font-medium"
                      >
                        <div className="p-1 rounded-lg bg-slate-100 text-slate-700">
                          <Printer className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            Imprimir (B&W)
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Apto blanco y negro / fotocopia
                          </div>
                        </div>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => emitirReportePdf(true)}
                        className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/60 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer transition font-medium"
                      >
                        <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                          <Palette className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-indigo-950">
                            Generar PDF Color
                          </div>
                          <div className="text-[10px] text-indigo-500">
                            Diseño institucional en color
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CABECERA DE DATOS DEL EMPLEADO */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white font-bold text-base shadow-md overflow-hidden shrink-0">
                <Users className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {fichaData?.nombreCompleto ||
                      `${empleadoSeleccionado?.apellido || ""}, ${empleadoSeleccionado?.nombre || ""}`}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Activo
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-purple-700">
                    {fichaData?.rolOArea}
                  </span>{" "}
                  • {fichaData?.departamento}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {fichaData?.etiquetaTurno}
                  </span>
                </div>
              </div>
            </div>
            <div className="border border-slate-100 bg-slate-50/60 p-4 rounded-2xl text-right shrink-0 min-w-[170px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {modalidad === "DIARIO"
                  ? "CUMPLIMIENTO JORNADA"
                  : "CUMPLIMIENTO PERÍODO"}
              </div>
              <div
                className={`text-3xl font-black mt-1 ${
                  estadoJornadaDiaria.esInasistencia
                    ? "text-rose-600"
                    : estadoJornadaDiaria.esSinHorario ||
                        estadoJornadaDiaria.esFuturoConHorario
                      ? "text-slate-400"
                      : "text-slate-900"
                }`}
              >
                {estadoJornadaDiaria.esSinHorario ||
                estadoJornadaDiaria.esFuturoConHorario
                  ? "—"
                  : `${fichaData?.porcentajeCumplimiento || 0}%`}
              </div>
            </div>
          </div>

          {/* ESCENARIO 1: DÍA FUTURO CON HORARIO PROGRAMADO */}
          {modalidad === "DIARIO" && estadoJornadaDiaria.esFuturoConHorario && (
            <div className="bg-indigo-50/60 border-2 border-indigo-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <div className="max-w-xl mx-auto space-y-1.5">
                <span className="inline-block px-3 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-2xs">
                  Jornada Futura Programada
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Horarios pautados para el{" "}
                  {formatearFechaVisual(fechaConsulta)} (
                  {obtenerNombreDia(fechaConsulta)})
                </h3>
                <p className="text-xs text-slate-600">
                  Esta fecha es posterior al día de hoy. El colaborador tiene
                  los siguientes horarios laborales registrados que deberá
                  cumplir al iniciar la jornada.
                </p>
              </div>

              {Array.isArray(estadoJornadaDiaria.planificados) &&
                estadoJornadaDiaria.planificados.length > 0 && (
                  <div className="max-w-lg mx-auto bg-white/95 border border-indigo-100 rounded-2xl p-3.5 text-left text-xs shadow-2xs">
                    <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Horarios a cumplir:
                    </div>
                    <div className="space-y-1.5">
                      {estadoJornadaDiaria.planificados.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-700"
                        >
                          <span className="font-semibold text-slate-800">
                            {p.etiqueta || "Turno Laboral"}
                          </span>
                          <span className="font-mono font-bold text-indigo-700">
                            {p.horaInicio} hs → {p.horaFin} hs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => moverFecha(-1)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Día anterior
                </button>
                <button
                  type="button"
                  onClick={() => moverFecha(1)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  Día siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
                {fechaConsulta !== hoyIso && (
                  <button
                    type="button"
                    onClick={() => {
                      setFechaConsulta(hoyIso);
                      setDiaInspeccionado(null);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    Volver a Hoy
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ESCENARIO 2: PASADO / HOY CON HORARIO ASIGNADO PERO SIN ASISTENCIA */}
          {modalidad === "DIARIO" && estadoJornadaDiaria.esInasistencia && (
            <div className="bg-rose-50/80 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                <UserX className="w-7 h-7" />
              </div>
              <div className="max-w-xl mx-auto space-y-1.5">
                <span className="inline-block px-3 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                  Inasistencia detectada
                </span>
                <h3 className="text-base sm:text-lg font-black text-rose-950">
                  El empleado tenía jornada laboral asignada pero no registró
                  asistencia
                </h3>
                <p className="text-xs text-rose-800">
                  Para el día{" "}
                  <strong>{formatearFechaVisual(fechaConsulta)}</strong> (
                  {obtenerNombreDia(fechaConsulta)}) constan franjas horarias
                  obligatorias programadas, pero no se registraron marcaciones
                  biométricas válidas de ingreso ni egreso.
                </p>
              </div>

              {Array.isArray(estadoJornadaDiaria.planificados) &&
                estadoJornadaDiaria.planificados.length > 0 && (
                  <div className="max-w-lg mx-auto bg-white/90 border border-rose-200 rounded-2xl p-3.5 text-left text-xs shadow-2xs">
                    <div className="text-[10px] font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      Horarios obligatorios que debía cumplir:
                    </div>
                    <div className="space-y-1.5">
                      {estadoJornadaDiaria.planificados.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-rose-50/50 border border-rose-100 font-medium text-slate-700"
                        >
                          <span className="font-semibold text-rose-950">
                            {p.etiqueta || "Turno Programado"}
                          </span>
                          <span className="font-mono font-bold text-rose-800">
                            {p.horaInicio} hs → {p.horaFin} hs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTabInferior("INCIDENTES");
                    if (tablaDetalleRef.current) {
                      tablaDetalleRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ver Incidencia y Justificar Abajo
                </button>
                <button
                  type="button"
                  onClick={() => moverFecha(-1)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-rose-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Día anterior
                </button>
                <button
                  type="button"
                  onClick={() => moverFecha(1)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-rose-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  Día siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ESCENARIO 3: SIN HORARIOS ASIGNADOS NI ACTIVIDAD (FRANCO) */}
          {modalidad === "DIARIO" && estadoJornadaDiaria.esSinHorario && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs">
                <CalendarOff className="w-8 h-8 text-slate-400" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                  Sin registros ni horario
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  No hay datos para esta jornada
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No existe registro de un horario laboral asignado ni
                  marcaciones biométricas para el día{" "}
                  <strong>{formatearFechaVisual(fechaConsulta)}</strong> (
                  {obtenerNombreDia(fechaConsulta)}).
                </p>
                <p className="text-[11px] text-slate-400">
                  Por favor, seleccione otro día utilizando el selector de
                  fechas o los botones de navegación.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => moverFecha(-1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Día anterior
                </button>
                <button
                  type="button"
                  onClick={() => moverFecha(1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  Día siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
                {fechaConsulta !== hoyIso && (
                  <button
                    type="button"
                    onClick={() => {
                      setFechaConsulta(hoyIso);
                      setDiaInspeccionado(null);
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Volver a Hoy
                  </button>
                )}
              </div>
            </div>
          )}

          {/* RENDERIZADO DE MÉTRICAS KPI */}
          {(modalidad !== "DIARIO" ||
            (!estadoJornadaDiaria.esSinHorario &&
              !estadoJornadaDiaria.esInasistencia &&
              !estadoJornadaDiaria.esFuturoConHorario)) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {modalidad === "DIARIO"
                    ? "1RA ENTRADA → EGRESO"
                    : "DÍAS EN SEDE"}
                </span>
                <div className="text-sm font-black text-slate-900 mt-2 font-mono">
                  {modalidad === "DIARIO" ? (
                    `${metricas.primeraEntrada} hs → ${metricas.ultimoEgreso} hs`
                  ) : (
                    <span className="text-base font-bold font-sans text-slate-800">
                      {metricas.primeraEntrada}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  TOTAL HORAS NETAS
                </span>
                <div>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    {metricas.presenciaNetaTexto}
                  </div>
                  {modalidad !== "DIARIO" && (
                    <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                      {metricas.ultimoEgreso}
                    </div>
                  )}
                </div>
              </div>

              {esDocente && (
                <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                    CLASES DICTADAS
                  </span>
                  <div>
                    <div className="text-xl font-black text-purple-950 mt-1 font-mono">
                      {String(
                        metricas.clasesDictadasTexto || "0h 0m / 0h 0m (0%)",
                      )
                        .split("/")[0]
                        .trim()}
                    </div>
                    <div className="text-[10px] font-semibold text-purple-700 mt-0.5 font-mono">
                      de{" "}
                      {String(
                        metricas.clasesDictadasTexto || "0h 0m / 0h 0m (0%)",
                      ).split("/")[1]
                        ? String(metricas.clasesDictadasTexto)
                            .split("/")[1]
                            .trim()
                        : "0h 0m"}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                  HORAS EN CONTRA (DEUDA)
                </span>
                <div>
                  <div className="text-xl font-black text-rose-950 mt-1">
                    -{metricas.horasEnContraTexto || "0h 0m"}
                  </div>
                  <div className="text-[10px] font-semibold text-rose-700 mt-0.5">
                    {metricas.diasConDeficit || 0} día(s) con faltante
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-200/70 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  SALIDAS INTERMEDIAS
                </span>
                <div className="text-base font-black text-amber-950 mt-1">
                  {metricas.salidasIntermediasCantidad}{" "}
                  {metricas.salidasIntermediasCantidad === 1
                    ? "salida"
                    : "salidas"}
                  <div className="text-[11px] font-bold text-amber-800">
                    ({metricas.salidasIntermediasMinutos} min)
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  if (modalidad === "DIARIO") {
                    setTabInferior("INCIDENTES");
                    setTimeout(() => {
                      tablaDetalleRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }, 50);
                  } else {
                    setModalListaIncidentesAbierto(true);
                  }
                }}
                title="Haga clic para ver y justificar los incidentes registrados"
                className="p-4 rounded-2xl shadow-xs flex flex-col justify-between transition cursor-pointer select-none border bg-white hover:bg-rose-50/40 border-rose-200 hover:border-rose-400"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-600">
                    INCIDENTES REGISTRADOS
                  </span>
                  <Eye className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div>
                  <div className="text-xl font-black mt-1 text-slate-900">
                    {metricas.totalIncidentes}
                  </div>
                  <div className="text-[10px] font-semibold mt-0.5 text-slate-400">
                    {metricas.incidentesJustificados} revisados •{" "}
                    <span className="underline">Ver lista</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 1: DIARIO */}
          {modalidad === "DIARIO" &&
            !estadoJornadaDiaria.esSinHorario &&
            !estadoJornadaDiaria.esFuturoConHorario && (
              <>
                {!estadoJornadaDiaria.esInasistencia && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span>Línea de Tiempo (06:00 a 22:00 hs)</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-indigo-700">
                          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />{" "}
                          Planificado
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />{" "}
                          Presencia
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />{" "}
                          Salida Interm.
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-700">
                          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />{" "}
                          Infracción
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 overflow-x-auto">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 border-b border-slate-200 pb-1 min-w-[700px]">
                        {[
                          6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
                          20, 21, 22,
                        ].map((h) => (
                          <span key={h}>{h}:00</span>
                        ))}
                      </div>

                      <div className="relative h-8 bg-slate-200/60 rounded-xl overflow-hidden min-w-[700px]">
                        {(fichaData?.planificado || []).map((p, idx) => {
                          const leftPct = ((p.inicioMinutos - 360) / 960) * 100;
                          const widthPct = (p.duracionMinutos / 960) * 100;
                          return (
                            <div
                              key={idx}
                              style={{
                                left: `${Math.max(0, leftPct)}%`,
                                width: `${widthPct}%`,
                              }}
                              className="absolute top-1 bottom-1 bg-purple-600 text-white rounded-lg px-2 flex items-center text-[10px] font-bold shadow-xs truncate"
                              title={`${p.etiqueta}: ${p.horaInicio} - ${p.horaFin}`}
                            >
                              {p.etiqueta} ({p.horaInicio} a {p.horaFin})
                            </div>
                          );
                        })}
                      </div>

                      <div className="relative h-8 bg-slate-200/60 rounded-xl overflow-hidden min-w-[700px]">
                        {(fichaData?.presenciaReal || []).map((r, idx) => {
                          const leftPct = ((r.inicioMinutos - 360) / 960) * 100;
                          const widthPct = (r.duracionMinutos / 960) * 100;
                          const bg =
                            r.tipo === "PRESENCIA"
                              ? "bg-emerald-500"
                              : r.tipo === "INFRACCION"
                                ? "bg-rose-500"
                                : "bg-amber-400";
                          return (
                            <div
                              key={idx}
                              style={{
                                left: `${Math.max(0, leftPct)}%`,
                                width: `${widthPct}%`,
                              }}
                              className={`absolute top-1 bottom-1 ${bg} text-white rounded-lg px-2 flex items-center justify-center text-[10px] font-bold shadow-xs`}
                            >
                              {r.etiqueta}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TABLA DE DETALLES INFERIOR */}
                <div
                  ref={tablaDetalleRef}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs scroll-mt-6"
                >
                  <div className="flex border-b border-slate-100 bg-[#f8fafc] px-4 pt-3 gap-2 text-xs font-bold no-print">
                    <button
                      type="button"
                      onClick={() => setTabInferior("INTERVALOS")}
                      className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                        tabInferior === "INTERVALOS"
                          ? "border-indigo-600 text-indigo-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Intervalos de Jornada (
                      {fichaData?.intervalosDetalle?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabInferior("INCIDENTES")}
                      className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                        tabInferior === "INCIDENTES"
                          ? "border-rose-600 text-rose-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>
                        Incidentes ({fichaData?.incidentes?.length || 0})
                      </span>
                      {fichaData?.incidentes?.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabInferior("BRUTOS")}
                      className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                        tabInferior === "BRUTOS"
                          ? "border-indigo-600 text-indigo-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Fichajes en Bruto (
                      {fichaData?.fichajesBrutos?.length || 0})
                    </button>
                  </div>

                  <div className="p-4">
                    {tabInferior === "INTERVALOS" && (
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                          <tr>
                            <th className="py-2">Tipo</th>
                            <th className="py-2">Inicio</th>
                            <th className="py-2">Fin</th>
                            <th className="py-2">Duración</th>
                            <th className="py-2">Detalle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(fichaData?.intervalosDetalle || []).map(
                            (it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 font-bold">
                                  {it.tipo === "Presencia" ? (
                                    <span className="text-emerald-600">
                                      →] Presencia
                                    </span>
                                  ) : (
                                    <span className="text-amber-600">
                                      [→ Salida Intermedia
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 font-mono">
                                  {it.horaInicio}
                                </td>
                                <td className="py-3 font-mono">{it.horaFin}</td>
                                <td className="py-3 font-bold">
                                  {it.duracionTexto}
                                </td>
                                <td
                                  className={`py-3 ${it.esInfraccion ? "text-rose-600 font-bold" : "text-slate-500"}`}
                                >
                                  {it.detalle}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    )}

                    {tabInferior === "INCIDENTES" && (
                      <div className="space-y-2">
                        {(fichaData?.incidentes || [])
                          .filter((inc) =>
                            !inc.fecha
                              ? true
                              : String(inc.fecha).split("T")[0] ===
                                fechaConsulta,
                          )
                          .map((inc) =>
                            renderItemIncidenteInteractivo(inc, false),
                          )}
                        {(fichaData?.incidentes || []).filter((inc) =>
                          !inc.fecha
                            ? true
                            : String(inc.fecha).split("T")[0] === fechaConsulta,
                        ).length === 0 && (
                          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Sin incidentes ni ausencias registradas en esta
                              fecha.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {tabInferior === "BRUTOS" && (
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                          <tr>
                            <th className="py-2">Hora</th>
                            <th className="py-2">Evento</th>
                            <th className="py-2">Dispositivo / Reloj</th>
                            <th className="py-2">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {(fichaData?.fichajesBrutos || []).map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-bold">{b.hora} hs</td>
                              <td className="py-2.5 uppercase font-semibold text-indigo-700">
                                {b.tipoEvento}
                              </td>
                              <td className="py-2.5 text-slate-600">
                                {b.nombreReloj}
                              </td>
                              <td className="py-2.5 text-emerald-600 font-bold">
                                ✓ {b.estado}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}

          {/* VISTA MULTIMES: TRIMESTRE O CUATRIMESTRE */}
          {(modalidad === "TRIMESTRE" || modalidad === "CUATRIMESTRE") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    LISTA DE MESES DEL{" "}
                    {modalidad === "TRIMESTRE" ? "TRIMESTRE" : "CUATRIMESTRE"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Toque para expandir el calendario con cada día
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandirTodos}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Expandir Todos los Meses
                  </button>
                  <button
                    type="button"
                    onClick={colapsarTodos}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
                  >
                    Colapsar Todos
                  </button>
                </div>
              </div>

              {(fichaData?.mesesPeriodo || []).map((mes) => {
                const isExpanded = mesesExpandidos[mes.mesKey];
                return (
                  <div
                    key={mes.mesKey}
                    className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all"
                  >
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase block w-fit mb-0.5">
                            Mes {mes.orden} de{" "}
                            {modalidad === "TRIMESTRE" ? "3" : "4"}
                          </span>
                          <h4 className="text-base font-black text-slate-900">
                            {mes.nombreMes}
                          </h4>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {mes.presenciaNetaTexto}
                        </span>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {mes.diasEnSede}{" "}
                          días en sede
                        </span>
                        <span
                          className={`px-3 py-1 border rounded-xl flex items-center gap-1 ${
                            mes.totalIncidentes > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />{" "}
                          {mes.totalIncidentes} desvío(s)
                        </span>
                        {esDocente && (
                          <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />{" "}
                            {
                              String(
                                mes.clasesDictadasTexto || "0h 0m / 0h 0m",
                              ).split(" (")[0]
                            }
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleMes(mes.mesKey)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1 ml-2"
                        >
                          {isExpanded ? "Ocultar" : "Ver Calendario"}{" "}
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 border-t border-slate-100">
                        {renderCardInspeccionDiaria()}
                        <div className="grid grid-cols-7 gap-2.5 mt-4">
                          {[
                            "LUN",
                            "MAR",
                            "MIÉ",
                            "JUE",
                            "VIE",
                            "SÁB",
                            "DOM",
                          ].map((d) => (
                            <div
                              key={d}
                              className="text-center font-bold text-[11px] text-slate-500 py-1 uppercase tracking-wider"
                            >
                              {d}
                            </div>
                          ))}
                          {Array.from({ length: mes.diasOffset }).map(
                            (_, idx) => (
                              <div
                                key={`vacio-${mes.mesKey}-${idx}`}
                                className="border border-transparent rounded-2xl min-h-[110px] hidden sm:block pointer-events-none opacity-0"
                              />
                            ),
                          )}
                          {(mes.diasPeriodo || []).map((dia) => {
                            const numDia = parseInt(
                              dia.fecha.split("-")[2],
                              10,
                            );
                            const esHoy = dia.fecha === hoyIso;
                            const estaSeleccionado =
                              diaInspeccionado?.fecha === dia.fecha;
                            const esFuturo =
                              dia.estadoGeneral === "FUTURO" ||
                              dia.fecha > hoyIso;
                            const esSinRegistro =
                              !esFuturo && dia.estadoGeneral === "SIN_REGISTRO";

                            const esCritica =
                              !esFuturo &&
                              (dia.estadoGeneral === "INFRACCION" ||
                                esSinRegistro ||
                                (fichaData?.incidentes || []).some(
                                  (inc) =>
                                    String(inc.fecha).split("T")[0] ===
                                      dia.fecha &&
                                    (inc.severidad === "CRÍTICA" ||
                                      inc.severidad === "CRITICA" ||
                                      inc.tipo
                                        ?.toLowerCase()
                                        .includes("clase")),
                                ));
                            const esDesvio =
                              !esCritica &&
                              !esFuturo &&
                              (dia.totalIncidentes > 0 ||
                                dia.estadoGeneral === "DESVIO");
                            const esSalidaIntermedia =
                              !esCritica &&
                              !esDesvio &&
                              dia.salidasIntermedias > 0;
                            const esNormal =
                              !esCritica &&
                              !esDesvio &&
                              dia.presenciaNetaMinutos > 0;

                            let cardBgClasses =
                              "bg-white border-slate-200 hover:border-slate-300";
                            if (estaSeleccionado)
                              cardBgClasses =
                                "bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-300 shadow-sm";
                            else if (esFuturo)
                              cardBgClasses =
                                "bg-slate-50/40 border-slate-200/60 opacity-60";
                            else if (esCritica)
                              cardBgClasses =
                                "bg-rose-50/70 border-rose-300 hover:border-rose-400 hover:shadow-sm";
                            else if (esDesvio)
                              cardBgClasses =
                                "bg-amber-50/50 border-amber-300 hover:border-amber-400 hover:shadow-sm";
                            else if (esSalidaIntermedia)
                              cardBgClasses =
                                "bg-sky-50/50 border-sky-300 hover:border-sky-400 hover:shadow-sm";
                            else if (esNormal)
                              cardBgClasses =
                                "bg-emerald-50/40 border-emerald-300 hover:border-emerald-400 hover:shadow-sm";
                            else if (esSinRegistro)
                              cardBgClasses = "bg-slate-50/70 border-slate-200";

                            return (
                              <div
                                key={dia.fecha}
                                onClick={() => {
                                  if (diaInspeccionado?.fecha === dia.fecha)
                                    setDiaInspeccionado(null);
                                  else setDiaInspeccionado(dia);
                                }}
                                className={`border rounded-2xl p-2.5 min-h-[110px] flex flex-col justify-between transition-all cursor-pointer select-none ${cardBgClasses}`}
                              >
                                <div>
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                    <span
                                      className={`text-sm font-black ${esCritica ? "text-rose-900" : ""}`}
                                    >
                                      {numDia}
                                    </span>
                                    {esHoy && (
                                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
                                        HOY
                                      </span>
                                    )}
                                  </div>

                                  {esDocente &&
                                    dia.clasesDictadasTexto &&
                                    dia.clasesDictadasTexto !==
                                      "0h 0m / 0h 0m" && (
                                      <div
                                        className={`mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md w-fit ${
                                          esCritica
                                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                                            : "bg-purple-100 text-purple-800 border border-purple-200"
                                        } flex items-center gap-1`}
                                      >
                                        <GraduationCap className="w-2.5 h-2.5" />
                                        <span>
                                          Clase:{" "}
                                          {
                                            String(
                                              dia.clasesDictadasTexto,
                                            ).split(" (")[0]
                                          }
                                        </span>
                                      </div>
                                    )}

                                  {esSinRegistro && (
                                    <div className="text-[10px] font-bold text-rose-700 mt-1">
                                      Ausencia
                                    </div>
                                  )}
                                </div>

                                <div className="mt-2">
                                  {esFuturo ? (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Programado
                                    </span>
                                  ) : esCritica ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold shadow-2xs">
                                      <span>
                                        ⚠ Crítica (
                                        {Math.max(1, dia.totalIncidentes)})
                                      </span>
                                    </div>
                                  ) : esDesvio ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-2xs">
                                      <Clock className="w-3 h-3 stroke-[2.5]" />
                                      <span>
                                        Desvío ({dia.totalIncidentes})
                                      </span>
                                    </div>
                                  ) : esSalidaIntermedia ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500 text-white text-[10px] font-bold shadow-2xs">
                                      <span>
                                        Salida ({dia.salidasIntermedias})
                                      </span>
                                    </div>
                                  ) : esNormal ? (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                                      <span>✓ {dia.presenciaNetaTexto}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                      Sin registros
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA 2: SEMANAL O RANGO DE FECHAS */}
          {(modalidad === "SEMANAL" || modalidad === "RANGO_FECHAS") && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Desglose de Asistencia •{" "}
                    {modalidad === "SEMANAL"
                      ? `Semanal (${formatearFechaVisual(inicioSemanaStr)} al ${formatearFechaVisual(finSemanaStr)})`
                      : `Rango (${formatearFechaVisual(fechaConsulta)} al ${formatearFechaVisual(fechaHastaRango)})`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Haga clic en "Ver Día" para abrir los detalles y la línea de
                    tiempo de cualquier jornada.
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs">
                  Total: {metricas.presenciaNetaTexto} presenciales
                </span>
              </div>

              {renderCardInspeccionDiaria()}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Fecha (dd/mm/aaaa)</th>
                      <th className="px-4 py-3">Día</th>
                      <th className="px-4 py-3">1ra Entrada</th>
                      <th className="px-4 py-3">Último Egreso</th>
                      <th className="px-4 py-3">Presencia Neta</th>
                      <th className="px-4 py-3">Salidas Interm.</th>
                      <th className="px-4 py-3">Incidentes</th>
                      <th className="px-4 py-3">Cumplimiento</th>
                      <th className="px-4 py-3 text-right no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(fichaData?.diasPeriodo || []).map((dia) => {
                      const estaInspeccionado =
                        diaInspeccionado?.fecha === dia.fecha;
                      return (
                        <tr
                          key={dia.fecha}
                          className={`transition ${
                            estaInspeccionado
                              ? "bg-indigo-50/70 font-semibold"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {formatearFechaVisual(dia.fecha)}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {dia.diaSemana}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {dia.primeraEntrada}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {dia.ultimoEgreso}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-700">
                            {dia.presenciaNetaTexto}
                          </td>
                          <td className="px-4 py-3">
                            {dia.salidasIntermedias} ({dia.minutosFuera} min)
                          </td>
                          <td className="px-4 py-3">
                            {dia.totalIncidentes > 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                ⚠ {dia.totalIncidentes} desvío(s)
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            <span
                              className={
                                dia.porcentajeCumplimiento < 100
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }
                            >
                              {dia.porcentajeCumplimiento}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right no-print">
                            <button
                              type="button"
                              onClick={() => {
                                if (diaInspeccionado?.fecha === dia.fecha) {
                                  setDiaInspeccionado(null);
                                } else {
                                  setDiaInspeccionado(dia);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                                estaInspeccionado
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {estaInspeccionado ? "Cerrar" : "Ver Día"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 3: MENSUAL */}
          {modalidad === "MENSUAL" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Calendario Mensual • {fichaData?.periodoTexto}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Toque cualquier día para ver sus marcas, desvíos y detalles
                    en específico.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                    Normal
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />{" "}
                    Infracción
                  </span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />{" "}
                    Desvío
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-300" /> Sin
                    Registro
                  </span>
                </div>
              </div>

              {renderCardInspeccionDiaria()}

              <div className="grid grid-cols-7 gap-2">
                {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
                  <div
                    key={d}
                    className="text-center font-bold text-[10px] text-slate-400 py-1 uppercase"
                  >
                    {d}
                  </div>
                ))}

                {Array.from({ length: diasOffsetInicioMes }).map((_, idx) => (
                  <div
                    key={`vacio-${idx}`}
                    className="border border-transparent rounded-2xl min-h-[90px] hidden sm:block pointer-events-none opacity-0"
                  />
                ))}

                {(fichaData?.diasPeriodo || []).map((dia) => {
                  const numDia = dia.fecha.split("-")[2];
                  const esHoy = dia.fecha === hoyIso;
                  const estaSeleccionado =
                    diaInspeccionado?.fecha === dia.fecha;

                  const esFuturo =
                    dia.estadoGeneral === "FUTURO" || dia.fecha > hoyIso;
                  const esSinRegistro =
                    !esFuturo && dia.estadoGeneral === "SIN_REGISTRO";

                  const esCritica =
                    !esFuturo &&
                    (dia.estadoGeneral === "INFRACCION" ||
                      esSinRegistro ||
                      (fichaData?.incidentes || []).some(
                        (inc) =>
                          String(inc.fecha).split("T")[0] === dia.fecha &&
                          (inc.severidad === "CRÍTICA" ||
                            inc.severidad === "CRITICA" ||
                            inc.tipo?.toLowerCase().includes("clase")),
                      ));
                  const esDesvio =
                    !esCritica &&
                    !esFuturo &&
                    (dia.totalIncidentes > 0 || dia.estadoGeneral === "DESVIO");
                  const esSalidaIntermedia =
                    !esCritica && !esDesvio && dia.salidasIntermedias > 0;
                  const esNormal =
                    !esCritica && !esDesvio && dia.presenciaNetaMinutos > 0;

                  let cardBgClasses =
                    "bg-white border-slate-200 hover:border-slate-300";
                  if (estaSeleccionado)
                    cardBgClasses =
                      "bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-300 shadow-sm";
                  else if (esFuturo)
                    cardBgClasses =
                      "bg-slate-50/40 border-slate-200/60 opacity-60";
                  else if (esCritica)
                    cardBgClasses =
                      "bg-rose-50/70 border-rose-300 hover:border-rose-400 hover:shadow-sm";
                  else if (esDesvio)
                    cardBgClasses =
                      "bg-amber-50/50 border-amber-300 hover:border-amber-400 hover:shadow-sm";
                  else if (esSalidaIntermedia)
                    cardBgClasses =
                      "bg-sky-50/50 border-sky-300 hover:border-sky-400 hover:shadow-sm";
                  else if (esNormal)
                    cardBgClasses =
                      "bg-emerald-50/40 border-emerald-300 hover:border-emerald-400 hover:shadow-sm";
                  else if (esSinRegistro)
                    cardBgClasses = "bg-slate-50/70 border-slate-200";

                  return (
                    <div
                      key={dia.fecha}
                      onClick={() => {
                        if (diaInspeccionado?.fecha === dia.fecha)
                          setDiaInspeccionado(null);
                        else setDiaInspeccionado(dia);
                      }}
                      className={`border rounded-2xl p-2.5 min-h-[90px] flex flex-col justify-between hover:shadow-xs transition cursor-pointer ${cardBgClasses}`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span
                          className={`text-sm font-black ${esCritica ? "text-rose-900" : ""}`}
                        >
                          {numDia}
                        </span>
                        {esHoy && (
                          <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
                            HOY
                          </span>
                        )}
                        {!esHoy && dia.totalIncidentes > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        ) : !esHoy && dia.presenciaNetaMinutos > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : null}
                      </div>

                      {esDocente &&
                        dia.clasesDictadasTexto &&
                        dia.clasesDictadasTexto !== "0h 0m / 0h 0m" && (
                          <div
                            className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md w-fit ${
                              esCritica
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-purple-100 text-purple-800 border border-purple-200"
                            } flex items-center gap-1`}
                          >
                            <GraduationCap className="w-2.5 h-2.5" />
                            <span>
                              Clase:{" "}
                              {String(dia.clasesDictadasTexto).split(" (")[0]}
                            </span>
                          </div>
                        )}

                      {dia.presenciaNetaMinutos > 0 ? (
                        <div className="space-y-1 mt-1">
                          <div className="text-[10px] text-slate-500 font-mono">
                            {dia.primeraEntrada} → {dia.ultimoEgreso}
                          </div>
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold">
                            {dia.presenciaNetaTexto}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic mt-1">
                          {esSinRegistro ? "Ausencia" : "Franco"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalListaIncidentesAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>
                  Listado de Incidentes Registrados (
                  {fichaData?.incidentes?.length || 0})
                </span>
              </div>
              <button
                onClick={() => setModalListaIncidentesAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {!fichaData?.incidentes || fichaData.incidentes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  No se registran incidentes ni ausencias en este período.
                </div>
              ) : (
                fichaData.incidentes.map((inc) =>
                  renderItemIncidenteInteractivo(inc, true),
                )
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setModalListaIncidentesAbierto(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-xs cursor-pointer transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalJustificarIncidente
        incidente={incidenteSeleccionado}
        isOpen={modalJustificarAbierto}
        readOnly={modoSoloLecturaModal || !puedeJustificar}
        onClose={() => {
          setModalJustificarAbierto(false);
          setIncidenteSeleccionado(null);
        }}
        onGuardar={handleGuardarJustificacion}
      />
    </div>
  );
}
