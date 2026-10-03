import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Users,
  Search,
  Plus,
  Clock,
  Eye,
  Sliders,
  Trash2,
  Repeat,
  Loader2,
  Lock,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import {
  getEmpleadosActivos,
  getHorariosPaginados,
  getEmpleadoHorarios,
  addEmpleadoHorario,
  removeEmpleadoHorario,
  getMetricasEmpleado,
} from "../services/empleadoService";
import {
  getCategorias,
  getHorarios,
  getMaterias,
} from "../services/configuracionService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalDetalleCronograma from "../components/personal/ModalDetalleCronograma";
import ModalAsignarClase from "../components/personal/ModalAsignarClase";
import ModalAsignarTurno from "../components/personal/ModalAsignarTurno";
import { useAuth } from "../context/AuthContext";

const DIAS_MAP = [
  { clave: "Lun", nombre: "Lunes", diaNumero: 1 },
  { clave: "Mar", nombre: "Martes", diaNumero: 2 },
  { clave: "Mié", nombre: "Miércoles", diaNumero: 3 },
  { clave: "Jue", nombre: "Jueves", diaNumero: 4 },
  { clave: "Vie", nombre: "Viernes", diaNumero: 5 },
  { clave: "Sáb", nombre: "Sábado", diaNumero: 6 },
  { clave: "Dom", nombre: "Domingo", diaNumero: 7 },
];

const MAPA_DIAS_NUMERO = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Domingo: 7,
  Lun: 1,
  Mar: 2,
  Mié: 3,
  Jue: 4,
  Vie: 5,
  Sáb: 6,
  Dom: 7,
};

const ITEMS_POR_PAGINA = 15;

const FORM_CLASE_INICIAL = {
  materiaId: "",
  materia: "",
  diasSemana: ["Lunes"],
  horaInicio: "18:00",
  horaFin: "21:00",
  aula: "",
  tipoFrecuencia: "SEMANAL",
  repeticionesPeriodo: 1,
  semanaAlterna: "PAR",
};

