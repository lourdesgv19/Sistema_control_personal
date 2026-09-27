import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  BookOpen,
  Clock,
  Sliders,
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
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  reactivarEmpleado,
  getEmpleadoClases,
  getMetricasEmpleado,
  addEmpleadoClasesMultiples,
  removeEmpleadoClase,
} from "../services/empleadoService";
import {
  getCategorias,
  getCargos,
  getHorarios,
  getMaterias,
} from "../services/configuracionService";
import { getBadgeColorClasses } from "./TiposConfiguracion";
import ModalAlerta from "../components/comunes/ModalAlerta";

// Componentes modales extraídos
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
  rolSistema: "Consulta / Empleado (Visualiza su ficha)",
  tipoRegimenHorario: "SIN_HORARIO",
  horarioGeneralId: "",
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
  { clave: "Lun", nombre: "Lunes" },
  { clave: "Mar", nombre: "Martes" },
  { clave: "Mié", nombre: "Miércoles" },
  { clave: "Jue", nombre: "Jueves" },
  { clave: "Vie", nombre: "Viernes" },
  { clave: "Sáb", nombre: "Sábado" },
  { clave: "Dom", nombre: "Domingo" },
];

const ITEMS_POR_PAGINA = 15;

export default function GestionPersonal() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [metricasEmpleado, setMetricasEmpleado] = useState(null);
  const [materias, setMaterias] = useState([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegimen, setFilterRegimen] = useState("TODOS");
  const [filterCategoria, setFilterCategoria] = useState("TODAS");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [paginaActual, setPaginaActual] = useState(1);

  // Estados de modales
  const [modalRegistro, setModalRegistro] = useState(false);
  const [editandoEmpleadoId, setEditandoEmpleadoId] = useState(null);
  const [formEmpleado, setFormEmpleado] = useState(FORM_EMP_INICIAL);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [clasesEmpleado, setClasesEmpleado] = useState([]);

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

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [empRes, catRes, carRes, horRes, matRes] = await Promise.all([
        getEmpleados(),
        getCategorias(),
        getCargos(),
        getHorarios(),
        getMaterias(),
      ]);
      setEmpleados(Array.isArray(empRes) ? empRes : []);
      setCategorias(Array.isArray(catRes) ? catRes : []);
      setCargos(Array.isArray(carRes) ? carRes : []);
      setHorarios(Array.isArray(horRes) ? horRes : []);
      setMaterias(Array.isArray(matRes) ? matRes : []);
    } catch (err) {
      console.error(err);
      mostrarAviso(
        "danger",
        "Error de Carga",
        "No se pudieron obtener los datos del servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filterRegimen, filterCategoria, filterEstado]);

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

  const stats = useMemo(() => {
    const total = empleados.length;
    const porClases = empleados.filter(
      (e) => e.tipoRegimenHorario === "POR_CLASES",
    ).length;
    const turnoFijo = empleados.filter(
      (e) => e.tipoRegimenHorario === "PREESTABLECIDO",
    ).length;
    const especifico = empleados.filter(
      (e) => e.tipoRegimenHorario === "ESPECIFICO",
    ).length;
    const sinHorario = empleados.filter(
      (e) => !e.tipoRegimenHorario || e.tipoRegimenHorario === "SIN_HORARIO",
    ).length;
    return { total, porClases, turnoFijo, especifico, sinHorario };
  }, [empleados]);

  const filteredEmpleados = useMemo(() => {
    return empleados.filter((e) => {
      const matchEstado =
        filterEstado === "TODOS" ||
        (filterEstado === "ACTIVOS" && e.activo !== false) ||
        (filterEstado === "INACTIVOS" && e.activo === false);

      const query = searchTerm.toLowerCase();
      const matchSearch =
        e.nombre.toLowerCase().includes(query) ||
        e.apellido.toLowerCase().includes(query) ||
        e.dni.toLowerCase().includes(query) ||
        e.nroLegajo.toLowerCase().includes(query) ||
        (e.cargos || []).some((c) => c.nombre.toLowerCase().includes(query));

      const matchRegimen =
        filterRegimen === "TODOS" ||
        (filterRegimen === "SIN_HORARIO"
          ? !e.tipoRegimenHorario || e.tipoRegimenHorario === "SIN_HORARIO"
          : e.tipoRegimenHorario === filterRegimen);

      const matchCat =
        filterCategoria === "TODAS" ||
        (e.categorias || []).some(
          (c) => c.nombre?.toLowerCase() === filterCategoria.toLowerCase(),
        ) ||
        (e.categoria?.nombre || "").toLowerCase() ===
          filterCategoria.toLowerCase();

      return matchEstado && matchSearch && matchRegimen && matchCat;
    });
  }, [empleados, searchTerm, filterRegimen, filterCategoria, filterEstado]);

  const totalPaginas =
    Math.ceil(filteredEmpleados.length / ITEMS_POR_PAGINA) || 1;
  const empleadosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return filteredEmpleados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [filteredEmpleados, paginaActual]);

  const verificarEmpleadoActivo = (emp, accionPermitida) => {
    if (emp.activo === false) {
      mostrarAviso(
        "warning",
        "Empleado Inactivo",
        `El empleado ${emp.apellido}, ${emp.nombre} se encuentra dado de baja lógica. Debe reactivarlo en el sistema para poder modificar sus horarios o asignarle cátedras.`,
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
      horarioGeneralId: horariosActivos[0]?.id || "",
    });
    setModalRegistro(true);
  };

  const abrirModalEditar = (emp) => {
    setEditandoEmpleadoId(emp.id);
    let catIds = [];
    if (Array.isArray(emp.categorias)) {
      catIds = emp.categorias.map((c) => c.id);
    } else if (emp.categoria?.id) {
      catIds = [emp.categoria.id];
    }

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
      tipoRegimenHorario: emp.tipoRegimenHorario || "SIN_HORARIO",
      horarioGeneralId: emp.horarioGeneral?.id || "",
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
        tipoRegimenHorario: formEmpleado.horarioGeneralId
          ? "PREESTABLECIDO"
          : formEmpleado.tipoRegimenHorario,
        toleranciaIngresoMin: parseInt(formEmpleado.toleranciaIngresoMin),
        toleranciaEgresoMin: parseInt(formEmpleado.toleranciaEgresoMin),
        categorias: (formEmpleado.categoriasIds || []).map((id) => ({
          id: parseInt(id),
        })),
        cargos: (formEmpleado.cargosIds || []).map((id) => ({
          id: parseInt(id),
        })),
        horarioGeneral: formEmpleado.horarioGeneralId
          ? { id: parseInt(formEmpleado.horarioGeneralId) }
          : null,
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

      await cargarDatos();
      setModalRegistro(false);
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        "No se pudo registrar el empleado. Verifique DNI, Legajo o ID Biométrico.",
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
          await cargarDatos();
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
          await cargarDatos();
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

  // --- CRONOGRAMA & CLASES ---
  const handleVerDetalle = async (emp) => {
    setEmpleadoSeleccionado(emp);
    try {
      const [clases, metricas] = await Promise.all([
        getEmpleadoClases(emp.id),
        getMetricasEmpleado(emp.id),
      ]);
      setClasesEmpleado(clases || []);
      setMetricasEmpleado(metricas);
    } catch (err) {
      setClasesEmpleado([]);
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

  const handleGuardarClase = async (e) => {
    e.preventDefault();
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

    const horaIniStr =
      formClase.horaInicio.length === 5
        ? `${formClase.horaInicio}:00`
        : formClase.horaInicio;
    const horaFinStr =
      formClase.horaFin.length === 5
        ? `${formClase.horaFin}:00`
        : formClase.horaFin;

    // Validación preventiva de sobreposición
    for (const dia of dias) {
      const claseConflicto = clasesEmpleado.find((c) => {
        if (!c.diaSemana || c.diaSemana.toLowerCase() !== dia.toLowerCase())
          return false;
        const iniExist = c.horaInicio.substring(0, 5);
        const finExist = c.horaFin.substring(0, 5);
        const iniNueva = formClase.horaInicio.substring(0, 5);
        const finNueva = formClase.horaFin.substring(0, 5);
        return iniNueva < finExist && finNueva > iniExist;
      });

      if (claseConflicto) {
        mostrarAviso(
          "danger",
          "Conflicto de Horario",
          `El día ${dia} ya tiene asignada la materia "${claseConflicto.materia}" de ${claseConflicto.horaInicio.substring(0, 5)} a ${claseConflicto.horaFin.substring(0, 5)} hs.`,
        );
        return;
      }
    }

    try {
      const payload = {
        materiaId: formClase.materiaId,
        materia: formClase.materia,
        diasSemana: dias,
        horaInicio: horaIniStr,
        horaFin: horaFinStr,
        aula: formClase.aula,
      };

      await addEmpleadoClasesMultiples(empleadoSeleccionado.id, payload);

      const [clasesActualizadas, metricasActualizadas] = await Promise.all([
        getEmpleadoClases(empleadoSeleccionado.id),
        getMetricasEmpleado(empleadoSeleccionado.id),
      ]);

      setClasesEmpleado(clasesActualizadas);
      setMetricasEmpleado(metricasActualizadas);
      setModalAsignarClase(false);
      setFormClase(FORM_CLASE_INICIAL);
      await cargarDatos();
      mostrarAviso(
        "success",
        "Clases Asignadas",
        "Las cátedras fueron agregadas sin conflictos.",
      );
    } catch (err) {
      const mensaje =
        err.response?.data?.message ||
        "No se pudo asignar la clase por conflicto de horario.";
      mostrarAviso("danger", "Error de Asignación", mensaje);
    }
  };

  const handleEliminarClase = async (claseId) => {
    if (!claseId) {
      mostrarAviso("danger", "Error", "ID de clase no válido.");
      return;
    }

    try {
      await removeEmpleadoClase(claseId);
      // Refrescar las clases y métricas del empleado abierto
      const [clasesActualizadas, metricasActualizadas] = await Promise.all([
        getEmpleadoClases(empleadoSeleccionado.id),
        getMetricasEmpleado(empleadoSeleccionado.id),
      ]);

      setClasesEmpleado(clasesActualizadas || []);
      setMetricasEmpleado(metricasActualizadas);

      // Refrescar la tabla general de empleados
      await cargarDatos();
      mostrarAviso(
        "success",
        "Clase Eliminada",
        "La clase fue dada de baja del cronograma.",
      );
    } catch (err) {
      console.error("Error al eliminar la clase:", err);
      const mensaje =
        err.response?.data?.message ||
        "No se pudo quitar la clase del servidor.";
      mostrarAviso("danger", "Error", mensaje);
    }
  };

  // --- ASIGNACIÓN DE TURNO ---
  const abrirModalTurno = (emp) => {
    setEmpleadoSeleccionado(emp);
    setTipoAsignacionTurno(
      emp.tipoRegimenHorario === "ESPECIFICO" ? "ESPECIFICO" : "PREESTABLECIDO",
    );
    setHorarioGeneralSeleccionado(
      emp.horarioGeneral?.id || horariosActivos[0]?.id || "",
    );
    setTolIngresoEsp(emp.toleranciaIngresoMin ?? 15);
    setTolEgresoEsp(emp.toleranciaEgresoMin ?? 10);
    setModalAsignarTurno(true);
  };

  const handleGuardarTurno = async () => {
    if (!empleadoSeleccionado) return;
    try {
      const payload = {
        ...empleadoSeleccionado,
        tipoRegimenHorario: tipoAsignacionTurno,
        horarioGeneral:
          tipoAsignacionTurno === "PREESTABLECIDO"
            ? { id: parseInt(horarioGeneralSeleccionado) }
            : null,
        toleranciaIngresoMin: parseInt(tolIngresoEsp),
        toleranciaEgresoMin: parseInt(tolEgresoEsp),
        rangosHorario:
          tipoAsignacionTurno === "ESPECIFICO"
            ? rangosEspecificos.map((r) => ({
                horaDesde:
                  r.horaDesde.length === 5 ? `${r.horaDesde}:00` : r.horaDesde,
                horaHasta:
                  r.horaHasta.length === 5 ? `${r.horaHasta}:00` : r.horaHasta,
                etiqueta: r.etiqueta || "Turno Específico",
                diasAplicables: diasEspecificos.join(","),
              }))
            : [],
      };

      await updateEmpleado(empleadoSeleccionado.id, payload);
      await cargarDatos();
      setModalAsignarTurno(false);
      mostrarAviso(
        "success",
        "Turno Asignado",
        "Se actualizó el régimen laboral del empleado.",
      );
    } catch (err) {
      console.error(err);
      mostrarAviso("danger", "Error", "No se pudo asignar el horario.");
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Registrar Empleado
        </button>
      </div>

      {/* 2. TARJETAS DE CANTIDADES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setFilterRegimen("TODOS")}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterRegimen === "TODOS"
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
              {stats.total}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Todos los empleados
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRegimen("POR_CLASES")}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterRegimen === "POR_CLASES"
              ? "bg-purple-50/80 border-purple-500 ring-4 ring-purple-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Por Clases
            </span>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {stats.porClases}
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">
              Docentes con cátedras
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRegimen("PREESTABLECIDO")}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterRegimen === "PREESTABLECIDO"
              ? "bg-indigo-50/80 border-indigo-500 ring-4 ring-indigo-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-indigo-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Turno Fijo
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {stats.turnoFijo}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              Preestablecido general
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRegimen("ESPECIFICO")}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterRegimen === "ESPECIFICO"
              ? "bg-blue-50/80 border-blue-500 ring-4 ring-blue-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-blue-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Específico
            </span>
            <Sliders className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {stats.especifico}
            </div>
            <div className="text-[10px] text-blue-600 font-medium mt-0.5">
              Rangos personalizados
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRegimen("SIN_HORARIO")}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterRegimen === "SIN_HORARIO"
              ? "bg-amber-50/80 border-amber-500 ring-4 ring-amber-500/20 shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
          }`}
        >
          <div className="flex items-center justify-between w-full text-amber-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Sin Horario
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {stats.sinHorario}
            </div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
              Pendientes de asignar
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
            value={filterRegimen}
            onChange={(e) => setFilterRegimen(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-500 font-medium"
          >
            <option value="TODOS">Todos los regímenes de horario</option>
            <option value="POR_CLASES">Docente por Cátedras</option>
            <option value="PREESTABLECIDO">Turno Preestablecido</option>
            <option value="ESPECIFICO">Rango Específico</option>
            <option value="SIN_HORARIO">Sin Horario Asignado</option>
          </select>

          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
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
            onChange={(e) => setFilterEstado(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white font-semibold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="ACTIVOS">Solo Activos</option>
            <option value="TODOS">Todos los estados</option>
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
                Carga Semanal & Horario
              </th>
              <th className="px-6 py-3.5 tracking-wider">Estado</th>
              <th className="px-6 py-3.5 tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {empleadosPaginados.length > 0 ? (
              empleadosPaginados.map((emp) => {
                const esDocente =
                  (emp.categorias || []).some((c) =>
                    (c.codigoTag || c.nombre || "")
                      .toLowerCase()
                      .includes("docente"),
                  ) ||
                  (emp.categoria?.codigoTag || "")
                    .toLowerCase()
                    .includes("docente");

                const horarioNombre = emp.horarioGeneral
                  ? emp.horarioGeneral.nombre
                  : null;

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
                        Ver detalle
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
                        {/* Ver Detalle / Cronograma (Siempre accesible para consulta histórica) */}
                        <button
                          onClick={() => handleVerDetalle(emp)}
                          className="p-1 hover:text-indigo-600 transition"
                          title="Ver Cronograma y Ficha"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Asignar Turno / Horario (Bloqueado si está inactivo) */}
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
                              ? "Empleado inactivo: Reactívelo para asignar turnos"
                              : "Asignar Turno / Horario"
                          }
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        {/* Asignar Clase a Docente (Bloqueado si está inactivo) */}
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
                                ? "Empleado inactivo: Reactívelo para asignar clases"
                                : "Asignar Clase a Docente"
                            }
                          >
                            <Plus className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                          </button>
                        )}

                        {/* Editar Empleado (Bloqueado si está inactivo) */}
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
                          title={
                            emp.activo === false
                              ? "Empleado inactivo: Reactívelo para editar sus datos"
                              : "Editar Empleado"
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Alta / Baja Lógica */}
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
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-slate-400 text-xs"
                >
                  No se encontraron empleados con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 5. PAGINACIÓN */}
        <div className="bg-white px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Mostrando{" "}
            <span className="font-bold text-slate-800">
              {filteredEmpleados.length === 0
                ? 0
                : (paginaActual - 1) * ITEMS_POR_PAGINA + 1}
            </span>{" "}
            a{" "}
            <span className="font-bold text-slate-800">
              {Math.min(
                paginaActual * ITEMS_POR_PAGINA,
                filteredEmpleados.length,
              )}
            </span>{" "}
            de{" "}
            <span className="font-bold text-slate-800">
              {filteredEmpleados.length}
            </span>{" "}
            empleados
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
              disabled={paginaActual === 1}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
              (num) => (
                <button
                  key={num}
                  onClick={() => setPaginaActual(num)}
                  className={`w-8 h-8 rounded-xl font-bold transition ${
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
              disabled={paginaActual === totalPaginas}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Página Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RENDERIZADO DE LOS 4 MODALES EXTERNOS */}
      <ModalRegistroEmpleado
        isOpen={modalRegistro}
        onClose={() => setModalRegistro(false)}
        onSubmit={handleGuardarEmpleado}
        formEmpleado={formEmpleado}
        setFormEmpleado={setFormEmpleado}
        editandoEmpleadoId={editandoEmpleadoId}
        categoriasActivas={categoriasActivas}
        cargosFiltradosForm={cargosFiltradosForm}
        horariosActivos={horariosActivos}
      />

      <ModalDetalleCronograma
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        empleado={empleadoSeleccionado}
        clases={clasesEmpleado}
        metricas={metricasEmpleado}
        diasMap={DIAS_MAP}
        diasEspecificos={diasEspecificos}
        rangosEspecificos={rangosEspecificos}
        onOpenAsignarClase={(dia) =>
          verificarEmpleadoActivo(empleadoSeleccionado, () =>
            handleAbrirAsignarClase(dia),
          )
        }
        onEliminarClase={(claseId) =>
          verificarEmpleadoActivo(empleadoSeleccionado, () =>
            handleEliminarClase(claseId),
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
