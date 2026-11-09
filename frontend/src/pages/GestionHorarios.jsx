import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  Eye,
  Sliders,
  Loader2,
  Lock,
  BookOpen,
  Briefcase,
  Filter,
  ArrowRight,
  User,
  Users,
} from "lucide-react";
import {
  getEmpleadosActivos,
  getEmpleadoHorarios,
  addEmpleadoHorario,
  removeEmpleadoHorario,
  getMetricasEmpleado,
} from "../services/empleadoService";
import { getCategorias, getHorarios } from "../services/configuracionService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalDetalleCronograma from "../components/personal/ModalDetalleCronograma";
import ModalAsignarTurno from "../components/personal/ModalAsignarTurno";
import PaginadorTabla from "../components/comunes/PaginadorTabla";
import { useAuth } from "../context/AuthContext";

import {
  DIAS_MAP,
  MAPA_DIAS_NUMERO,
  getPestanaBgClass,
  getBadgeColorClasses,
} from "../utils/categoriasHorariosUtils";

const ITEMS_POR_PAGINA = 12;

export default function GestionHorarios() {
  const navigate = useNavigate();
  const { tienePermiso } = useAuth();

  const puedeCrear =
    tienePermiso("HORARIOS_GESTIONAR") || tienePermiso("PERM_ADMIN_TOTAL");
  const puedeEditar =
    tienePermiso("HORARIOS_GESTIONAR") || tienePermiso("PERM_ADMIN_TOTAL");
  const puedeEliminar =
    tienePermiso("HORARIOS_ELIMINAR") || tienePermiso("PERM_ADMIN_TOTAL");

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [horariosPreestablecidos, setHorariosPreestablecidos] = useState([]);

  const [paginaActual, setPaginaActual] = useState(1);
  const [searchEmpleado, setSearchEmpleado] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("TODAS");

  const [modalDetalle, setModalDetalle] = useState(false);
  const [empleadoEnModal, setEmpleadoEnModal] = useState(null);
  const [horariosEmpleadoModal, setHorariosEmpleadoModal] = useState([]);
  const [metricasEmpleadoModal, setMetricasEmpleadoModal] = useState(null);

  const hoyIso = new Date().toISOString().split("T")[0];
  const [fechaDesdeTurno, setFechaDesdeTurno] = useState(hoyIso);

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

  const [horasObjetivoTurno, setHorasObjetivoTurno] = useState(4);
  const [etiquetaFlexibleTurno, setEtiquetaFlexibleTurno] = useState(
    "Bolsa de Horas Flexible",
  );

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

  const cargarCatalogos = useCallback(async (forzar = false) => {
    setLoading(true);
    try {
      const [empRes, catRes, horRes] = await Promise.all([
        getEmpleadosActivos(forzar),
        getCategorias(),
        getHorarios(),
      ]);

      const emps = Array.isArray(empRes) ? empRes : [];
      setEmpleados(emps);

      const cats = Array.isArray(catRes) ? catRes : [];
      setCategorias(cats);
      setHorariosPreestablecidos(Array.isArray(horRes) ? horRes : []);
    } catch (err) {
      console.error("Error al cargar datos de horarios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos(false);
  }, [cargarCatalogos]);

  useEffect(() => {
    let debounceTimer = null;

    const handleSincronizacionGlobal = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        cargarCatalogos(false);
      }, 600);
    };

    window.addEventListener("datos:actualizados", handleSincronizacionGlobal);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener(
        "datos:actualizados",
        handleSincronizacionGlobal,
      );
    };
  }, [cargarCatalogos]);

  const esVistaDocentePura = useMemo(() => {
    return (
      categoriaActiva.toLowerCase() === "docentes" ||
      categoriaActiva.toLowerCase() === "docente"
    );
  }, [categoriaActiva]);

  // Filtrado de la nómina
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      const perteneceCat =
        categoriaActiva === "TODAS" ||
        (emp.categorias || []).some(
          (c) => c.nombre?.toLowerCase() === categoriaActiva.toLowerCase(),
        ) ||
        emp.categoria?.nombre?.toLowerCase() === categoriaActiva.toLowerCase();

      const q = searchEmpleado.toLowerCase();
      const matchSearch =
        `${emp.nombre || ""} ${emp.apellido || ""} ${emp.nroLegajo || ""}`
          .toLowerCase()
          .includes(q);

      return perteneceCat && matchSearch;
    });
  }, [empleados, categoriaActiva, searchEmpleado]);

  // Cálculo de páginas totales
  const totalPaginas = Math.max(
    1,
    Math.ceil(empleadosFiltrados.length / ITEMS_POR_PAGINA),
  );

  // Autoajuste si el filtro reduce la cantidad de páginas existentes
  useEffect(() => {
    if (paginaActual > totalPaginas && totalPaginas > 0) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  // Elementos recortados para la vista actual
  const empleadosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return empleadosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [empleadosFiltrados, paginaActual]);

  const abrirCronograma = async (emp) => {
    setEmpleadoEnModal(emp);
    try {
      const [hRes, mRes] = await Promise.all([
        getEmpleadoHorarios(emp.id),
        getMetricasEmpleado(emp.id),
      ]);
      setHorariosEmpleadoModal(hRes || []);
      setMetricasEmpleadoModal(mRes);
    } catch {
      setHorariosEmpleadoModal([]);
      setMetricasEmpleadoModal(null);
    }
    setModalDetalle(true);
  };

  const abrirTurno = (emp) => {
    if (!puedeEditar && !puedeCrear) return;
    setEmpleadoEnModal(emp);
    setTolIngresoEsp(emp.toleranciaIngresoMin ?? 15);
    setTolEgresoEsp(emp.toleranciaEgresoMin ?? 10);
    setTipoAsignacionTurno("PREESTABLECIDO");
    setHorarioGeneralSeleccionado(horariosPreestablecidos[0]?.id || "");
    setTipoFrecuenciaTurno("SEMANAL");
    setRepeticionesPeriodoTurno(1);
    setSemanaAlternaTurno("PAR");
    setHorasObjetivoTurno(4);
    setEtiquetaFlexibleTurno("Bolsa de Horas Flexible");
    setFechaDesdeTurno(hoyIso);
    setModalAsignarTurno(true);
  };

  const handleGuardarTurno = async (forzar = false) => {
    const esForzado = typeof forzar === "boolean" ? forzar : false;
    if (!empleadoEnModal) return;

    try {
      if (tipoAsignacionTurno === "FLEXIBLE") {
        if (!horasObjetivoTurno || horasObjetivoTurno <= 0) {
          mostrarAviso(
            "warning",
            "Atención",
            "Debe ingresar una cantidad válida de horas.",
          );
          return;
        }

        await addEmpleadoHorario(empleadoEnModal.id, {
          diasSemana: [],
          horaEntrada: null,
          horaSalida: null,
          horasObjetivo: Number(horasObjetivoTurno),
          etiqueta: etiquetaFlexibleTurno || "Bolsa de Horas Flexible",
          materiaId: null,
          aula: null,
          forzarGuardado: true,
          tipoFrecuencia: tipoFrecuenciaTurno,
          repeticionesPeriodo:
            tipoFrecuenciaTurno === "MENSUAL" || tipoFrecuenciaTurno === "ANUAL"
              ? repeticionesPeriodoTurno
              : 1,
          semanaAlterna:
            tipoFrecuenciaTurno === "SEMANA_POR_MEDIO"
              ? semanaAlternaTurno
              : null,
          fechaDesde: fechaDesdeTurno || hoyIso,
        });
      } else if (tipoAsignacionTurno === "PREESTABLECIDO") {
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

        await addEmpleadoHorario(empleadoEnModal.id, {
          diasSemana: diasArray,
          horaEntrada: plantilla.horaEntrada,
          horaSalida: plantilla.horaEgreso,
          horasObjetivo: null,
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
          fechaDesde: fechaDesdeTurno || hoyIso,
        });
      } else {
        const diasNumericos = diasEspecificos.map(
          (d) => MAPA_DIAS_NUMERO[d] || 1,
        );
        for (const r of rangosEspecificos) {
          await addEmpleadoHorario(empleadoEnModal.id, {
            diasSemana: diasNumericos,
            horaEntrada:
              r.horaDesde.length === 5 ? `${r.horaDesde}:00` : r.horaDesde,
            horaSalida:
              r.horaHasta.length === 5 ? `${r.horaHasta}:00` : r.horaHasta,
            horasObjetivo: null,
            materiaId: null,
            etiqueta: r.etiqueta || "Personalizado",
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
            fechaDesde: fechaDesdeTurno || hoyIso,
          });
        }
      }

      setModalAsignarTurno(false);
      await cargarCatalogos(true);
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

  const handleConfirmarEliminarFranja = (franja) => {
    if (!puedeEliminar) return;

    const esMateria = Boolean(franja.materia);
    const titulo = esMateria
      ? "¿Desvincular cátedra del docente?"
      : "¿Dar de baja franja horaria?";
    const mensaje = esMateria
      ? `¿Está seguro de desvincular la clase de "${franja.materia.nombre}"? La materia quedará vacante pero mantendrá sus horarios.`
      : `¿Está seguro de dar de baja este bloque horario laboral?`;

    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo,
      mensaje,
      textoConfirmar: "Sí, quitar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await removeEmpleadoHorario(franja.id || franja.idEmpleadoHorario);
          const [hRes, mRes] = await Promise.all([
            getEmpleadoHorarios(empleadoEnModal.id),
            getMetricasEmpleado(empleadoEnModal.id),
          ]);
          setHorariosEmpleadoModal(hRes || []);
          setMetricasEmpleadoModal(mRes);
          await cargarCatalogos(true);
          mostrarAviso(
            "success",
            "Éxito",
            "La franja fue desvinculada del cronograma.",
          );
        } catch {
          mostrarAviso("danger", "Error", "No se pudo eliminar el bloque.");
        }
      },
    });
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-5 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Gestión de Horarios y Cronogramas
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Administración de turnos para el personal y consulta de
              cronogramas docentes.
            </p>
          </div>
        </div>
      </div>

      {/* Selector de Categoría */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Categoría de Personal:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setCategoriaActiva("TODAS");
              setPaginaActual(1);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              categoriaActiva === "TODAS"
                ? "bg-[#111827] text-white shadow-xs"
                : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60"
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Todas las Categorías</span>
          </button>

          {categorias.map((cat) => {
            const activa =
              categoriaActiva.toLowerCase() === cat.nombre.toLowerCase();
            const esDoc = cat.nombre.toLowerCase().includes("docente");
            const estiloActivo = getPestanaBgClass(cat.colorIdentificacion);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoriaActiva(cat.nombre);
                  setPaginaActual(1);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activa
                    ? estiloActivo
                    : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60"
                }`}
              >
                {esDoc ? (
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{cat.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por empleado o legajo..."
            value={searchEmpleado}
            onChange={(e) => {
              setSearchEmpleado(e.target.value);
              setPaginaActual(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
          Total en{" "}
          <strong className="text-slate-800 font-bold">
            {categoriaActiva === "TODAS"
              ? "Todas las Categorías"
              : categoriaActiva}
          </strong>
          : {empleadosFiltrados.length} empleados
        </div>
      </div>

      {/* Tabla y Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
            <span className="text-xs font-medium">
              Cargando nómina de horarios...
            </span>
          </div>
        ) : empleadosPaginados.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">
            No se encontraron empleados registrados en{" "}
            {categoriaActiva === "TODAS"
              ? "el sistema"
              : `la categoría ${categoriaActiva}`}
            .
          </div>
        ) : (
          <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden divide-y divide-slate-100">
              {empleadosPaginados.map((emp) => {
                const cargosList = emp.cargos || [];
                const esDocente =
                  (emp.categorias || []).some((c) =>
                    (c.nombre || c.codigoTag || "")
                      .toLowerCase()
                      .includes("docente"),
                  ) ||
                  (emp.categoria?.nombre || "")
                    .toLowerCase()
                    .includes("docente");

                const categoriasEmp =
                  emp.categorias && emp.categorias.length > 0
                    ? emp.categorias
                    : emp.categoria
                      ? [emp.categoria]
                      : [];

                return (
                  <div
                    key={emp.id}
                    className="p-4 flex flex-col gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {emp.apellido}, {emp.nombre}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Legajo:{" "}
                            <span className="font-semibold text-slate-700">
                              {emp.nroLegajo || "Sin asignar"}
                            </span>{" "}
                            • DNI: {emp.dni || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                      {categoriaActiva === "TODAS" && (
                        <div className="flex flex-wrap gap-1 mb-0.5">
                          {categoriasEmp.length > 0 ? (
                            categoriasEmp.map((cat, idx) => (
                              <span
                                key={cat.id || idx}
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getBadgeColorClasses(
                                  cat.colorIdentificacion,
                                )}`}
                              >
                                {cat.nombre || "General"}
                              </span>
                            ))
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-50 text-slate-600 border-slate-200">
                              General
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Cargo:
                        </span>
                        {cargosList.length > 0 ? (
                          cargosList.map((c, i) => (
                            <span
                              key={c.id || i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
                            >
                              {c.nombre || c}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Sin cargos asignados
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/80">
                      <button
                        type="button"
                        onClick={() => abrirCronograma(emp)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>Cronograma</span>
                      </button>

                      {puedeCrear || puedeEditar ? (
                        esVistaDocentePura ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/materias", {
                                state: { tab: "catalogo", docenteId: emp.id },
                              })
                            }
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 font-bold rounded-xl text-xs transition cursor-pointer border border-purple-200"
                          >
                            <span>Materias</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => abrirTurno(emp)}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                            >
                              <Sliders className="w-3.5 h-3.5 shrink-0" />
                              <span>Asignar Horario</span>
                            </button>
                            {categoriaActiva === "TODAS" && esDocente && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/materias", {
                                    state: {
                                      tab: "catalogo",
                                      docenteId: emp.id,
                                    },
                                  })
                                }
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition cursor-pointer border border-purple-200"
                              >
                                <span>Materias</span>
                                <ArrowRight className="w-3 h-3 shrink-0" />
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-400 font-bold rounded-xl text-xs">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloqueado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 tracking-wider">Empleado</th>
                    <th className="px-6 py-3.5 tracking-wider">
                      Cargos / Puestos
                    </th>
                    <th className="px-6 py-3.5 tracking-wider">
                      Cronograma Semanal
                    </th>
                    <th className="px-6 py-3.5 tracking-wider text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {empleadosPaginados.map((emp) => {
                    const cargosList = emp.cargos || [];
                    const esDocente =
                      (emp.categorias || []).some((c) =>
                        (c.nombre || c.codigoTag || "")
                          .toLowerCase()
                          .includes("docente"),
                      ) ||
                      (emp.categoria?.nombre || "")
                        .toLowerCase()
                        .includes("docente");

                    const categoriasEmp =
                      emp.categorias && emp.categorias.length > 0
                        ? emp.categorias
                        : emp.categoria
                          ? [emp.categoria]
                          : [];

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {emp.apellido}, {emp.nombre}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            Legajo: {emp.nroLegajo || "Sin asignar"} • DNI:{" "}
                            {emp.dni || "-"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {categoriaActiva === "TODAS" && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {categoriasEmp.length > 0 ? (
                                categoriasEmp.map((cat, idx) => (
                                  <span
                                    key={cat.id || idx}
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getBadgeColorClasses(
                                      cat.colorIdentificacion,
                                    )}`}
                                  >
                                    {cat.nombre || "General"}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-50 text-slate-600 border-slate-200">
                                  General
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {cargosList.length > 0 ? (
                              cargosList.map((cg, i) => (
                                <span
                                  key={cg.id || i}
                                  className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium"
                                >
                                  {cg.nombre || cg}
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
                            type="button"
                            onClick={() => abrirCronograma(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver cronograma</span>
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            {puedeCrear || puedeEditar ? (
                              esVistaDocentePura ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate("/materias", {
                                      state: {
                                        tab: "catalogo",
                                        docenteId: emp.id,
                                      },
                                    })
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition cursor-pointer border border-purple-200"
                                >
                                  <span>Gestionar Materias</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => abrirTurno(emp)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span>Asignar Horario</span>
                                  </button>

                                  {categoriaActiva === "TODAS" && esDocente && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate("/materias", {
                                          state: {
                                            tab: "catalogo",
                                            docenteId: emp.id,
                                          },
                                        })
                                      }
                                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition cursor-pointer border border-purple-200"
                                    >
                                      <span>Materias</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )
                            ) : (
                              <span className="p-1 text-slate-300 cursor-not-allowed">
                                <Lock className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Paginador Modularizado */}
        <PaginadorTabla
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          totalElementos={empleadosFiltrados.length}
          itemsPorPagina={ITEMS_POR_PAGINA}
          onCambiarPagina={(nuevaPag) => setPaginaActual(nuevaPag)}
          etiqueta="empleados"
        />
      </div>

      <ModalDetalleCronograma
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        empleado={empleadoEnModal}
        clases={horariosEmpleadoModal}
        metricas={metricasEmpleadoModal}
        diasMap={DIAS_MAP}
        onOpenAsignarClase={() =>
          navigate("/materias", {
            state: { tab: "catalogo", docenteId: empleadoEnModal?.id },
          })
        }
        onEliminarClase={(franja) => handleConfirmarEliminarFranja(franja)}
        onOpenAsignarTurno={(emp) => {
          setModalDetalle(false);
          abrirTurno(emp);
        }}
        puedeEditar={puedeEditar}
        puedeEliminar={puedeEliminar}
      />

      <ModalAsignarTurno
        isOpen={modalAsignarTurno}
        onClose={() => setModalAsignarTurno(false)}
        onSubmit={handleGuardarTurno}
        empleado={empleadoEnModal}
        empleadoSeleccionadoId={empleadoEnModal?.id}
        setEmpleadoSeleccionadoId={() => {}}
        empleadosDisponibles={empleadosFiltrados}
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
        horasObjetivo={horasObjetivoTurno}
        setHorasObjetivo={setHorasObjetivoTurno}
        etiquetaFlexible={etiquetaFlexibleTurno}
        setEtiquetaFlexible={setEtiquetaFlexibleTurno}
        fechaDesde={fechaDesdeTurno}
        setFechaDesde={setFechaDesdeTurno}
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
