import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  BookOpen,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getEmpleadosPaginados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  reactivarEmpleado,
  getEmpleadoHorarios,
  addEmpleadoHorario,
  removeEmpleadoHorario,
  getMetricasEmpleado,
  getPersonalResumen,
} from "../services/empleadoService";
import {
  getCategorias,
  getCargos,
  getHorarios,
  getMaterias,
} from "../services/configuracionService";
import { getBadgeColorClasses } from "./TiposConfiguracion";
import ModalAlerta from "../components/comunes/ModalAlerta";

// Modales del módulo de personal
import ModalRegistroEmpleado from "../components/personal/ModalRegistroEmpleado";
import ModalDetalleCronograma from "../components/personal/ModalDetalleCronograma";
import ModalAsignarClase from "../components/personal/ModalAsignarClase";
import ModalAsignarTurno from "../components/personal/ModalAsignarTurno";

const FORM_EMP_INICIAL = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  nroLegajo: "",
  idBiometrico: "",
  categoriasIds: [],
  cargosIds: [],
  toleranciaIngresoMin: 15,
  toleranciaEgresoMin: 10,
};

const FORM_CLASE_INICIAL = {
  materiaId: "",
  materia: "",
  diasSemana: ["Lunes"],
  horaInicio: "18:00",
  horaFin: "21:00",
  aula: "",
};

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

