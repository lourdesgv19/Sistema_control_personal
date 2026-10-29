import React from "react";
import {
  X,
  Calendar,
  Sliders,
  AlertTriangle,
  Lock,
  Repeat,
  Clock,
  LogOut,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ModalDetalleCronograma({
  isOpen,
  onClose,
  empleado,
  clases = [],
  metricas,
  diasMap = [],
  onOpenAsignarClase,
  onEliminarClase,
  onOpenAsignarTurno,
  puedeEditar: puedeEditarProp,
  puedeEliminar: puedeEliminarProp,
}) {
  const { tienePermiso } = useAuth();

  const puedeEditar =
    typeof puedeEditarProp === "boolean"
      ? puedeEditarProp
      : tienePermiso("HORARIOS_GESTIONAR");

  const puedeEliminar =
    typeof puedeEliminarProp === "boolean"
      ? puedeEliminarProp
      : tienePermiso("HORARIOS_ELIMINAR");

  if (!isOpen || !empleado) return null;

  const isActivo = empleado.activo !== false;

  const esDocente =
    (empleado.categorias || []).some((c) =>
      (c.codigoTag || c.nombre || "").toLowerCase().includes("docente"),
    ) ||
    (empleado.categoria?.codigoTag || "").toLowerCase().includes("docente");

  // Identificar si existen franjas con esquema flexible (sin día fijo o con horas objetivo)
  const franjasFlexibles = clases.filter(
    (c) =>
      c.diaSemana == null || (c.horasObjetivo != null && c.horasObjetivo > 0),
  );
  const tieneEsquemaFlexible = franjasFlexibles.length > 0;

  // Identificar si existen franjas con DÍA FIJO asignado
  const franjasFijas = clases.filter(
    (c) => c.diaSemana != null && c.horaEntrada != null && c.horaSalida != null,
  );
  const tieneDiasFijos = franjasFijas.length > 0;

  // Obtener los nombres de los días fijos para la aclaración visual
  const diasFijosNombres = Array.from(
    new Set(
      franjasFijas.map((f) => {
        const diaObj = diasMap.find((d) => d.diaNumero === f.diaSemana);
        return diaObj ? diaObj.nombre : `Día ${f.diaSemana}`;
      }),
    ),
  );

  const renderDetalleFrecuencia = (f) => {
    const frec = (f.tipoFrecuencia || "SEMANAL").toUpperCase();
    const reps = f.repeticionesPeriodo || 1;
    const alterna = f.semanaAlterna || "PAR";

    switch (frec) {
      case "SEMANA_POR_MEDIO":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200/60 text-[9px] mt-1">
            <Repeat className="w-2.5 h-2.5" />
            Quincenal (Sem. {alterna})
          </span>
        );
      case "MENSUAL":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 text-[9px] mt-1">
            <Repeat className="w-2.5 h-2.5" />
            {reps} {reps === 1 ? "vez" : "veces"} al mes
          </span>
        );
      case "ANUAL":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200/60 text-[9px] mt-1">
            <Repeat className="w-2.5 h-2.5" />
            {reps} {reps === 1 ? "vez" : "veces"} al año
          </span>
        );
      case "SEMANAL":
      default:
        return (
          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
            Todas las semanas
          </span>
        );
    }
  };

  const maxSalidas =
    metricas?.maxSalidasIntermedias ?? empleado.maxSalidasIntermedias ?? 2;
  const maxTiempoFuera =
    metricas?.tiempoMaxFueraMin ?? empleado.tiempoMaxFueraMin ?? 45;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">
                  {empleado.apellido}, {empleado.nombre}
                </h3>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    isActivo
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {isActivo ? "ACTIVO" : "INACTIVO / BAJA"}
                </span>
                {tieneEsquemaFlexible && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Bolsa Flexible
                  </span>
                )}
                <span className="text-slate-400 text-xs font-mono">
                  Legajo: {empleado.nroLegajo || "Sin legajo"}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {(empleado.cargos || []).map((c) => c.nombre).join(", ") ||
                  "Sin cargo"}{" "}
                • DNI: {empleado.dni || "Sin DNI"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de baja lógica */}
        {!isActivo && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-amber-800 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Empleado Inactivo:</strong> Las opciones de asignación de
              turnos, alta y eliminación de horarios están deshabilitadas hasta
              que se reactive al empleado.
            </span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          {/* BANNER ESPECÍFICO DE HORARIO FLEXIBLE / BOLSA DE HORAS */}
          {tieneEsquemaFlexible && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Régimen de Horario Flexible Activo
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        {tieneDiasFijos ? "Esquema Híbrido" : "Sin Días Fijos"}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      El colaborador cumple horas por bolsa flexible.{" "}
                      {tieneDiasFijos ? (
                        <>
                          Las tolerancias y el control de asistencia diaria{" "}
                          <strong>
                            aplican exclusivamente a sus días fijos asignados (
                            {diasFijosNombres.join(", ")})
                          </strong>
                          . En los días libres no se computan tardanzas ni
                          inasistencias.
                        </>
                      ) : (
                        <>
                          <strong>
                            No se generan incidentes por inasistencias ni
                            tardanzas diarias
                          </strong>{" "}
                          en días no concurridos.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Tarjetas de las franjas flexibles asignadas */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {franjasFlexibles.map((flx) => (
                    <div
                      key={flx.id || flx.idEmpleadoHorario}
                      className="bg-white/90 border border-emerald-300 rounded-xl px-3 py-1.5 shadow-2xs flex items-center gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">
                          {flx.etiqueta || "Bolsa Flexible"}:{" "}
                          <span className="text-emerald-700 font-extrabold">
                            {flx.horasObjetivo} hs
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium capitalize">
                          {flx.tipoFrecuencia
                            ? flx.tipoFrecuencia.toLowerCase()
                            : "mensual"}
                        </div>
                      </div>

                      {isActivo && puedeEliminar && (
                        <button
                          type="button"
                          onClick={() => onEliminarClase(flx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Dar de baja este esquema flexible"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Métricas calculadas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs">
            {/* 1. Carga Semanal */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Carga Semanal
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {metricas ? metricas.cargaSemanalHoras : 0} horas
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {tieneEsquemaFlexible
                  ? "Equivalente prorrateado"
                  : "Ponderada por periodicidad"}
              </div>
            </div>

            {/* 2. Régimen Horario */}
            <div
              className={`border p-3.5 rounded-2xl flex flex-col justify-between ${
                tieneEsquemaFlexible
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-purple-50/60 border-purple-100"
              }`}
            >
              <div
                className={`text-[10px] font-bold uppercase ${
                  tieneEsquemaFlexible ? "text-emerald-800" : "text-purple-700"
                }`}
              >
                Régimen Horario
              </div>
              <div
                className={`text-sm font-bold mt-1 truncate ${
                  tieneEsquemaFlexible
                    ? "text-emerald-950 font-extrabold"
                    : "text-purple-900"
                }`}
                title={metricas?.regimenHorarioDescripcion}
              >
                {metricas ? metricas.regimenHorarioDescripcion : "Sin Asignar"}
              </div>
              <div
                className={`text-[10px] truncate mt-0.5 ${
                  tieneEsquemaFlexible
                    ? "text-emerald-700 font-semibold"
                    : "text-purple-700"
                }`}
                title={metricas?.regimenHorarioSubtitulo}
              >
                {metricas ? metricas.regimenHorarioSubtitulo : ""}
              </div>
            </div>

            {/* 3. Días con Asistencia */}
            <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase text-blue-700">
                Días con Asistencia
              </div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {tieneDiasFijos
                  ? `${diasFijosNombres.length} ${diasFijosNombres.length === 1 ? "día fijo" : "días fijos"}`
                  : "Libre"}
              </div>
              <div
                className="text-[10px] text-blue-700 font-medium truncate mt-0.5"
                title={
                  tieneDiasFijos
                    ? diasFijosNombres.join(", ")
                    : "Cumplimiento libre por horas"
                }
              >
                {tieneDiasFijos
                  ? diasFijosNombres.join(", ")
                  : "Sin días fijos asignados"}
              </div>
            </div>

            {/* 4. TOLERANCIAS FICHAJE (DETALLADO DINÁMICO DÍAS FIJOS VS LIBRES) */}
            <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-700">
                <span>Tolerancias Fichaje</span>
                <Clock className="w-3 h-3 text-emerald-600" />
              </div>

              {tieneDiasFijos ? (
                <>
                  <div className="text-sm font-bold text-emerald-900 mt-1">
                    +
                    {metricas
                      ? metricas.toleranciaIngresoMin
                      : (empleado.toleranciaIngresoMin ?? 15)}
                    m / -
                    {metricas
                      ? metricas.toleranciaEgresoMin
                      : (empleado.toleranciaEgresoMin ?? 10)}
                    m
                  </div>
                  <div className="text-[10px] text-emerald-800 font-semibold mt-0.5 leading-tight">
                    {tieneEsquemaFlexible
                      ? `Solo aplica en días fijos (${diasFijosNombres.join(", ")})`
                      : "Ingreso y egreso permitidos"}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-emerald-900 mt-1">
                    No aplican
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5 leading-tight">
                    Asistencia y horarios libres
                  </div>
                </>
              )}
            </div>

            {/* 5. Pausas Intermedias */}
            <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-800">
                <span>Pausas Intermedias</span>
                <LogOut className="w-3 h-3 text-amber-700" />
              </div>
              <div className="text-sm font-extrabold text-amber-950 mt-1">
                Hasta {maxSalidas} {maxSalidas === 1 ? "salida" : "salidas"} /{" "}
                {maxTiempoFuera}m
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5">
                Tiempo acumulado máx. fuera
              </div>
            </div>
          </div>

          {/* Grilla Semanal */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Cronograma de Jornadas por Día:</span>
              </div>

              {esDocente &&
                (puedeEditar ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAsignarClase();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    title="Ir al módulo Gestión de Materias para asignar o crear cátedras"
                  >
                    <span>Ir a Gestión de Materias</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                    title="Requiere permiso HORARIOS_GESTIONAR"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Asignación Restringida
                  </span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2.5">
              {diasMap.map(({ nombre, diaNumero }) => {
                const franjasDia = clases.filter(
                  (c) => c.diaSemana === diaNumero,
                );
                const tieneActividad = franjasDia.length > 0;

                return (
                  <div
                    key={nombre}
                    className={`border rounded-2xl p-2.5 flex flex-col justify-between min-h-[220px] ${
                      tieneActividad
                        ? "bg-white border-slate-200 shadow-2xs"
                        : tieneEsquemaFlexible
                          ? "bg-emerald-50/20 border-emerald-100/60"
                          : "bg-slate-50/60 border-slate-200/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-slate-700">
                          {nombre}
                        </span>
                        {tieneActividad ? (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-500"
                            title="Jornada fija programada"
                          ></span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium">
                            {tieneEsquemaFlexible ? "Optativo" : "Franco"}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {franjasDia.map((f) => {
                          const esMateria = Boolean(f.materia);
                          return (
                            <div
                              key={f.id || f.idEmpleadoHorario}
                              className={`border rounded-xl p-2 text-[10px] relative group ${
                                esMateria
                                  ? "bg-purple-50/70 border-purple-100"
                                  : "bg-indigo-50/70 border-indigo-100"
                              }`}
                            >
                              {/* Botón de baja de franja con confirmación */}
                              {isActivo && puedeEliminar && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEliminarClase(f);
                                  }}
                                  className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer z-10"
                                  title="Quitar franja del cronograma"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <div
                                className={`font-bold leading-tight ${
                                  esMateria
                                    ? "text-purple-900"
                                    : "text-indigo-900"
                                }`}
                              >
                                {esMateria
                                  ? f.materia.nombre
                                  : f.etiqueta || "Turno Regular"}
                              </div>

                              <div
                                className={`mt-1 font-semibold ${
                                  esMateria
                                    ? "text-purple-700"
                                    : "text-indigo-700"
                                }`}
                              >
                                {f.horaEntrada?.substring(0, 5)} -{" "}
                                {f.horaSalida?.substring(0, 5)} hs
                              </div>

                              {renderDetalleFrecuencia(f)}

                              {f.aula && (
                                <div className="text-slate-500 mt-1">
                                  Aula: {f.aula}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {!tieneActividad && (
                          <div className="text-center py-10 text-[11px] text-slate-400 italic">
                            {tieneEsquemaFlexible
                              ? "Asistencia libre"
                              : "Sin actividad"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cerrar
          </button>

          {!esDocente && puedeEditar && (
            <button
              type="button"
              disabled={!isActivo}
              onClick={() => {
                onClose();
                onOpenAsignarTurno(empleado);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-md transition ${
                !isActivo
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-[#4b35e6] hover:bg-[#3e2bc0] text-white cursor-pointer"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Modificar / Asignar Horario
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
