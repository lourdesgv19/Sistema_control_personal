import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Users,
  Search,
  Plus,
  Clock,
  Eye,
  Sliders,
  Loader2,
  Lock,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getEmpleadosActivos,
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
import { getBadgeColorClasses } from "./TiposConfiguracion";
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

const ITEMS_POR_PAGINA = 12;

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

// Mapeo para fondo sólido del botón activo de la pestaña superior
const getPestanaBgClass = (color) => {
  switch (color?.toLowerCase()) {
    case "emerald":
      return "bg-[#10b981] text-white shadow-xs";
    case "amber":
      return "bg-[#f59e0b] text-white shadow-xs";
    case "purple":
      return "bg-[#a855f7] text-white shadow-xs";
    case "cyan":
      return "bg-[#06b6d4] text-white shadow-xs";
    case "rose":
      return "bg-[#f43f5e] text-white shadow-xs";
    case "indigo":
    default:
      return "bg-[#4338ca] text-white shadow-xs";
  }
};

const getDotColorClass = (color) => {
  switch (color?.toLowerCase()) {
    case "emerald":
      return "bg-emerald-600";
    case "amber":
      return "bg-amber-600";
    case "purple":
      return "bg-purple-600";
    case "cyan":
      return "bg-cyan-600";
    case "rose":
      return "bg-rose-600";
    case "indigo":
    default:
      return "bg-indigo-600";
  }
};

