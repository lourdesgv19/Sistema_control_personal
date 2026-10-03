import React from "react";
import {
  X,
  Calendar,
  Plus,
  Sliders,
  AlertTriangle,
  Lock,
  Repeat,
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

  // Control granular de permisos: se prioriza la prop del componente padre si fue enviada;
  // de lo contrario, se consultan directamente los permisos específicos de Horarios.
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

  // Helper para formatear visualmente la periodicidad de cada bloque
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
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
                <span className="text-slate-400 text-xs">
                  Legajo: {empleado.nroLegajo}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {(empleado.cargos || []).map((c) => c.nombre).join(", ") ||
                  "Sin cargo"}{" "}
                • DNI: {empleado.dni}
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
              que se reactive al colaborador.
            </span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Métricas calculadas centralizadas */}
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Carga Semanal Estimada
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {metricas ? metricas.cargaSemanalHoras : 0} horas
              </div>
              <div className="text-[10px] text-slate-500">
                Ponderada según periodicidad
              </div>
            </div>

            <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
              <div className="text-[10px] font-bold uppercase text-purple-700">
                Régimen Horario
              </div>
              <div className="text-sm font-bold text-purple-900 mt-1">
                {metricas ? metricas.regimenHorarioDescripcion : "Sin Asignar"}
              </div>
              <div
                className="text-[10px] text-purple-700 truncate"
                title={metricas?.regimenHorarioSubtitulo}
              >
                {metricas ? metricas.regimenHorarioSubtitulo : ""}
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl">
              <div className="text-[10px] font-bold uppercase text-blue-700">
                Días con Asistencia
              </div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {metricas ? metricas.diasConAsistencia : 0} días
              </div>
              <div
                className="text-[10px] text-blue-700 font-medium truncate"
                title={metricas?.textoRangoDias}
              >
                {metricas ? metricas.textoRangoDias : "Sin días asignados"}
              </div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
              <div className="text-[10px] font-bold uppercase text-emerald-700">
                Tolerancias de Registro
              </div>
              <div className="text-sm font-bold text-emerald-900 mt-1">
                +{metricas ? metricas.toleranciaIngresoMin : 15}m / -
                {metricas ? metricas.toleranciaEgresoMin : 10}m
              </div>
              <div className="text-[10px] text-emerald-700">
                Ingreso y Egreso permitidos
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
                    disabled={!isActivo}
                    onClick={() => onOpenAsignarClase()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition ${
                      !isActivo
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    }`}
                    title={
                      !isActivo ? "Empleado inactivo" : "Asignar Nueva Clase"
                    }
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    Asignar Nueva Clase
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
                              {/* Botón de baja de la franja (Controlado por HORARIOS_ELIMINAR) */}
                              {isActivo && puedeEliminar && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEliminarClase(
                                      f.id || f.idEmpleadoHorario,
                                    );
                                  }}
                                  className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer z-10"
                                  title="Quitar franja horaria"
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

                              {/* DETALLE DE FRECUENCIA / PERIODICIDAD */}
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
                            Sin actividad
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón rápido "+ Clase" para docentes (Controlado por HORARIOS_GESTIONAR) */}
                    {esDocente &&
                      (puedeEditar ? (
                        <button
                          type="button"
                          disabled={!isActivo}
                          onClick={() => onOpenAsignarClase(nombre)}
                          className={`w-full mt-2 py-1.5 border border-dashed rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                            !isActivo
                              ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                              : "border-purple-300 hover:border-purple-500 hover:bg-purple-50 text-purple-700 cursor-pointer"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Clase
                        </button>
                      ) : (
                        <div
                          className="w-full mt-2 py-1.5 border border-dashed border-slate-200 rounded-xl text-[10px] text-slate-300 flex items-center justify-center gap-1 select-none"
                          title="Requiere permiso HORARIOS_GESTIONAR"
                        >
                          <Lock className="w-3 h-3" />
                          Clase
                        </div>
                      ))}
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

          {puedeEditar ? (
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
              title={!isActivo ? "Empleado inactivo" : "Modificar Turno"}
            >
              <Sliders className="w-3.5 h-3.5" />
              Modificar / Asignar Horario
            </button>
          ) : (
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
              title="Requiere permiso HORARIOS_GESTIONAR"
            >
              <Lock className="w-3.5 h-3.5" />
              Modificación de Horarios Restringida
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
