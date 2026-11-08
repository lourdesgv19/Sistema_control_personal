import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  AlertCircle,
  RotateCcw,
  Repeat,
  CalendarCheck,
  UserPlus,
  UserMinus,
  Search,
} from "lucide-react";
import {
  getCatalogoMateriasPaginado,
  reactivarMateria,
  desvincularDocenteMateria,
  desvincularComisionMateria,
} from "../../services/gestionMateriasService";
import ModalAlerta from "../comunes/ModalAlerta";

const DIAS_ORDEN = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ITEMS_POR_PAGINA = 10;

export default function CatalogoMateriasABM({
  onNuevaMateria,
  onEditarMateria,
  onEditarHorario,
  onAsignarDocente,
  onEliminarMateria,
  docenteInicialId = null,
  filtroDocente = "",
  busqueda: busquedaProp = "",
  puedeCrear,
  puedeEditar,
  puedeGestionarDocente,
  puedeEliminar,
}) {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("ACTIVOS");
  const [busquedaLocal, setBusquedaLocal] = useState(busquedaProp);

  // Paginación desde Servidor (Spring Data)
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  const puedeOperarDocente = Boolean(puedeGestionarDocente);

  const [modalAlerta, setModalAlerta] = useState({
    isOpen: false,
    tipo: "info",
    titulo: "",
    mensaje: "",
    textoConfirmar: "Confirmar",
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

  // Carga paginada desde el servidor
  const cargarDatos = useCallback(
    async (pageIndex = 0) => {
      setLoading(true);
      try {
        const pageSegura = Number.isNaN(Number(pageIndex))
          ? 0
          : Math.max(0, parseInt(pageIndex, 10) || 0);

        const res = await getCatalogoMateriasPaginado({
          q: busquedaLocal.trim(),
          estado: filtroEstado,
          docenteId: filtroDocente || docenteInicialId || undefined,
          page: pageSegura,
          size: ITEMS_POR_PAGINA,
        });

        const data = res.data;
        if (data && data.content) {
          const lista = Array.isArray(data.content) ? data.content : [];
          setMaterias(lista);

          // Compatibilidad: res.page.* (DTO) o res.* (raíz)
          const totalReal =
            data.page?.totalElements ??
            data.totalElements ??
            data.page?.total ??
            lista.length;

          const totalPags =
            data.page?.totalPages ??
            data.totalPages ??
            Math.max(1, Math.ceil(Number(totalReal) / ITEMS_POR_PAGINA));

          const numPag = data.page?.number ?? data.number ?? pageSegura;

          setTotalElementos(Number(totalReal) || 0);
          setTotalPaginas(Math.max(1, Number(totalPags) || 1));
          setPaginaActual((Number(numPag) || 0) + 1);
        } else if (Array.isArray(data)) {
          setMaterias(data);
          setTotalElementos(data.length);
          setTotalPaginas(
            Math.max(1, Math.ceil(data.length / ITEMS_POR_PAGINA)),
          );
          setPaginaActual(1);
        } else {
          setMaterias([]);
          setTotalElementos(0);
          setTotalPaginas(1);
        }
      } catch (err) {
        console.error("Error al cargar catálogo paginado de materias:", err);
        setMaterias([]);
        setTotalElementos(0);
        setTotalPaginas(1);
      } finally {
        setLoading(false);
      }
    },
    [busquedaLocal, filtroEstado, filtroDocente, docenteInicialId],
  );

  // Navegación imperativa directa
  const handleCambiarPagina = (nuevaPagina) => {
    const pag = Math.max(1, Math.min(nuevaPagina, totalPaginas));
    setPaginaActual(pag);
    cargarDatos(pag - 1);
  };

  // Debounce para filtros y búsqueda (reinicia siempre a página 1)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginaActual(1);
      cargarDatos(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [busquedaLocal, filtroEstado, filtroDocente, cargarDatos]);

  // Sincronización reactiva por eventos globales
  useEffect(() => {
    let timerSync = null;
    const handleActualizar = () => {
      if (timerSync) clearTimeout(timerSync);
      timerSync = setTimeout(() => {
        cargarDatos(paginaActual - 1);
      }, 250);
    };

    window.addEventListener("datos:actualizados", handleActualizar);
    return () => {
      if (timerSync) clearTimeout(timerSync);
      window.removeEventListener("datos:actualizados", handleActualizar);
    };
  }, [cargarDatos, paginaActual]);

  const toggleExpandir = (id) => {
    setExpandidos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleTodos = () => {
    const idsPagina = materias.map((m) => m.idMateria);
    const estanTodosPagina = idsPagina.every((id) => expandidos.includes(id));

    if (estanTodosPagina) {
      setExpandidos((prev) => prev.filter((id) => !idsPagina.includes(id)));
    } else {
      setExpandidos((prev) => Array.from(new Set([...prev, ...idsPagina])));
    }
  };

  const handleReactivarMateria = (idMateria, nombreMateria) => {
    if (!puedeEditar) return;

    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar materia?",
      mensaje: `¿Desea reactivar la cátedra "${nombreMateria}" en el catálogo institucional?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await reactivarMateria(idMateria);
          window.dispatchEvent(new CustomEvent("datos:actualizados"));
          await cargarDatos(paginaActual - 1);
          mostrarAviso(
            "success",
            "Reactivada",
            `La cátedra "${nombreMateria}" fue reactivada.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar la materia.");
        }
      },
    });
  };

  const handleConfirmarDesvincularDocente = (materia) => {
    if (!puedeOperarDocente) return;

    setModalAlerta({
      isOpen: true,
      tipo: "warning",
      titulo: "¿Desvincular docente de la cátedra?",
      mensaje: `¿Desea desvincular a "${materia.docenteTitularNombre}" de la materia "${materia.nombre}"? La materia conservará sus días y horarios fijados pero quedará en estado vacante. Los registros históricos del docente no se borrarán.`,
      textoConfirmar: "Sí, desvincular",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await desvincularDocenteMateria(materia.idMateria);
          window.dispatchEvent(new CustomEvent("datos:actualizados"));
          await cargarDatos(paginaActual - 1);
          mostrarAviso(
            "success",
            "Docente Desvinculado",
            `La cátedra "${materia.nombre}" ahora se encuentra sin docente asignado.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo desvincular al docente.");
        }
      },
    });
  };

  const handleConfirmarBajaHorario = (horario, materia) => {
    if (!puedeEliminar) return;

    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja comisión?",
      mensaje: `¿Desea desvincular el horario de ${horario.diaNombre} (${horario.horaInicio} - ${horario.horaFin} hs) de la cátedra "${materia.nombre}"? La materia conservará sus demás comisiones.`,
      textoConfirmar: "Sí, desvincular",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await desvincularComisionMateria(
            materia.idMateria,
            horario.idHorario || null,
            horario.diaSemana || null,
          );
          window.dispatchEvent(new CustomEvent("datos:actualizados"));
          await cargarDatos(paginaActual - 1);
          mostrarAviso(
            "success",
            "Baja Confirmada",
            "La comisión fue desvinculada del cronograma.",
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            "No se pudo eliminar el horario asignado.",
          );
        }
      },
    });
  };

  const renderBadgeTurnoOFrecuencia = (horario) => {
    const frec = (horario.tipoFrecuencia || "SEMANAL").toUpperCase();
    const reps = horario.repeticionesPeriodo || 1;
    const alterna = horario.semanaAlterna || "PAR";

    switch (frec) {
      case "SEMANA_POR_MEDIO":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Repeat className="w-3 h-3 text-amber-600 shrink-0" />
            Quincenal (Sem. {alterna})
          </span>
        );
      case "MENSUAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CalendarCheck className="w-3 h-3 text-blue-600 shrink-0" />
            {reps} {reps === 1 ? "vez al mes" : "veces al mes"}
          </span>
        );
      case "ANUAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <CalendarCheck className="w-3 h-3 text-purple-600 shrink-0" />
            {reps} {reps === 1 ? "vez al año" : "veces al año"}
          </span>
        );
      case "SEMANAL":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {horario.turnoEtiqueta}
          </span>
        );
    }
  };

  const normalizarHora = (h) => {
    if (!h) return "";
    return String(h).trim().slice(0, 5);
  };

  const sonHorariosUniforme = (desglose) => {
    if (!Array.isArray(desglose) || desglose.length === 0) return false;
    if (desglose.length === 1) return true;

    const base = desglose[0];
    const baseIni = normalizarHora(base.horaInicio);
    const baseFin = normalizarHora(base.horaFin);
    const baseFrec = (base.tipoFrecuencia || "SEMANAL").toUpperCase().trim();
    const baseSemAlt = (base.semanaAlterna || "").toUpperCase().trim();
    const baseReps = Number(base.repeticionesPeriodo || 1);

    if (!baseIni || !baseFin) return false;

    return desglose.every((h) => {
      const hIni = normalizarHora(h.horaInicio);
      const hFin = normalizarHora(h.horaFin);
      const hFrec = (h.tipoFrecuencia || "SEMANAL").toUpperCase().trim();
      const hSemAlt = (h.semanaAlterna || "").toUpperCase().trim();
      const hReps = Number(h.repeticionesPeriodo || 1);

      return (
        hIni === baseIni &&
        hFin === baseFin &&
        hFrec === baseFrec &&
        hSemAlt === baseSemAlt &&
        hReps === baseReps
      );
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
      {/* HEADER Y FILTROS INTEGRADOS */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Catálogo de Asignaturas Académicas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {Math.max(Number(totalElementos) || 0, materias.length)} materias
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            Haga clic sobre cualquier fila para desglosar u ocultar los días,
            horarios y profesores asignados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Buscador */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cátedra o aula..."
              value={busquedaLocal}
              onChange={(e) => setBusquedaLocal(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 transition"
            />
          </div>

          {/* Selector Estado */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="ACTIVOS">Solo Activas</option>
              <option value="TODOS">Todas las Materias</option>
              <option value="INACTIVOS">Solo Bajas (Inactivas)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleTodos}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {materias.length > 0 &&
            materias.every((m) => expandidos.includes(m.idMateria)) ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                <span>Colapsar página</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                <span>Desglosar página</span>
              </>
            )}
          </button>

          {puedeCrear && (
            <button
              type="button"
              onClick={onNuevaMateria}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar Materia</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. VISTA MÓVIL (md:hidden) */}
      <div className="md:hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            Consultando asignaturas académicas...
          </div>
        ) : materias.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            No se encontraron materias registradas con los filtros aplicados.
          </div>
        ) : (
          materias.map((materia) => {
            const estaExpandido = expandidos.includes(materia.idMateria);
            const esInactiva = materia.activo === false;
            const horariosIguales = sonHorariosUniforme(
              materia.desgloseHorarios,
            );

            return (
              <div
                key={materia.idMateria}
                className={`p-4 transition-colors ${
                  esInactiva
                    ? "bg-slate-50/70 opacity-75"
                    : estaExpandido
                      ? "bg-indigo-50/30"
                      : "bg-white"
                }`}
              >
                <div
                  onClick={() => toggleExpandir(materia.idMateria)}
                  className="cursor-pointer select-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${
                          esInactiva
                            ? "bg-slate-100 border-slate-200 text-slate-400"
                            : "bg-indigo-50 border-indigo-100 text-[#4b35e6]"
                        }`}
                      >
                        {materia.totalHorarios}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-xs ${
                              esInactiva
                                ? "text-slate-500 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {materia.nombre}
                          </span>
                          {esInactiva && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                              Baja
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {materia.totalHorarios}{" "}
                          {materia.totalHorarios === 1
                            ? "clase por semana"
                            : "clases por semana"}
                        </span>
                      </div>
                    </div>

                    <div className="p-1 text-slate-400">
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          estaExpandido ? "rotate-90 text-indigo-600" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Aula Base
                      </span>
                      <div className="flex items-center gap-1 text-slate-700 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {materia.aulaPredeterminada || "S/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase mb-1">
                      Carga y Días
                    </span>
                    <div className="flex flex-wrap gap-1 items-center">
                      {DIAS_ORDEN.map((dia) => {
                        const activo = (materia.diasResumen || []).includes(
                          dia,
                        );
                        return (
                          <span
                            key={dia}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              activo
                                ? "bg-slate-100 text-slate-800 border-slate-200 font-bold"
                                : "text-slate-300 border-transparent"
                            }`}
                          >
                            {dia}
                          </span>
                        );
                      })}
                      <span className="text-[10px] text-slate-500 font-medium ml-1">
                        • {Number(materia.totalHorasSemanales || 0).toFixed(1)}h
                        / sem
                      </span>
                    </div>
                  </div>

                  {/* Docentes a Cargo */}
                  <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {materia.sinDocente ? (
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 text-amber-800 text-[11px] font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Sin Docente Asignado</span>
                        </div>
                        {puedeOperarDocente && !esInactiva && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAsignarDocente) onAsignarDocente(materia);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Asignar</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-indigo-600">
                            Titular:
                          </span>
                          <span className="font-semibold text-slate-800 text-[11px] truncate">
                            {materia.docenteTitularNombre}
                          </span>
                        </div>
                        {materia.docenteAuxiliarNombre && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-[10px] uppercase font-bold text-purple-600">
                              Auxiliar:
                            </span>
                            <span className="font-medium text-slate-700 text-[11px] truncate">
                              {materia.docenteAuxiliarNombre}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {!esInactiva ? (
                    <>
                      {puedeOperarDocente && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAsignarDocente) onAsignarDocente(materia);
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold hover:bg-purple-100 transition flex items-center gap-1 cursor-pointer"
                          title="Asignar o cambiar profesor de cátedra"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Docente
                        </button>
                      )}

                      {puedeOperarDocente && !materia.sinDocente && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmarDesvincularDocente(materia);
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
                          title="Desvincular docente y dejar cátedra vacante"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Quitar Docente
                        </button>
                      )}

                      {puedeEditar &&
                        (horariosIguales ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEditarMateria) onEditarMateria(materia);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                            Horarios diversos
                          </span>
                        ))}

                      {puedeEliminar && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEliminarMateria)
                              onEliminarMateria(
                                materia.idMateria,
                                materia.nombre,
                              );
                          }}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Baja
                        </button>
                      )}
                    </>
                  ) : (
                    puedeEditar && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactivarMateria(
                            materia.idMateria,
                            materia.nombre,
                          );
                        }}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reactivar
                      </button>
                    )
                  )}
                </div>

                {estaExpandido && (
                  <div className="mt-3 space-y-2 pt-3 border-t-2 border-indigo-100">
                    <span className="text-[11px] font-bold text-indigo-950 block">
                      Comisiones Asignadas:
                    </span>
                    {(materia.desgloseHorarios || []).map((horario, idx) => (
                      <div
                        key={horario.idHorario || `h-mob-${idx}`}
                        className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {horario.diaNombre}
                          </span>
                          {renderBadgeTurnoOFrecuencia(horario)}
                        </div>

                        <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                          <span>
                            {horario.horaInicio} - {horario.horaFin} (
                            {Number(horario.horasClase || 0).toFixed(1)}h)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{horario.aula}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-[11px]">
                          {horario.idDocente ? (
                            <div>
                              <span className="font-semibold text-slate-800">
                                {horario.nombreDocente}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-mono block">
                                Titular • Leg. {horario.legajoDocente}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-700 font-bold text-[10px] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Sin
                              titular asignado
                            </span>
                          )}

                          {materia.docenteAuxiliarNombre && (
                            <div className="mt-1 pt-1 border-t border-slate-100 text-slate-600">
                              <span className="font-medium text-slate-700">
                                {materia.docenteAuxiliarNombre}
                              </span>
                              <span className="text-[9px] uppercase font-bold text-purple-600 block">
                                Auxiliar
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          {puedeOperarDocente &&
                            horario.idDocente &&
                            !esInactiva && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmarDesvincularDocente(materia)
                                }
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Desvincular docente de esta comisión"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Quitar Docente
                              </button>
                            )}

                          {(puedeEditar || puedeOperarDocente) &&
                            !esInactiva && (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditarHorario &&
                                  onEditarHorario(horario, materia)
                                }
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar Comisión
                              </button>
                            )}

                          {puedeEliminar && !esInactiva && (
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmarBajaHorario(horario, materia)
                              }
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 2. VISTA ESCRITORIO (hidden md:block) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Materia / Comisiones</th>
              <th className="py-3 px-4">Aula(s)</th>
              <th className="py-3 px-4">Días & Carga Semanal</th>
              <th className="py-3 px-4">Cuerpo Docente (Titular & Auxiliar)</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-slate-400 text-xs"
                >
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                  Consultando asignaturas académicas...
                </td>
              </tr>
            ) : materias.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-slate-400 text-xs italic"
                >
                  No se encontraron materias registradas con los filtros
                  aplicados.
                </td>
              </tr>
            ) : (
              materias.map((materia) => {
                const estaExpandido = expandidos.includes(materia.idMateria);
                const esInactiva = materia.activo === false;
                const horariosIguales = sonHorariosUniforme(
                  materia.desgloseHorarios,
                );

                return (
                  <React.Fragment key={materia.idMateria}>
                    <tr
                      onClick={() => toggleExpandir(materia.idMateria)}
                      className={`transition-colors cursor-pointer select-none ${
                        esInactiva
                          ? "bg-slate-50/70 opacity-75 hover:bg-slate-100/70"
                          : estaExpandido
                            ? "bg-indigo-50/40 hover:bg-indigo-50/60"
                            : "hover:bg-slate-50/80 bg-white"
                      }`}
                      title="Haga clic para desglosar u ocultar los horarios de esta cátedra"
                    >
                      <td className="py-4 px-4 text-center">
                        <span className="text-slate-400 hover:text-indigo-600 transition p-1 inline-block">
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              estaExpandido ? "rotate-90 text-indigo-600" : ""
                            }`}
                          />
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${
                              esInactiva
                                ? "bg-slate-100 border-slate-200 text-slate-400"
                                : "bg-indigo-50 border-indigo-100 text-[#4b35e6]"
                            }`}
                          >
                            {materia.totalHorarios}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold text-xs block ${
                                  esInactiva
                                    ? "text-slate-500 line-through"
                                    : "text-slate-900"
                                }`}
                              >
                                {materia.nombre}
                              </span>
                              {esInactiva && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200">
                                  Baja
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {materia.totalHorarios}{" "}
                              {materia.totalHorarios === 1
                                ? "clase por semana en cronograma"
                                : "clases por semana en cronograma"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{materia.aulaPredeterminada}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {DIAS_ORDEN.map((dia) => {
                            const activo = (materia.diasResumen || []).includes(
                              dia,
                            );
                            return (
                              <span
                                key={dia}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  activo
                                    ? "bg-slate-100 text-slate-800 border-slate-200 font-bold"
                                    : "text-slate-300 border-transparent"
                                }`}
                              >
                                {dia}
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {Number(materia.totalHorasSemanales || 0).toFixed(1)}h
                          reloj / semana
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {materia.sinDocente ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Sin Docente Asignado</span>
                            </span>
                            {puedeOperarDocente && !esInactiva && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onAsignarDocente)
                                    onAsignarDocente(materia);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                                title="Asignar profesor titular o auxiliar a esta cátedra vacante"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Asignar</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {materia.docenteTitularNombre.charAt(0)}
                              </div>
                              <div className="leading-tight">
                                <span className="font-semibold text-slate-800 text-xs block truncate max-w-[170px]">
                                  {materia.docenteTitularNombre}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block">
                                  Prof. Titular
                                </span>
                              </div>
                            </div>

                            {materia.docenteAuxiliarNombre ? (
                              <div className="flex items-center gap-2 pl-1 border-l-2 border-indigo-200">
                                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                                  {materia.docenteAuxiliarNombre.charAt(0)}
                                </div>
                                <div className="leading-tight">
                                  <span className="font-medium text-slate-700 text-[11px] block truncate max-w-[160px]">
                                    {materia.docenteAuxiliarNombre}
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 block">
                                    Auxiliar / Alterno
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic block pl-1">
                                Sin auxiliar asignado
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td
                        className="py-4 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {!esInactiva ? (
                            <>
                              {puedeOperarDocente && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAsignarDocente)
                                      onAsignarDocente(materia);
                                  }}
                                  className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                  title="Asignar o cambiar profesor de cátedra"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              )}

                              {puedeOperarDocente && !materia.sinDocente && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmarDesvincularDocente(materia);
                                  }}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="Desvincular docente y dejar cátedra vacante"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}

                              {puedeEditar &&
                                (horariosIguales ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onEditarMateria)
                                        onEditarMateria(materia);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                    title="Editar cátedra y horarios unificados"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span
                                    className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md cursor-help"
                                    title="Esta materia tiene horarios o frecuencias diferentes. Haga clic en la fila para desplegar y editar cada comisión individualmente."
                                  >
                                    Horarios diversos
                                  </span>
                                ))}

                              {puedeEliminar && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onEliminarMateria)
                                      onEliminarMateria(
                                        materia.idMateria,
                                        materia.nombre,
                                      );
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Dar de baja materia"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            puedeEditar && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReactivarMateria(
                                    materia.idMateria,
                                    materia.nombre,
                                  );
                                }}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Reactivar cátedra en el catálogo"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* SUBFILAS DE COMISIONES */}
                    {estaExpandido &&
                      (materia.desgloseHorarios || []).map((horario, idx) => (
                        <tr
                          key={horario.idHorario || `h-${idx}`}
                          className="bg-indigo-50/20 border-l-4 border-indigo-600 hover:bg-indigo-50/40 transition-colors text-xs"
                        >
                          <td className="py-3 px-4 text-center">
                            <span className="text-indigo-600 font-bold text-sm">
                              ↳
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {horario.diaNombre}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {horario.horaInicio} - {horario.horaFin} (
                              {Number(horario.horasClase || 0).toFixed(1)}h)
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{horario.aula}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {renderBadgeTurnoOFrecuencia(horario)}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1.5">
                              {!horario.idDocente ? (
                                <span className="text-amber-700 font-bold text-[10px] inline-flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Sin
                                  titular asignado
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {horario.nombreDocente.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs">
                                      {horario.nombreDocente}
                                    </div>
                                    <span className="text-[10px] text-indigo-600 font-semibold font-mono block">
                                      Titular • Leg. {horario.legajoDocente}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {materia.docenteAuxiliarNombre ? (
                                <div className="flex items-center gap-2 pt-1 border-t border-indigo-100/60">
                                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                                    <UserPlus className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-700 text-[11px] block">
                                      {materia.docenteAuxiliarNombre}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase text-purple-600 font-mono block">
                                      Auxiliar de Respaldo
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic block">
                                  Sin suplente pautado
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-400">
                              {puedeOperarDocente &&
                                horario.idDocente &&
                                !esInactiva && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleConfirmarDesvincularDocente(materia)
                                    }
                                    className="p-1.5 hover:text-amber-600 hover:bg-white rounded-lg transition cursor-pointer"
                                    title="Desvincular docente de esta comisión"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                )}

                              {(puedeEditar || puedeOperarDocente) &&
                                !esInactiva && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onEditarHorario &&
                                      onEditarHorario(horario, materia)
                                    }
                                    className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer"
                                    title="Editar este horario y docentes"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                              {puedeEliminar && !esInactiva && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleConfirmarBajaHorario(horario, materia)
                                  }
                                  className="p-1.5 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                                  title="Eliminar este horario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. BARRA DE CONTROL DE PAGINACIÓN */}
      <div className="bg-white px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 text-center sm:text-left">
          {Math.max(Number(totalElementos) || 0, materias.length) === 0 ? (
            <span>
              Mostrando <span className="font-bold text-slate-800">0</span> de{" "}
              <span className="font-bold text-slate-800">0</span> materias
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
                  Math.max(Number(totalElementos) || 0, materias.length),
                )}
              </span>{" "}
              de{" "}
              <span className="font-bold text-slate-800">
                {Math.max(Number(totalElementos) || 0, materias.length)}
              </span>{" "}
              materias
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => handleCambiarPagina(Number(paginaActual) - 1)}
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
              type="button"
              key={num}
              onClick={() => handleCambiarPagina(num)}
              disabled={loading}
              className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer ${
                Number(paginaActual) === num
                  ? "bg-[#4b35e6] text-white shadow-xs"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={() => handleCambiarPagina(Number(paginaActual) + 1)}
            disabled={Number(paginaActual) >= Number(totalPaginas) || loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            title="Página Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

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