export default function GestionHorarios() {
  const { tienePermiso } = useAuth();

  const puedeCrear = tienePermiso("HORARIOS_GESTIONAR");
  const puedeEditar = tienePermiso("HORARIOS_EDITAR");
  const puedeEliminar = tienePermiso("HORARIOS_ELIMINAR");

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [horariosPreestablecidos, setHorariosPreestablecidos] = useState([]);
  const [materias, setMaterias] = useState([]);

  // Mapa con las franjas horarias de cada empleado
  const [franjasPorEmpleado, setFranjasPorEmpleado] = useState({});

  // Paginación y búsqueda
  const [paginaActual, setPaginaActual] = useState(1);
  const [searchEmpleado, setSearchEmpleado] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Docentes");

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

  const cargarCatalogos = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, catRes, horRes, matRes] = await Promise.all([
        getEmpleadosActivos(),
        getCategorias(),
        getHorarios(),
        getMaterias(),
      ]);

      const emps = Array.isArray(empRes) ? empRes : [];
      setEmpleados(emps);

      const cats = Array.isArray(catRes) ? catRes : [];
      setCategorias(cats);
      setHorariosPreestablecidos(Array.isArray(horRes) ? horRes : []);
      setMaterias(Array.isArray(matRes) ? matRes : []);

      if (
        cats.length > 0 &&
        !cats.some(
          (c) => c.nombre.toLowerCase() === categoriaActiva.toLowerCase(),
        )
      ) {
        setCategoriaActiva(cats[0].nombre);
      }

      // Carga directa de las franjas de cada empleado
      const mapaFranjas = {};
      await Promise.allSettled(
        emps.map(async (emp) => {
          try {
            const franjas = await getEmpleadoHorarios(emp.id);
            mapaFranjas[emp.id] = Array.isArray(franjas)
              ? franjas.filter((f) => f.activo !== false)
              : [];
          } catch (e) {
            mapaFranjas[emp.id] = [];
          }
        }),
      );
      setFranjasPorEmpleado(mapaFranjas);
    } catch (err) {
      console.error("Error al cargar datos de horarios:", err);
    } finally {
      setLoading(false);
    }
  }, [categoriaActiva]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const esVistaDocente = useMemo(() => {
    return categoriaActiva.toLowerCase().includes("docente");
  }, [categoriaActiva]);

  // Categoría actual seleccionada
  const categoriaObjetoActiva = useMemo(() => {
    return categorias.find(
      (c) => c.nombre?.toLowerCase() === categoriaActiva.toLowerCase(),
    );
  }, [categorias, categoriaActiva]);

  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      const perteneceCat =
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

  const totalPaginas =
    Math.ceil(empleadosFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const empleadosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return empleadosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [empleadosFiltrados, paginaActual]);

  // Determinar régimen con estilo respetando el color de su categoría
  const obtenerInfoRegimen = (emp) => {
    const franjas = franjasPorEmpleado[emp.id] || [];

    if (franjas.length === 0) {
      return {
        titulo: "Sin Horario Asignado",
        subtitulo: "Pendiente de configuración",
        clasesBadge: "bg-slate-50 text-slate-500 border-slate-200",
        colorPunto: "bg-slate-400",
      };
    }

    const tieneMaterias = franjas.some((f) => f.materia != null);
    if (tieneMaterias) {
      const colorDocente =
        categoriaObjetoActiva?.colorIdentificacion || "purple";
      return {
        titulo: "Por Cátedra",
        subtitulo: `${franjas.length} clases semanales`,
        clasesBadge: getBadgeColorClasses(colorDocente),
        colorPunto: getDotColorClass(colorDocente), // Sincronizado
      };
    }

    const primeraEtiqueta = franjas.find(
      (f) => f.etiqueta && f.etiqueta.trim() !== "",
    )?.etiqueta;
    const diasUnicos = new Set(franjas.map((f) => f.diaSemana)).size;

    if (!primeraEtiqueta || primeraEtiqueta.toLowerCase() === "personalizado") {
      return {
        titulo: "Personalizado",
        subtitulo: `${diasUnicos} días laborables`,
        clasesBadge: "bg-cyan-50 text-cyan-700 border-cyan-300",
        colorPunto: "bg-cyan-600",
      };
    }

    // Color asignado a la categoría del colaborador
    const colorCat =
      emp.categorias?.[0]?.colorIdentificacion ||
      emp.categoria?.colorIdentificacion ||
      categoriaObjetoActiva?.colorIdentificacion ||
      "indigo";

    return {
      titulo: primeraEtiqueta,
      subtitulo: `${diasUnicos} días laborables`,
      clasesBadge: getBadgeColorClasses(colorCat),
      colorPunto: getDotColorClass(colorCat), // Toma el mismo tono que el texto y borde
    };
  };

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
    setModalAsignarTurno(true);
  };

  const abrirClase = (emp) => {
    if (!puedeEditar && !puedeCrear) return;
    setEmpleadoEnModal(emp);
    setFormClase(FORM_CLASE_INICIAL);
    setModalAsignarClase(true);
  };

  const handleGuardarTurno = async (forzar = false) => {
    const esForzado = typeof forzar === "boolean" ? forzar : false;
    if (!empleadoEnModal) return;

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

        await addEmpleadoHorario(empleadoEnModal.id, {
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
          await addEmpleadoHorario(empleadoEnModal.id, {
            diasSemana: diasNumericos,
            horaEntrada:
              r.horaDesde.length === 5 ? `${r.horaDesde}:00` : r.horaDesde,
            horaSalida:
              r.horaHasta.length === 5 ? `${r.horaHasta}:00` : r.horaHasta,
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
          });
        }
      }

      setModalAsignarTurno(false);
      await cargarCatalogos();
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

  const handleGuardarClase = async (e, forzar = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!empleadoEnModal) return;

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
        etiqueta: formClase.materia || "Por Cátedra",
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

      await addEmpleadoHorario(empleadoEnModal.id, payload);
      setModalAsignarClase(false);
      setFormClase(FORM_CLASE_INICIAL);
      await cargarCatalogos();
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
              Gestión de Horarios y Cronogramas
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Administración de turnos y cátedras por empleado. Haga clic en{" "}
              <strong>Ver cronograma</strong> para consultar el detalle de cada
              día.
            </p>
          </div>
        </div>

        {/* PESTAÑAS DE CATEGORÍA SUPERIOR (FONDO DINÁMICO SEGÚN EL COLOR CONFIGURADO) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activa
                    ? estiloActivo
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

      {/* 2. BARRA DE BÚSQUEDA */}
      <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
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
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total en <strong className="text-slate-800">{categoriaActiva}</strong>
          : {empleadosFiltrados.length} empleados
        </div>
      </div>

      {/* 3. TABLA CENTRAL */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5 tracking-wider">Empleado</th>
                <th className="px-6 py-3.5 tracking-wider">Cargos / Puestos</th>
                <th className="px-6 py-3.5 tracking-wider">Régimen & Estado</th>
                <th className="px-6 py-3.5 tracking-wider">
                  Cronograma Semanal
                </th>
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
                    Cargando nómina de horarios...
                  </td>
                </tr>
              ) : empleadosPaginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-slate-400 text-xs italic"
                  >
                    No se encontraron empleados registrados en la categoría{" "}
                    {categoriaActiva}.
                  </td>
                </tr>
              ) : (
                empleadosPaginados.map((emp) => {
                  const cargosStr =
                    (emp.cargos || []).map((c) => c.nombre || c).join(", ") ||
                    "General";
                  const regimenInfo = obtenerInfoRegimen(emp);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Empleado */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {emp.apellido}, {emp.nombre}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Legajo: {emp.nroLegajo || "Sin asignar"} • DNI:{" "}
                          {emp.dni || "-"}
                        </div>
                      </td>

                      {/* Cargos */}
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                          {cargosStr}
                        </span>
                      </td>

                      {/* Régimen & Estado: Respeta el color configurado de la categoría */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${regimenInfo.clasesBadge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${regimenInfo.colorPunto}`}
                          ></span>
                          {regimenInfo.titulo}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {regimenInfo.subtitulo}
                        </div>
                      </td>

                      {/* Botón Ver Cronograma */}
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

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          {puedeCrear || puedeEditar ? (
                            esVistaDocente ? (
                              <button
                                type="button"
                                onClick={() => abrirClase(emp)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition cursor-pointer"
                                title="Asignar cátedra a docente"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Asignar Clase</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => abrirTurno(emp)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                                title="Asignar o editar franja laboral"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Asignar Horario</span>
                              </button>
                            )
                          ) : (
                            <span
                              className="p-1 text-slate-300 cursor-not-allowed"
                              title="Sin permisos"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. CONTROLES DE PAGINACIÓN */}
        <div className="bg-white px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Mostrando{" "}
            <span className="font-bold text-slate-800">
              {empleadosFiltrados.length === 0
                ? 0
                : (paginaActual - 1) * ITEMS_POR_PAGINA + 1}
            </span>{" "}
            a{" "}
            <span className="font-bold text-slate-800">
              {Math.min(
                paginaActual * ITEMS_POR_PAGINA,
                empleadosFiltrados.length,
              )}
            </span>{" "}
            de{" "}
            <span className="font-bold text-slate-800">
              {empleadosFiltrados.length}
            </span>{" "}
            empleados
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
                      ? "bg-[#4338ca] text-white shadow-xs"
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

      {/* MODALES REUTILIZADOS */}
      <ModalDetalleCronograma
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        empleado={empleadoEnModal}
        clases={horariosEmpleadoModal}
        metricas={metricasEmpleadoModal}
        diasMap={DIAS_MAP}
        onOpenAsignarClase={() => {
          setModalDetalle(false);
          abrirClase(empleadoEnModal);
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
            await cargarCatalogos();
          } catch {
            mostrarAviso("danger", "Error", "No se pudo eliminar el bloque.");
          }
        }}
        onOpenAsignarTurno={(emp) => {
          setModalDetalle(false);
          abrirTurno(emp);
        }}
        puedeEditar={puedeEditar}
        puedeEliminar={puedeEliminar}
      />

      <ModalAsignarClase
        isOpen={modalAsignarClase}
        onClose={() => setModalAsignarClase(false)}
        onSubmit={handleGuardarClase}
        formClase={formClase}
        setFormClase={setFormClase}
        empleado={empleadoEnModal}
        docenteSeleccionadoId={empleadoEnModal?.id}
        setDocenteSeleccionadoId={() => {}}
        docentesDisponibles={empleadosFiltrados}
        materiasActivas={materias}
        onMateriaCreada={(nueva) => setMaterias((prev) => [...prev, nueva])}
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
