import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Calendar,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Building,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Stethoscope,
  Briefcase,
  Palmtree,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  getExcepcionesMetricas,
  getExcepcionesPaginadas,
  createExcepcion,
  updateExcepcion,
  dictaminarExcepcion,
  deleteExcepcion,
  reactivarExcepcion,
} from "../services/excepcionLicenciaService";
import { getEmpleados } from "../services/empleadoService";
import { getCategorias } from "../services/configuracionService";
import { useAuth } from "../context/AuthContext";
import ModalCrearExcepcion from "../components/excepciones/ModalCrearExcepcion";
import ModalFichaDetalleLicencia from "../components/excepciones/ModalFichaDetalleLicencia";
import ModalAlerta from "../components/comunes/ModalAlerta";
import { formatearFechaVisual } from "../utils/fechasFichaUtils";
import {
  getBadgeColorClasses,
  getDotColorClass,
} from "../utils/categoriasHorariosUtils";

const ITEMS_POR_PAGINA = 15;

export default function ExcepcionesLicencias() {
  const { tienePermiso } = useAuth();
  const puedeCrear = tienePermiso("EXCEPCIONES_CREAR");
  const puedeDictaminar =
    tienePermiso("EXCEPCIONES_DICTAMINAR") ||
    tienePermiso("EXCEPCIONES_APROBAR");
  const puedeEliminar = tienePermiso("EXCEPCIONES_ELIMINAR");

  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({
    enCursoHoy: 0,
    proximas: 0,
    finalizadas: 0,
    pendientesRrhh: 0,
    totalRegistros: 0,
  });

  const [registros, setRegistros] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // Pestañas: "DESGLOSE" | "LISTADO" | "ASUETOS"
  const [tabPrincipal, setTabPrincipal] = useState("DESGLOSE");

  // Filtro de tarjetas KPI
  const [filtroKpi, setFiltroKpi] = useState("TODOS");

  // Filtros de barra
  const [busqueda, setBusqueda] = useState("");
  const [filtroRegimen, setFiltroRegimen] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [filtroEstadoActivo, setFiltroEstadoActivo] = useState("ACTIVOS");

  // Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [licenciaEditando, setLicenciaEditando] = useState(null);
  const [licenciaFicha, setLicenciaFicha] = useState(null);
  const [desglosesAbiertos, setDesglosesAbiertos] = useState({});

  const cargandoPaginacionRef = useRef(false);

  // ModalAlerta
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
      onConfirmar: () => setModalAlerta((p) => ({ ...p, isOpen: false })),
    });
  };

  const cargarMetricas = useCallback(async () => {
    try {
      const data = await getExcepcionesMetricas();
      if (data) setMetricas(data);
    } catch (err) {
      console.error("Error al cargar métricas:", err);
    }
  }, []);

  const cargarRegistrosServidor = useCallback(
    async (pageIndex = 0) => {
      if (cargandoPaginacionRef.current) return;
      cargandoPaginacionRef.current = true;
      setLoading(true);

      try {
        const pageSegura = Number.isNaN(Number(pageIndex))
          ? 0
          : Math.max(0, parseInt(pageIndex, 10) || 0);

        const params = {
          busqueda: busqueda.trim(),
          estado: filtroRegimen,
          tipo: filtroTipo,
          filtroKpi,
          filtroActivo: filtroEstadoActivo,
          page: pageSegura,
          size: ITEMS_POR_PAGINA,
        };

        const res = await getExcepcionesPaginadas(params);

        if (res && res.content) {
          let lista = res.content;

          if (filtroCategoria !== "TODAS") {
            lista = lista.filter((d) => {
              if (filtroCategoria === "INSTITUCIONAL") return d.esInstitucional;
              return (
                d.rolArea &&
                d.rolArea.toLowerCase() === filtroCategoria.toLowerCase()
              );
            });
          }

          setRegistros(lista);

          const totalElem =
            res.page?.totalElements ?? res.totalElements ?? lista.length;
          const totalPags = res.page?.totalPages ?? res.totalPages ?? 1;
          const numPag = res.page?.number ?? res.number ?? 0;

          setTotalElementos(Number(totalElem) || 0);
          setTotalPaginas(Math.max(1, Number(totalPags) || 1));

          const nuevaPagina = (Number(numPag) || 0) + 1;
          setPaginaActual((prev) =>
            prev !== nuevaPagina ? nuevaPagina : prev,
          );
        } else {
          setRegistros([]);
          setTotalPaginas(1);
          setTotalElementos(0);
        }
      } catch (err) {
        console.error("Error al cargar registros paginados:", err);
        setRegistros([]);
      } finally {
        setLoading(false);
        cargandoPaginacionRef.current = false;
      }
    },
    [
      busqueda,
      filtroRegimen,
      filtroTipo,
      filtroKpi,
      filtroEstadoActivo,
      filtroCategoria,
    ],
  );

  useEffect(() => {
    cargarMetricas();
    getEmpleados()
      .then((res) => setEmpleados(Array.isArray(res) ? res : []))
      .catch(() => setEmpleados([]));
    getCategorias()
      .then((res) => setCategorias(Array.isArray(res) ? res : []))
      .catch(() => setCategorias([]));
  }, [cargarMetricas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const pageIndex = Math.max(0, (Number(paginaActual) || 1) - 1);
      cargarRegistrosServidor(pageIndex);
    }, 250);
    return () => clearTimeout(timer);
  }, [cargarRegistrosServidor, paginaActual]);

  useEffect(() => {
    setPaginaActual(1);
  }, [
    busqueda,
    filtroRegimen,
    filtroTipo,
    filtroCategoria,
    filtroEstadoActivo,
    filtroKpi,
  ]);

  // Obtiene el color exacto definido en Tipos y Configuración
  const obtenerColorDeConfiguracion = useCallback(
    (nombreOArea, esInstitucional = false) => {
      if (
        esInstitucional ||
        nombreOArea?.toLowerCase().includes("institucional")
      ) {
        return "purple";
      }
      if (!nombreOArea) return "indigo";

      // Búsqueda directa en la tabla de categorías activas por coincidencia exacta de nombre o tag
      const categoriaConfigurada = categorias.find(
        (c) =>
          c.nombre?.trim().toLowerCase() === nombreOArea.trim().toLowerCase() ||
          c.codigoTag?.trim().toLowerCase() ===
            nombreOArea.trim().toLowerCase(),
      );

      return categoriaConfigurada?.colorIdentificacion || "indigo";
    },
    [categorias],
  );

  const desgloseAgentes = useMemo(() => {
    const mapa = new Map();
    const institucionales = registros.filter((r) => r.esInstitucional);

    if (institucionales.length > 0) {
      mapa.set("INSTITUCIONAL", {
        idEmpleado: null,
        esInstitucional: true,
        nombreCompleto: "Toda la Institución (Asuetos y Feriados)",
        iniciales: "TF",
        rolArea: "Institucional",
        departamento: "Alcance general a todo el personal",
        licencias: institucionales,
        totalDias: institucionales.reduce(
          (acc, l) => acc + (l.diasDuracion || 1),
          0,
        ),
        cantEnCursoHoy: institucionales.filter(
          (l) => l.condicionTemporal === "EN_CURSO",
        ).length,
        cantPendientesRrhh: institucionales.filter(
          (l) => l.estado === "PENDIENTE_RRHH",
        ).length,
        cantProximas: institucionales.filter(
          (l) => l.condicionTemporal === "PROXIMA",
        ).length,
        cantFinalizadas: institucionales.filter(
          (l) => l.condicionTemporal === "FINALIZADA",
        ).length,
      });
    }

    registros
      .filter((r) => !r.esInstitucional)
      .forEach((r) => {
        const key = `EMP_${r.idEmpleado}`;
        if (!mapa.has(key)) {
          mapa.set(key, {
            idEmpleado: r.idEmpleado,
            esInstitucional: false,
            nombreCompleto: r.nombreEmpleado,
            iniciales: r.nombreEmpleado
              ? r.nombreEmpleado.slice(0, 2).toUpperCase()
              : "AG",
            rolArea: r.rolArea || "Personal",
            nroLegajo: r.legajoEmpleado,
            departamento: "",
            licencias: [],
            totalDias: 0,
            cantEnCursoHoy: 0,
            cantPendientesRrhh: 0,
            cantProximas: 0,
            cantFinalizadas: 0,
          });
        }
        const ag = mapa.get(key);
        ag.licencias.push(r);
        ag.totalDias += r.diasDuracion || 1;
        if (r.condicionTemporal === "EN_CURSO") ag.cantEnCursoHoy++;
        if (r.estado === "PENDIENTE_RRHH") ag.cantPendientesRrhh++;
        if (r.condicionTemporal === "PROXIMA") ag.cantProximas++;
        if (r.condicionTemporal === "FINALIZADA") ag.cantFinalizadas++;
      });

    return Array.from(mapa.values());
  }, [registros]);

  const asuetos = useMemo(
    () => registros.filter((r) => r.esInstitucional),
    [registros],
  );

  const estanTodosAbiertos = useMemo(() => {
    return (
      desgloseAgentes.length > 0 &&
      desgloseAgentes.every(
        (ag) => !!desglosesAbiertos[ag.idEmpleado || "INSTITUCIONAL"],
      )
    );
  }, [desgloseAgentes, desglosesAbiertos]);

  const alternarTodosDesgloses = () => {
    const nuevo = {};
    desgloseAgentes.forEach((ag) => {
      nuevo[ag.idEmpleado || "INSTITUCIONAL"] = !estanTodosAbiertos;
    });
    setDesglosesAbiertos(nuevo);
  };

  const toggleDesglose = (key) => {
    setDesglosesAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCambiarPagina = (nuevaPagina) => {
    setPaginaActual(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
  };

  const abrirModalNuevo = (idEmpleadoPrefill = null, esAsueto = false) => {
    if (esAsueto) {
      setLicenciaEditando({ esInstitucional: true, tipo: "FERIADO_ASUETO" });
    } else if (idEmpleadoPrefill) {
      setLicenciaEditando({
        idEmpleado: Number(idEmpleadoPrefill),
        esInstitucional: false,
        tipo: "LICENCIA_MEDICA",
      });
    } else {
      setLicenciaEditando(null);
    }
    setModalCrearAbierto(true);
  };

  const abrirModalEditar = (lic) => {
    setLicenciaEditando(lic);
    setModalCrearAbierto(true);
  };

  const handleGuardar = async (payload, idAEditar) => {
    try {
      if (idAEditar) {
        await updateExcepcion(idAEditar, payload);
        mostrarAviso(
          "success",
          "Actualizado",
          "La licencia se actualizó correctamente.",
        );
      } else {
        await createExcepcion(payload);
        mostrarAviso(
          "success",
          "Registrado",
          "La excepción o licencia se registró con éxito.",
        );
      }
      await Promise.all([
        cargarRegistrosServidor(paginaActual - 1),
        cargarMetricas(),
      ]);
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        err.response?.data?.message || "No se pudo guardar la licencia.",
      );
    }
  };

  const handleDictaminar = async (id, nuevoEstado) => {
    try {
      await dictaminarExcepcion(id, nuevoEstado);
      await Promise.all([
        cargarRegistrosServidor(paginaActual - 1),
        cargarMetricas(),
      ]);
      mostrarAviso(
        "success",
        "Dictamen Registrado",
        `La solicitud ha sido marcada como ${nuevoEstado}.`,
      );
    } catch (err) {
      mostrarAviso("danger", "Error", "No se pudo dictaminar la solicitud.");
    }
  };

  const handleEliminar = (lic) => {
    if (!puedeEliminar) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja licencia?",
      mensaje: `¿Confirma la baja lógica de la excepción/licencia "${lic.tipoEtiqueta}"?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await deleteExcepcion(lic.id);
          await Promise.all([
            cargarRegistrosServidor(paginaActual - 1),
            cargarMetricas(),
          ]);
          mostrarAviso(
            "success",
            "Baja Exitosa",
            "La licencia fue dada de baja.",
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo anular la licencia.");
        }
      },
      onCancelar: () => setModalAlerta((p) => ({ ...p, isOpen: false })),
    });
  };

  const handleReactivar = (lic) => {
    if (!puedeEliminar) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar licencia?",
      mensaje: `¿Desea reactivar la excepción/licencia "${lic.tipoEtiqueta}" para este colaborador?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await reactivarExcepcion(lic.id);
          await Promise.all([
            cargarRegistrosServidor(paginaActual - 1),
            cargarMetricas(),
          ]);
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            "La licencia ha sido reactivada.",
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar la licencia.");
        }
      },
      onCancelar: () => setModalAlerta((p) => ({ ...p, isOpen: false })),
    });
  };

  const handleSeleccionarKpi = (tipoKpi) => {
    setFiltroKpi((prev) => (prev === tipoKpi ? "TODOS" : tipoKpi));
  };

  const esActivo = (item) =>
    item?.activo !== false && item?.activo !== 0 && item?.activo !== "0";

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
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
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
      {/* 1. HEADER LIMPIO */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Excepciones y Licencias
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Control de licencias médicas, vacaciones, feriados y asuetos.
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

      {/* 2. TARJETAS KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

      {/* 3. PESTAÑAS Y ACCIÓN COLAPSAR / DESGLOSAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto w-fit">
          {[
            {
              key: "DESGLOSE",
              label: `Desglose por Agente (${desgloseAgentes.length})`,
            },
            { key: "LISTADO", label: `Listado Detallado (${totalElementos})` },
            { key: "ASUETOS", label: "Asuetos & Feriados Institucionales" },
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer w-fit shadow-2xs"
          >
            {estanTodosAbiertos ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Colapsar todos los registros</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Desglosar todos los registros</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 4. FILTROS DE BÚSQUEDA */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por agente, legajo o motivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800"
          />
        </div>

        <select
          value={filtroEstadoActivo}
          onChange={(e) => setFiltroEstadoActivo(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-semibold bg-white"
        >
          <option value="ACTIVOS">Estado: Solo Activos</option>
          <option value="INACTIVOS">Estado: Solo Bajas (Inactivos)</option>
          <option value="TODOS">Estado: Todos los registros</option>
        </select>

        <select
          value={filtroRegimen}
          onChange={(e) => setFiltroRegimen(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 bg-white"
        >
          <option value="TODOS">Dictamen: Todos</option>
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
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* 5. VISTA 1: DESGLOSE POR AGENTE */}
      {tabPrincipal === "DESGLOSE" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
              Consultando licencias del servidor...
            </div>
          ) : desgloseAgentes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 text-xs italic">
              No se registran licencias ni excepciones para el filtro aplicado.
            </div>
          ) : (
            desgloseAgentes.map((agente) => {
              const key = agente.idEmpleado || "INSTITUCIONAL";
              const isExpanded = !!desglosesAbiertos[key];

              // Obtención del color de configuración para el agente
              const colorCat = obtenerColorDeConfiguracion(
                agente.rolArea,
                agente.esInstitucional,
              );
              const estiloBadgeCat = getBadgeColorClasses(colorCat);
              const estiloDotCat = getDotColorClass(colorCat);

              return (
                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all border-l-4 border-l-indigo-600"
                >
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
                          {/* BADGE CON COLOR ASIGNADO POR EL USUARIO EN CONFIGURACIÓN */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[10px] border ${estiloBadgeCat}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${estiloDotCat}`}
                            />
                            <span>{agente.rolArea}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {agente.esInstitucional
                            ? agente.departamento
                            : `#${agente.nroLegajo || "S/L"}`}
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
                          {agente.licencias.length} registros
                        </div>
                      </div>

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

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 space-y-4 bg-white">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-1 border-b border-slate-50">
                        <div className="flex items-center gap-1.5 tracking-wider uppercase text-[11px] text-indigo-950 font-black">
                          <span className="text-indigo-600">❖</span>
                          <span>
                            DESGLOSE DE LICENCIAS Y EXCEPCIONES REGISTRADAS (
                            {agente.licencias.length})
                          </span>
                        </div>

                        {!agente.esInstitucional && puedeCrear && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalNuevo(agente.idEmpleado);
                            }}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer transition hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Agregar licencia para este agente</span>
                          </button>
                        )}
                      </div>

                      {agente.licencias.map((lic) => {
                        const estaActivo = esActivo(lic);
                        const esEnCurso = lic.condicionTemporal === "EN_CURSO";
                        const esPendiente = lic.estado === "PENDIENTE_RRHH";
                        const esProxima = lic.condicionTemporal === "PROXIMA";
                        const esUnSoloDia =
                          lic.diasDuracion === 1 ||
                          lic.fechaInicio === lic.fechaFin;
                        const esVenceHoy = esEnCurso && esUnSoloDia;

                        let clasesRecuadro =
                          "bg-white border-slate-200 hover:border-slate-300 shadow-2xs";
                        if (!estaActivo) {
                          clasesRecuadro =
                            "bg-slate-50/70 border-dashed border-rose-300 opacity-75 shadow-none";
                        } else if (esPendiente) {
                          clasesRecuadro =
                            "bg-white border-amber-400 ring-1 ring-amber-300/40 shadow-xs";
                        } else if (esEnCurso) {
                          clasesRecuadro =
                            "bg-white border-emerald-400 ring-1 ring-emerald-300/30 shadow-xs";
                        } else if (esProxima) {
                          clasesRecuadro =
                            "bg-white border-sky-400 ring-1 ring-sky-300/30 shadow-xs";
                        }

                        const textoFechaRango = esUnSoloDia
                          ? `${formatearFechaVisual(lic.fechaInicio)} (1 día)`
                          : `${formatearFechaVisual(lic.fechaInicio)} al ${formatearFechaVisual(lic.fechaFin)} (${lic.diasDuracion} días)`;

                        return (
                          <div
                            key={lic.id}
                            className={`p-4 rounded-2xl border transition-all space-y-2.5 ${clasesRecuadro}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold border text-xs shadow-2xs ${getEstiloPildoraTipo(lic.tipo)}`}
                                >
                                  {getIconoTipo(lic.tipo)}
                                  <span>{lic.tipoEtiqueta}</span>
                                </span>

                                <span className="flex items-center gap-1 text-slate-700 text-xs font-semibold">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{textoFechaRango}</span>
                                </span>

                                {!estaActivo ? (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    ● Eliminada (Baja lógica)
                                  </span>
                                ) : esPendiente ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    <span className="w-3.5 h-3.5 rounded-full border border-amber-500 text-amber-700 flex items-center justify-center text-[9px] font-bold">
                                      !
                                    </span>
                                    <span>Pendiente de RRHH</span>
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${lic.estado === "APROBADA" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}
                                  >
                                    {lic.estado === "APROBADA"
                                      ? "Aprobada"
                                      : "Rechazada"}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-center">
                                {estaActivo &&
                                  esPendiente &&
                                  puedeDictaminar && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDictaminar(lic.id, "APROBADA")
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Ver Ficha</span>
                                </button>

                                {estaActivo && puedeCrear && (
                                  <button
                                    type="button"
                                    onClick={() => abrirModalEditar(lic)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                                    title="Editar esta licencia"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {puedeEliminar &&
                                  (estaActivo ? (
                                    <button
                                      type="button"
                                      onClick={() => handleEliminar(lic)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                      title="Dar de baja registro"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleReactivar(lic)}
                                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                                      title="Reactivar licencia"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {esVenceHoy ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                  <span>¡Vence hoy!</span>
                                </span>
                              ) : esEnCurso ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  <span>{lic.textoProgreso}</span>
                                </span>
                              ) : esProxima ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                  {lic.textoProgreso}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {lic.textoProgreso}
                                </span>
                              )}

                              {esPendiente ? (
                                <span className="text-amber-800 text-xs">
                                  <strong className="font-bold text-amber-900">
                                    Solicitud en revisión
                                  </strong>{" "}
                                  <span className="font-bold text-amber-800">
                                    • Restan {lic.diasRestantes} días para que
                                    finalice
                                  </span>
                                </span>
                              ) : esVenceHoy ? (
                                <span className="text-slate-700 text-xs">
                                  <strong className="font-bold text-slate-900">
                                    En curso hoy (vigencia de 1 día)
                                  </strong>{" "}
                                  <span className="text-slate-500 font-normal">
                                    • ¡Último día de vigencia! Concluye hoy a
                                    las 23:59 hs
                                  </span>
                                </span>
                              ) : esEnCurso ? (
                                <span className="text-slate-700 text-xs">
                                  <strong className="font-bold text-slate-900">
                                    En curso: van {lic.diasTranscurridos} de{" "}
                                    {lic.diasDuracion} días
                                  </strong>{" "}
                                  <span className="text-slate-500 font-normal">
                                    • Restan {lic.diasRestantes} días para que
                                    finalice
                                  </span>
                                </span>
                              ) : esProxima ? (
                                <span className="text-slate-700 text-xs">
                                  <strong className="font-bold text-slate-900">
                                    Próxima ({lic.textoProgreso})
                                  </strong>{" "}
                                  <span className="text-slate-500 font-normal">
                                    • Comienza el{" "}
                                    {formatearFechaVisual(lic.fechaInicio)} •
                                    Duración: {lic.diasDuracion}{" "}
                                    {esUnSoloDia ? "día" : "días"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-700 text-xs">
                                  <strong className="font-bold text-slate-900">
                                    Concluyó el{" "}
                                    {formatearFechaVisual(lic.fechaFin)}
                                  </strong>{" "}
                                  <span className="text-slate-500 font-normal">
                                    • Duró {lic.diasDuracion}{" "}
                                    {esUnSoloDia ? "día" : "días"}
                                  </span>
                                </span>
                              )}
                            </div>

                            {esEnCurso && estaActivo && (
                              <div className="space-y-1 pt-0.5 max-w-md">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400 font-medium">
                                    Progreso de la licencia:
                                  </span>
                                  <span className="font-mono text-slate-800 font-bold">
                                    {lic.porcentajeProgreso ||
                                      (esVenceHoy ? 100 : 20)}
                                    %
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${esVenceHoy ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{
                                      width: `${Math.max(4, lic.porcentajeProgreso || (esVenceHoy ? 100 : 20))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="text-[11px] text-slate-600 pt-0.5 border-t border-slate-50">
                              <strong className="font-bold text-slate-900">
                                Motivo / Dictamen:
                              </strong>{" "}
                              <span className="text-slate-600 font-normal">
                                {lic.motivoDictamen}
                              </span>
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

      {/* 6. VISTA 2: LISTADO DETALLADO */}
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Consultando licencias del servidor...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-slate-400 italic"
                  >
                    No se registran licencias para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                registros.map((lic) => {
                  const estaActivo = esActivo(lic);
                  const esUnSoloDia =
                    lic.diasDuracion === 1 || lic.fechaInicio === lic.fechaFin;

                  // Resolución del color configurado para la categoría
                  const colorCat = obtenerColorDeConfiguracion(
                    lic.rolArea,
                    lic.esInstitucional,
                  );
                  const estiloBadgeCat = getBadgeColorClasses(colorCat);
                  const estiloDotCat = getDotColorClass(colorCat);

                  return (
                    <tr
                      key={lic.id}
                      className={`transition-colors ${!estaActivo ? "bg-slate-50/70 opacity-75" : "hover:bg-slate-50/70"}`}
                    >
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
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {lic.legajoEmpleado && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{lic.legajoEmpleado} •
                                </span>
                              )}
                              {/* BADGE DE CATEGORÍA CON EL COLOR CONFIGURADO POR EL USUARIO */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-md font-bold text-[9px] border ${estiloBadgeCat}`}
                              >
                                <span
                                  className={`w-1 h-1 rounded-full ${estiloDotCat}`}
                                />
                                <span>{lic.rolArea}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${getEstiloPildoraTipo(lic.tipo)}`}
                        >
                          {getIconoTipo(lic.tipo)}
                          <span>{lic.tipoEtiqueta}</span>
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {esUnSoloDia
                            ? `${formatearFechaVisual(lic.fechaInicio)}`
                            : `${formatearFechaVisual(lic.fechaInicio)} al ${formatearFechaVisual(lic.fechaFin)}`}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Duración: {lic.diasDuracion}{" "}
                          {esUnSoloDia ? "día" : "días"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                              !estaActivo
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : lic.condicionTemporal === "FINALIZADA"
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : esUnSoloDia &&
                                      lic.condicionTemporal === "EN_CURSO"
                                    ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse font-black"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {!estaActivo ? "Baja Lógica" : lic.textoProgreso}
                          </span>
                          <div className="text-[11px] font-bold text-slate-800 leading-tight">
                            {lic.condicionTemporal === "EN_CURSO"
                              ? `En curso: van ${lic.diasTranscurridos} de ${lic.diasDuracion} días`
                              : lic.condicionTemporal === "FINALIZADA"
                                ? "Completada"
                                : "Programada"}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <div
                          className="text-slate-600 text-xs truncate font-medium"
                          title={lic.motivoDictamen}
                        >
                          {lic.motivoDictamen}
                        </div>
                      </td>

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

                          {estaActivo && puedeCrear && (
                            <button
                              type="button"
                              onClick={() => abrirModalEditar(lic)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {puedeEliminar &&
                            (estaActivo ? (
                              <button
                                type="button"
                                onClick={() => handleEliminar(lic)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Dar de baja"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReactivar(lic)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Reactivar"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. VISTA 3: ASUETOS & FERIADOS INSTITUCIONALES */}
      {tabPrincipal === "ASUETOS" && (
        <div className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                Consultando asuetos...
              </div>
            ) : asuetos.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-3xl text-xs italic">
                No hay asuetos o feriados institucionales registrados bajo este
                filtro.
              </div>
            ) : (
              asuetos.map((lic) => {
                const estaActivo = esActivo(lic);
                const esUnSoloDia =
                  lic.diasDuracion === 1 || lic.fechaInicio === lic.fechaFin;
                return (
                  <div
                    key={lic.id}
                    className={`bg-white border rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between transition ${
                      !estaActivo
                        ? "border-dashed border-rose-300 opacity-75"
                        : "border-purple-200 hover:border-purple-300"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                            !estaActivo
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {!estaActivo ? "Eliminado (Baja)" : lic.textoProgreso}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatearFechaVisual(lic.fechaInicio)}
                        </span>
                      </div>

                      <h4 className="font-black text-slate-900 text-sm leading-snug">
                        {lic.motivoDictamen}
                      </h4>

                      <p className="text-[11px] text-slate-500">
                        {esUnSoloDia
                          ? `Duración: 1 día • ${formatearFechaVisual(lic.fechaInicio)}`
                          : lic.detalleVigencia}
                      </p>
                    </div>

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

                        {estaActivo && puedeCrear && (
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(lic)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {puedeEliminar &&
                          (estaActivo ? (
                            <button
                              type="button"
                              onClick={() => handleEliminar(lic)}
                              className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] transition cursor-pointer ml-1"
                            >
                              Eliminar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivar(lic)}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold text-[11px] transition cursor-pointer ml-1"
                            >
                              Reactivar
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 8. BARRA DE CONTROL DE PAGINACIÓN */}
      <div className="bg-white px-6 py-4 border border-slate-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
        <div className="text-slate-500">
          {Number(totalElementos) === 0 ? (
            <span>
              Mostrando <span className="font-bold text-slate-800">0</span> de{" "}
              <span className="font-bold text-slate-800">0</span> registros
            </span>
          ) : (
            <span>
              Mostrando{" "}
              <span className="font-bold text-slate-800">
                {(Math.max(1, Number(paginaActual) || 1) - 1) *
                  ITEMS_POR_PAGINA +
                  1}
              </span>{" "}
              a{" "}
              <span className="font-bold text-slate-800">
                {Math.min(
                  Math.max(1, Number(paginaActual) || 1) * ITEMS_POR_PAGINA,
                  Number(totalElementos) || 0,
                )}
              </span>{" "}
              de{" "}
              <span className="font-bold text-slate-800">
                {Number(totalElementos) || 0}
              </span>{" "}
              registros
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleCambiarPagina((Number(paginaActual) || 1) - 1)}
            disabled={Number(paginaActual) <= 1 || loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Página Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from(
            { length: Math.max(1, Number(totalPaginas) || 1) },
            (_, i) => i + 1,
          ).map((num) => (
            <button
              key={num}
              onClick={() => handleCambiarPagina(num)}
              disabled={loading}
              className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer ${
                (Number(paginaActual) || 1) === num
                  ? "bg-[#4b35e6] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {num}
            </button>
          ))}

          <button
            onClick={() => handleCambiarPagina((Number(paginaActual) || 1) + 1)}
            disabled={Number(paginaActual) >= Number(totalPaginas) || loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Página Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 9. MODALES */}
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

      <ModalAlerta
        isOpen={modalAlerta.isOpen}
        tipo={modalAlerta.tipo}
        titulo={modalAlerta.titulo}
        mensaje={modalAlerta.mensaje}
        textoConfirmar={modalAlerta.textoConfirmar}
        textoCancelar={modalAlerta.textoCancelar}
        mostrarCancelar={modalAlerta.mostrarCancelar}
        onConfirmar={modalAlerta.onConfirmar}
        onCancelar={() => setModalAlerta((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
