import React from "react";
import {
  Calendar,
  Sliders,
  Loader2,
  Lock,
  ArrowRight,
  X,
  AlertTriangle,
  Repeat,
  Clock,
  LogOut,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { DIAS_MAP } from "../../utils/categoriasHorariosUtils";

export default function CronogramaSemanalDesplegable({
  empleado,
  cargando = false,
  clases = [],
  metricas = null,
  esVistaDocentePura = false,
  puedeEditar = false,
  puedeEliminar = false,
  onAbrirTurno,
  onIrAMaterias,
  onEliminarFranja,
}) {
  if (!empleado) return null;

  const isActivo = empleado.activo !== false;

  const esDocente =
    (empleado.categorias || []).some((c) =>
      (c.codigoTag || c.nombre || "").toLowerCase().includes("docente"),
    ) ||
    (empleado.categoria?.codigoTag || empleado.categoria?.nombre || "")
      .toLowerCase()
      .includes("docente");

  const franjasFlexibles = clases.filter(
    (c) =>
      c.diaSemana == null || (c.horasObjetivo != null && c.horasObjetivo > 0),
  );
  const tieneEsquemaFlexible = franjasFlexibles.length > 0;

  const franjasFijas = clases.filter(
    (c) => c.diaSemana != null && c.horaEntrada != null && c.horaSalida != null,
  );
  const tieneDiasFijos = franjasFijas.length > 0;

  const diasFijosNombres = Array.from(
    new Set(
      franjasFijas.map((f) => {
        const diaObj = DIAS_MAP.find((d) => d.diaNumero === f.diaSemana);
        return diaObj ? diaObj.nombre : `Día ${f.diaSemana}`;
      }),
    ),
  );

  const maxSalidas =
    metricas?.maxSalidasIntermedias ?? empleado.maxSalidasIntermedias ?? 2;
  const maxTiempoFuera =
    metricas?.tiempoMaxFueraMin ?? empleado.tiempoMaxFueraMin ?? 45;

  const renderDetalleFrecuencia = (f) => {
    const frec = (f.tipoFrecuencia || "SEMANAL").toUpperCase();
    const reps = f.repeticionesPeriodo || 1;
    const alterna = f.semanaAlterna || "PAR";

    switch (frec) {
      case "SEMANA_POR_MEDIO":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200/60 text-[9px] mt-1">
            <Repeat className="w-2.5 h-2.5 shrink-0" />
            Quincenal (Sem. {alterna})
          </span>
        );
      case "MENSUAL":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 text-[9px] mt-1">
            <Repeat className="w-2.5 h-2.5 shrink-0" />
            {reps} {reps === 1 ? "vez" : "veces"} al mes
          </span>
        );
      case "ANUAL":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200/60 text-[9px] mt-1">
            <Repeat className="w-2.5 h-2.5 shrink-0" />
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

  if (cargando) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50/70 border-t border-slate-200/80">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-xs font-medium">
          Cargando cronograma semanal de {empleado.apellido}, {empleado.nombre}
          ...
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-150">
      {!isActivo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Empleado Inactivo:</strong> Las opciones de alta y
            eliminación de horarios están deshabilitadas.
          </span>
        </div>
      )}

      {/* BANNER DE HORARIO FLEXIBLE */}
      {tieneEsquemaFlexible && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
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
                      El control de asistencia diaria aplica exclusivamente a
                      sus días fijos ({diasFijosNombres.join(", ")}).
                    </>
                  ) : (
                    <>
                      No se generan incidentes por inasistencias ni tardanzas
                      diarias en días no concurridos.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {franjasFlexibles.map((flx) => (
                <div
                  key={flx.id || flx.idEmpleadoHorario}
                  className="bg-white border border-emerald-300 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs"
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
                      onClick={() => onEliminarFranja(empleado, flx)}
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

      {/* MÉTRICAS RESUMIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
        <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase text-slate-400">
            Carga Semanal
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {metricas ? metricas.cargaSemanalHoras : 0} horas
          </div>
          <div className="text-[10px] text-slate-500">
            {tieneEsquemaFlexible
              ? "Equivalente prorrateado"
              : "Ponderada por periodicidad"}
          </div>
        </div>

        <div
          className={`border p-3 rounded-xl flex flex-col justify-between ${
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
            className={`text-xs font-bold mt-0.5 truncate ${
              tieneEsquemaFlexible ? "text-emerald-950" : "text-purple-900"
            }`}
            title={metricas?.regimenHorarioDescripcion}
          >
            {metricas ? metricas.regimenHorarioDescripcion : "Sin Asignar"}
          </div>
          <div
            className={`text-[10px] truncate ${
              tieneEsquemaFlexible ? "text-emerald-700" : "text-purple-700"
            }`}
            title={metricas?.regimenHorarioSubtitulo}
          >
            {metricas ? metricas.regimenHorarioSubtitulo : ""}
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase text-blue-700">
            Días con Asistencia
          </div>
          <div className="text-lg font-bold text-blue-900 mt-0.5">
            {tieneDiasFijos
              ? `${diasFijosNombres.length} ${
                  diasFijosNombres.length === 1 ? "día fijo" : "días fijos"
                }`
              : "Libre"}
          </div>
          <div
            className="text-[10px] text-blue-700 font-medium truncate"
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

        <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-700">
            <span>Tolerancias</span>
            <Clock className="w-3 h-3 text-emerald-600" />
          </div>

          {tieneDiasFijos ? (
            <>
              <div className="text-xs font-bold text-emerald-900 mt-0.5">
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
              <div className="text-[10px] text-emerald-800 font-medium">
                Ingreso y egreso permitidos
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold text-emerald-900 mt-0.5">
                No aplican
              </div>
              <div className="text-[10px] text-emerald-700">
                Asistencia y horarios libres
              </div>
            </>
          )}
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-800">
            <span>Pausas Intermedias</span>
            <LogOut className="w-3 h-3 text-amber-700" />
          </div>
          <div className="text-xs font-extrabold text-amber-950 mt-0.5">
            Hasta {maxSalidas} {maxSalidas === 1 ? "salida" : "salidas"} /{" "}
            {maxTiempoFuera}m
          </div>
          <div className="text-[10px] text-amber-800">
            Tiempo acumulado máx. fuera
          </div>
        </div>
      </div>

      {/* GRILLA SEMANAL (LUNES A DOMINGO) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cronograma de Jornadas por Día:</span>
            {tieneEsquemaFlexible && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <Sparkles className="w-2.5 h-2.5" />
                Bolsa Flexible
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {esDocente &&
              (puedeEditar ? (
                <button
                  type="button"
                  onClick={() => onIrAMaterias(empleado.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition"
                >
                  <span>Gestionar Cátedras</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold">
                  <Lock className="w-3 h-3" />
                  Cátedras Restringidas
                </span>
              ))}

            {puedeEditar && !esVistaDocentePura && (
              <button
                type="button"
                disabled={!isActivo}
                onClick={() => onAbrirTurno(empleado)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  !isActivo
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-[#4b35e6] hover:bg-[#3e2bc0] text-white cursor-pointer shadow-2xs"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Agregar / Modificar Horario</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {DIAS_MAP.map(({ nombre, diaNumero }) => {
            const franjasDia = clases.filter((c) => c.diaSemana === diaNumero);
            const tieneActividad = franjasDia.length > 0;

            return (
              <div
                key={nombre}
                className={`border rounded-xl p-2.5 flex flex-col justify-between min-h-[100px] sm:min-h-[155px] ${
                  tieneActividad
                    ? "bg-white border-slate-200 shadow-2xs"
                    : tieneEsquemaFlexible
                      ? "bg-emerald-50/30 border-emerald-200/60"
                      : "bg-white/60 border-slate-200/70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-slate-700">
                      {nombre}
                    </span>
                    {tieneActividad ? (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-500"
                        title="Jornada fija programada"
                      />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium">
                        {tieneEsquemaFlexible ? "Optativo" : "Franco"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {franjasDia.map((f) => {
                      const esMateria = Boolean(f.materia);
                      return (
                        <div
                          key={f.id || f.idEmpleadoHorario}
                          className={`border rounded-lg p-2 text-[10px] relative group ${
                            esMateria
                              ? "bg-purple-50/80 border-purple-200/70"
                              : "bg-indigo-50/80 border-indigo-200/70"
                          }`}
                        >
                          {isActivo && puedeEliminar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEliminarFranja(empleado, f);
                              }}
                              className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer z-10"
                              title="Quitar franja del cronograma"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div
                            className={`font-bold leading-tight pr-4 ${
                              esMateria ? "text-purple-900" : "text-indigo-900"
                            }`}
                          >
                            {esMateria
                              ? f.materia.nombre
                              : f.etiqueta || "Turno Regular"}
                          </div>

                          <div
                            className={`mt-1 font-semibold ${
                              esMateria ? "text-purple-700" : "text-indigo-700"
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
                      <div className="text-center py-3 sm:py-7 text-[11px] text-slate-400 italic">
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
  );
}
