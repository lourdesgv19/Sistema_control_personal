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
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  getEmpleadosPaginados,
  getEmpleados,
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

import ModalRegistroEmpleado from "../components/personal/ModalRegistroEmpleado";
import ModalDetalleCronograma from "../components/personal/ModalDetalleCronograma";
import ModalAsignarClase from "../components/personal/ModalAsignarClase";
import ModalAsignarTurno from "../components/personal/ModalAsignarTurno";
import { useAuth } from "../context/AuthContext";

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
  tiempoMaxFueraMin: 45,
  maxSalidasIntermedias: 2,
};

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

// Helper: determina si a un empleado le faltan datos esenciales
export const esEmpleadoIncompleto = (emp) => {
  if (!emp) return false;
  const sinDni = !emp.dni || String(emp.dni).trim() === "";
  const sinLegajo = !emp.nroLegajo || String(emp.nroLegajo).trim() === "";
  const sinCat =
    (!emp.categorias || emp.categorias.length === 0) && !emp.categoria;
  return sinDni || sinLegajo || sinCat;
};

export default function GestionPersonal() {
  const { tienePermiso } = useAuth();

  // Permisos granulares de Personal
  const puedePersonalCrear = tienePermiso("PERSONAL_CREAR");
  const puedePersonalEditar = tienePermiso("PERSONAL_EDITAR");
  const puedePersonalBajaReactivar = tienePermiso("PERSONAL_BAJA_REACTIVAR");

  // Permisos granulares de Horarios
  const puedeHorariosVer =
    tienePermiso("HORARIOS_VER") || tienePermiso("PERSONAL_VER");
  const puedeHorariosGestionar = tienePermiso("HORARIOS_GESTIONAR");
  const puedeHorariosEliminar = tienePermiso("HORARIOS_ELIMINAR");

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [todosLosEmpleados, setTodosLosEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [materias, setMaterias] = useState([]);

  // Periodicidad de franjas
  const [tipoFrecuencia, setTipoFrecuencia] = useState("SEMANAL");
  const [repeticionesPeriodo, setRepeticionesPeriodo] = useState(1);
  const [semanaAlterna, setSemanaAlterna] = useState("PAR");

  // Paginación del Servidor
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("TODAS");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [soloIncompletos, setSoloIncompletos] = useState(false);

  // Modales
  const [modalRegistro, setModalRegistro] = useState(false);
  const [editandoEmpleadoId, setEditandoEmpleadoId] = useState(null);
  const [formEmpleado, setFormEmpleado] = useState(FORM_EMP_INICIAL);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [metricasEmpleado, setMetricasEmpleado] = useState(null);
  const [horariosEmpleado, setHorariosEmpleado] = useState([]);

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

  const cargarResumenGlobal = useCallback(async () => {
    try {
      const data = await getPersonalResumen();
      if (data) setResumenGlobal(data);
      const todos = await getEmpleados();
      if (Array.isArray(todos)) setTodosLosEmpleados(todos);
    } catch (err) {
      console.error("Error al cargar resumen global:", err);
    }
  }, []);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [catRes, carRes, horRes, matRes] = await Promise.allSettled([
        getCategorias(),
        getCargos(),
        getHorarios(),
        getMaterias(),
      ]);
      setCategorias(
        catRes.status === "fulfilled" && Array.isArray(catRes.value)
          ? catRes.value
          : [],
      );
      setCargos(
        carRes.status === "fulfilled" && Array.isArray(carRes.value)
          ? carRes.value
          : [],
      );
      setHorarios(
        horRes.status === "fulfilled" && Array.isArray(horRes.value)
          ? horRes.value
          : [],
      );
      setMaterias(
        matRes.status === "fulfilled" && Array.isArray(matRes.value)
          ? matRes.value
          : [],
      );
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  }, []);

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
        setEmpleados([]);
      } finally {
        setLoading(false);
      }
    },
    [categorias, filterCategoria, filterEstado, searchTerm],
  );

  useEffect(() => {
    cargarCatalogos();
    cargarResumenGlobal();
  }, [cargarCatalogos, cargarResumenGlobal]);

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

  const totalIncompletos = useMemo(() => {
    return todosLosEmpleados.filter(esEmpleadoIncompleto).length;
  }, [todosLosEmpleados]);

  const empleadosRenderizados = useMemo(() => {
    if (!soloIncompletos) return empleados;
    return empleados.filter(esEmpleadoIncompleto);
  }, [empleados, soloIncompletos]);

  const verificarEmpleadoActivo = (emp, accionPermitida) => {
    if (emp.activo === false) {
      mostrarAviso(
        "warning",
        "Empleado Inactivo",
        `El empleado ${emp.apellido}, ${emp.nombre} se encuentra dado de baja lógica. Debe reactivarlo antes de modificar sus horarios o cátedras.`,
      );
      return false;
    }
    accionPermitida();
    return true;
  };

  const abrirModalCrear = () => {
    if (!puedePersonalCrear) return;
    setEditandoEmpleadoId(null);
    setFormEmpleado({
      ...FORM_EMP_INICIAL,
      categoriasIds: categoriasActivas[0]?.id ? [categoriasActivas[0].id] : [],
      cargosIds: [],
    });
    setModalRegistro(true);
  };

  const abrirModalEditar = (emp) => {
    if (!puedePersonalEditar) return;
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
      toleranciaIngresoMin: emp.toleranciaIngresoMin ?? 15,
      toleranciaEgresoMin: emp.toleranciaEgresoMin ?? 10,
      tiempoMaxFueraMin: emp.tiempoMaxFueraMin ?? 45,
      maxSalidasIntermedias: emp.maxSalidasIntermedias ?? 2,
    });
    setModalRegistro(true);
  };

  const handleGuardarEmpleado = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formEmpleado.nombre?.trim(),
        apellido: formEmpleado.apellido?.trim(),
        dni: formEmpleado.dni?.trim() || null,
        email: formEmpleado.email?.trim() || null,
        telefono: formEmpleado.telefono?.trim() || null,
        nroLegajo: formEmpleado.nroLegajo?.trim() || null,
        idBiometrico: formEmpleado.idBiometrico?.trim() || null,
        toleranciaIngresoMin:
          parseInt(formEmpleado.toleranciaIngresoMin, 10) || 15,
        toleranciaEgresoMin:
          parseInt(formEmpleado.toleranciaEgresoMin, 10) || 10,
        tiempoMaxFueraMin: parseInt(formEmpleado.tiempoMaxFueraMin, 10) || 45,
        maxSalidasIntermedias:
          parseInt(formEmpleado.maxSalidasIntermedias, 10) || 2,
        categorias: (formEmpleado.categoriasIds || []).map((id) => ({
          id: parseInt(id, 10),
        })),
        cargos: (formEmpleado.cargosIds || []).map((id) => ({
          id: parseInt(id, 10),
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
          "El nuevo empleado fue dado de alta con éxito.",
        );
      }

      await cargarEmpleadosServidor(paginaActual - 1);
      cargarResumenGlobal();
      setModalRegistro(false);
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        err.response?.data?.message ||
          "No se pudo guardar la información del empleado.",
      );
    }
  };

  const handleEliminarEmpleado = (id, nombre) => {
    if (!puedePersonalBajaReactivar) return;
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
            err.response?.data?.message ||
              "No se pudo dar de baja al empleado.",
          );
        }
      },
    });
  };

  const handleReactivarEmpleado = (id, nombre) => {
    if (!puedePersonalBajaReactivar) return;
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
          mostrarAviso(
            "danger",
            "Error",
            err.response?.data?.message || "No se pudo reactivar al empleado.",
          );
        }
      },
    });
  };

  const handleVerDetalle = async (emp) => {
    if (!puedeHorariosVer) return;
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
    if (!puedeHorariosGestionar) return;
    setFormClase({
      ...FORM_CLASE_INICIAL,
      diasSemana: diaPreseleccionado ? [diaPreseleccionado] : ["Lunes"],
    });
    setModalAsignarClase(true);
  };

  const handleGuardarClase = async (e, forzar = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!empleadoSeleccionado || !puedeHorariosGestionar) return;

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
      const tipoFrec = formClase.tipoFrecuencia || "SEMANAL";
      const reps =
        tipoFrec === "MENSUAL" || tipoFrec === "ANUAL"
          ? parseInt(formClase.repeticionesPeriodo, 10) || 1
          : 1;
      const semanaAlt =
        tipoFrec === "SEMANA_POR_MEDIO"
          ? formClase.semanaAlterna || "PAR"
          : null;

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
        tipoFrecuencia: tipoFrec,
        repeticionesPeriodo: reps,
        semanaAlterna: semanaAlt,
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
        "Las cátedras fueron asignadas con éxito.",
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
    if (!puedeHorariosEliminar) {
      mostrarAviso(
        "danger",
        "Acceso Denegado",
        "No posee permiso (HORARIOS_ELIMINAR) para quitar horarios asignados.",
      );
      return;
    }
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
      mostrarAviso(
        "danger",
        "Error",
        err.response?.data?.message || "No se pudo eliminar el bloque horario.",
      );
    }
  };

  const abrirModalTurno = (emp) => {
    if (!puedeHorariosGestionar) return;
    setEmpleadoSeleccionado(emp);
    setTipoAsignacionTurno("PREESTABLECIDO");
    setHorarioGeneralSeleccionado(horariosActivos[0]?.id || "");
    setTolIngresoEsp(emp.toleranciaIngresoMin ?? 15);
    setTolEgresoEsp(emp.toleranciaEgresoMin ?? 10);
    setTipoFrecuencia("SEMANAL");
    setRepeticionesPeriodo(1);
    setSemanaAlterna("PAR");
    setModalAsignarTurno(true);
  };

  const handleGuardarTurno = async (forzar = false) => {
    const esForzado = typeof forzar === "boolean" ? forzar : false;
    if (!empleadoSeleccionado || !puedeHorariosGestionar) return;

    try {
      if (tipoAsignacionTurno === "PREESTABLECIDO") {
        const plantilla = horarios.find(
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

        await addEmpleadoHorario(empleadoSeleccionado.id, {
          diasSemana: diasArray,
          horaEntrada: plantilla.horaEntrada,
          horaSalida: plantilla.horaEgreso,
          materiaId: null,
          etiqueta: plantilla.nombre,
          aula: null,
          forzarGuardado: esForzado,
          tipoFrecuencia,
          repeticionesPeriodo:
            tipoFrecuencia === "MENSUAL" || tipoFrecuencia === "ANUAL"
              ? repeticionesPeriodo
              : 1,
          semanaAlterna:
            tipoFrecuencia === "SEMANA_POR_MEDIO" ? semanaAlterna : null,
        });

        // Herencia de tolerancias de salidas intermedias de la plantilla
        if (plantilla.tiempoMaxFueraMin || plantilla.maxSalidasIntermedias) {
          await updateEmpleado(empleadoSeleccionado.id, {
            ...empleadoSeleccionado,
            tiempoMaxFueraMin: plantilla.tiempoMaxFueraMin || 45,
            maxSalidasIntermedias: plantilla.maxSalidasIntermedias || 2,
          });
        }
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
            tipoFrecuencia,
            repeticionesPeriodo:
              tipoFrecuencia === "MENSUAL" || tipoFrecuencia === "ANUAL"
                ? repeticionesPeriodo
                : 1,
            semanaAlterna:
              tipoFrecuencia === "SEMANA_POR_MEDIO" ? semanaAlterna : null,
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
        "Se generaron las franjas horarias con la periodicidad establecida.",
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
              Padrón de empleados, asignación de regímenes y cronograma de
              horarios.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* BOTÓN ALERTA: COMPLETAR CAMPOS FALTANTES */}
          {totalIncompletos > 0 && (
            <button
              onClick={() => {
                setSoloIncompletos(!soloIncompletos);
                setPaginaActual(1);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border ${
                soloIncompletos
                  ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
              }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {soloIncompletos
                  ? "Ver Todos los Empleados"
                  : `Faltan completar datos (${totalIncompletos})`}
              </span>
            </button>
          )}

          {/* ALTA DE PERSONAL: PERSONAL_CREAR */}
          {puedePersonalCrear ? (
            <button
              onClick={abrirModalCrear}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Registrar Empleado
            </button>
          ) : (
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold border border-slate-200 cursor-not-allowed select-none"
              title="Requiere permiso PERSONAL_CREAR"
            >
              <Lock className="w-3.5 h-3.5" />
              Alta Restringida
            </span>
          )}
        </div>
      </div>

      {/* 2. TARJETAS GLOBALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setFilterEstado("TODOS");
            setFilterCategoria("TODAS");
            setSoloIncompletos(false);
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterEstado === "TODOS" &&
            filterCategoria === "TODAS" &&
            !soloIncompletos
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

        <button
          type="button"
          onClick={() => {
            setFilterCategoria("Docentes");
            setFilterEstado("ACTIVOS");
            setSoloIncompletos(false);
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterCategoria.toLowerCase().includes("docente") &&
            !soloIncompletos
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

        <button
          type="button"
          onClick={() => {
            const catAdmin = categorias.find((c) =>
              c.nombre?.toLowerCase().includes("administrativ"),
            )?.nombre;
            setFilterCategoria(catAdmin || "TODAS");
            setFilterEstado("ACTIVOS");
            setSoloIncompletos(false);
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterEstado === "ACTIVOS" &&
            filterCategoria.toLowerCase().includes("administrativ") &&
            !soloIncompletos
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

        <button
          type="button"
          onClick={() => {
            setFilterEstado("INACTIVOS");
            setFilterCategoria("TODAS");
            setSoloIncompletos(false);
            setPaginaActual(1);
          }}
          className={`p-5 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
            filterEstado === "INACTIVOS" && !soloIncompletos
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
            ) : empleadosRenderizados.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-slate-400 text-xs italic"
                >
                  {soloIncompletos
                    ? "¡Excelente! No hay empleados con datos pendientes."
                    : "No se encontraron empleados con los filtros seleccionados."}
                </td>
              </tr>
            ) : (
              empleadosRenderizados.map((emp) => {
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

                const incompleto = esEmpleadoIncompleto(emp);

                return (
                  <tr
                    key={emp.id}
                    className={`transition-colors ${
                      emp.activo === false
                        ? "bg-slate-50/60 opacity-80"
                        : incompleto
                          ? "bg-amber-50/30 hover:bg-amber-50/60"
                          : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {emp.apellido}, {emp.nombre}
                        </span>
                        {incompleto && (
                          <span
                            title="Faltan datos obligatorios (DNI, Legajo o Categoría)"
                            className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Incompleto
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        DNI:{" "}
                        {emp.dni || (
                          <span className="text-amber-600 font-bold">
                            Sin DNI
                          </span>
                        )}{" "}
                        •{" "}
                        <span className="font-mono text-slate-700">
                          {emp.nroLegajo || (
                            <span className="text-amber-600 font-bold">
                              Sin Legajo
                            </span>
                          )}
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
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-50 border border-amber-200 text-amber-700">
                            Sin Categoría
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
                      {puedeHorariosVer ? (
                        <button
                          onClick={() => handleVerDetalle(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Ver cronograma
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed select-none"
                          title="Requiere permiso HORARIOS_VER"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Cronograma Restringido
                        </span>
                      )}
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
                        {/* Botón rápido Completar Datos */}
                        {incompleto && puedePersonalEditar && (
                          <button
                            onClick={() => abrirModalEditar(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition mr-1"
                            title="Completar datos pendientes"
                          >
                            <Pencil className="w-3 h-3" />
                            Completar
                          </button>
                        )}

                        {puedeHorariosVer && (
                          <button
                            onClick={() => handleVerDetalle(emp)}
                            className="p-1 hover:text-indigo-600 transition cursor-pointer"
                            title="Ver Cronograma y Ficha"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {puedeHorariosGestionar && (
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
                        )}

                        {esDocente && puedeHorariosGestionar && (
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

                        {puedePersonalEditar && (
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
                                ? "Empleado inactivo"
                                : "Editar Empleado"
                            }
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {puedePersonalBajaReactivar &&
                          (emp.activo !== false ? (
                            <button
                              onClick={() =>
                                handleEliminarEmpleado(
                                  emp.id,
                                  `${emp.nombre} ${emp.apellido}`,
                                )
                              }
                              className="p-1 hover:text-rose-600 transition cursor-pointer"
                              title="Dar de baja empleado"
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
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
            empleados
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
              disabled={paginaActual === 1 || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
        empleadosExistentes={todosLosEmpleados}
      />

      <ModalDetalleCronograma
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        empleado={empleadoSeleccionado}
        clases={horariosEmpleado}
        metricas={metricasEmpleado}
        diasMap={DIAS_MAP}
        onOpenAsignarClase={(dia) =>
          verificarEmpleadoActivo(empleadoSeleccionado, () => {
            setModalDetalle(false);
            handleAbrirAsignarClase(dia);
          })
        }
        onEliminarClase={(horarioId) =>
          verificarEmpleadoActivo(empleadoSeleccionado, () =>
            handleEliminarHorario(horarioId),
          )
        }
        onOpenAsignarTurno={(emp) =>
          verificarEmpleadoActivo(emp, () => {
            setModalDetalle(false);
            abrirModalTurno(emp);
          })
        }
        puedeEditar={puedeHorariosGestionar}
        puedeEliminar={puedeHorariosEliminar}
      />

      <ModalAsignarClase
        isOpen={modalAsignarClase}
        onClose={() => setModalAsignarClase(false)}
        onSubmit={handleGuardarClase}
        formClase={formClase}
        setFormClase={setFormClase}
        empleado={empleadoSeleccionado}
        docenteSeleccionadoId={empleadoSeleccionado?.id}
        setDocenteSeleccionadoId={() => {}}
        docentesDisponibles={empleados}
        materiasActivas={materiasActivas}
        onMateriaCreada={(nueva) => setMaterias((prev) => [...prev, nueva])}
      />

      <ModalAsignarTurno
        isOpen={modalAsignarTurno}
        onClose={() => setModalAsignarTurno(false)}
        onSubmit={handleGuardarTurno}
        empleado={empleadoSeleccionado}
        empleadoSeleccionadoId={empleadoSeleccionado?.id}
        setEmpleadoSeleccionadoId={() => {}}
        empleadosDisponibles={empleados}
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
        tipoFrecuencia={tipoFrecuencia}
        setTipoFrecuencia={setTipoFrecuencia}
        repeticionesPeriodo={repeticionesPeriodo}
        setRepeticionesPeriodo={setRepeticionesPeriodo}
        semanaAlterna={semanaAlterna}
        setSemanaAlterna={setSemanaAlterna}
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
