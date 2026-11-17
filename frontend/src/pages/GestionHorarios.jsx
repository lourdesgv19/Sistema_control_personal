import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  BookOpen,
  Briefcase,
  Filter,
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
import ModalAsignarTurno from "../components/personal/ModalAsignarTurno";
import PaginadorTabla from "../components/comunes/PaginadorTabla";
import TablaEmpleadosHorarios from "../components/horarios/TablaEmpleadosHorarios";
import { useAuth } from "../context/AuthContext";

import {
  DIAS_MAP,
  MAPA_DIAS_NUMERO,
  getPestanaBgClass,
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

  // Estado del acordeón desplegable
  const [filasExpandidas, setFilasExpandidas] = useState({});
  const [cargandoDetalle, setCargandoDetalle] = useState({});
  const [detallesPorEmpleado, setDetallesPorEmpleado] = useState({});

  const [empleadoEnModal, setEmpleadoEnModal] = useState(null);

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

      setEmpleados(Array.isArray(empRes) ? empRes : []);
      setCategorias(Array.isArray(catRes) ? catRes : []);
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

  const refrescarDetalleEmpleado = useCallback(async (empId) => {
    setCargandoDetalle((prev) => ({ ...prev, [empId]: true }));
    try {
      const [hRes, mRes] = await Promise.all([
        getEmpleadoHorarios(empId),
        getMetricasEmpleado(empId),
      ]);
      setDetallesPorEmpleado((prev) => ({
        ...prev,
        [empId]: {
          clases: hRes || [],
          metricas: mRes || null,
        },
      }));
    } catch {
      setDetallesPorEmpleado((prev) => ({
        ...prev,
        [empId]: {
          clases: [],
          metricas: null,
        },
      }));
    } finally {
      setCargandoDetalle((prev) => ({ ...prev, [empId]: false }));
    }
  }, []);

  const handleToggleExpandir = async (emp) => {
    const yaAbierto = !!filasExpandidas[emp.id];
    setFilasExpandidas((prev) => ({
      ...prev,
      [emp.id]: !yaAbierto,
    }));

    if (!yaAbierto && !detallesPorEmpleado[emp.id]) {
      await refrescarDetalleEmpleado(emp.id);
    }
  };

  const handleIrAMaterias = (docenteId) => {
    navigate("/materias", {
      state: { tab: "catalogo", docenteId },
    });
  };

  const esVistaDocentePura = useMemo(() => {
    return (
      categoriaActiva.toLowerCase() === "docentes" ||
      categoriaActiva.toLowerCase() === "docente"
    );
  }, [categoriaActiva]);

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

  const totalPaginas = Math.max(
    1,
    Math.ceil(empleadosFiltrados.length / ITEMS_POR_PAGINA),
  );

  useEffect(() => {
    if (paginaActual > totalPaginas && totalPaginas > 0) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  const empleadosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return empleadosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [empleadosFiltrados, paginaActual]);

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

    const empIdActual = empleadoEnModal.id;

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

        await addEmpleadoHorario(empIdActual, {
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

        await addEmpleadoHorario(empIdActual, {
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
          await addEmpleadoHorario(empIdActual, {
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
      setFilasExpandidas((prev) => ({ ...prev, [empIdActual]: true }));
      await Promise.all([
        cargarCatalogos(true),
        refrescarDetalleEmpleado(empIdActual),
      ]);
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

  const handleConfirmarEliminarFranja = (emp, franja) => {
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
          await Promise.all([
            refrescarDetalleEmpleado(emp.id),
            cargarCatalogos(true),
          ]);
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
      {/* Cabecera */}
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

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Tabla Modularizada con Desglose Desplegable */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <TablaEmpleadosHorarios
          loading={loading}
          empleados={empleadosPaginados}
          categoriaActiva={categoriaActiva}
          esVistaDocentePura={esVistaDocentePura}
          filasExpandidas={filasExpandidas}
          cargandoDetalle={cargandoDetalle}
          detallesPorEmpleado={detallesPorEmpleado}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onToggleExpandir={handleToggleExpandir}
          onAbrirTurno={abrirTurno}
          onIrAMaterias={handleIrAMaterias}
          onEliminarFranja={handleConfirmarEliminarFranja}
        />

        <PaginadorTabla
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          totalElementos={empleadosFiltrados.length}
          itemsPorPagina={ITEMS_POR_PAGINA}
          onCambiarPagina={(nuevaPag) => setPaginaActual(nuevaPag)}
          etiqueta="empleados"
        />
      </div>

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
