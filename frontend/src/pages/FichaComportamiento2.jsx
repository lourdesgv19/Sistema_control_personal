import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Calendar as CalendarIcon,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Eye,
  ArrowRight,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  ChevronDown,
  Palette,
  Lock,
  CalendarOff,
  UserX,
  CalendarCheck,
  Check,
  Ban,
  HelpCircle,
  FileCheck,
  BarChart3,
  CalendarRange,
  Clock,
  ShieldCheck,
} from "lucide-react";
import ListaEmpleadosSidebar from "../components/comunes/ListaEmpleadosSidebar";
import ModalJustificarIncidente from "../components/incidentes/ModalJustificarIncidente";
import FichaKpisHeader from "../components/ficha/FichaKpisHeader";
import FichaVistaDiaria from "../components/ficha/FichaVistaDiaria";
import FichaVistaSemanal from "../components/ficha/FichaVistaSemanal";
import { getFichaComportamiento } from "../services/fichaComportamientoService";
import { resolverIncidente } from "../services/incidenteService";
import { getEmpleadoHorarios } from "../services/empleadoService";
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
  formatearHora24,
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
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [menuImpresionAbierto, setMenuImpresionAbierto] = useState(false);
  const [mostrarKpis, setMostrarKpis] = useState(true);

  const [modalidad, setModalidad] = useState(modalidadInicial);
  const [fechaConsulta, setFechaConsulta] = useState(fechaInicial);
  const [fechaHastaRango, setFechaHastaRango] = useState(fechaHastaInicial);

  const [mesesExpandidos, setMesesExpandidos] = useState({});
  const [diaInspeccionado, setDiaInspeccionado] = useState(null);
  const [modalListaIncidentesAbierto, setModalListaIncidentesAbierto] =
    useState(false);
  const [modalKpiJustificacionesAbierto, setModalKpiJustificacionesAbierto] =
    useState(false);
  const [filtroEstadoModal, setFiltroEstadoModal] = useState("TODOS");
  const [tabInferior, setTabInferior] = useState("INTERVALOS");

  const [loadingFicha, setLoadingFicha] = useState(false);
  const [fichaData, setFichaData] = useState(null);
  const [horariosConfigurados, setHorariosConfigurados] = useState([]);

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

  // Régimen flexible
  const { esFlexible, franjaFlexible, horasObjetivoSemana } = useMemo(() => {
    const flexible = horariosConfigurados.find(
      (h) =>
        h.activo !== false &&
        (h.diaSemana == null ||
          (h.horasObjetivo != null && h.horasObjetivo > 0)),
    );
    if (!flexible) {
      return {
        esFlexible: false,
        franjaFlexible: null,
        horasObjetivoSemana: 0,
      };
    }

    const frec = (flexible.tipoFrecuencia || "MENSUAL").toUpperCase();
    const reps = flexible.repeticionesPeriodo || 1;
    let horasSem = flexible.horasObjetivo || 0;

    if (frec === "MENSUAL")
      horasSem = Math.round(((horasSem * reps) / 4.33) * 10) / 10;
    else if (frec === "SEMANA_POR_MEDIO")
      horasSem = Math.round(horasSem * 0.5 * 10) / 10;
    else if (frec === "ANUAL")
      horasSem = Math.round(((horasSem * reps) / 52.0) * 10) / 10;

    return {
      esFlexible: true,
      franjaFlexible: flexible,
      horasObjetivoSemana: horasSem,
    };
  }, [horariosConfigurados]);

  const textoRangoContemplado = useMemo(() => {
    if (modalidad === "DIARIO")
      return `Jornada del ${formatearFechaVisual(fechaConsulta)} (${obtenerNombreDia(fechaConsulta)})`;
    if (modalidad === "SEMANAL")
      return `Semana del ${formatearFechaVisual(inicioSemanaStr)} al ${formatearFechaVisual(finSemanaStr)}`;
    if (modalidad === "MENSUAL")
      return `${obtenerNombreMes(fechaConsulta)} (${formatearFechaVisual(inicioMesStr)} al ${formatearFechaVisual(finMesStr)})`;
    if (modalidad === "RANGO_FECHAS")
      return `Rango del ${formatearFechaVisual(fechaConsulta)} al ${formatearFechaVisual(fechaHastaRango)}`;
    if (modalidad === "TRIMESTRE" || modalidad === "CUATRIMESTRE")
      return (
        fichaData?.periodoTexto ||
        `Período desde ${formatearFechaVisual(fechaConsulta)}`
      );
    return fichaData?.periodoTexto || formatearFechaVisual(fechaConsulta);
  }, [
    modalidad,
    fechaConsulta,
    fechaHastaRango,
    inicioSemanaStr,
    finSemanaStr,
    inicioMesStr,
    finMesStr,
    fichaData,
  ]);

  useEffect(() => {
    const empId = empleadoSeleccionado?.id;
    if (empId) {
      getEmpleadoHorarios(empId)
        .then((res) => setHorariosConfigurados(Array.isArray(res) ? res : []))
        .catch(() => setHorariosConfigurados([]));
    } else {
      setHorariosConfigurados([]);
    }
  }, [empleadoSeleccionado?.id]);

  // Obtiene los horarios activos verificando estrictamente fechaAlta y fechaBaja
  const obtenerHorariosDeFecha = useCallback(
    (fechaStr) => {
      if (!fechaStr) return [];
      const partes = String(fechaStr).split("T")[0].split("-");
      if (partes.length !== 3) return [];
      const d = new Date(
        parseInt(partes[0], 10),
        parseInt(partes[1], 10) - 1,
        parseInt(partes[2], 10),
      );
      const diaNum = d.getDay() === 0 ? 7 : d.getDay();
      const fechaLimpia = String(fechaStr).split("T")[0];

      const aliasDias = {
        lunes: 1,
        lun: 1,
        martes: 2,
        mar: 2,
        miercoles: 3,
        miércoles: 3,
        mié: 3,
        mie: 3,
        jueves: 4,
        jue: 4,
        viernes: 5,
        vie: 5,
        sabado: 6,
        sábado: 6,
        sáb: 6,
        sab: 6,
        domingo: 7,
        dom: 7,
      };

      return horariosConfigurados
        .filter((h) => {
          if (h.diaSemana == null) return false;
          let hDiaNum =
            typeof h.diaSemana === "number"
              ? h.diaSemana
              : aliasDias[String(h.diaSemana).toLowerCase().trim()] || null;
          if (hDiaNum !== diaNum) return false;

          // Vigencia de inicio
          if (h.fechaAlta && fechaLimpia < String(h.fechaAlta).split("T")[0])
            return false;

          // Vigencia de fin
          if (h.fechaBaja) {
            if (fechaLimpia > String(h.fechaBaja).split("T")[0]) return false;
          } else if (h.activo === false) {
            return false;
          }

          return true;
        })
        .map((h) => ({
          id: h.id,
          nombre:
            h.materia?.nombre ||
            h.etiqueta ||
            h.nombreTurno ||
            "Turno Programado",
          entrada: (h.horaEntrada || "00:00").substring(0, 5),
          salida: (h.horaSalida || h.horaEgreso || "00:00").substring(0, 5),
          fechaAlta: h.fechaAlta,
          fechaBaja: h.fechaBaja,
          esHistorico: Boolean(h.fechaBaja) || h.activo === false,
        }));
    },
    [horariosConfigurados],
  );

  // DETECCIÓN DE HORARIO HISTÓRICO PARA TODAS LAS MODALIDADES
  const horarioHistoricoActivoPeriodo = useMemo(() => {
    // 1. En diario: si el planificado devuelto por backend viene marcado como histórico o por fecha
    if (modalidad === "DIARIO") {
      const planificadoHist = fichaData?.planificado?.find(
        (p) => p.esHistorico,
      );
      if (planificadoHist) return planificadoHist;
      return (
        obtenerHorariosDeFecha(fechaConsulta).find((h) => h.esHistorico) || null
      );
    }

    // 2. En semanal, mensual, trimestre, cuatrimestre, rango:
    // Revisar si en los días del período hay algún turno histórico asignado
    if (!fichaData?.diasPeriodo || fichaData.diasPeriodo.length === 0)
      return null;

    for (const d of fichaData.diasPeriodo) {
      const turnosDia = obtenerHorariosDeFecha(d.fecha);
      const hist = turnosDia.find((h) => h.esHistorico);
      if (hist) {
        return {
          etiqueta: hist.nombre,
          horaInicio: hist.entrada,
          horaFin: hist.salida,
          fechaAlta: hist.fechaAlta,
          fechaBaja: hist.fechaBaja,
        };
      }
    }

    return null;
  }, [modalidad, fechaConsulta, fichaData, obtenerHorariosDeFecha]);

  const mesesDelRango = useMemo(() => {
    if (!fichaData?.diasPeriodo || fichaData.diasPeriodo.length === 0)
      return [];
    const mapa = {};
    fichaData.diasPeriodo.forEach((d) => {
      const mesKey = d.fecha.substring(0, 7);
      if (!mapa[mesKey]) {
        mapa[mesKey] = {
          mesKey,
          nombreMes: obtenerNombreMes(d.fecha),
          dias: [],
        };
      }
      mapa[mesKey].dias.push(d);
    });
    return Object.values(mapa).map((m) => ({
      ...m,
      diasOffset: calcularOffsetPrimerDia(m.dias[0].fecha),
    }));
  }, [fichaData]);

  const toggleMes = (mesKey) =>
    setMesesExpandidos((prev) => ({ ...prev, [mesKey]: !prev[mesKey] }));
  const expandirTodos = () => {
    if (!fichaData?.mesesPeriodo) return;
    const all = {};
    fichaData.mesesPeriodo.forEach((m) => (all[m.mesKey] = true));
    setMesesExpandidos(all);
  };
  const colapsarTodos = () => setMesesExpandidos({});

  useEffect(() => {
    const empId = location.state?.empleadoId || searchParams.get("empleadoId");
    if (empId) setEmpleadoSeleccionado({ id: Number(empId) });
    if (location.state?.fecha) {
      setFechaConsulta(location.state.fecha);
      setModalidad(location.state.modalidad || "DIARIO");
      if (location.state.fechaHasta)
        setFechaHastaRango(location.state.fechaHasta);
      setDiaInspeccionado(null);
    }
  }, [location.state, searchParams]);

  const cargarFicha = useCallback(async () => {
    const empId = empleadoSeleccionado?.id;
    if (!empId) return;

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
      const data = await getFichaComportamiento(empId, params);
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
  }, [empleadoSeleccionado?.id, modalidad, fechaConsulta, fechaHastaRango]);

  useEffect(() => {
    cargarFicha();
  }, [cargarFicha]);

  useEffect(() => {
    let timerSync = null;
    const handleActualizacion = () => {
      if (timerSync) clearTimeout(timerSync);
      timerSync = setTimeout(() => cargarFicha(), 350);
    };
    window.addEventListener("datos:actualizados", handleActualizacion);
    window.addEventListener("conexion:restaurada", handleActualizacion);
    return () => {
      if (timerSync) clearTimeout(timerSync);
      window.removeEventListener("datos:actualizados", handleActualizacion);
      window.removeEventListener("conexion:restaurada", handleActualizacion);
    };
  }, [cargarFicha]);

  const abrirModalJustificarDirecto = (inc, soloLectura = false) => {
    setIncidenteSeleccionado({
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
    });
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

  const moverFecha = (direccion) => {
    const partes = fechaConsulta.split("-");
    const actual = new Date(
      parseInt(partes[0], 10),
      parseInt(partes[1], 10) - 1,
      parseInt(partes[2], 10),
    );

    if (modalidad === "DIARIO") actual.setDate(actual.getDate() + direccion);
    else if (modalidad === "SEMANAL")
      actual.setDate(actual.getDate() + direccion * 7);
    else if (["MENSUAL", "TRIMESTRE", "CUATRIMESTRE"].includes(modalidad))
      actual.setMonth(actual.getMonth() + direccion);

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
    incidentesPendientes: 0,
    incidentesObservados: 0,
    incidentesRechazados: 0,
    totalIncidentesJustificadosConMotivo: 0,
    topJustificaciones: [],
    diasLicenciaPeriodo: 0,
    horasLicenciaTexto: "0h 0m",
    minutosLicencia: 0,
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

  const infoLicenciaDiaria = useMemo(() => {
    if (modalidad !== "DIARIO" || !fichaData?.diasPeriodo) return null;
    const diaEncontrado = fichaData.diasPeriodo.find(
      (d) => d.fecha === fechaConsulta,
    );
    return diaEncontrado?.tieneLicencia ||
      ["LICENCIA", "ASUETO"].includes(diaEncontrado?.estadoGeneral)
      ? diaEncontrado
      : null;
  }, [modalidad, fichaData, fechaConsulta]);

  const estadoJornadaDiaria = useMemo(() => {
    if (modalidad !== "DIARIO") {
      return {
        esSinHorario: false,
        esInasistencia: false,
        esFuturoConHorario: false,
        esLicencia: false,
        tieneDatos: true,
      };
    }
    if (infoLicenciaDiaria) {
      return {
        esSinHorario: false,
        esInasistencia: false,
        esFuturoConHorario: false,
        esLicencia: true,
        tieneDatos: true,
      };
    }

    const esFechaFutura = fechaConsulta > hoyIso;
    const horariosFecha = obtenerHorariosDeFecha(fechaConsulta);
    const franjasTeoricas =
      horariosFecha.length > 0
        ? horariosFecha.map((h) => ({
            etiqueta: h.nombre,
            horaInicio: h.entrada,
            horaFin: h.salida,
          }))
        : fichaData?.planificado || [];
    const tieneHorariosPlanificados = franjasTeoricas.length > 0;
    const tienePresencia =
      (fichaData?.presenciaReal && fichaData.presenciaReal.length > 0) ||
      (fichaData?.fichajesBrutos && fichaData.fichajesBrutos.length > 0) ||
      (metricas?.presenciaNetaTexto &&
        !["0h 0m", "0h 00m"].includes(metricas.presenciaNetaTexto));

    const tieneIncidentesAusencia =
      Array.isArray(fichaData?.incidentes) &&
      fichaData.incidentes.some((inc) => {
        const matchFecha = !inc.fecha
          ? true
          : String(inc.fecha).split("T")[0] === fechaConsulta;
        const esAusencia =
          (inc.tipo || "").toLowerCase().includes("inasistencia") ||
          (inc.tipo || "").toLowerCase().includes("ausencia") ||
          (inc.categoriaRegla || "").toUpperCase() === "AUSENCIAS";
        return matchFecha && esAusencia;
      });

    if (esFechaFutura) {
      return tieneHorariosPlanificados
        ? {
            esSinHorario: false,
            esInasistencia: false,
            esFuturoConHorario: true,
            esLicencia: false,
            tieneDatos: false,
            planificados: franjasTeoricas,
          }
        : {
            esSinHorario: true,
            esInasistencia: false,
            esFuturoConHorario: false,
            esLicencia: false,
            tieneDatos: false,
          };
    }

    if (
      tieneHorariosPlanificados &&
      !tienePresencia &&
      tieneIncidentesAusencia
    ) {
      return {
        esSinHorario: false,
        esInasistencia: true,
        esFuturoConHorario: false,
        esLicencia: false,
        tieneDatos: false,
        planificados: franjasTeoricas,
      };
    }

    if (!tieneHorariosPlanificados && !tienePresencia) {
      return {
        esSinHorario: true,
        esInasistencia: false,
        esFuturoConHorario: false,
        esLicencia: false,
        tieneDatos: false,
      };
    }

    return {
      esSinHorario: false,
      esInasistencia: false,
      esFuturoConHorario: false,
      esLicencia: false,
      tieneDatos: true,
    };
  }, [
    modalidad,
    fichaData,
    metricas,
    fechaConsulta,
    hoyIso,
    obtenerHorariosDeFecha,
    infoLicenciaDiaria,
  ]);

  useEffect(() => {
    if (
      modalidad === "DIARIO" &&
      estadoJornadaDiaria.esInasistencia &&
      !loadingFicha
    ) {
      setTabInferior("INCIDENTES");
      const timer = setTimeout(() => {
        tablaDetalleRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [
    modalidad,
    estadoJornadaDiaria.esInasistencia,
    loadingFicha,
    fechaConsulta,
  ]);

  const volverAAuditoriaPrincipal = () => {
    setModalListaIncidentesAbierto(false);
    setModalKpiJustificacionesAbierto(true);
  };

  const abrirModalListaFiltrada = (filtro) => {
    setFiltroEstadoModal(filtro);
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
  };

  const incidentesFiltradosModal = useMemo(() => {
    const incs = fichaData?.incidentes || [];
    if (filtroEstadoModal === "TODOS") return incs;
    return incs.filter((i) => {
      const e = (i.estado || "PENDIENTE").toUpperCase();
      if (filtroEstadoModal === "JUSTIFICADAS")
        return ["JUSTIFICADA", "JUSTIFICADO"].includes(e);
      if (filtroEstadoModal === "OBSERVADAS")
        return ["OBSERVADA", "OBSERVADO"].includes(e);
      if (filtroEstadoModal === "RECHAZADAS")
        return ["RECHAZADA", "RECHAZADO"].includes(e);
      if (filtroEstadoModal === "PENDIENTES")
        return e === "PENDIENTE" || !i.estado;
      return true;
    });
  }, [fichaData?.incidentes, filtroEstadoModal]);

  const renderItemIncidenteInteractivo = (inc, mostrarFecha = false) => {
    const esCritica = ["CRÍTICA", "CRITICA"].includes(inc.severidad);
    const esInasistencia =
      (inc.tipo || "").toLowerCase().includes("inasistencia") ||
      (inc.tipo || "").toLowerCase().includes("ausencia") ||
      (inc.tipo || "").toLowerCase().includes("falta");
    const esHorarioHistorico =
      (inc.detalle || "").includes("Horario Histórico") ||
      (inc.detalle || "").includes("Dado de Baja") ||
      (inc.tipo || "").includes("Horario Histórico") ||
      (inc.tipo || "").includes("Inactivo");
    const tituloLimpio = (inc.tipo || "").replace(/\[.*?\]/g, "").trim();
    const horariosProgramados = inc.fecha
      ? obtenerHorariosDeFecha(inc.fecha)
      : [];

    return (
      <div
        key={inc.id}
        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
          esCritica
            ? "bg-rose-50/80 border-rose-200"
            : "bg-amber-50/80 border-amber-200"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {mostrarFecha && inc.fecha && (
              <span className="font-mono font-bold text-indigo-900 bg-white/90 border border-slate-200 px-2.5 py-0.5 rounded-md text-[11px]">
                {formatearFechaVisual(inc.fecha)}
              </span>
            )}
            {!esInasistencia &&
              inc.hora &&
              !["00:00", "00:00:00"].includes(inc.hora) && (
                <span className="font-mono font-bold text-slate-700 bg-white/70 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                  {formatearHora24(inc.hora)}
                </span>
              )}
            <span
              className={`font-bold ${esCritica ? "text-rose-950" : "text-amber-950"}`}
            >
              {tituloLimpio}
            </span>
            {esHorarioHistorico && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs">
                Horario Histórico (Inactivo)
              </span>
            )}
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

          <div className="text-[11px] text-slate-600 leading-relaxed">
            {inc.detalle}
          </div>

          {(inc.resolucionMotivo || inc.resolucionObservaciones) && (
            <div className="text-[11px] text-indigo-900 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-xl">
              <strong>Motivo de Justificación:</strong>{" "}
              {inc.resolucionMotivo || ""}{" "}
              {inc.resolucionObservaciones
                ? `— ${inc.resolucionObservaciones}`
                : ""}
            </div>
          )}

          {horariosProgramados.length > 0 && !esHorarioHistorico && (
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Horario vigente:
              </span>
              {horariosProgramados.map((h, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-900 font-mono text-[10px] font-bold shadow-2xs"
                >
                  <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>
                    {h.nombre ? `${h.nombre}: ` : ""}
                    {h.entrada} hs → {h.salida} hs
                  </span>
                </span>
              ))}
            </div>
          )}
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
              ✕ RECHAZADA
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
                inc.estado === "PENDIENTE" || !inc.estado
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
              }`}
            >
              {inc.estado === "PENDIENTE" || !inc.estado
                ? "Justificar"
                : "Editar"}
            </button>
          ) : (
            <span
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-[11px] font-semibold cursor-not-allowed select-none"
              title="Requiere permiso INCIDENTES_JUSTIFICAR"
            >
              <Lock className="w-3.5 h-3.5" />
              {inc.estado === "PENDIENTE" || !inc.estado
                ? "Justificar"
                : "Editar"}
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
    const esFuturo = diaInspeccionado.fecha > hoyIso;

    const huboPresencia =
      diaInspeccionado.presenciaNetaMinutos > 0 ||
      (diaInspeccionado.primeraEntrada &&
        diaInspeccionado.primeraEntrada !== "--:--");

    const esLicencia =
      diaInspeccionado.tieneLicencia ||
      ["LICENCIA", "ASUETO"].includes(diaInspeccionado.estadoGeneral);

    const incidentesDelDia = (fichaData?.incidentes || []).filter((inc) => {
      const matchFecha = !inc.fecha
        ? true
        : String(inc.fecha).split("T")[0] === fechaDiaStr;
      if (!matchFecha) return false;
      if (
        huboPresencia &&
        String(inc.tipo || "")
          .toLowerCase()
          .includes("inasistencia")
      )
        return false;
      return true;
    });

    const horariosDia = obtenerHorariosDeFecha(diaInspeccionado.fecha);

    return (
      <div className="bg-white border-2 border-indigo-500/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 transition-all animate-fadeIn">
        {/* CABECERA DE LA INSPECCIÓN */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                {esFuturo
                  ? "JORNADA FUTURA PROGRAMADA"
                  : "JORNADA ESPECÍFICA INSPECCIONADA"}
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {formatearFechaLarga(diaInspeccionado.fecha)}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              disabled={esFuturo}
              onClick={() => {
                if (!esFuturo) {
                  setFechaConsulta(diaInspeccionado.fecha);
                  setModalidad("DIARIO");
                  setDiaInspeccionado(null);
                }
              }}
              title={esFuturo ? "No disponible para fechas futuras" : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                esFuturo
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Ficha Diaria</span>
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

        {/* SI ES LICENCIA O ASUETO */}
        {esLicencia && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-sky-900 font-bold">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
              <div>
                <span>Jornada cubierta por Licencia / Excepción:</span>
                <span className="ml-1.5 font-black text-sky-950 uppercase">
                  {diaInspeccionado.tipoLicenciaEtiqueta || "Licencia Aprobada"}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-white border border-sky-300 text-sky-800 rounded-lg font-bold text-[10px] self-start sm:self-center">
              Eximido por RRHH
            </span>
          </div>
        )}

        {/* HORARIOS PROGRAMADOS */}
        {horariosDia.length > 0 && !esFlexible && (
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>
                {esFuturo
                  ? "HORARIOS ASIGNADOS A CUMPLIR"
                  : "HORARIOS TEÓRICOS ASIGNADOS"}{" "}
                ({horariosDia.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {horariosDia.map((h, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-950 rounded-xl font-medium text-xs shadow-2xs flex items-center gap-2"
                >
                  <span className="font-bold text-slate-800">{h.nombre}:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {h.entrada} hs → {h.salida} hs
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DÍA FUTURO SIN HORARIOS */}
        {esFuturo && horariosDia.length === 0 && !esLicencia && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 italic">
            Sin horarios asignados programados para esta jornada.
          </div>
        )}

        {/* MÉTRICAS KPI E INCIDENCIAS (OCULTAS EN DÍAS FUTUROS) */}
        {!esFuturo && (
          <>
            <div
              className={`grid grid-cols-2 ${
                esDocente
                  ? "sm:grid-cols-3 lg:grid-cols-5"
                  : "sm:grid-cols-2 lg:grid-cols-4"
              } gap-2.5 sm:gap-3 text-xs`}
            >
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ENTRADA → EGRESO
                </span>
                <div className="font-mono font-bold text-slate-800 text-xs sm:text-sm mt-1 truncate">
                  {diaInspeccionado.primeraEntrada !== "--:--"
                    ? `${diaInspeccionado.primeraEntrada} → ${diaInspeccionado.ultimoEgreso}`
                    : esLicencia
                      ? "Licencia"
                      : "--:--"}
                </div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-200/80 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  HORAS REALIZADAS
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
                  {esFlexible
                    ? "Bolsa Período"
                    : `${diaInspeccionado.porcentajeCumplimiento}%`}
                </div>
              </div>
              {esDocente && (
                <div className="bg-purple-50/60 border border-purple-200/80 p-3 rounded-2xl flex flex-col justify-between col-span-2 sm:col-span-1">
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
                  INCIDENCIAS Y DESVÍOS DE LA JORNADA ({incidentesDelDia.length}
                  )
                </span>
              </div>
              {incidentesDelDia.length === 0 ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {esLicencia
                      ? "Jornada eximida de marcas de asistencia conforme al dictamen de licencia."
                      : "Jornada regular sin desvíos ni infracciones horarias registradas."}
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
          </>
        )}
      </div>
    );
  };
  const renderCuadriculaCalendario = (dias, offset) => {
    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
          <div
            key={d}
            className="text-center font-bold text-[9px] sm:text-xs text-slate-400 py-1 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: offset }).map((_, idx) => (
          <div
            key={`vacio-${idx}`}
            className="border border-transparent rounded-xl sm:rounded-2xl min-h-[50px] sm:min-h-[105px] hidden sm:block pointer-events-none opacity-0"
          />
        ))}

        {(dias || []).map((dia) => {
          const numDia = dia.fecha.split("-")[2];
          const esHoy = dia.fecha === hoyIso;
          const estaSeleccionado = diaInspeccionado?.fecha === dia.fecha;

          const esLicencia =
            dia.tieneLicencia ||
            dia.estadoGeneral === "LICENCIA" ||
            dia.estadoGeneral === "ASUETO";

          const esFuturo = dia.estadoGeneral === "FUTURO" || dia.fecha > hoyIso;
          const horariosProgramados = obtenerHorariosDeFecha(dia.fecha);
          const tieneHorarioAsignado = horariosProgramados.length > 0;

          const huboPresencia =
            dia.presenciaNetaMinutos > 0 ||
            (dia.primeraEntrada && dia.primeraEntrada !== "--:--");

          const incidentesValidos = (fichaData?.incidentes || []).filter(
            (inc) => {
              const matchFecha = String(inc.fecha).split("T")[0] === dia.fecha;
              if (!matchFecha) return false;
              if (
                huboPresencia &&
                String(inc.tipo || "")
                  .toLowerCase()
                  .includes("inasistencia")
              ) {
                return false;
              }
              return true;
            },
          );

          const tieneCritica = incidentesValidos.some(
            (inc) =>
              inc.severidad === "CRÍTICA" ||
              inc.severidad === "CRITICA" ||
              inc.tipo?.toLowerCase().includes("clase"),
          );

          const tieneIncidenteAusenciaReal = incidentesValidos.some(
            (inc) =>
              (inc.tipo || "").toLowerCase().includes("inasistencia") ||
              (inc.tipo || "").toLowerCase().includes("ausencia") ||
              (inc.categoriaRegla || "").toUpperCase() === "AUSENCIAS",
          );

          // Solo se marca sin registro si tenía horario vigente E incidente real de falta
          const esSinRegistro =
            !esFuturo &&
            !esLicencia &&
            !esFlexible &&
            tieneHorarioAsignado &&
            !huboPresencia &&
            tieneIncidenteAusenciaReal;

          const esCritica =
            !esFuturo &&
            !esLicencia &&
            (dia.estadoGeneral === "INFRACCION" ||
              esSinRegistro ||
              tieneCritica);
          const esDesvio =
            !esCritica &&
            !esFuturo &&
            !esLicencia &&
            (incidentesValidos.length > 0 || dia.estadoGeneral === "DESVIO");
          const esSalidaIntermedia =
            !esCritica &&
            !esDesvio &&
            !esLicencia &&
            dia.salidasIntermedias > 0;
          const esNormal =
            !esCritica &&
            !esDesvio &&
            !esLicencia &&
            dia.presenciaNetaMinutos > 0;

          let cardBgClasses =
            "bg-white border-slate-200 hover:border-indigo-300";
          if (estaSeleccionado)
            cardBgClasses =
              "bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-400/40 shadow-sm";
          else if (esLicencia)
            cardBgClasses =
              "bg-sky-50/80 border-sky-300 hover:border-sky-400 hover:shadow-xs";
          else if (esFuturo && tieneHorarioAsignado)
            cardBgClasses =
              "bg-indigo-50/30 border-indigo-200/70 hover:border-indigo-400";
          else if (esFuturo)
            cardBgClasses = "bg-slate-50/50 border-slate-200/60 opacity-60";
          else if (esCritica)
            cardBgClasses =
              "bg-rose-50/80 border-rose-300 hover:border-rose-400 hover:shadow-sm";
          else if (esDesvio)
            cardBgClasses =
              "bg-amber-50/60 border-amber-300 hover:border-amber-400 hover:shadow-sm";
          else if (esSalidaIntermedia)
            cardBgClasses =
              "bg-sky-50/60 border-sky-300 hover:border-sky-400 hover:shadow-sm";
          else if (esNormal)
            cardBgClasses =
              "bg-emerald-50/50 border-emerald-300 hover:border-emerald-400 hover:shadow-sm";
          else if (esSinRegistro)
            cardBgClasses = "bg-rose-50/70 border-rose-300";

          return (
            <div
              key={dia.fecha}
              onClick={() => {
                if (diaInspeccionado?.fecha === dia.fecha)
                  setDiaInspeccionado(null);
                else setDiaInspeccionado(dia);
              }}
              className={`border rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 min-h-[50px] sm:min-h-[105px] h-full flex flex-col justify-between hover:shadow-xs transition cursor-pointer overflow-hidden ${cardBgClasses}`}
            >
              <div className="flex items-center justify-between leading-none">
                <span
                  className={`text-[11px] sm:text-sm font-black ${
                    esCritica
                      ? "text-rose-950 font-mono"
                      : esLicencia
                        ? "text-sky-950 font-mono"
                        : "text-slate-900 font-mono"
                  }`}
                >
                  {numDia}
                </span>

                <div className="flex items-center gap-1">
                  {esHoy && (
                    <span className="px-1 sm:px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] sm:text-[9px] font-black rounded-md tracking-wider uppercase">
                      HOY
                    </span>
                  )}

                  {esLicencia ? (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 shrink-0" />
                  ) : !esHoy && incidentesValidos.length > 0 ? (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shrink-0" />
                  ) : !esHoy && dia.presenciaNetaMinutos > 0 ? (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />
                  ) : null}
                </div>
              </div>

              <div className="hidden sm:block my-1 space-y-1">
                {esDocente &&
                  dia.clasesDictadasTexto &&
                  dia.clasesDictadasTexto !== "0h 0m / 0h 0m" && (
                    <div
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center justify-between gap-1 ${
                        esCritica
                          ? "bg-rose-100 text-rose-900 border border-rose-200"
                          : "bg-purple-100 text-purple-900 border border-purple-200"
                      }`}
                    >
                      <span className="flex items-center gap-1 truncate">
                        <GraduationCap className="w-3 h-3 shrink-0" />
                        <span className="truncate">Clase</span>
                      </span>
                      <span className="font-mono shrink-0">
                        {String(dia.clasesDictadasTexto).split(" (")[0]}
                      </span>
                    </div>
                  )}

                {esLicencia ? (
                  <div className="space-y-0.5">
                    <span className="inline-block px-1.5 py-0.5 bg-sky-100 text-sky-900 border border-sky-200 rounded-md text-[9px] font-black uppercase tracking-wider truncate max-w-full">
                      {dia.tipoLicenciaEtiqueta || "Licencia"}
                    </span>
                    <span className="text-[10px] text-sky-800 font-semibold block leading-tight truncate">
                      Día eximido
                    </span>
                  </div>
                ) : dia.presenciaNetaMinutos > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-600 font-mono leading-none truncate">
                      {dia.primeraEntrada} → {dia.ultimoEgreso}
                    </div>
                    <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md text-[10px] font-black font-mono">
                      ✓ {dia.presenciaNetaTexto}
                    </span>
                  </div>
                ) : esFlexible ? (
                  <span className="text-[10px] text-emerald-700 font-semibold italic block">
                    {esFuturo ? "Optativo" : "Libre (0h)"}
                  </span>
                ) : esSinRegistro && tieneHorarioAsignado ? (
                  <div className="space-y-0.5">
                    <div className="text-[9px] text-rose-800 font-mono leading-none truncate">
                      {horariosProgramados[0]?.entrada} →{" "}
                      {horariosProgramados[0]?.salida}
                    </div>
                    <span className="inline-block px-1.5 py-0.5 bg-rose-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider truncate max-w-full">
                      ✕ Ausencia
                    </span>
                  </div>
                ) : esFuturo && tieneHorarioAsignado ? (
                  <div className="space-y-0.5">
                    <div className="text-[9px] text-indigo-700 font-mono font-bold leading-none truncate">
                      {horariosProgramados[0]?.entrada} →{" "}
                      {horariosProgramados[0]?.salida}
                    </div>
                    <span className="inline-block px-1.5 py-0.5 bg-indigo-100 text-indigo-900 rounded-md text-[9px] font-medium truncate max-w-full">
                      {horariosProgramados[0]?.nombre || "Programado"}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic block leading-none">
                    Franco
                  </span>
                )}
              </div>

              <div className="sm:hidden flex items-center justify-center mt-1">
                {dia.presenciaNetaMinutos > 0 ? (
                  <span className="text-[8px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded">
                    {dia.presenciaNetaTexto}
                  </span>
                ) : esLicencia ? (
                  <span className="text-[7px] font-bold text-sky-800 bg-sky-100 px-1 py-0.2 rounded uppercase">
                    Lic.
                  </span>
                ) : esSinRegistro && tieneHorarioAsignado ? (
                  <span className="text-[7px] font-bold text-rose-800 bg-rose-100 px-1 py-0.2 rounded uppercase">
                    Falta
                  </span>
                ) : incidentesValidos.length > 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                ) : (
                  <span className="text-[8px] text-slate-300 font-mono">-</span>
                )}
              </div>

              <div className="hidden sm:block leading-none pt-0.5">
                {incidentesValidos.length > 0 && !esLicencia ? (
                  <span
                    className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      tieneCritica
                        ? "bg-rose-100 text-rose-800 font-black"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {incidentesValidos.length}{" "}
                    {incidentesValidos.length === 1 ? "desvío" : "desvíos"}
                  </span>
                ) : dia.salidasIntermedias > 0 && !esLicencia ? (
                  <span className="text-[9px] font-semibold text-sky-700">
                    {dia.salidasIntermedias} sal.
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-5 font-sans relative">
      <style>{`@media print { body { background: white !important; } .no-print { display: none !important; } .print-full { width: 100% !important; margin: 0 !important; } }`}</style>

      {/* BARRA SUPERIOR DE ACCIÓN / SIDEBAR */}
      <div className="flex items-center justify-between no-print gap-2">
        <button
          type="button"
          onClick={() => setSidebarAbierto(!sidebarAbierto)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          {sidebarAbierto ? (
            <>
              <PanelLeftClose className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Ocultar listado</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
              <span>Listado de personal</span>
            </>
          )}
        </button>
        {!sidebarAbierto && empleadoSeleccionado && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
            <span className="hidden sm:inline">Inspeccionando:</span>
            <strong className="text-slate-900 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl truncate">
              {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}
            </strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* SIDEBAR LISTA DE EMPLEADOS */}
        <div
          className={`no-print transition-all duration-300 ${sidebarAbierto ? "lg:col-span-3 block" : "lg:hidden hidden"}`}
        >
          <ListaEmpleadosSidebar
            isOpen={sidebarAbierto}
            onClose={() => setSidebarAbierto(false)}
            empleadoSeleccionadoId={empleadoSeleccionado?.id}
            onSeleccionarEmpleado={(emp) => setEmpleadoSeleccionado(emp)}
          />
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div
          className={`print-full space-y-4 sm:space-y-5 transition-all duration-300 ${sidebarAbierto ? "lg:col-span-9" : "lg:col-span-12"}`}
        >
          {/* BARRA DE MODALIDADES */}
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Modalidad de Reporte:
              </span>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto w-full md:w-fit scrollbar-none">
              {[
                { label: "Diario", key: "DIARIO" },
                { label: "Semanal", key: "SEMANAL" },
                { label: "Mensual", key: "MENSUAL" },
                { label: "Trimestre", key: "TRIMESTRE" },
                { label: "Cuatrimestre", key: "CUATRIMESTRE" },
                { label: "Rango de fechas", key: "RANGO_FECHAS" },
              ].map(({ label, key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setModalidad(key);
                    setDiaInspeccionado(null);
                    setModalListaIncidentesAbierto(false);
                    setMesesExpandidos({});
                  }}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex-1 md:flex-initial text-center ${
                    modalidad === key
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* BARRA DE NAVEGACIÓN Y SELECCIONADORES DE FECHA PARA TODAS LAS MODALIDADES */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-600">
                {modalidad === "DIARIO"
                  ? "Jornada:"
                  : modalidad === "SEMANAL"
                    ? "Semana:"
                    : modalidad === "MENSUAL"
                      ? "Mes:"
                      : modalidad === "TRIMESTRE"
                        ? "Trimestre (3 meses):"
                        : modalidad === "CUATRIMESTRE"
                          ? "Cuatrimestre (4 meses):"
                          : "Período:"}
              </span>

              {!["RANGO_FECHAS", "TRIMESTRE", "CUATRIMESTRE"].includes(
                modalidad,
              ) && (
                <button
                  type="button"
                  onClick={() => moverFecha(-1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* DIARIO: Selector nativo */}
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
                    onChange={(e) =>
                      e.target.value && setFechaConsulta(e.target.value)
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}

              {/* SEMANAL: Selector que navega semanas completas */}
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
                    onChange={(e) =>
                      e.target.value && setFechaConsulta(e.target.value)
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}

              {/* MENSUAL: Selector de mes */}
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
                    {formatearFechaVisual(inicioMesStr)} al{" "}
                    {formatearFechaVisual(finMesStr)})
                  </span>
                  <CalendarIcon className="w-4 h-4 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="month"
                    value={fechaConsulta.substring(0, 7)}
                    onChange={(e) =>
                      e.target.value && setFechaConsulta(`${e.target.value}-01`)
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}

              {/* TRIMESTRE / CUATRIMESTRE: Selector de mes de inicio */}
              {(modalidad === "TRIMESTRE" || modalidad === "CUATRIMESTRE") && (
                <div className="flex items-center gap-2">
                  <select
                    value={fechaConsulta.substring(0, 7)}
                    onChange={(e) =>
                      e.target.value && setFechaConsulta(`${e.target.value}-01`)
                    }
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 outline-none cursor-pointer text-xs"
                  >
                    {[
                      { num: "01", mes: "Enero" },
                      { num: "02", mes: "Febrero" },
                      { num: "03", mes: "Marzo" },
                      { num: "04", mes: "Abril" },
                      { num: "05", mes: "Mayo" },
                      { num: "06", mes: "Junio" },
                      { num: "07", mes: "Julio" },
                      { num: "08", mes: "Agosto" },
                      { num: "09", mes: "Septiembre" },
                      { num: "10", mes: "Octubre" },
                      { num: "11", mes: "Noviembre" },
                      { num: "12", mes: "Diciembre" },
                    ].map((m) => (
                      <option
                        key={m.num}
                        value={`${hoyIso.substring(0, 4)}-${m.num}`}
                      >
                        {m.mes} (contar {modalidad === "TRIMESTRE" ? "3" : "4"}{" "}
                        meses)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* RANGO DE FECHAS: Selectores Desde y Hasta */}
              {modalidad === "RANGO_FECHAS" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      if (input && typeof input.showPicker === "function")
                        input.showPicker();
                    }}
                    className="relative inline-flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-400 uppercase mr-1 select-none font-bold pointer-events-none">
                      Desde:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-xs select-none pointer-events-none">
                      {formatearFechaVisual(fechaConsulta)}
                    </span>
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

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      if (input && typeof input.showPicker === "function")
                        input.showPicker();
                    }}
                    className="relative inline-flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white shadow-2xs hover:border-indigo-400 cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-400 uppercase mr-1 select-none font-bold pointer-events-none">
                      Hasta:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-xs select-none pointer-events-none">
                      {formatearFechaVisual(fechaHastaRango)}
                    </span>
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

              {!["RANGO_FECHAS", "TRIMESTRE", "CUATRIMESTRE"].includes(
                modalidad,
              ) && (
                <button
                  type="button"
                  onClick={() => moverFecha(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
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

            <div className="flex items-center gap-2 no-print relative justify-end">
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
                        onClick={() => {
                          setMenuImpresionAbierto(false);
                          generarPdfFichaComportamiento({
                            fichaData,
                            modalidad,
                            fechaConsulta,
                            fechaHastaRango,
                            esColor: false,
                          });
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <div>
                          <div className="font-bold text-slate-900">
                            Imprimir (B&W)
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Apto blanco y negro
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuImpresionAbierto(false);
                          generarPdfFichaComportamiento({
                            fichaData,
                            modalidad,
                            fechaConsulta,
                            fechaHastaRango,
                            esColor: true,
                          });
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/60 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium"
                      >
                        <Palette className="w-3.5 h-3.5 text-indigo-600" />
                        <div>
                          <div className="font-bold text-indigo-950">
                            Generar PDF Color
                          </div>
                          <div className="text-[10px] text-indigo-500">
                            Diseño institucional
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SUBMÓDULO: CABECERA Y KPIS */}
          <FichaKpisHeader
            fichaData={fichaData}
            empleadoSeleccionado={empleadoSeleccionado}
            esFlexible={esFlexible}
            franjaFlexible={franjaFlexible}
            metricas={metricas}
            mostrarKpis={mostrarKpis}
            setMostrarKpis={setMostrarKpis}
            onAbrirAuditoria={() => setModalKpiJustificacionesAbierto(true)}
            onAbrirIncidentes={() => abrirModalListaFiltrada("TODOS")}
            modalidad={modalidad}
            estadoJornadaDiaria={estadoJornadaDiaria}
            esDocente={esDocente}
          />

          {/* BANNER DE HORARIO HISTÓRICO DISPONIBLE PARA TODAS LAS MODALIDADES */}
          {horarioHistoricoActivoPeriodo && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start sm:items-center gap-3 text-xs text-amber-950 shadow-xs animate-fadeIn">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black uppercase tracking-wider text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                    Régimen Horario Histórico Detectado
                  </span>
                  <span className="font-bold text-amber-900">
                    {horarioHistoricoActivoPeriodo.etiqueta ||
                      horarioHistoricoActivoPeriodo.nombre}{" "}
                    (
                    {horarioHistoricoActivoPeriodo.horaInicio ||
                      horarioHistoricoActivoPeriodo.entrada}{" "}
                    hs →{" "}
                    {horarioHistoricoActivoPeriodo.horaFin ||
                      horarioHistoricoActivoPeriodo.salida}{" "}
                    hs)
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  En el período seleccionado (
                  <strong>{textoRangoContemplado}</strong>) rigió un esquema
                  horario anterior del colaborador, vigente desde el{" "}
                  <strong>
                    {formatearFechaVisual(
                      horarioHistoricoActivoPeriodo.fechaAlta,
                    )}
                  </strong>
                  {horarioHistoricoActivoPeriodo.fechaBaja ? (
                    <>
                      {" "}
                      hasta el{" "}
                      <strong>
                        {formatearFechaVisual(
                          horarioHistoricoActivoPeriodo.fechaBaja,
                        )}
                      </strong>
                      .
                    </>
                  ) : (
                    " (dado de baja)."
                  )}{" "}
                  Las asistencias, faltas e inasistencias en ese rango se
                  auditan y computan conforme a dicho cronograma.
                </p>
              </div>
            </div>
          )}

          {/* ESCENARIOS ESPECÍFICOS DIARIOS */}
          {modalidad === "DIARIO" && estadoJornadaDiaria.esLicencia && (
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0 shadow-2xs">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-black text-[9px] uppercase tracking-wider shadow-2xs">
                    Jornada Justificada por Dictamen
                  </span>
                  <h3 className="text-sm sm:text-lg font-black text-sky-950">
                    {infoLicenciaDiaria?.tipoLicenciaEtiqueta ||
                      "Licencia / Asueto Institucional Vigente"}
                  </h3>
                  <p className="text-xs text-sky-800 max-w-2xl leading-relaxed">
                    Para el día{" "}
                    <strong>{formatearFechaVisual(fechaConsulta)}</strong> (
                    {obtenerNombreDia(fechaConsulta)}) consta una excepción
                    formal aprobada por Recursos Humanos.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-sky-300 text-sky-800 rounded-xl text-xs font-bold shadow-2xs">
                  ✓ Amparado por Reglamentación
                </span>
                <span className="text-[11px] font-mono text-sky-700 font-bold">
                  Cumplimiento: 100%
                </span>
              </div>
            </div>
          )}

          {modalidad === "DIARIO" &&
            !estadoJornadaDiaria.esLicencia &&
            estadoJornadaDiaria.esFuturoConHorario && (
              <div className="bg-indigo-50/60 border-2 border-indigo-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <CalendarCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="max-w-xl mx-auto space-y-1.5">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-2xs">
                    Jornada Futura Programada
                  </span>
                  <h3 className="text-sm sm:text-lg font-black text-slate-900">
                    Horarios para el {formatearFechaVisual(fechaConsulta)} (
                    {obtenerNombreDia(fechaConsulta)})
                  </h3>
                  <p className="text-xs text-slate-600">
                    Esta fecha es posterior al día de hoy. El colaborador tiene
                    los siguientes horarios laborales a cumplir.
                  </p>
                </div>
                {Array.isArray(estadoJornadaDiaria.planificados) &&
                  estadoJornadaDiaria.planificados.length > 0 && (
                    <div className="max-w-lg mx-auto bg-white/95 border border-indigo-100 rounded-2xl p-3.5 text-left text-xs shadow-2xs space-y-1.5">
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
                  )}
              </div>
            )}

          {modalidad === "DIARIO" &&
            !estadoJornadaDiaria.esLicencia &&
            estadoJornadaDiaria.esInasistencia &&
            !esFlexible && (
              <div className="bg-rose-50/80 border-2 border-rose-300 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                  <UserX className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="max-w-xl mx-auto space-y-1.5">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                    Inasistencia detectada
                  </span>
                  <h3 className="text-sm sm:text-lg font-black text-rose-950">
                    Jornada laboral asignada sin registro de asistencia
                  </h3>
                  <p className="text-xs text-rose-800">
                    Para el día{" "}
                    <strong>{formatearFechaVisual(fechaConsulta)}</strong> no se
                    registraron marcaciones biométricas válidas de ingreso ni
                    egreso.
                  </p>
                </div>
                {Array.isArray(estadoJornadaDiaria.planificados) &&
                  estadoJornadaDiaria.planificados.length > 0 && (
                    <div className="max-w-lg mx-auto bg-white/90 border border-rose-200 rounded-2xl p-3.5 text-left text-xs shadow-2xs space-y-1.5">
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
                  )}
              </div>
            )}

          {modalidad === "DIARIO" &&
            !estadoJornadaDiaria.esLicencia &&
            (estadoJornadaDiaria.esSinHorario ||
              (esFlexible && !estadoJornadaDiaria.tieneDatos)) && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs">
                  <CalendarOff className="w-8 h-8 text-slate-400" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                    {esFlexible
                      ? "Día Libre / Bolsa Flexible"
                      : "Sin registros ni horario"}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {esFlexible
                      ? "Sin actividad registrada en esta fecha"
                      : "No hay datos para esta jornada"}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {esFlexible
                      ? `El colaborador cuenta con esquema flexible y no registró fichajes el día ${formatearFechaVisual(fechaConsulta)}.`
                      : `No existe registro de un horario laboral asignado ni marcaciones biométricas para el día ${formatearFechaVisual(fechaConsulta)} (${obtenerNombreDia(fechaConsulta)}).`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => moverFecha(-1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Día anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => moverFecha(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    Día siguiente <ChevronRight className="w-4 h-4" />
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

          {/* VISTA 1: DIARIO */}
          {modalidad === "DIARIO" &&
            !estadoJornadaDiaria.esSinHorario &&
            !estadoJornadaDiaria.esFuturoConHorario && (
              <FichaVistaDiaria
                fichaData={fichaData}
                fechaConsulta={fechaConsulta}
                tabInferior={tabInferior}
                setTabInferior={setTabInferior}
                tablaDetalleRef={tablaDetalleRef}
                renderItemIncidenteInteractivo={renderItemIncidenteInteractivo}
                estadoJornadaDiaria={estadoJornadaDiaria}
              />
            )}

          {/* VISTA 2: SEMANAL */}
          {modalidad === "SEMANAL" && (
            <FichaVistaSemanal
              fichaData={fichaData}
              inicioSemanaStr={inicioSemanaStr}
              finSemanaStr={finSemanaStr}
              esFlexible={esFlexible}
              horasObjetivoSemana={horasObjetivoSemana}
              metricas={metricas}
              renderCardInspeccionDiaria={renderCardInspeccionDiaria}
              obtenerHorariosDeFecha={obtenerHorariosDeFecha}
              hoyIso={hoyIso}
              diaInspeccionado={diaInspeccionado}
              setDiaInspeccionado={setDiaInspeccionado}
            />
          )}

          {/* VISTA 3: RANGO DE FECHAS */}
          {modalidad === "RANGO_FECHAS" && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Calendario del Rango ({formatearFechaVisual(fechaConsulta)}{" "}
                    al {formatearFechaVisual(fechaHastaRango)})
                  </h3>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs">
                  Total: {metricas.presenciaNetaTexto}
                </span>
              </div>
              {renderCardInspeccionDiaria()}
              {mesesDelRango.map((mes) => (
                <div
                  key={mes.mesKey}
                  className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4"
                >
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    {mes.nombreMes}
                  </h4>
                  {renderCuadriculaCalendario(mes.dias, mes.diasOffset)}
                </div>
              ))}
            </div>
          )}

          {/* VISTA 4: MENSUAL */}
          {modalidad === "MENSUAL" && (
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Calendario Mensual • {fichaData?.periodoTexto}
                </h3>
              </div>
              {renderCardInspeccionDiaria()}
              {renderCuadriculaCalendario(
                fichaData?.diasPeriodo,
                diasOffsetInicioMes,
              )}
            </div>
          )}

          {/* VISTA 5: MULTIMES (TRIMESTRE / CUATRIMESTRE) */}
          {["TRIMESTRE", "CUATRIMESTRE"].includes(modalidad) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  LISTA DE MESES DEL {modalidad}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandirTodos}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Expandir
                  </button>
                  <button
                    type="button"
                    onClick={colapsarTodos}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
                  >
                    Colapsar
                  </button>
                </div>
              </div>

              {(fichaData?.mesesPeriodo || []).map((mes) => {
                const isExpanded = mesesExpandidos[mes.mesKey];
                return (
                  <div
                    key={mes.mesKey}
                    className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden transition-all"
                  >
                    <div className="p-4 sm:p-5 flex items-center justify-between bg-slate-50/50">
                      <h4 className="text-base font-black text-slate-900">
                        {mes.nombreMes}
                      </h4>
                      <button
                        type="button"
                        onClick={() => toggleMes(mes.mesKey)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                      >
                        {isExpanded ? "Ocultar" : "Ver Calendario"}{" "}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-slate-100">
                        {renderCardInspeccionDiaria()}
                        {renderCuadriculaCalendario(
                          mes.diasPeriodo,
                          mes.diasOffset,
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL AUDITORÍA DE JUSTIFICACIONES */}
      {modalKpiJustificacionesAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="bg-[#111827] px-4 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm tracking-tight text-white truncate">
                    Auditoría de Descargos y Motivos
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-0.5 truncate">
                    <CalendarRange className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{textoRangoContemplado}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalKpiJustificacionesAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Distribución de Resoluciones en este Período
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div
                    onClick={() => {
                      setModalKpiJustificacionesAbierto(false);
                      abrirModalListaFiltrada("PENDIENTES");
                    }}
                    className="p-3 sm:p-4 rounded-2xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 transition cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-amber-900">
                        Pendientes
                      </span>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1 font-mono">
                      {metricas.incidentesPendientes}
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setModalKpiJustificacionesAbierto(false);
                      abrirModalListaFiltrada("JUSTIFICADAS");
                    }}
                    className="p-3 sm:p-4 rounded-2xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 transition cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-emerald-900">
                        Justificados
                      </span>
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 font-mono">
                      {metricas.incidentesJustificados}
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setModalKpiJustificacionesAbierto(false);
                      abrirModalListaFiltrada("OBSERVADAS");
                    }}
                    className="p-3 sm:p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 transition cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-indigo-900">
                        Observados
                      </span>
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-950 mt-1 font-mono">
                      {metricas.incidentesObservados}
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setModalKpiJustificacionesAbierto(false);
                      abrirModalListaFiltrada("RECHAZADAS");
                    }}
                    className="p-3 sm:p-4 rounded-2xl border border-rose-300 bg-rose-50/70 hover:bg-rose-100/70 transition cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-rose-900">
                        Rechazados
                      </span>
                      <Ban className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-950 mt-1 font-mono">
                      {metricas.incidentesRechazados}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Ranking de Motivos
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {metricas.totalIncidentesJustificadosConMotivo} resoluciones
                  </span>
                </div>
                {!metricas.topJustificaciones?.length ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic">
                    No constan justificaciones fundamentadas en el período.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {metricas.topJustificaciones.map((item, idx) => {
                      const porcentaje =
                        metricas.totalIncidentesJustificadosConMotivo > 0
                          ? Math.round(
                              (item.cantidad /
                                metricas.totalIncidentesJustificadosConMotivo) *
                                100,
                            )
                          : 0;
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-bold text-slate-800 flex items-center gap-2 truncate">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-[10px] font-mono shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{item.texto}</span>
                            </span>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                              {item.cantidad} ({porcentaje}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(4, porcentaje)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalKpiJustificacionesAbierto(false);
                  abrirModalListaFiltrada("TODOS");
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Ver incidentes →
              </button>
              <button
                type="button"
                onClick={() => setModalKpiJustificacionesAbierto(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-xs cursor-pointer transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE INCIDENTES */}
      {modalListaIncidentesAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="bg-[#111827] px-4 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={volverAAuditoriaPrincipal}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Volver</span>
                </button>
                <div className="font-bold text-sm text-white">
                  Incidentes ({incidentesFiltradosModal.length})
                </div>
              </div>
              <button
                onClick={() => setModalListaIncidentesAbierto(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-semibold scrollbar-none">
              {[
                "TODOS",
                "PENDIENTES",
                "JUSTIFICADAS",
                "OBSERVADAS",
                "RECHAZADAS",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFiltroEstadoModal(tab)}
                  className={`px-3 py-1 rounded-xl transition cursor-pointer whitespace-nowrap capitalize ${
                    filtroEstadoModal === tab
                      ? "bg-white text-indigo-700 font-bold shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
              {incidentesFiltradosModal.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">
                  No se registran incidentes bajo el estado seleccionado.
                </div>
              ) : (
                incidentesFiltradosModal.map((inc) =>
                  renderItemIncidenteInteractivo(inc, true),
                )
              )}
            </div>

            <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={volverAAuditoriaPrincipal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer transition shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>Volver a Auditoría</span>
              </button>
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

      {/* MODAL JUSTIFICACIÓN DIRECTA */}
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
