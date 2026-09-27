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
  X,
  Check,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  reactivarEmpleado,
  getEmpleadoClases,
  getMetricasEmpleado,
  addEmpleadoClase,
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

const FORM_EMP_INICIAL = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  nroLegajo: "",
  idBiometrico: "",
  categoriaId: "",
  cargosIds: [],
  rolSistema: "Consulta / Empleado (Visualiza su ficha)",
  tipoRegimenHorario: "SIN_HORARIO",
  horarioGeneralId: "",
  toleranciaIngresoMin: 15,
  toleranciaEgresoMin: 10,
};

const FORM_CLASE_INICIAL = {
  materia: "",
  diaSemana: ["Lunes"],
  comision: "",
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
  const [filterEstado, setFilterEstado] = useState("ACTIVOS");
  const [paginaActual, setPaginaActual] = useState(1);

  // Modales
  const [modalRegistro, setModalRegistro] = useState(false);
  const [editandoEmpleadoId, setEditandoEmpleadoId] = useState(null);
  const [formEmpleado, setFormEmpleado] = useState(FORM_EMP_INICIAL);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [clasesEmpleado, setClasesEmpleado] = useState([]);

  const [modalAsignarClase, setModalAsignarClase] = useState(false);
  const [formClase, setFormClase] = useState(FORM_CLASE_INICIAL);

  // Modal Asignar Turno (General o Específico)
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
    if (!formEmpleado.categoriaId) return cargosActivos;
    return cargosActivos.filter(
      (c) => String(c.categoria?.id) === String(formEmpleado.categoriaId),
    );
  }, [formEmpleado.categoriaId, cargosActivos]);

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

  // --- REGISTRAR / EDITAR EMPLEADO ---
  const abrirModalCrear = () => {
    setEditandoEmpleadoId(null);
    setFormEmpleado({
      ...FORM_EMP_INICIAL,
      categoriaId: categoriasActivas[0]?.id || "",
      cargosIds: [],
      horarioGeneralId: horariosActivos[0]?.id || "",
    });
    setModalRegistro(true);
  };

  const abrirModalEditar = (emp) => {
    setEditandoEmpleadoId(emp.id);
    setFormEmpleado({
      nombre: emp.nombre,
      apellido: emp.apellido,
      dni: emp.dni,
      email: emp.email || "",
      telefono: emp.telefono || "",
      nroLegajo: emp.nroLegajo,
      idBiometrico: emp.idBiometrico,
      categoriaId: emp.categoria?.id || "",
      cargosIds: emp.cargos ? emp.cargos.map((c) => c.id) : [],
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
        categoria: { id: parseInt(formEmpleado.categoriaId) },
        cargos: formEmpleado.cargosIds.map((id) => ({ id: parseInt(id) })),
        horarioGeneral: formEmpleado.horarioGeneralId
          ? { id: parseInt(formEmpleado.horarioGeneralId) }
          : null,
      };

      if (editandoEmpleadoId) {
        await updateEmpleado(editandoEmpleadoId, payload);
        mostrarAviso(
          "success",
          "Empleado Actualizado",
          "Los datos del empleado se modificaron correctamente.",
        );
      } else {
        await createEmpleado(payload);
        mostrarAviso(
          "success",
          "Empleado Registrado",
          "El nuevo empleado fue dado de alta en el padrón.",
        );
      }

      await cargarDatos();
      setModalRegistro(false);
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        "No se pudo registrar el empleado. Verifique que DNI, Legajo o ID Biométrico no estén duplicados.",
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

  const handleGuardarClase = async (e) => {
    e.preventDefault();
    if (!empleadoSeleccionado) return;
    if (formClase.diasSemana.length === 0) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe seleccionar al menos un día de la semana.",
      );
      return;
    }

    try {
      const payload = {
        materia: formClase.materia,
        diasSemana: formClase.diasSemana,
        comision: formClase.comision,
        horaInicio:
          formClase.horaInicio.length === 5
            ? `${formClase.horaInicio}:00`
            : formClase.horaInicio,
        horaFin:
          formClase.horaFin.length === 5
            ? `${formClase.horaFin}:00`
            : formClase.horaFin,
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
        "Las cátedras fueron programadas exitosamente.",
      );
    } catch (err) {
      console.error(err);
      mostrarAviso("danger", "Error", "No se pudieron asignar las clases.");
    }
  };

  const handleEliminarClase = async (claseId) => {
    try {
      await removeEmpleadoClase(claseId);
      const clasesActualizadas = await getEmpleadoClases(
        empleadoSeleccionado.id,
      );
      setClasesEmpleado(clasesActualizadas);
      await cargarDatos();
    } catch (err) {
      mostrarAviso("danger", "Error", "No se pudo quitar la clase.");
    }
  };

  // --- ASIGNACIÓN DE TURNO (GENERAL O ESPECÍFICO / PERSONALIZADO) ---
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

  const agregarRangoHorario = () => {
    setRangosEspecificos([
      ...rangosEspecificos,
      { horaDesde: "14:00", horaHasta: "18:00", etiqueta: "Turno Tarde" },
    ]);
  };

  const eliminarRangoHorario = (index) => {
    setRangosEspecificos(rangosEspecificos.filter((_, i) => i !== index));
  };

  const toggleDiaEspecifico = (diaClave) => {
    if (diasEspecificos.includes(diaClave)) {
      setDiasEspecificos(diasEspecificos.filter((d) => d !== diaClave));
    } else {
      setDiasEspecificos([...diasEspecificos, diaClave]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">
            Cargando personal y carga horaria...
          </span>
        </div>
      </div>
    );
  }

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

      {/* 2. TARJETAS DE CANTIDADES FILTRABLES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setFilterRegimen("TODOS")}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer ${
            filterRegimen === "TODOS"
              ? "bg-[#0f172a] text-white ring-4 ring-indigo-500/20 shadow-lg scale-[1.02]"
              : "bg-[#0f172a]/90 text-white/80 hover:bg-[#0f172a]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Personal
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
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

      {/* 3. BARRA DE FILTROS */}
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
                const esDocente = (emp.categoria?.codigoTag || "")
                  .toLowerCase()
                  .includes("docente");
                const horarioNombre = emp.horarioGeneral
                  ? emp.horarioGeneral.nombre
                  : null;

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
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border mb-1.5 ${getBadgeColorClasses(
                          emp.categoria?.colorIdentificacion,
                        )}`}
                      >
                        {emp.categoria?.nombre || "GENERAL"}
                      </span>
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
                      <div className="flex items-center gap-2 mb-1.5">
                        {emp.tipoRegimenHorario === "POR_CLASES" && (
                          <span className="font-bold text-slate-900 text-sm">
                            Cátedras{" "}
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Por Clases
                            </span>
                          </span>
                        )}

                        {emp.tipoRegimenHorario === "PREESTABLECIDO" && (
                          <span className="font-bold text-slate-900 text-sm">
                            Fijo{" "}
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              {horarioNombre || "Turno Fijo"}
                            </span>
                          </span>
                        )}

                        {emp.tipoRegimenHorario === "ESPECIFICO" && (
                          <span className="font-bold text-slate-900 text-sm">
                            Personalizado{" "}
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Específico
                            </span>
                          </span>
                        )}

                        {(!emp.tipoRegimenHorario ||
                          emp.tipoRegimenHorario === "SIN_HORARIO") && (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" /> Sin
                            horario
                          </span>
                        )}
                      </div>

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
                        <button
                          onClick={() => handleVerDetalle(emp)}
                          className="p-1 hover:text-indigo-600 transition"
                          title="Ver Cronograma y Ficha"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => abrirModalTurno(emp)}
                          className="p-1 hover:text-indigo-600 transition"
                          title="Asignar Turno / Horario"
                        >
                          <Clock className="w-4 h-4" />
                        </button>

                        {esDocente && (
                          <button
                            onClick={() => {
                              setEmpleadoSeleccionado(emp);
                              setModalAsignarClase(true);
                            }}
                            className="p-1 hover:text-purple-600 transition"
                            title="Asignar Clase a Docente"
                          >
                            <Plus className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                          </button>
                        )}

                        <button
                          onClick={() => abrirModalEditar(emp)}
                          className="p-1 hover:text-indigo-600 transition"
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
                            className="p-1 hover:text-rose-600 transition"
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
                            className="p-1 hover:text-emerald-600 transition"
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

      {/* ========================================================
          MODAL 1: REGISTRAR / EDITAR EMPLEADO
         ======================================================== */}
      {modalRegistro && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  {editandoEmpleadoId
                    ? "Editar Empleado"
                    : "Registrar Nuevo Empleado"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Defina datos personales, legajo institucional e ID biométrico.
                </p>
              </div>
              <button
                onClick={() => setModalRegistro(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleGuardarEmpleado}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carlos"
                    value={formEmpleado.nombre}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        nombre: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Benítez"
                    value={formEmpleado.apellido}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        apellido: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    DNI / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 28.455.912"
                    value={formEmpleado.dni}
                    onChange={(e) =>
                      setFormEmpleado({ ...formEmpleado, dni: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="carlos.benitez@instituto.edu.ar"
                    value={formEmpleado.email}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        email: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="+54 11 4821-9901"
                    value={formEmpleado.telefono}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        telefono: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nº Legajo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="LEG-1019"
                    value={formEmpleado.nroLegajo}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        nroLegajo: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ID Biométrico (Reloj) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BIO-19"
                    value={formEmpleado.idBiometrico}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        idBiometrico: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Categoría Laboral *
                  </label>
                  <select
                    value={formEmpleado.categoriaId}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        categoriaId: e.target.value,
                        cargosIds: [],
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                  >
                    {categoriasActivas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.codigoTag})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ASIGNACIÓN DE MÚLTIPLES CARGOS */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cargos / Puestos Asignados (Selección múltiple):
                </label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto bg-slate-50/50">
                  {cargosFiltradosForm.map((cg) => {
                    const seleccionado = formEmpleado.cargosIds.includes(cg.id);
                    return (
                      <button
                        key={cg.id}
                        type="button"
                        onClick={() => {
                          if (seleccionado) {
                            setFormEmpleado({
                              ...formEmpleado,
                              cargosIds: formEmpleado.cargosIds.filter(
                                (id) => id !== cg.id,
                              ),
                            });
                          } else {
                            setFormEmpleado({
                              ...formEmpleado,
                              cargosIds: [...formEmpleado.cargosIds, cg.id],
                            });
                          }
                        }}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold border text-left transition cursor-pointer ${
                          seleccionado
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{cg.nombre}</span>
                        {seleccionado && (
                          <Check className="w-3.5 h-3.5 ml-2 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Turno General Asignado
                  </label>
                  <select
                    value={formEmpleado.horarioGeneralId}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        horarioGeneralId: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="">
                      Sin turno fijo (Por Cátedras o Específico)
                    </option>
                    {horariosActivos.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nombre} ({h.horaEntrada?.substring(0, 5)} a{" "}
                        {h.horaEgreso?.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rol en Sistema *
                  </label>
                  <select
                    value={formEmpleado.rolSistema}
                    onChange={(e) =>
                      setFormEmpleado({
                        ...formEmpleado,
                        rolSistema: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="Consulta / Empleado (Visualiza su ficha)">
                      Consulta / Empleado (Visualiza su ficha)
                    </option>
                    <option value="Administrador">Administrador General</option>
                    <option value="Recursos Humanos">
                      Recursos Humanos / Auditor
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalRegistro(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md"
                >
                  {editandoEmpleadoId
                    ? "Guardar Cambios"
                    : "Registrar Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CRONOGRAMA SEMANAL & FICHA DETALLADA (CORREGIDO)
         ======================================================== */}
      {modalDetalle &&
        empleadoSeleccionado &&
        (() => {
          const emp = empleadoSeleccionado;
          const esDocentePorClases = emp.tipoRegimenHorario === "POR_CLASES";
          const tieneTurnoPreestablecido =
            emp.tipoRegimenHorario === "PREESTABLECIDO" && emp.horarioGeneral;
          const tieneTurnoEspecifico = emp.tipoRegimenHorario === "ESPECIFICO";

          const diasPreestablecidos = tieneTurnoPreestablecido
            ? (emp.horarioGeneral.diasLaborables || "")
                .split(",")
                .map((d) => d.trim().toLowerCase())
            : [];

          let totalHoras = 0;
          let diasConActividad = 0;

          DIAS_MAP.forEach(({ clave, nombre }) => {
            let tiene = false;
            if (esDocentePorClases) {
              tiene = clasesEmpleado.some(
                (c) => c.diaSemana?.toLowerCase() === nombre.toLowerCase(),
              );
            } else if (tieneTurnoPreestablecido) {
              tiene = diasPreestablecidos.some(
                (d) =>
                  d === clave.toLowerCase() ||
                  d === nombre.toLowerCase().substring(0, 3),
              );
            } else if (tieneTurnoEspecifico) {
              tiene = diasEspecificos.some(
                (d) => d.toLowerCase() === clave.toLowerCase(),
              );
            }
            if (tiene) diasConActividad++;
          });

          if (tieneTurnoPreestablecido) {
            totalHoras = 40;
          } else if (esDocentePorClases) {
            totalHoras = clasesEmpleado.length * 3;
          }

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">
                          {emp.apellido}, {emp.nombre}
                        </h3>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getBadgeColorClasses(
                            emp.categoria?.colorIdentificacion,
                          )}`}
                        >
                          {emp.categoria?.nombre}
                        </span>
                        <span className="text-slate-400 text-xs">
                          Legajo: {emp.nroLegajo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {(emp.cargos || []).map((c) => c.nombre).join(", ") ||
                          "Sin cargo"}{" "}
                        • DNI: {emp.dni}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalDetalle(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                  {/* 4 Cards Superiores */}
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Carga Semanal Total
                      </div>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {metricasEmpleado
                          ? metricasEmpleado.cargaSemanalHoras
                          : 0}{" "}
                        horas
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Calculadas semanalmente
                      </div>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase text-purple-700">
                        Régimen Horario
                      </div>
                      <div className="text-sm font-bold text-purple-900 mt-1">
                        {metricasEmpleado
                          ? metricasEmpleado.regimenHorarioDescripcion
                          : "Sin Asignar"}
                      </div>
                      <div className="text-[10px] text-purple-700">
                        {metricasEmpleado
                          ? metricasEmpleado.regimenHorarioSubtitulo
                          : ""}
                      </div>
                    </div>

                    <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase text-blue-700">
                        Días con Asistencia
                      </div>
                      <div className="text-xl font-bold text-blue-900 mt-1">
                        {metricasEmpleado
                          ? metricasEmpleado.diasConAsistencia
                          : 0}{" "}
                        días
                      </div>
                      <div
                        className="text-[10px] text-blue-700 font-medium truncate"
                        title={metricasEmpleado?.textoRangoDias}
                      >
                        {metricasEmpleado
                          ? metricasEmpleado.textoRangoDias
                          : "Sin días asignados"}
                      </div>
                    </div>

                    <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase text-emerald-700">
                        Tolerancias de Registro
                      </div>
                      <div className="text-sm font-bold text-emerald-900 mt-1">
                        +
                        {metricasEmpleado
                          ? metricasEmpleado.toleranciaIngresoMin
                          : 15}
                        m / -
                        {metricasEmpleado
                          ? metricasEmpleado.toleranciaEgresoMin
                          : 10}
                        m
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        Ingreso y Egreso permitidos
                      </div>
                    </div>
                  </div>

                  {/* Grilla Semanal: LUNES a DOMINGO */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>Cronograma de Clases y Jornadas por Día:</span>
                      </div>

                      {esDocentePorClases && (
                        <button
                          onClick={() => setModalAsignarClase(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          Asignar Nueva Clase
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-2.5">
                      {DIAS_MAP.map(({ clave, nombre }) => {
                        const clasesDia = clasesEmpleado.filter(
                          (c) =>
                            c.diaSemana?.toLowerCase() === nombre.toLowerCase(),
                        );

                        const trabajaPreestablecido =
                          tieneTurnoPreestablecido &&
                          diasPreestablecidos.some(
                            (d) =>
                              d === clave.toLowerCase() ||
                              d === nombre.toLowerCase().substring(0, 3),
                          );

                        const trabajaEspecifico =
                          tieneTurnoEspecifico &&
                          diasEspecificos.some(
                            (d) => d.toLowerCase() === clave.toLowerCase(),
                          );

                        const tieneActividad =
                          clasesDia.length > 0 ||
                          trabajaPreestablecido ||
                          trabajaEspecifico;

                        return (
                          <div
                            key={nombre}
                            className={`border rounded-2xl p-2.5 flex flex-col justify-between min-h-[220px] ${
                              tieneActividad
                                ? "bg-white border-slate-200"
                                : "bg-slate-50/60 border-slate-200/60"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase text-slate-700">
                                  {nombre}
                                </span>
                                {tieneActividad ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    Franco
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2">
                                {/* Tarjetas de Clases Docentes */}
                                {clasesDia.map((c) => (
                                  <div
                                    key={c.id}
                                    className="bg-purple-50/70 border border-purple-100 rounded-xl p-2 text-[10px] relative group"
                                  >
                                    <button
                                      onClick={() => handleEliminarClase(c.id)}
                                      className="absolute top-1 right-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                                      title="Quitar clase"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                    <div className="font-bold text-purple-900 leading-tight">
                                      {c.materia}
                                    </div>
                                    <div className="text-purple-700 mt-1 font-medium">
                                      {c.horaInicio?.substring(0, 5)} -{" "}
                                      {c.horaFin?.substring(0, 5)}
                                    </div>
                                    {c.aula && (
                                      <div className="text-slate-500 mt-0.5">
                                        Aula: {c.aula}
                                      </div>
                                    )}
                                    {c.comision && (
                                      <div className="text-purple-600 font-semibold mt-0.5">
                                        {c.comision}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Tarjeta de Turno Preestablecido Fijo */}
                                {trabajaPreestablecido && (
                                  <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-2.5 text-[10px] space-y-1">
                                    <div className="font-bold text-indigo-900 leading-tight">
                                      {emp.horarioGeneral.nombre}
                                    </div>
                                    <div className="text-indigo-700 font-semibold">
                                      {emp.horarioGeneral.horaEntrada?.substring(
                                        0,
                                        5,
                                      )}{" "}
                                      a{" "}
                                      {emp.horarioGeneral.horaEgreso?.substring(
                                        0,
                                        5,
                                      )}{" "}
                                      hs
                                    </div>
                                    <div className="text-indigo-500 text-[9px]">
                                      Jornada Completa
                                    </div>
                                  </div>
                                )}

                                {/* Tarjeta de Turno Específico Personalizado */}
                                {trabajaEspecifico && (
                                  <div className="space-y-1">
                                    {rangosEspecificos.map((r, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-blue-50/70 border border-blue-200 rounded-xl p-2 text-[10px]"
                                      >
                                        <div className="font-bold text-blue-900">
                                          {r.etiqueta || "Turno Específico"}
                                        </div>
                                        <div className="text-blue-700 font-semibold">
                                          {r.horaDesde} a {r.horaHasta} hs
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!tieneActividad && (
                                  <div className="text-center py-10 text-[11px] text-slate-400 italic">
                                    Sin actividad
                                  </div>
                                )}
                              </div>
                            </div>

                            {esDocentePorClases && (
                              <button
                                onClick={() => {
                                  setFormClase({
                                    ...FORM_CLASE_INICIAL,
                                    diaSemana: nombre,
                                  });
                                  setModalAsignarClase(true);
                                }}
                                className="w-full mt-2 py-1 border border-dashed border-slate-300 hover:border-purple-400 text-slate-500 hover:text-purple-600 rounded-lg text-[10px] font-semibold transition"
                              >
                                + Clase
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => setModalDetalle(false)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      setModalDetalle(false);
                      abrirModalTurno(emp);
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3e2bc0] text-white text-xs font-semibold shadow-md transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Modificar / Asignar Turno
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ========================================================
          MODAL 3: ASIGNAR CLASE
         ======================================================== */}
      {/* MODAL 3: ASIGNAR CLASE AL CRONOGRAMA */}
      {modalAsignarClase && empleadoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#6b21a8] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Asignar Clase al Cronograma Docente
                </h3>
                <p className="text-[11px] text-purple-200">
                  {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}
                </p>
              </div>
              <button
                onClick={() => setModalAsignarClase(false)}
                className="text-purple-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleGuardarClase}
              className="p-6 space-y-4 text-xs"
            >
              {/* LISTA DESPLEGABLE DE CÁTEDRAS */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Materia *
                </label>
                <select
                  required
                  value={formClase.materiaId || ""}
                  onChange={(e) => {
                    const idSel = e.target.value;
                    const mat = (materiasActivas || []).find(
                      (m) => String(m.id) === String(idSel),
                    );
                    setFormClase({
                      ...formClase,
                      materiaId: idSel,
                      materia: mat ? mat.nombre : "",
                      comision: mat?.comision || formClase.comision,
                      aula: mat?.aulaPredeterminada || formClase.aula,
                    });
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-600 bg-white"
                >
                  <option value="">
                    Seleccione una cátedra del catálogo...
                  </option>
                  {(materiasActivas || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} {m.comision ? `(${m.comision})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* SELECCIÓN MÚLTIPLE DE DÍAS DE CURSADA */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Días de Dictado (Selección Múltiple) *
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[
                    "Lunes",
                    "Martes",
                    "Miércoles",
                    "Jueves",
                    "Viernes",
                    "Sábado",
                  ].map((dia) => {
                    const sel = formClase.diaSemana.includes(dia);
                    return (
                      <button
                        type="button"
                        key={dia}
                        onClick={() => {
                          const nuevos = sel
                            ? formClase.diasSemana.filter((d) => d !== dia)
                            : [...formClase.diasSemana, dia];
                          setFormClase({ ...formClase, diasSemana: nuevos });
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                          sel
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {dia.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Días marcados: {formClase.diaSemana.join(", ") || "Ninguno"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={formClase.horaInicio}
                    onChange={(e) =>
                      setFormClase({ ...formClase, horaInicio: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={formClase.horaFin}
                    onChange={(e) =>
                      setFormClase({ ...formClase, horaFin: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Comisión / Curso
                  </label>
                  <input
                    type="text"
                    value={formClase.comision}
                    onChange={(e) =>
                      setFormClase({ ...formClase, comision: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Aula / Laboratorio
                  </label>
                  <input
                    type="text"
                    value={formClase.aula}
                    onChange={(e) =>
                      setFormClase({ ...formClase, aula: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAsignarClase(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md"
                >
                  + Asignar al Cronograma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: ASIGNAR TURNO GENERAL O ESPECÍFICO
         ======================================================== */}
      {modalAsignarTurno && empleadoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Asignar Turno y Horario Laboral
                </h3>
                <p className="text-[11px] text-slate-400">
                  {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}{" "}
                  •{" "}
                  {(empleadoSeleccionado.cargos || [])
                    .map((c) => c.nombre)
                    .join(", ")}
                </p>
              </div>
              <button
                onClick={() => setModalAsignarTurno(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Tipo de Asignación de Horario
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAsignacionTurno("PREESTABLECIDO")}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    tipoAsignacionTurno === "PREESTABLECIDO"
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      Turno Preestablecido General
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Asignar uno de los turnos corporativos de la
                      configuración.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoAsignacionTurno("ESPECIFICO")}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                    tipoAsignacionTurno === "ESPECIFICO"
                      ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      Turno Específico / Personalizado
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Para empleados o docentes: rangos horarios por jornada.
                    </div>
                  </div>
                </button>
              </div>

              {/* OPCIÓN 1: TURNO GENERAL PREESTABLECIDO */}
              {tipoAsignacionTurno === "PREESTABLECIDO" && (
                <div className="space-y-3 pt-2">
                  <label className="block font-semibold text-slate-700">
                    Seleccionar Turno de la Tabla Preestablecida:
                  </label>
                  <select
                    value={horarioGeneralSeleccionado}
                    onChange={(e) =>
                      setHorarioGeneralSeleccionado(e.target.value)
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600 bg-white"
                  >
                    {horariosActivos.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nombre} ({h.horaEntrada?.substring(0, 5)} a{" "}
                        {h.horaEgreso?.substring(0, 5)} hs • Cat:{" "}
                        {h.categoria?.nombre})
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const sel = horariosActivos.find(
                      (h) =>
                        String(h.id) === String(horarioGeneralSeleccionado),
                    );
                    if (!sel) return null;
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {sel.nombre}
                          </span>
                          <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                            {sel.horaEntrada?.substring(0, 5)} →{" "}
                            {sel.horaEgreso?.substring(0, 5)} hs
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                          <div>
                            <span className="text-slate-400 block uppercase font-semibold">
                              Categoría
                            </span>
                            <span className="font-bold text-slate-700">
                              {sel.categoria?.nombre}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-semibold">
                              Días
                            </span>
                            <span className="font-bold text-slate-700">
                              {sel.diasLaborables}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-semibold">
                              Tol. Entrada
                            </span>
                            <span className="font-bold text-slate-700">
                              {sel.tolEntradaMin} min
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* OPCIÓN 2: TURNO ESPECÍFICO / PERSONALIZADO */}
              {tipoAsignacionTurno === "ESPECIFICO" && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        Rangos Horarios del Día (Intervalos o Jornada Partida)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Puede definir 1, 2 o más rangos horarios por jornada.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={agregarRangoHorario}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      Agregar Rango
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {rangosEspecificos.map((rango, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3"
                      >
                        <span className="font-bold text-slate-700 shrink-0">
                          Rango {idx + 1}:
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={rango.horaDesde}
                            onChange={(e) => {
                              const nuevo = [...rangosEspecificos];
                              nuevo[idx].horaDesde = e.target.value;
                              setRangosEspecificos(nuevo);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 outline-none font-medium"
                          />
                          <span className="text-slate-400">→</span>
                          <input
                            type="time"
                            value={rango.horaHasta}
                            onChange={(e) => {
                              const nuevo = [...rangosEspecificos];
                              nuevo[idx].horaHasta = e.target.value;
                              setRangosEspecificos(nuevo);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 outline-none font-medium"
                          />
                          <input
                            type="text"
                            placeholder="Etiqueta (ej: Turno Mañana)"
                            value={rango.etiqueta}
                            onChange={(e) => {
                              const nuevo = [...rangosEspecificos];
                              nuevo[idx].etiqueta = e.target.value;
                              setRangosEspecificos(nuevo);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none flex-1"
                          />
                        </div>
                        {rangosEspecificos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarRangoHorario(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="font-bold text-slate-700 mb-2">
                      Días en que Aplica este Turno
                    </div>
                    <div className="flex gap-1.5">
                      {DIAS_MAP.map(({ clave }) => {
                        const sel = diasEspecificos.includes(clave);
                        return (
                          <button
                            type="button"
                            key={clave}
                            onClick={() => toggleDiaEspecifico(clave)}
                            className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer ${
                              sel
                                ? "bg-[#4b35e6] text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {clave}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tolerancia de Ingreso (minutos)
                      </label>
                      <input
                        type="number"
                        value={tolIngresoEsp}
                        onChange={(e) => setTolIngresoEsp(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tolerancia de Egreso (minutos)
                      </label>
                      <input
                        type="number"
                        value={tolEgresoEsp}
                        onChange={(e) => setTolEgresoEsp(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAsignarTurno(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleGuardarTurno}
                  className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md"
                >
                  Guardar Asignación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
