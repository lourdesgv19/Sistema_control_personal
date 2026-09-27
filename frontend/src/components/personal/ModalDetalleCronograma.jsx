import React from "react";
import { X, Calendar, Plus, Sliders, AlertTriangle } from "lucide-react";
import { getBadgeColorClasses } from "../../pages/TiposConfiguracion";

export default function ModalDetalleCronograma({
  isOpen,
  onClose,
  empleado,
  clases,
  metricas,
  diasMap,
  diasEspecificos,
  rangosEspecificos,
  onOpenAsignarClase,
  onEliminarClase,
  onOpenAsignarTurno,
}) {
  if (!isOpen || !empleado) return null;

  const isActivo = empleado.activo !== false;
  const esDocentePorClases = empleado.tipoRegimenHorario === "POR_CLASES";
  const tieneTurnoPreestablecido =
    empleado.tipoRegimenHorario === "PREESTABLECIDO" && empleado.horarioGeneral;
  const tieneTurnoEspecifico = empleado.tipoRegimenHorario === "ESPECIFICO";

  const diasPreestablecidos = tieneTurnoPreestablecido
    ? (empleado.horarioGeneral.diasLaborables || "")
        .split(",")
        .map((d) => d.trim().toLowerCase())
    : [];

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
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA VISUAL SI EL EMPLEADO ESTÁ INACTIVO */}
        {!isActivo && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-amber-800 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Empleado Inactivo:</strong> Las opciones de asignación de
              turnos, alta y eliminación de clases están deshabilitadas hasta
              que se reactive al empleado.
            </span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Carga Semanal Total
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {metricas ? metricas.cargaSemanalHoras : 0} horas
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
                {metricas ? metricas.regimenHorarioDescripcion : "Sin Asignar"}
              </div>
              <div className="text-[10px] text-purple-700">
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
                <span>Cronograma de Clases y Jornadas por Día:</span>
              </div>

              {esDocentePorClases && (
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
              )}
            </div>

            <div className="grid grid-cols-7 gap-2.5">
              {diasMap.map(({ clave, nombre }) => {
                const clasesDia = clases.filter(
                  (c) => c.diaSemana?.toLowerCase() === nombre.toLowerCase(),
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
                  (diasEspecificos || []).some(
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
                        {clasesDia.map((c) => (
                          <div
                            key={c.id || c.idClase}
                            className="bg-purple-50/70 border border-purple-100 rounded-xl p-2 text-[10px] relative group"
                          >
                            {/* X solo interactiva si el empleado está activo */}
                            {isActivo && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEliminarClase(c.id || c.idClase);
                                }}
                                className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer z-10"
                                title="Quitar clase"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                          </div>
                        ))}

                        {trabajaPreestablecido && (
                          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-2.5 text-[10px] space-y-1">
                            <div className="font-bold text-indigo-900 leading-tight">
                              {empleado.horarioGeneral.nombre}
                            </div>
                            <div className="text-indigo-700 font-semibold">
                              {empleado.horarioGeneral.horaEntrada?.substring(
                                0,
                                5,
                              )}{" "}
                              a{" "}
                              {empleado.horarioGeneral.horaEgreso?.substring(
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

                        {trabajaEspecifico && (
                          <div className="space-y-1">
                            {(rangosEspecificos || []).map((r, idx) => (
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
                        type="button"
                        disabled={!isActivo}
                        onClick={() => onOpenAsignarClase(nombre)}
                        className={`w-full mt-2 py-1.5 border border-dashed rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                          !isActivo
                            ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"
                            : "border-purple-300 hover:border-purple-500 hover:bg-purple-50 text-purple-700 cursor-pointer"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        Clase
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
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cerrar
          </button>
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
            title={
              !isActivo
                ? "Empleado inactivo: Reactívelo primero"
                : "Modificar Turno"
            }
          >
            <Sliders className="w-3.5 h-3.5" />
            Modificar / Asignar Horario
          </button>
        </div>
      </div>
    </div>
  );
}
