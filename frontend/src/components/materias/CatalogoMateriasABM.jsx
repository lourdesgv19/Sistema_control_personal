import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  AlertCircle,
  RotateCcw,
  Repeat,
  CalendarCheck,
  UserPlus,
} from "lucide-react";
import {
  getCatalogoMateriasAgrupadas,
  reactivarMateria,
} from "../../services/gestionMateriasService";
import { removeEmpleadoHorario } from "../../services/empleadoService";
import ModalAlerta from "../comunes/ModalAlerta";

const DIAS_ORDEN = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CatalogoMateriasABM({
  onNuevaMateria,
  onEditarMateria,
  onEditarHorario,
  onEliminarMateria,
  docenteInicialId = null,
  filtroDocente = "",
  busqueda = "",
  puedeCrear,
  puedeEditar,
  puedeEliminar,
}) {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("ACTIVOS");

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

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await getCatalogoMateriasAgrupadas();
      const lista = Array.isArray(res.data) ? res.data : [];
      setMaterias(lista);
    } catch (err) {
      console.error("Error al cargar catálogo de materias agrupadas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (docenteInicialId && materias.length > 0) {
      const idBuscado = String(docenteInicialId);
      const materiasDelDocente = materias
        .filter((m) => {
          const esTitular = String(m.idDocenteTitular) === idBuscado;
          const esAuxiliar = String(m.idDocenteAuxiliar) === idBuscado;
          const tieneComision = (m.desgloseHorarios || []).some(
            (h) => String(h.idDocente) === idBuscado,
          );
          return esTitular || esAuxiliar || tieneComision;
        })
        .map((m) => m.idMateria);

      setExpandidos(materiasDelDocente);
    } else if (!docenteInicialId) {
      setExpandidos([]);
    }
  }, [docenteInicialId, materias]);

  useEffect(() => {
    const handleActualizar = () => {
      cargarDatos();
    };
    window.addEventListener("datos:actualizados", handleActualizar);
    return () =>
      window.removeEventListener("datos:actualizados", handleActualizar);
  }, []);

  const toggleExpandir = (id) => {
    setExpandidos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleTodos = () => {
    if (expandidos.length === materiasFiltradas.length) {
      setExpandidos([]);
    } else {
      setExpandidos(materiasFiltradas.map((m) => m.idMateria));
    }
  };

  const materiasFiltradas = useMemo(() => {
    return materias.filter((m) => {
      const matchEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVOS" && m.activo !== false) ||
        (filtroEstado === "INACTIVOS" && m.activo === false);

      const q = busqueda.trim().toLowerCase();
      const matchBusqueda =
        !q ||
        m.nombre?.toLowerCase().includes(q) ||
        m.codigo?.toLowerCase().includes(q) ||
        m.aulaPredeterminada?.toLowerCase().includes(q);

      const matchDocente =
        !filtroDocente ||
        String(m.idDocenteTitular) === String(filtroDocente) ||
        String(m.idDocenteAuxiliar) === String(filtroDocente);

      return matchEstado && matchBusqueda && matchDocente;
    });
  }, [materias, filtroEstado, busqueda, filtroDocente]);

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
          await cargarDatos();
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

  const handleConfirmarBajaHorario = (horario, nombreMateria) => {
    if (!puedeEliminar) return;

    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja comisión?",
      mensaje: `¿Desea desvincular el horario de ${horario.diaNombre} (${horario.horaInicio} - ${horario.horaFin} hs) de la cátedra "${nombreMateria}"? La materia conservará sus demás comisiones.`,
      textoConfirmar: "Sí, desvincular",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await removeEmpleadoHorario(horario.idHorario);
          window.dispatchEvent(new CustomEvent("datos:actualizados"));
          await cargarDatos();
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
            <Repeat className="w-3 h-3 text-amber-600" />
            Quincenal (Sem. {alterna})
          </span>
        );
      case "MENSUAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CalendarCheck className="w-3 h-3 text-blue-600" />
            {reps} {reps === 1 ? "vez al mes" : "veces al mes"}
          </span>
        );
      case "ANUAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <CalendarCheck className="w-3 h-3 text-purple-600" />
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

  // Normaliza y formatea la hora para comparar ("HH:mm")
  const normalizarHora = (h) => {
    if (!h) return "";
    return String(h).trim().slice(0, 5);
  };

  /**
   * Determina si todos los horarios configurados son exactamente uniformes.
   * COMPARA:
   * 1. Hora Inicio
   * 2. Hora Fin
   * 3. Tipo de Frecuencia (SEMANAL, SEMANA_POR_MEDIO, etc.)
   * 4. Semana Alterna (PAR/IMPAR)
   * 5. Repeticiones del período
   */
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

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
        Cargando catálogo de asignaturas académicas...
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
      {/* HEADER DE LA SECCIÓN */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Catálogo de Asignaturas Académicas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {materiasFiltradas.length} materias
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Haga clic sobre cualquier fila para desglosar u ocultar los días,
            horarios y profesores asignados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Estado:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs cursor-pointer"
            >
              <option value="ACTIVOS">Solo Activas</option>
              <option value="TODOS">Todas las Materias</option>
              <option value="INACTIVOS">Solo Bajas (Inactivas)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleTodos}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {expandidos.length === materiasFiltradas.length &&
            materiasFiltradas.length > 0 ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                <span>Colapsar todas</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                <span>Desglosar todas</span>
              </>
            )}
          </button>

          {puedeCrear && (
            <button
              type="button"
              onClick={onNuevaMateria}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar Materia</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE MATERIAS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Materia / Comisiones</th>
              <th className="py-3 px-4">Aula(s)</th>
              <th className="py-3 px-4">Días & Carga Semanal</th>
              <th className="py-3 px-4">Cuerpo Docente (Titular & Auxiliar)</th>
              <th className="py-3 px-4 text-right">Tarifa / Hora</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {materiasFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-slate-400 text-xs italic"
                >
                  No se encontraron materias con el estado seleccionado.
                </td>
              </tr>
            ) : (
              materiasFiltradas.map((materia) => {
                const estaExpandido = expandidos.includes(materia.idMateria);
                const esInactiva = materia.activo === false;
                const horariosIguales = sonHorariosUniforme(
                  materia.desgloseHorarios,
                );

                return (
                  <React.Fragment key={materia.idMateria}>
                    {/* FILA PRINCIPAL: AL CLICKEAR EN CUALQUIER PARTE SE DESGLOSA */}
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

                      {/* MATERIA */}
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
                            const activo = materia.diasResumen.includes(dia);
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
                          {materia.totalHorasSemanales.toFixed(1)}h reloj /
                          semana
                        </span>
                      </td>

                      {/* DOCENTES EN FILA PRINCIPAL */}
                      <td className="py-4 px-4">
                        {materia.sinDocente ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Sin Docente Asignado</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Titular */}
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

                            {/* Auxiliar */}
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

                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-900 text-xs font-mono">
                          ${materia.tarifaHora.toLocaleString("es-AR")}/h
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Tarifa cátedra
                        </span>
                      </td>

                      {/* ACCIONES (STOP PROPAGATION PARA NO ABRIR/CERRAR LA FILA ACCIDENTALMENTE) */}
                      <td
                        className="py-4 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {!esInactiva ? (
                            <>
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

                    {/* SUBFILAS DE COMISIONES: EDICIÓN INDIVIDUAL EN CADA HORARIO */}
                    {estaExpandido &&
                      materia.desgloseHorarios.map((horario) => (
                        <tr
                          key={horario.idHorario}
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
                              {horario.horasClase.toFixed(1)}h)
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

                          {/* CUERPO DOCENTE DETALLADO */}
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

                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-slate-900 font-mono">
                              ${horario.tarifaHora.toLocaleString("es-AR")}/h
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ${horario.totalPorClase.toLocaleString("es-AR")}{" "}
                              por clase
                            </span>
                          </td>

                          {/* ACCIONES DEL DESGLOSE INDIVIDUAL */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-400">
                              {puedeEditar && !esInactiva && (
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
                                    handleConfirmarBajaHorario(
                                      horario,
                                      materia.nombre,
                                    )
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