export default function GestionPersonal() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [materias, setMaterias] = useState([]);

  // Paginación y conteos del Servidor
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  // Métricas y franjas unificadas del empleado en consulta
  const [metricasEmpleado, setMetricasEmpleado] = useState(null);
  const [horariosEmpleado, setHorariosEmpleado] = useState([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("TODAS");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  // Estados de modales
  const [modalRegistro, setModalRegistro] = useState(false);
  const [editandoEmpleadoId, setEditandoEmpleadoId] = useState(null);
  const [formEmpleado, setFormEmpleado] = useState(FORM_EMP_INICIAL);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

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

  const [resumenGlobal, setResumenGlobal] = useState({
    totalPersonal: 0,
    totalDocentes: 0,
    totalAdministrativos: 0,
    totalInactivos: 0,
  });

  // 1. Cargar métricas de tarjetas globales
  const cargarResumenGlobal = useCallback(async () => {
    try {
      const data = await getPersonalResumen();
      if (data) setResumenGlobal(data);
    } catch (err) {
      console.error("Error al cargar resumen global:", err);
    }
  }, []);

  // 2. Cargar catálogos maestros
  const cargarCatalogos = useCallback(async () => {
    try {
      const [catRes, carRes, horRes, matRes] = await Promise.all([
        getCategorias(),
        getCargos(),
        getHorarios(),
        getMaterias(),
      ]);
      setCategorias(Array.isArray(catRes) ? catRes : []);
      setCargos(Array.isArray(carRes) ? carRes : []);
      setHorarios(Array.isArray(horRes) ? horRes : []);
      setMaterias(Array.isArray(matRes) ? matRes : []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  }, []);

  // 3. Consulta paginada y filtrada desde el backend
  const cargarEmpleadosServidor = useCallback(
    async (page = 0) => {
      setLoading(true);
      try {
        const catId =
          filterCategoria !== "TODAS"
            ? categorias.find(
                (c) =>
                  c.nombre?.toLowerCase() === filterCategoria.toLowerCase(),
              )?.id
            : null;

        const res = await getEmpleadosPaginados(
          searchTerm,
          catId,
          filterEstado,
          page,
          ITEMS_POR_PAGINA,
        );
        if (res && res.content) {
          setEmpleados(res.content);
          setTotalPaginas(res.totalPages || 1);
          setTotalElementos(res.totalElements || 0);
          setPaginaActual(res.number + 1);
        } else {
          setEmpleados(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        console.error("Error al cargar empleados del servidor:", err);
      } finally {
        setLoading(false);
      }
    },
    [categorias, filterCategoria, filterEstado, searchTerm],
  );

  // Carga inicial
  useEffect(() => {
    cargarCatalogos();
    cargarResumenGlobal();
  }, [cargarCatalogos, cargarResumenGlobal]);

  // Recarga automática y silenciosa al recuperarse la conexión
  useEffect(() => {
    const handleRecuperacion = () => {
      cargarCatalogos();
      cargarResumenGlobal();
      cargarEmpleadosServidor(paginaActual - 1);
    };

    window.addEventListener("conexion:restaurada", handleRecuperacion);
    return () => {
      window.removeEventListener("conexion:restaurada", handleRecuperacion);
    };
  }, [
    cargarCatalogos,
    cargarResumenGlobal,
    cargarEmpleadosServidor,
    paginaActual,
  ]);

  // Sincronización y debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarEmpleadosServidor(paginaActual - 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [cargarEmpleadosServidor, paginaActual]);

  const categoriasActivas = useMemo(
    () => categorias.filter((c) => c.activo !== false),
    [categorias],
  );
  const cargosActivos = useMemo(
    () => cargos.filter((c) => c.activo !== false),
    [cargos],
  );
  const horariosActivos = useMemo(
    () => horarios.filter((h) => h.activo !== false),
    [horarios],
  );
  const materiasActivas = useMemo(
    () => materias.filter((m) => m.activo !== false),
    [materias],
  );

  const cargosFiltradosForm = useMemo(() => {
    const cats = formEmpleado.categoriasIds || [];
    if (cats.length === 0) return cargosActivos;
    return cargosActivos.filter((c) => cats.includes(c.categoria?.id));
  }, [formEmpleado.categoriasIds, cargosActivos]);

  const verificarEmpleadoActivo = (emp, accionPermitida) => {
    if (emp.activo === false) {
      mostrarAviso(
        "warning",
        "Empleado Inactivo",
        `El empleado ${emp.apellido}, ${emp.nombre} se encuentra dado de baja lógica. Debe reactivarlo para modificar sus horarios o asignarle cátedras.`,
      );
      return false;
    }
    accionPermitida();
    return true;
  };

  // --- HANDLERS: EMPLEADOS ---
  const abrirModalCrear = () => {
    setEditandoEmpleadoId(null);
    setFormEmpleado({
      ...FORM_EMP_INICIAL,
      categoriasIds: categoriasActivas[0]?.id ? [categoriasActivas[0].id] : [],
      cargosIds: [],
    });
    setModalRegistro(true);
  };

  const abrirModalEditar = (emp) => {
    setEditandoEmpleadoId(emp.id);
    const catIds = Array.isArray(emp.categorias)
      ? emp.categorias.map((c) => c.id)
      : emp.categoria?.id
        ? [emp.categoria.id]
        : [];

    setFormEmpleado({
      nombre: emp.nombre || "",
      apellido: emp.apellido || "",
      dni: emp.dni || "",
      email: emp.email || "",
      telefono: emp.telefono || "",
      nroLegajo: emp.nroLegajo || "",
      idBiometrico: emp.idBiometrico || "",
      categoriasIds: catIds,
      cargosIds: Array.isArray(emp.cargos) ? emp.cargos.map((c) => c.id) : [],
      rolSistema: emp.rolSistema || "Consulta / Empleado (Visualiza su ficha)",
      toleranciaIngresoMin: emp.toleranciaIngresoMin ?? 15,
      toleranciaEgresoMin: emp.toleranciaEgresoMin ?? 10,
    });
    setModalRegistro(true);
  };

  const handleGuardarEmpleado = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formEmpleado.nombre,
        apellido: formEmpleado.apellido,
        dni: formEmpleado.dni,
        email: formEmpleado.email,
        telefono: formEmpleado.telefono,
        nroLegajo: formEmpleado.nroLegajo,
        idBiometrico: formEmpleado.idBiometrico,
        rolSistema: formEmpleado.rolSistema,
        toleranciaIngresoMin: parseInt(formEmpleado.toleranciaIngresoMin),
        toleranciaEgresoMin: parseInt(formEmpleado.toleranciaEgresoMin),
        categorias: (formEmpleado.categoriasIds || []).map((id) => ({
          id: parseInt(id),
        })),
        cargos: (formEmpleado.cargosIds || []).map((id) => ({
          id: parseInt(id),
        })),
      };

      if (editandoEmpleadoId) {
        await updateEmpleado(editandoEmpleadoId, payload);
        mostrarAviso(
          "success",
          "Empleado Actualizado",
          "Los datos se modificaron correctamente.",
        );
      } else {
        await createEmpleado(payload);
        mostrarAviso(
          "success",
          "Empleado Registrado",
          "El nuevo empleado fue dado de alta.",
        );
      }

      await cargarEmpleadosServidor(paginaActual - 1);
      cargarResumenGlobal();
      setModalRegistro(false);
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        "No se pudo registrar el empleado. Verifique que DNI, Legajo o ID Biométrico no existan previamente.",
      );
    }
  };

  const handleEliminarEmpleado = (id, nombre) => {
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja empleado?",
      mensaje: `¿Desea dar de baja lógica al empleado ${nombre}? Podrá reactivarlo en cualquier momento.`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteEmpleado(id);
          await cargarEmpleadosServidor(paginaActual - 1);
          cargarResumenGlobal();
          mostrarAviso(
            "success",
            "Baja Exitosa",
            `El empleado ${nombre} fue dado de baja.`,
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            "No se pudo dar de baja al empleado.",
          );
        }
      },
    });
  };

  const handleReactivarEmpleado = (id, nombre) => {
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar empleado?",
      mensaje: `¿Desea reactivar a ${nombre} en el padrón activo?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarEmpleado(id);
          await cargarEmpleadosServidor(paginaActual - 1);
          cargarResumenGlobal();
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            `El empleado ${nombre} está activo nuevamente.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar al empleado.");
        }
      },
    });
  };

  // --- CRONOGRAMA & HORARIOS UNIFICADOS ---
  const handleVerDetalle = async (emp) => {
    setEmpleadoSeleccionado(emp);
    try {
      const [horariosRes, metricasRes] = await Promise.all([
        getEmpleadoHorarios(emp.id),
        getMetricasEmpleado(emp.id),
      ]);
      setHorariosEmpleado(horariosRes || []);
      setMetricasEmpleado(metricasRes);
    } catch (err) {
      console.error("Error al cargar cronograma:", err);
      setHorariosEmpleado([]);
      setMetricasEmpleado(null);
    }
    setModalDetalle(true);
  };

  const handleAbrirAsignarClase = (diaPreseleccionado = null) => {
    setFormClase({
      ...FORM_CLASE_INICIAL,
      diasSemana: diaPreseleccionado ? [diaPreseleccionado] : ["Lunes"],
    });
    setModalAsignarClase(true);
  };

  const handleGuardarClase = async (e, forzar = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!empleadoSeleccionado) return;

    const dias = formClase.diasSemana || [];
    if (dias.length === 0) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe seleccionar al menos un día de cursada.",
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
        materiaId: formClase.materiaId ? parseInt(formClase.materiaId) : null,
        etiqueta: formClase.materia || "Cátedra",
        aula: formClase.aula || null,
        forzarGuardado: forzar,
      };

      await addEmpleadoHorario(empleadoSeleccionado.id, payload);

      const [horariosActualizados, metricasActualizadas] = await Promise.all([
        getEmpleadoHorarios(empleadoSeleccionado.id),
        getMetricasEmpleado(empleadoSeleccionado.id),
      ]);

      setHorariosEmpleado(horariosActualizados);
      setMetricasEmpleado(metricasActualizadas);
      setModalAsignarClase(false);
      setFormClase(FORM_CLASE_INICIAL);
      await cargarEmpleadosServidor(paginaActual - 1);
      mostrarAviso(
        "success",
        "Clases Asignadas",
        "Las cátedras fueron agregadas con éxito.",
      );
    } catch (err) {
      const mensaje = err.response?.data?.message || "";

      if (mensaje.includes("SOLAPAMIENTO")) {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Superponer Horario?",
          mensaje: `${mensaje.replace("SOLAPAMIENTO: ", "")} ¿Desea guardarlo de todas formas?`,
          textoConfirmar: "Sí, asignar igual",
          textoCancelar: "Corregir horario",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((prev) => ({ ...prev, isOpen: false }));
            await handleGuardarClase(null, true);
          },
        });
      } else {
        mostrarAviso(
          "danger",
          "Error",
          mensaje || "No se pudo asignar el bloque horario.",
        );
      }
    }
  };

  const handleEliminarHorario = async (horarioId) => {
    try {
      await removeEmpleadoHorario(horarioId);
      const [horariosActualizados, metricasActualizadas] = await Promise.all([
        getEmpleadoHorarios(empleadoSeleccionado.id),
        getMetricasEmpleado(empleadoSeleccionado.id),
      ]);
      setHorariosEmpleado(horariosActualizados);
      setMetricasEmpleado(metricasActualizadas);
      await cargarEmpleadosServidor(paginaActual - 1);
      mostrarAviso(
        "success",
        "Horario Eliminado",
        "La franja horaria fue dada de baja.",
      );
    } catch (err) {
      mostrarAviso("danger", "Error", "No se pudo eliminar el bloque horario.");
    }
  };

  // --- ASIGNACIÓN DE TURNO ---
  const abrirModalTurno = (emp) => {
    setEmpleadoSeleccionado(emp);
    setTipoAsignacionTurno("PREESTABLECIDO");
    setHorarioGeneralSeleccionado(horariosActivos[0]?.id || "");
    setTolIngresoEsp(emp.toleranciaIngresoMin ?? 15);
    setTolEgresoEsp(emp.toleranciaEgresoMin ?? 10);
    setModalAsignarTurno(true);
  };

  const handleGuardarTurno = async (forzar = false) => {
    const esForzado = typeof forzar === "boolean" ? forzar : false;
    if (!empleadoSeleccionado) return;

    try {
      if (tipoAsignacionTurno === "PREESTABLECIDO") {
        const plantilla = horarios.find(
          (h) => h.id === parseInt(horarioGeneralSeleccionado),
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

        await addEmpleadoHorario(empleadoSeleccionado.id, {
          diasSemana: diasArray,
          horaEntrada: plantilla.horaEntrada,
          horaSalida: plantilla.horaEgreso,
          materiaId: null,
          etiqueta: plantilla.nombre,
          aula: null,
          forzarGuardado: esForzado,
        });
      } else {
        const diasNumericos = diasEspecificos.map(
          (d) => MAPA_DIAS_NUMERO[d] || 1,
        );

        for (const r of rangosEspecificos) {
          await addEmpleadoHorario(empleadoSeleccionado.id, {
            diasSemana: diasNumericos,
            horaEntrada:
              r.horaDesde.length === 5 ? `${r.horaDesde}:00` : r.horaDesde,
            horaSalida:
              r.horaHasta.length === 5 ? `${r.horaHasta}:00` : r.horaHasta,
            materiaId: null,
            etiqueta: r.etiqueta || "Turno Específico",
            aula: null,
            forzarGuardado: esForzado,
          });
        }
      }

      const [horariosActualizados, metricasActualizadas] = await Promise.all([
        getEmpleadoHorarios(empleadoSeleccionado.id),
        getMetricasEmpleado(empleadoSeleccionado.id),
      ]);
      setHorariosEmpleado(horariosActualizados);
      setMetricasEmpleado(metricasActualizadas);
      await cargarEmpleadosServidor(paginaActual - 1);
      setModalAsignarTurno(false);
      mostrarAviso(
        "success",
        "Turno Asignado",
        "Se generaron las franjas horarias del empleado.",
      );
    } catch (err) {
      const mensaje = err.response?.data?.message || "";
      if (mensaje.includes("SOLAPAMIENTO")) {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Superponer Franjas Horarias?",
          mensaje: `${mensaje.replace("SOLAPAMIENTO: ", "")} ¿Desea asignar este turno de todas formas?`,
          textoConfirmar: "Sí, asignar igual",
          textoCancelar: "Revisar horario",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((prev) => ({ ...prev, isOpen: false }));
            await handleGuardarTurno(true);
          },
        });
      } else {
        mostrarAviso(
          "danger",
          "Conflicto",
          mensaje || "No se pudo asignar el turno.",
        );
      }
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <Users className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestión de Personal & Carga Horaria
            </h1>
            <p className="text-xs text-slate-500">
              Padrón de empleados, carga horaria semanal y acceso al cronograma
              detallado por empleado.
            </p>
          </div>
        </div>

        <button
          onClick={abrirModalCrear}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Registrar Empleado
        </button>
      </div>

      {/* 2. TARJETAS DE CANTIDADES GLOBALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* TOTAL PERSONAL */}
        <button
          type="button"
          onClick={() => {
            setFilterEstado("TODOS");
            setFilterCategoria("TODAS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterEstado === "TODOS" && filterCategoria === "TODAS"
              ? "bg-slate-50/90 border-slate-700 ring-4 ring-slate-400/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between w-full text-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Total Personal
            </span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.totalPersonal}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Todos los registrados
            </div>
          </div>
        </button>

        {/* DOCENTES */}
        <button
          type="button"
          onClick={() => {
            setFilterCategoria("Docentes");
            setFilterEstado("ACTIVOS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterCategoria.toLowerCase().includes("docente")
              ? "bg-purple-50/80 border-purple-500 ring-4 ring-purple-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Docentes
            </span>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.totalDocentes}
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">
              Con perfil docente
            </div>
          </div>
        </button>

        {/* ADMINISTRATIVOS */}
        <button
          type="button"
          onClick={() => {
            const catAdmin = categorias.find((c) =>
              c.nombre?.toLowerCase().includes("administrativ"),
            )?.nombre;
            setFilterCategoria(catAdmin || "TODAS");
            setFilterEstado("ACTIVOS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterEstado === "ACTIVOS" &&
            filterCategoria.toLowerCase().includes("administrativ")
              ? "bg-indigo-50/80 border-indigo-500 ring-4 ring-indigo-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-indigo-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Administrativos
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.totalAdministrativos}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              Personal no docente
            </div>
          </div>
        </button>

        {/* BAJAS LÓGICAS */}
        <button
          type="button"
          onClick={() => {
            setFilterEstado("INACTIVOS");
            setFilterCategoria("TODAS");
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterEstado === "INACTIVOS"
              ? "bg-rose-50/80 border-rose-500 ring-4 ring-rose-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-rose-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Bajas Lógicas
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {resumenGlobal.totalInactivos}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              Inactivos
            </div>
          </div>
        </button>
      </div>

      {/* 3. FILTROS */}
      <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por empleado, DNI, legajo o cargo..."
            className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={filterCategoria}
            onChange={(e) => {
              setFilterCategoria(e.target.value);
              setPaginaActual(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500 font-medium"
          >
            <option value="TODAS">Todas Las Categorías</option>
            {categoriasActivas.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={(e) => {
              setFilterEstado(e.target.value);
              setPaginaActual(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white font-semibold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Bajas</option>
          </select>
        </div>
      </div>

      {/* 4. TABLA DE EMPLEADOS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
            <tr>
              <th className="px-6 py-3.5 tracking-wider">Empleado</th>
              <th className="px-6 py-3.5 tracking-wider">Categoría & Cargo</th>
              <th className="px-6 py-3.5 tracking-wider">
                Cronograma & Horarios
              </th>
              <th className="px-6 py-3.5 tracking-wider">Estado</th>
              <th className="px-6 py-3.5 tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                  Cargando nómina de empleados...
                </td>
              </tr>
            ) : empleados.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-slate-400 text-xs italic"
                >
                  No se encontraron empleados con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              empleados.map((emp) => {
                const esDocente =
                  (emp.categorias || []).some((c) =>
                    (c.codigoTag || c.nombre || "")
                      .toLowerCase()
                      .includes("docente"),
                  ) ||
                  (emp.categoria?.codigoTag || "")
                    .toLowerCase()
                    .includes("docente");

                const categoriasList =
                  emp.categorias && emp.categorias.length > 0
                    ? emp.categorias
                    : emp.categoria
                      ? [emp.categoria]
                      : [];

                return (
                  <tr
                    key={emp.id}
                    className={`transition-colors ${
                      emp.activo === false
                        ? "bg-slate-50/60 opacity-80"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {emp.apellido}, {emp.nombre}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        DNI: {emp.dni} •{" "}
                        <span className="font-mono text-slate-700">
                          {emp.nroLegajo}
                        </span>
                      </div>
                      {emp.email && (
                        <div className="text-[10px] text-slate-400">
                          {emp.email}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {categoriasList.length > 0 ? (
                          categoriasList.map((cat) => (
                            <span
                              key={cat.id}
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getBadgeColorClasses(
                                cat.colorIdentificacion,
                              )}`}
                            >
                              {cat.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-50 text-slate-600 border-slate-200">
                            GENERAL
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {emp.cargos && emp.cargos.length > 0 ? (
                          emp.cargos.map((cg) => (
                            <span
                              key={cg.id}
                              className="bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium px-2 py-0.5 rounded-md"
                            >
                              {cg.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Sin cargos asignados
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleVerDetalle(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Ver cronograma
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          emp.activo !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.activo !== false
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        ></span>
                        {emp.activo !== false ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button
                          onClick={() => handleVerDetalle(emp)}
                          className="p-1 hover:text-indigo-600 transition cursor-pointer"
                          title="Ver Cronograma y Ficha"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            verificarEmpleadoActivo(emp, () =>
                              abrirModalTurno(emp),
                            )
                          }
                          className={`p-1 transition ${
                            emp.activo === false
                              ? "opacity-30 cursor-not-allowed hover:text-slate-400"
                              : "hover:text-indigo-600 cursor-pointer"
                          }`}
                          title={
                            emp.activo === false
                              ? "Empleado inactivo"
                              : "Asignar Horario / Turno"
                          }
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        {esDocente && (
                          <button
                            onClick={() =>
                              verificarEmpleadoActivo(emp, () => {
                                setEmpleadoSeleccionado(emp);
                                handleAbrirAsignarClase();
                              })
                            }
                            className={`p-1 transition ${
                              emp.activo === false
                                ? "opacity-30 cursor-not-allowed hover:text-slate-400"
                                : "hover:text-purple-600 cursor-pointer"
                            }`}
                            title={
                              emp.activo === false
                                ? "Empleado inactivo"
                                : "Asignar Cátedra a Docente"
                            }
                          >
                            <Plus className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                          </button>
                        )}

                        <button
                          onClick={() =>
                            verificarEmpleadoActivo(emp, () =>
                              abrirModalEditar(emp),
                            )
                          }
                          className={`p-1 transition ${
                            emp.activo === false
                              ? "opacity-30 cursor-not-allowed hover:text-slate-400"
                              : "hover:text-indigo-600 cursor-pointer"
                          }`}
                          title="Editar Empleado"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {emp.activo !== false ? (
                          <button
                            onClick={() =>
                              handleEliminarEmpleado(
                                emp.id,
                                `${emp.nombre} ${emp.apellido}`,
                              )
                            }
                            className="p-1 hover:text-rose-600 transition cursor-pointer"
                            title="Dar de baja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleReactivarEmpleado(
                                emp.id,
                                `${emp.nombre} ${emp.apellido}`,
                              )
                            }
                            className="p-1 hover:text-emerald-600 transition cursor-pointer"
                            title="Reactivar Empleado"
                          >
                            <RotateCcw className="w-4 h-4 text-emerald-600" />
                          </button>
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
            empleados
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

      {/* RENDERIZADO DE MODALES */}
      <ModalRegistroEmpleado
        isOpen={modalRegistro}
        onClose={() => setModalRegistro(false)}
        onSubmit={handleGuardarEmpleado}
        formEmpleado={formEmpleado}
        setFormEmpleado={setFormEmpleado}
        editandoEmpleadoId={editandoEmpleadoId}
        categoriasActivas={categoriasActivas}
        cargosFiltradosForm={cargosFiltradosForm}
      />

      <ModalDetalleCronograma
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        empleado={empleadoSeleccionado}
        clases={horariosEmpleado}
        metricas={metricasEmpleado}
        diasMap={DIAS_MAP}
        diasEspecificos={diasEspecificos}
        rangosEspecificos={rangosEspecificos}
        onOpenAsignarClase={(dia) =>
          verificarEmpleadoActivo(empleadoSeleccionado, () =>
            handleAbrirAsignarClase(dia),
          )
        }
        onEliminarClase={(horarioId) =>
          verificarEmpleadoActivo(empleadoSeleccionado, () =>
            handleEliminarHorario(horarioId),
          )
        }
        onOpenAsignarTurno={(emp) =>
          verificarEmpleadoActivo(emp, () => abrirModalTurno(emp))
        }
      />

      <ModalAsignarClase
        isOpen={modalAsignarClase}
        onClose={() => setModalAsignarClase(false)}
        onSubmit={handleGuardarClase}
        formClase={formClase}
        setFormClase={setFormClase}
        empleado={empleadoSeleccionado}
        materiasActivas={materiasActivas}
        onMateriaCreada={(nueva) => setMaterias((prev) => [...prev, nueva])}
      />

      <ModalAsignarTurno
        isOpen={modalAsignarTurno}
        onClose={() => setModalAsignarTurno(false)}
        onSubmit={handleGuardarTurno}
        empleado={empleadoSeleccionado}
        tipoAsignacionTurno={tipoAsignacionTurno}
        setTipoAsignacionTurno={setTipoAsignacionTurno}
        horarioGeneralSeleccionado={horarioGeneralSeleccionado}
        setHorarioGeneralSeleccionado={setHorarioGeneralSeleccionado}
        horariosActivos={horariosActivos}
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
        onCancelar={() =>
          setModalAlerta((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