export default function GestionHorarios() {
  const { tienePermiso } = useAuth();

  // Control estricto de permisos mediante PBAC
  const puedeCrear = tienePermiso("HORARIOS_GESTIONAR");
  const puedeEditar = tienePermiso("HORARIOS_EDITAR");
  const puedeEliminar = tienePermiso("HORARIOS_ELIMINAR");

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [horariosPreestablecidos, setHorariosPreestablecidos] = useState([]);
  const [materias, setMaterias] = useState([]);

  // Paginación desde servidor
  const [horariosPaginados, setHorariosPaginados] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  // Categoría Superior Activa
  const [categoriaActiva, setCategoriaActiva] = useState("Docentes");

  // Filtros panel lateral
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState(null);
  const [searchEmpleado, setSearchEmpleado] = useState("");
  const [sidebarMovilAbierto, setSidebarMovilAbierto] = useState(false);

  // Modales
  const [modalDetalle, setModalDetalle] = useState(false);
  const [empleadoEnModal, setEmpleadoEnModal] = useState(null);
  const [horariosEmpleadoModal, setHorariosEmpleadoModal] = useState([]);
  const [metricasEmpleadoModal, setMetricasEmpleadoModal] = useState(null);

  const [modalAsignarClase, setModalAsignarClase] = useState(false);
  const [formClase, setFormClase] = useState(FORM_CLASE_INICIAL);

  const [modalAsignarTurno, setModalAsignarTurno] = useState(false);
  const [tipoAsignacionTurno, setTipoAsignacionTurno] =
    useState("PREESTABLECIDO");
  const [horarioGeneralSeleccionado, setHorarioGeneralSeleccionado] =
    useState("");
  const [rangosEspecificos, setRangosEspecificos] = useState([
    { horaDesde: "08:00", horaHasta: "12:00", etiqueta: "Jornada Mañana" },
  ]);
  const [diasEspecificos, setDiasEspecificos] = useState([
    "Lun",
    "Mar",
    "Mié",
    "Jue",
    "Vie",
  ]);
  const [tolIngresoEsp, setTolIngresoEsp] = useState(15);
  const [tolEgresoEsp, setTolEgresoEsp] = useState(10);
  const [tipoFrecuenciaTurno, setTipoFrecuenciaTurno] = useState("SEMANAL");
  const [repeticionesPeriodoTurno, setRepeticionesPeriodoTurno] = useState(1);
  const [semanaAlternaTurno, setSemanaAlternaTurno] = useState("PAR");

  // Estado para la selección manual del empleado dentro del modal cuando la lista está en "Ver Todos"
  const [modalEmpleadoTargetId, setModalEmpleadoTargetId] = useState("");
  const [modalDocenteTargetId, setModalDocenteTargetId] = useState("");

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

  // Cargar catálogos
  useEffect(() => {
    Promise.all([
      getEmpleadosActivos(),
      getCategorias(),
      getHorarios(),
      getMaterias(),
    ]).then(([empRes, catRes, horRes, matRes]) => {
      setEmpleados(Array.isArray(empRes) ? empRes : []);
      const cats = Array.isArray(catRes) ? catRes : [];
      setCategorias(cats);
      setHorariosPreestablecidos(Array.isArray(horRes) ? horRes : []);
      setMaterias(Array.isArray(matRes) ? matRes : []);

      if (cats.length > 0 && !cats.some((c) => c.nombre === categoriaActiva)) {
        setCategoriaActiva(cats[0].nombre);
      }
    });
  }, []);

  // Paginación desde Backend
  const cargarHorariosServidor = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const catObj = categorias.find(
          (c) => c.nombre?.toLowerCase() === categoriaActiva.toLowerCase(),
        );
        const catId = catObj ? catObj.id : null;

        const res = await getHorariosPaginados(
          "",
          catId,
          empleadoSeleccionadoId,
          page,
          ITEMS_POR_PAGINA,
        );

        if (res && res.content) {
          setHorariosPaginados(res.content);
          setTotalPaginas(res.totalPages || 1);
          setTotalElementos(res.totalElements || 0);
          setPaginaActual(res.number + 1);
        } else {
          setHorariosPaginados([]);
        }
      } catch (err) {
        console.error(err);
        setHorariosPaginados([]);
      } finally {
        setLoading(false);
      }
    },
    [categoriaActiva, categorias, empleadoSeleccionadoId],
  );

  useEffect(() => {
    cargarHorariosServidor(paginaActual - 1);
  }, [cargarHorariosServidor, paginaActual]);

  const esVistaDocente = useMemo(() => {
    return categoriaActiva.toLowerCase().includes("docente");
  }, [categoriaActiva]);

  // Lista lateral filtrada por la categoría activa
  const empleadosLateral = useMemo(() => {
    return empleados.filter((emp) => {
      const perteneceCat =
        (emp.categorias || []).some(
          (c) => c.nombre?.toLowerCase() === categoriaActiva.toLowerCase(),
        ) ||
        emp.categoria?.nombre?.toLowerCase() === categoriaActiva.toLowerCase();

      const matchSearch = `${emp.nombre} ${emp.apellido} ${emp.nroLegajo || ""}`
        .toLowerCase()
        .includes(searchEmpleado.toLowerCase());

      return perteneceCat && matchSearch;
    });
  }, [empleados, categoriaActiva, searchEmpleado]);

  // Apertura del Modal Detalle
  const abrirCronograma = async (empId) => {
    const emp = empleados.find((e) => e.id === empId) || { id: empId };
    setEmpleadoEnModal(emp);
    try {
      const [hRes, mRes] = await Promise.all([
        getEmpleadoHorarios(empId),
        getMetricasEmpleado(empId),
      ]);
      setHorariosEmpleadoModal(hRes || []);
      setMetricasEmpleadoModal(mRes);
    } catch {
      setHorariosEmpleadoModal([]);
      setMetricasEmpleadoModal(null);
    }
    setModalDetalle(true);
  };

  // Apertura del Modal Turno
  const abrirTurno = (empId = null) => {
    if (!puedeEditar && !puedeCrear) return;

    if (empId) {
      // Caso 1: Asignación a un empleado específico (click directo o seleccionado en el lateral)
      const emp = empleados.find((e) => e.id === empId) || { id: empId };
      setEmpleadoEnModal(emp);
      setModalEmpleadoTargetId(emp.id);
      setTolIngresoEsp(emp.toleranciaIngresoMin ?? 15);
      setTolEgresoEsp(emp.toleranciaEgresoMin ?? 10);
    } else {
      // Caso 2: Viene desde "Ver Todos", sin selección previa en la barra lateral
      setEmpleadoEnModal(null);
      setModalEmpleadoTargetId("");
      setTolIngresoEsp(15);
      setTolEgresoEsp(10);
    }

    setTipoAsignacionTurno("PREESTABLECIDO");
    setHorarioGeneralSeleccionado(horariosPreestablecidos[0]?.id || "");
    setTipoFrecuenciaTurno("SEMANAL");
    setRepeticionesPeriodoTurno(1);
    setSemanaAlternaTurno("PAR");
    setModalAsignarTurno(true);
  };

  // Apertura del Modal Clase
  const abrirClase = (empId = null) => {
    if (!puedeEditar && !puedeCrear) return;

    if (empId) {
      const emp = empleados.find((e) => e.id === empId) || { id: empId };
      setEmpleadoEnModal(emp);
      setModalDocenteTargetId(emp.id);
    } else {
      setEmpleadoEnModal(null);
      setModalDocenteTargetId("");
    }

    setFormClase(FORM_CLASE_INICIAL);
    setModalAsignarClase(true);
  };

  // Guardar Turno
  const handleGuardarTurno = async (forzar = false) => {
    const esForzado = typeof forzar === "boolean" ? forzar : false;
    if (!puedeEditar && !puedeCrear) return;

    // Determinar qué colaborador recibe el horario
    const targetEmpId = empleadoEnModal?.id || modalEmpleadoTargetId;
    if (!targetEmpId) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe seleccionar un empleado de la lista para asignar el turno.",
      );
      return;
    }

    try {
      if (tipoAsignacionTurno === "PREESTABLECIDO") {
        const plantilla = horariosPreestablecidos.find(
          (h) => h.id === parseInt(horarioGeneralSeleccionado, 10),
        );
        if (!plantilla) {
          mostrarAviso(
            "warning",
            "Atención",
            "Seleccione un turno preestablecido.",
          );
          return;
        }

        const diasArray = plantilla.diasLaborables
          ? plantilla.diasLaborables
              .split(",")
              .map((d) => MAPA_DIAS_NUMERO[d.trim()] || 1)
          : [1, 2, 3, 4, 5];

        await addEmpleadoHorario(targetEmpId, {
          diasSemana: diasArray,
          horaEntrada: plantilla.horaEntrada,
          horaSalida: plantilla.horaEgreso,
          materiaId: null,
          etiqueta: plantilla.nombre,
          aula: null,
          forzarGuardado: esForzado,
          tipoFrecuencia: tipoFrecuenciaTurno,
          repeticionesPeriodo:
            tipoFrecuenciaTurno === "MENSUAL" || tipoFrecuenciaTurno === "ANUAL"
              ? repeticionesPeriodoTurno
              : 1,
          semanaAlterna:
            tipoFrecuenciaTurno === "SEMANA_POR_MEDIO"
              ? semanaAlternaTurno
              : null,
        });
      } else {
        const diasNumericos = diasEspecificos.map(
          (d) => MAPA_DIAS_NUMERO[d] || 1,
        );
        for (const r of rangosEspecificos) {
          await addEmpleadoHorario(targetEmpId, {
            diasSemana: diasNumericos,
            horaEntrada:
              r.horaDesde.length === 5 ? `${r.horaDesde}:00` : r.horaDesde,
            horaSalida:
              r.horaHasta.length === 5 ? `${r.horaHasta}:00` : r.horaHasta,
            materiaId: null,
            etiqueta: r.etiqueta || "Turno Regular",
            aula: null,
            forzarGuardado: esForzado,
            tipoFrecuencia: tipoFrecuenciaTurno,
            repeticionesPeriodo:
              tipoFrecuenciaTurno === "MENSUAL" ||
              tipoFrecuenciaTurno === "ANUAL"
                ? repeticionesPeriodoTurno
                : 1,
            semanaAlterna:
              tipoFrecuenciaTurno === "SEMANA_POR_MEDIO"
                ? semanaAlternaTurno
                : null,
          });
        }
      }

      await cargarHorariosServidor(paginaActual - 1);
      setModalAsignarTurno(false);
      mostrarAviso("success", "Éxito", "Horario registrado correctamente.");
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.includes("SOLAPAMIENTO")) {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Superponer Franjas Horarias?",
          mensaje: `${msg.replace("SOLAPAMIENTO: ", "")} ¿Desea asignarlo de todas formas?`,
          textoConfirmar: "Sí, asignar",
          textoCancelar: "Cancelar",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((p) => ({ ...p, isOpen: false }));
            await handleGuardarTurno(true);
          },
        });
      } else {
        mostrarAviso(
          "danger",
          "Conflicto",
          msg || "No se pudo asignar el turno.",
        );
      }
    }
  };

  // Guardar Clase
  const handleGuardarClase = async (e, forzar = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!puedeEditar && !puedeCrear) return;

    const targetDocenteId = empleadoEnModal?.id || modalDocenteTargetId;
    if (!targetDocenteId) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe seleccionar un docente para asignarle la cátedra.",
      );
      return;
    }

    const dias = formClase.diasSemana || [];
    if (dias.length === 0) {
      mostrarAviso(
        "warning",
        "Atención",
        "Seleccione al menos un día de cursada.",
      );
      return;
    }

    try {
      const diasNumericos = dias.map((d) =>
        typeof d === "number" ? d : MAPA_DIAS_NUMERO[d] || 1,
      );

      const payload = {
        diasSemana: diasNumericos,
        horaEntrada:
          formClase.horaInicio.length === 5
            ? `${formClase.horaInicio}:00`
            : formClase.horaInicio,
        horaSalida:
          formClase.horaFin.length === 5
            ? `${formClase.horaFin}:00`
            : formClase.horaFin,
        materiaId: formClase.materiaId
          ? parseInt(formClase.materiaId, 10)
          : null,
        etiqueta: formClase.materia || "Cátedra",
        aula: formClase.aula || null,
        forzarGuardado: forzar,
        tipoFrecuencia: formClase.tipoFrecuencia || "SEMANAL",
        repeticionesPeriodo:
          formClase.tipoFrecuencia === "MENSUAL" ||
          formClase.tipoFrecuencia === "ANUAL"
            ? formClase.repeticionesPeriodo
            : 1,
        semanaAlterna:
          formClase.tipoFrecuencia === "SEMANA_POR_MEDIO"
            ? formClase.semanaAlterna
            : null,
      };

      await addEmpleadoHorario(targetDocenteId, payload);
      await cargarHorariosServidor(paginaActual - 1);
      setModalAsignarClase(false);
      setFormClase(FORM_CLASE_INICIAL);
      mostrarAviso("success", "Éxito", "Clase asignada al cronograma docente.");
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.includes("SOLAPAMIENTO")) {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Superponer Clase?",
          mensaje: `${msg.replace("SOLAPAMIENTO: ", "")} ¿Desea guardarla de todas formas?`,
          textoConfirmar: "Sí, asignar",
          textoCancelar: "Cancelar",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((p) => ({ ...p, isOpen: false }));
            await handleGuardarClase(null, true);
          },
        });
      } else {
        mostrarAviso(
          "danger",
          "Conflicto",
          msg || "No se pudo asignar la clase.",
        );
      }
    }
  };

  // Eliminar Horario
  const handleEliminarHorario = (hId) => {
    if (!puedeEliminar) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Eliminar Bloque Horario?",
      mensaje: "¿Desea dar de baja esta asignación del cronograma?",
      textoConfirmar: "Sí, eliminar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await removeEmpleadoHorario(hId);
          await cargarHorariosServidor(paginaActual - 1);
          mostrarAviso("success", "Eliminado", "La franja fue dada de baja.");
        } catch {
          mostrarAviso("danger", "Error", "No se pudo eliminar el bloque.");
        }
      },
    });
  };

  const nombreDia = (num) => {
    return DIAS_MAP.find((d) => d.diaNumero === num)?.nombre || `Día ${num}`;
  };

  const renderBadgeFrecuencia = (frec, reps, alterna) => {
    const f = (frec || "SEMANAL").toUpperCase();
    if (f === "SEMANA_POR_MEDIO") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
          <Repeat className="w-3 h-3" /> Sem. {alterna || "PAR"}
        </span>
      );
    }
    if (f === "MENSUAL") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md shrink-0">
          <Repeat className="w-3 h-3" /> {reps || 1} al mes
        </span>
      );
    }
    if (f === "ANUAL") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md shrink-0">
          <Repeat className="w-3 h-3" /> {reps || 1} al año
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-500 font-medium">Semanal</span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Gestión de Horarios, Clases y Excepciones
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Cronograma centralizado por categorías institucionales.
            </p>
          </div>
        </div>

        {/* 2. PESTAÑAS DE CATEGORÍA SUPERIOR */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
          {categorias.map((cat) => {
            const activa =
              categoriaActiva.toLowerCase() === cat.nombre.toLowerCase();
            const esDoc = cat.nombre.toLowerCase().includes("docente");

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoriaActiva(cat.nombre);
                  setEmpleadoSeleccionadoId(null);
                  setPaginaActual(1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activa
                    ? esDoc
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-[#4b35e6] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                {esDoc ? (
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                )}
                {cat.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* DISPARADOR DRAWER PARA MÓVILES */}
      <div className="lg:hidden flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2 truncate">
          <Users className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Filtro {categoriaActiva}:</span>
          <span className="text-slate-500 font-medium truncate">
            {empleadoSeleccionadoId
              ? `${empleados.find((e) => e.id === empleadoSeleccionadoId)?.apellido || ""}, ${empleados.find((e) => e.id === empleadoSeleccionadoId)?.nombre || ""}`
              : "Ver Todos"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarMovilAbierto(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 cursor-pointer shrink-0"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtrar Personal
        </button>
      </div>

      {/* 3. LAYOUT: SIDEBAR + TABLA CENTRAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* BACKDROP MÓVIL */}
        {sidebarMovilAbierto && (
          <div
            onClick={() => setSidebarMovilAbierto(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          />
        )}

        {/* SIDEBAR DE PERSONAL */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 sm:w-80 lg:w-full bg-white border-r lg:border border-slate-200 lg:rounded-2xl shadow-2xl lg:shadow-xs flex flex-col transition-transform duration-300 ease-in-out
            ${sidebarMovilAbierto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Nómina: {categoriaActiva}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {empleadosLateral.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 lg:hidden cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o legajo..."
                value={searchEmpleado}
                onChange={(e) => setSearchEmpleado(e.target.value)}
                className="w-full text-[11px] pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="p-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setEmpleadoSeleccionadoId(null);
                setPaginaActual(1);
                setSidebarMovilAbierto(false);
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                empleadoSeleccionadoId === null
                  ? esVistaDocente
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-[#4b35e6] text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>Ver Todo el Cronograma</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">
                {totalElementos}
              </span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[calc(100vh-220px)] lg:max-h-[580px] overflow-y-auto">
            {empleadosLateral.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Sin colaboradores en {categoriaActiva}
              </div>
            ) : (
              empleadosLateral.map((emp) => {
                const estaSeleccionado = empleadoSeleccionadoId === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setEmpleadoSeleccionadoId(emp.id);
                      setPaginaActual(1);
                      setSidebarMovilAbierto(false);
                    }}
                    className={`w-full p-3 text-left transition flex items-start justify-between cursor-pointer ${
                      estaSeleccionado
                        ? esVistaDocente
                          ? "bg-purple-50 border-l-4 border-purple-600"
                          : "bg-indigo-50 border-l-4 border-indigo-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {emp.apellido}, {emp.nombre}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {(emp.cargos || [])
                          .map((c) => c.nombre || c)
                          .join(", ") || "Personal"}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Activo
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* TABLA PRINCIPAL */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {esVistaDocente ? (
                  <BookOpen className="w-4 h-4 text-purple-600" />
                ) : (
                  <Clock className="w-4 h-4 text-indigo-600" />
                )}
                <span>
                  {empleadoSeleccionadoId
                    ? `Cronograma: ${
                        empleados.find((e) => e.id === empleadoSeleccionadoId)
                          ?.apellido || ""
                      }, ${
                        empleados.find((e) => e.id === empleadoSeleccionadoId)
                          ?.nombre || ""
                      }`
                    : esVistaDocente
                      ? "Cátedras y Comisiones Docentes"
                      : `Turnos Laborales - ${categoriaActiva}`}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Mostrando {horariosPaginados.length} franja(s) de un total de{" "}
                {totalElementos}.
              </p>
            </div>

            {/* BOTÓN ASIGNAR CONTROLADO POR PERMISOS */}
            <div>
              {puedeCrear || puedeEditar ? (
                esVistaDocente ? (
                  <button
                    type="button"
                    onClick={() => abrirClase(empleadoSeleccionadoId)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    {empleadoSeleccionadoId
                      ? "Asignar Clase a Docente"
                      : "Nueva Clase"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirTurno(empleadoSeleccionadoId)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4b35e6] hover:bg-[#3e2bc0] text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    {empleadoSeleccionadoId
                      ? "Asignar Horario al Colaborador"
                      : "Asignar Horario"}
                  </button>
                )
              ) : (
                <span
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold border border-slate-200 cursor-not-allowed select-none"
                  title="Requiere permisos de creación o edición"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Asignación Restringida
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {esVistaDocente ? (
              /* TABLA DOCENTES */
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5 tracking-wider">
                      Docente Titular / Cargo
                    </th>
                    <th className="px-5 py-3.5 tracking-wider">
                      Materia & Cátedra
                    </th>
                    <th className="px-5 py-3.5 tracking-wider">Aula / Sede</th>
                    <th className="px-5 py-3.5 tracking-wider">Día</th>
                    <th className="px-5 py-3.5 tracking-wider">Horario</th>
                    <th className="px-5 py-3.5 tracking-wider">Frecuencia</th>
                    <th className="px-5 py-3.5 tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400"
                      >
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-600 mb-2" />
                        Cargando cátedras...
                      </td>
                    </tr>
                  ) : horariosPaginados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400 text-xs italic"
                      >
                        No hay clases asignadas para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    horariosPaginados.map((h) => (
                      <tr
                        key={h.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {h.apellido}, {h.nombre}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Legajo: {h.nroLegajo || "S/L"} •{" "}
                            {(h.cargos || []).join(", ") || "Docente"}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-bold text-purple-900">
                            {h.materiaNombre || h.etiqueta || "Cátedra"}
                          </div>
                          {h.materiaCodigo && (
                            <span className="inline-block mt-0.5 text-[9px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                              {h.materiaCodigo}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-slate-700 font-medium">
                            {h.aula || "Sede Central"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-block bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            {nombreDia(h.diaSemana)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-purple-700 whitespace-nowrap">
                          {h.horaEntrada?.substring(0, 5)} a{" "}
                          {h.horaSalida?.substring(0, 5)} hs
                        </td>

                        <td className="px-5 py-3.5">
                          {renderBadgeFrecuencia(
                            h.tipoFrecuencia,
                            h.repeticionesPeriodo,
                            h.semanaAlterna,
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 text-slate-400">
                            {/* Ver Cronograma: accesible para lectura */}
                            <button
                              type="button"
                              onClick={() => abrirCronograma(h.empleadoId)}
                              className="p-1 hover:text-purple-600 transition cursor-pointer"
                              title="Ver cronograma completo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Eliminar Bloque: condicionado a PERSONAL_BAJA_REACTIVAR */}
                            {puedeEliminar ? (
                              <button
                                type="button"
                                onClick={() => handleEliminarHorario(h.id)}
                                className="p-1 hover:text-rose-600 transition cursor-pointer"
                                title="Eliminar clase"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span
                                className="p-1 text-slate-200 cursor-not-allowed"
                                title="Requiere permiso de baja/reactivación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              /* TABLA OTROS (ADMINISTRATIVOS, GENERAL, ETC.) */
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5 tracking-wider">
                      Empleado / Legajo
                    </th>
                    <th className="px-5 py-3.5 tracking-wider">Cargo</th>
                    <th className="px-5 py-3.5 tracking-wider">
                      Turno / Esquema
                    </th>
                    <th className="px-5 py-3.5 tracking-wider">
                      Día & Horario
                    </th>
                    <th className="px-5 py-3.5 tracking-wider">Frecuencia</th>
                    <th className="px-5 py-3.5 tracking-wider">Cronograma</th>
                    <th className="px-5 py-3.5 tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400"
                      >
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                        Cargando turnos...
                      </td>
                    </tr>
                  ) : horariosPaginados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400 text-xs italic"
                      >
                        No hay turnos registrados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    horariosPaginados.map((h) => (
                      <tr
                        key={h.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {h.apellido}, {h.nombre}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Legajo: {h.nroLegajo || "S/L"}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-700">
                            {(h.cargos || []).join(", ") || "Personal"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 block">
                            {h.etiqueta || "Turno Regular"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-indigo-700 whitespace-nowrap">
                          {nombreDia(h.diaSemana)}:{" "}
                          {h.horaEntrada?.substring(0, 5)} -{" "}
                          {h.horaSalida?.substring(0, 5)} hs
                        </td>

                        <td className="px-5 py-3.5">
                          {renderBadgeFrecuencia(
                            h.tipoFrecuencia,
                            h.repeticionesPeriodo,
                            h.semanaAlterna,
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => abrirCronograma(h.empleadoId)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Ver cronograma
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 text-slate-400">
                            {/* Editar Turno: condicionado a PERSONAL_EDITAR */}
                            {puedeEditar ? (
                              <button
                                type="button"
                                onClick={() => abrirTurno(h.empleadoId)}
                                className="p-1 hover:text-indigo-600 transition cursor-pointer"
                                title="Editar turno"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>
                            ) : (
                              <span
                                className="p-1 text-slate-200 cursor-not-allowed"
                                title="Requiere permiso PERSONAL_EDITAR"
                              >
                                <Sliders className="w-4 h-4" />
                              </span>
                            )}

                            {/* Eliminar Bloque: condicionado a PERSONAL_BAJA_REACTIVAR */}
                            {puedeEliminar ? (
                              <button
                                type="button"
                                onClick={() => handleEliminarHorario(h.id)}
                                className="p-1 hover:text-rose-600 transition cursor-pointer"
                                title="Eliminar bloque"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span
                                className="p-1 text-slate-200 cursor-not-allowed"
                                title="Requiere permiso PERSONAL_BAJA_REACTIVAR"
                              >
                                <Trash2 className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* 4. CONTROLES DE PAGINACIÓN */}
          <div className="bg-white px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
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
              asignaciones
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                disabled={paginaActual === 1 || loading}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                (num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setPaginaActual(num)}
                    disabled={loading}
                    className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer ${
                      paginaActual === num
                        ? esVistaDocente
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-[#4b35e6] text-white shadow-xs"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {num}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setPaginaActual((p) => Math.min(p + 1, totalPaginas))
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
      </div>

      {/* ========================================================
          MODALES REUTILIZADOS
         ======================================================== */}
      {/* Modal Detalle Cronograma */}
      <ModalDetalleCronograma
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        empleado={empleadoEnModal}
        clases={horariosEmpleadoModal}
        metricas={metricasEmpleadoModal}
        diasMap={DIAS_MAP}
        onOpenAsignarClase={() => {
          setModalDetalle(false);
          abrirClase(empleadoEnModal.id);
        }}
        onEliminarClase={async (hId) => {
          try {
            await removeEmpleadoHorario(hId);
            const [hRes, mRes] = await Promise.all([
              getEmpleadoHorarios(empleadoEnModal.id),
              getMetricasEmpleado(empleadoEnModal.id),
            ]);
            setHorariosEmpleadoModal(hRes || []);
            setMetricasEmpleadoModal(mRes);
            await cargarHorariosServidor(paginaActual - 1);
          } catch {
            mostrarAviso("danger", "Error", "No se pudo eliminar el bloque.");
          }
        }}
        onOpenAsignarTurno={(emp) => {
          setModalDetalle(false);
          abrirTurno(emp.id);
        }}
        puedeEditar={puedeEditar}
      />

      {/* Modal Asignar Clase Docente */}
      <ModalAsignarClase
        isOpen={modalAsignarClase}
        onClose={() => setModalAsignarClase(false)}
        onSubmit={handleGuardarClase}
        formClase={formClase}
        setFormClase={setFormClase}
        empleado={empleadoEnModal}
        docenteSeleccionadoId={modalDocenteTargetId}
        setDocenteSeleccionadoId={setModalDocenteTargetId}
        docentesDisponibles={empleadosLateral}
        materiasActivas={materias}
        onMateriaCreada={(nueva) => setMaterias((prev) => [...prev, nueva])}
      />

      {/* Modal Asignar Turno / Horario con selección condicionada */}
      <ModalAsignarTurno
        isOpen={modalAsignarTurno}
        onClose={() => setModalAsignarTurno(false)}
        onSubmit={handleGuardarTurno}
        empleado={empleadoEnModal}
        empleadoSeleccionadoId={modalEmpleadoTargetId}
        setEmpleadoSeleccionadoId={setModalEmpleadoTargetId}
        empleadosDisponibles={empleadosLateral}
        tipoAsignacionTurno={tipoAsignacionTurno}
        setTipoAsignacionTurno={setTipoAsignacionTurno}
        horarioGeneralSeleccionado={horarioGeneralSeleccionado}
        setHorarioGeneralSeleccionado={setHorarioGeneralSeleccionado}
        horariosActivos={horariosPreestablecidos}
        rangosEspecificos={rangosEspecificos}
        onAgregarRango={() =>
          setRangosEspecificos([
            ...rangosEspecificos,
            { horaDesde: "14:00", horaHasta: "18:00", etiqueta: "Turno Tarde" },
          ])
        }
        onEliminarRango={(idx) =>
          setRangosEspecificos(rangosEspecificos.filter((_, i) => i !== idx))
        }
        onCambiarRango={(idx, campo, valor) => {
          const nuevo = [...rangosEspecificos];
          nuevo[idx][campo] = valor;
          setRangosEspecificos(nuevo);
        }}
        diasEspecificos={diasEspecificos}
        onToggleDiaEspecifico={(diaClave) => {
          if (diasEspecificos.includes(diaClave)) {
            setDiasEspecificos(diasEspecificos.filter((d) => d !== diaClave));
          } else {
            setDiasEspecificos([...diasEspecificos, diaClave]);
          }
        }}
        tolIngresoEsp={tolIngresoEsp}
        setTolIngresoEsp={setTolIngresoEsp}
        tolEgresoEsp={tolEgresoEsp}
        setTolEgresoEsp={setTolEgresoEsp}
        diasMap={DIAS_MAP}
        tipoFrecuencia={tipoFrecuenciaTurno}
        setTipoFrecuencia={setTipoFrecuenciaTurno}
        repeticionesPeriodo={repeticionesPeriodoTurno}
        setRepeticionesPeriodo={setRepeticionesPeriodoTurno}
        semanaAlterna={semanaAlternaTurno}
        setSemanaAlterna={setSemanaAlternaTurno}
      />

      {/* Modal Alerta */}
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
