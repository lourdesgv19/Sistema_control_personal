import React from "react";
import {
  X,
  Clock,
  Sliders,
  Plus,
  Trash2,
  CalendarCheck,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

export default function ModalAsignarTurno({
  isOpen,
  onClose,
  onSubmit,
  empleado,
  empleadoSeleccionadoId,
  setEmpleadoSeleccionadoId,
  empleadosDisponibles = [],
  tipoAsignacionTurno,
  setTipoAsignacionTurno,
  horarioGeneralSeleccionado,
  setHorarioGeneralSeleccionado,
  horariosActivos = [],
  rangosEspecificos = [],
  onAgregarRango,
  onEliminarRango,
  onCambiarRango,
  diasEspecificos = [],
  onToggleDiaEspecifico,
  tolIngresoEsp,
  setTolIngresoEsp,
  tolEgresoEsp,
  setTolEgresoEsp,
  diasMap = [],
  tipoFrecuencia = "SEMANAL",
  setTipoFrecuencia,
  repeticionesPeriodo = 1,
  setRepeticionesPeriodo,
  semanaAlterna = "PAR",
  setSemanaAlterna,
  horasObjetivo = 4,
  setHorasObjetivo,
  etiquetaFlexible = "Bolsa de Horas Flexible",
  setEtiquetaFlexible,
}) {
  if (!isOpen) return null;

  const esFijado = Boolean(empleado && empleado.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Cabecera Adaptable */}
        <div className="bg-[#111827] px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">
              Asignar Turno y Franjas Horarias
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {esFijado
                ? `${empleado.apellido}, ${empleado.nombre} • Legajo: ${
                    empleado.nroLegajo || "S/L"
                  }`
                : "Asignación individual o múltiple de turnos laborales"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs overflow-y-auto">
          {/* SELECTOR DE EMPLEADO (si no viene prefijado) */}
          {!esFijado && (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 sm:p-3.5 space-y-2">
              <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Seleccionar Empleado Destino *</span>
              </label>
              <select
                value={empleadoSeleccionadoId || ""}
                onChange={(e) => setEmpleadoSeleccionadoId(e.target.value)}
                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
              >
                <option value="">
                  Seleccione un colaborador del padrón...
                </option>
                {empleadosDisponibles.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.apellido}, {emp.nombre} (Legajo:{" "}
                    {emp.nroLegajo || "S/L"} •{" "}
                    {(emp.cargos || []).map((c) => c.nombre || c).join(", ") ||
                      "General"}
                    )
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-[10px] font-bold uppercase text-slate-400">
            Modalidad de Carga de Horario
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setTipoAsignacionTurno("PREESTABLECIDO")}
              className={`p-3 rounded-2xl border text-left flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition cursor-pointer ${
                tipoAsignacionTurno === "PREESTABLECIDO"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  Plantilla General
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Turno corporativo fijo
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipoAsignacionTurno("ESPECIFICO")}
              className={`p-3 rounded-2xl border text-left flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition cursor-pointer ${
                tipoAsignacionTurno === "ESPECIFICO"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  Franja Personalizada
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Turno partido o por días
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipoAsignacionTurno("FLEXIBLE")}
              className={`p-3 rounded-2xl border text-left flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition cursor-pointer ${
                tipoAsignacionTurno === "FLEXIBLE"
                  ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  Bolsa de Horas
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Horas libres sin día fijo
                </div>
              </div>
            </button>
          </div>

          {/* OPCIÓN 1: PLANTILLA */}
          {tipoAsignacionTurno === "PREESTABLECIDO" && (
            <div className="space-y-2 pt-1">
              <label className="block font-semibold text-slate-700">
                Seleccionar Plantilla Preestablecida:
              </label>
              <select
                value={horarioGeneralSeleccionado}
                onChange={(e) => setHorarioGeneralSeleccionado(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-600 bg-white"
              >
                {horariosActivos.length === 0 ? (
                  <option value="">
                    No hay horarios preestablecidos disponibles
                  </option>
                ) : (
                  horariosActivos.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre} ({h.horaEntrada?.substring(0, 5)} a{" "}
                      {h.horaEgreso?.substring(0, 5)} hs • Cat:{" "}
                      {h.categoria?.nombre || "General"})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* OPCIÓN 2: ESPECÍFICO / BLOQUES (Adaptado a móviles) */}
          {tipoAsignacionTurno === "ESPECIFICO" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900">
                    Bloques de Horario
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Defina 1, 2 o más bloques por jornada.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onAgregarRango}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Agregar</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {rangosEspecificos.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                    No hay bloques definidos. Presione "+ Agregar".
                  </div>
                ) : (
                  rangosEspecificos.map((rango, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2.5"
                    >
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="font-bold text-slate-700 shrink-0">
                          Bloque {idx + 1}:
                        </span>
                        <button
                          type="button"
                          onClick={() => onEliminarRango(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer sm:hidden"
                          title="Eliminar bloque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={rango.horaDesde}
                            onChange={(e) =>
                              onCambiarRango(idx, "horaDesde", e.target.value)
                            }
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-medium flex-1 text-center"
                          />
                          <span className="text-slate-400">→</span>
                          <input
                            type="time"
                            value={rango.horaHasta}
                            onChange={(e) =>
                              onCambiarRango(idx, "horaHasta", e.target.value)
                            }
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-medium flex-1 text-center"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Etiqueta (ej: Turno Mañana)"
                          value={rango.etiqueta}
                          onChange={(e) =>
                            onCambiarRango(idx, "etiqueta", e.target.value)
                          }
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none flex-1 min-w-[120px]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => onEliminarRango(idx)}
                        className="hidden sm:block p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                        title="Eliminar bloque"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* OPCIÓN 3: BOLSA DE HORAS FLEXIBLES */}
          {tipoAsignacionTurno === "FLEXIBLE" && (
            <div className="space-y-3.5 p-3.5 sm:p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
              <div>
                <div className="font-bold text-emerald-950 text-xs">
                  Configuración de Carga Horaria sin Día Fijo
                </div>
                <div className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
                  El colaborador podrá distribuir libremente sus horas en el
                  período sin incurrir en incidentes de tardanzas ni ausencias
                  injustificadas.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cantidad de Horas a Cumplir *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="400"
                      value={horasObjetivo}
                      onChange={(e) =>
                        setHorasObjetivo(parseFloat(e.target.value) || 0)
                      }
                      className="w-24 px-3 py-2 text-xs border border-emerald-300 rounded-xl text-center font-bold text-emerald-800 bg-white outline-none focus:border-emerald-600"
                      placeholder="ej: 4"
                    />
                    <span className="text-xs text-slate-600 font-semibold">
                      horas totales
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombre / Etiqueta del Esquema
                  </label>
                  <input
                    type="text"
                    value={etiquetaFlexible}
                    onChange={(e) => setEtiquetaFlexible(e.target.value)}
                    placeholder="ej: Asesoría Contable / Bolsa Libre"
                    className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white outline-none focus:border-emerald-600 text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Periodicidad / Frecuencia */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Frecuencia de Cumplimiento</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Pauta de liquidación y asistencia
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "SEMANAL", label: "Todas las semanas" },
                { id: "SEMANA_POR_MEDIO", label: "Semana por medio" },
                { id: "MENSUAL", label: "Veces al mes" },
                { id: "ANUAL", label: "Veces al año" },
              ].map((frec) => (
                <button
                  key={frec.id}
                  type="button"
                  onClick={() => setTipoFrecuencia(frec.id)}
                  className={`px-2 py-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                    tipoFrecuencia === frec.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {frec.label}
                </button>
              ))}
            </div>

            {tipoFrecuencia === "SEMANA_POR_MEDIO" &&
              tipoAsignacionTurno !== "FLEXIBLE" && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mt-2 text-xs">
                  <span className="text-slate-700 font-medium">Rotación:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="modalSemanaAlterna"
                      value="PAR"
                      checked={semanaAlterna === "PAR"}
                      onChange={(e) => setSemanaAlterna(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Semanas Pares
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="modalSemanaAlterna"
                      value="IMPAR"
                      checked={semanaAlterna === "IMPAR"}
                      onChange={(e) => setSemanaAlterna(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Semanas Impares
                  </label>
                </div>
              )}

            {(tipoFrecuencia === "MENSUAL" || tipoFrecuencia === "ANUAL") &&
              tipoAsignacionTurno !== "FLEXIBLE" && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl mt-2">
                  <span className="text-xs text-slate-700 font-medium">
                    Cantidad requerida:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={tipoFrecuencia === "MENSUAL" ? 31 : 365}
                      value={repeticionesPeriodo}
                      onChange={(e) =>
                        setRepeticionesPeriodo(
                          parseInt(e.target.value, 10) || 1,
                        )
                      }
                      className="w-16 px-2.5 py-1 text-xs border border-indigo-200 rounded-lg text-center font-bold text-indigo-700 bg-white outline-none focus:border-indigo-600"
                    />
                    <span className="text-xs text-slate-600 font-semibold">
                      {tipoFrecuencia === "MENSUAL"
                        ? "jornada(s) al mes"
                        : "jornada(s) al año"}
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* DÍAS EN QUE APLICA */}
          {tipoAsignacionTurno === "ESPECIFICO" && (
            <div className="pt-2">
              <div className="font-bold text-slate-700 mb-2">
                Días en que Aplica
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {diasMap.map(({ clave }) => {
                  const sel = (diasEspecificos || []).includes(clave);
                  return (
                    <button
                      type="button"
                      key={clave}
                      onClick={() => onToggleDiaEspecifico(clave)}
                      className={`py-2 rounded-xl text-center font-bold text-xs transition cursor-pointer ${
                        sel
                          ? "bg-[#4b35e6] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {clave}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Adaptable */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer text-center"
            >
              Guardar en Cronograma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
