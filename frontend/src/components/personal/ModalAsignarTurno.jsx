import React from "react";
import {
  X,
  Clock,
  Sliders,
  Plus,
  Trash2,
  CalendarCheck,
  UserCheck,
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
}) {
  if (!isOpen) return null;

  const esFijado = Boolean(empleado && empleado.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">
              Asignar Turno y Franjas Horarias
            </h3>
            <p className="text-[11px] text-slate-400">
              {esFijado
                ? `${empleado.apellido}, ${empleado.nombre} • Legajo: ${empleado.nroLegajo || "S/L"}`
                : "Asignación individual o múltiple de turnos laborales"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs overflow-y-auto">
          {/* SELECTOR DE EMPLEADO: Visible si no viene prefijado desde la lista lateral */}
          {!esFijado && (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 space-y-2">
              <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Seleccionar Empleado Destino *
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoAsignacionTurno("PREESTABLECIDO")}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                tipoAsignacionTurno === "PREESTABLECIDO"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  Turno Plantilla General
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Copiar franja horaria desde un turno preestablecido
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipoAsignacionTurno("ESPECIFICO")}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                tipoAsignacionTurno === "ESPECIFICO"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  Franja Personalizada / Turno Cortado
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Para turnos mañana/tarde o esquemas a medida.
                </div>
              </div>
            </button>
          </div>

          {tipoAsignacionTurno === "PREESTABLECIDO" && (
            <div className="space-y-3 pt-2">
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

          {tipoAsignacionTurno === "ESPECIFICO" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    Bloques de Horario (Ej: Turno Mañana y Tarde)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Defina 1, 2 o más bloques por jornada.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onAgregarRango}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  Agregar Bloque
                </button>
              </div>

              <div className="space-y-2.5">
                {rangosEspecificos.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                    No hay bloques definidos. Presione "+ Agregar Bloque".
                  </div>
                ) : (
                  rangosEspecificos.map((rango, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3"
                    >
                      <span className="font-bold text-slate-700 shrink-0">
                        Bloque {idx + 1}:
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={rango.horaDesde}
                          onChange={(e) =>
                            onCambiarRango(idx, "horaDesde", e.target.value)
                          }
                          className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 outline-none font-medium"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                          type="time"
                          value={rango.horaHasta}
                          onChange={(e) =>
                            onCambiarRango(idx, "horaHasta", e.target.value)
                          }
                          className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 outline-none font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Etiqueta (ej: Turno Mañana)"
                          value={rango.etiqueta}
                          onChange={(e) =>
                            onCambiarRango(idx, "etiqueta", e.target.value)
                          }
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none flex-1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onEliminarRango(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Periodicidad / Frecuencia */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                Frecuencia de Cumplimiento
              </label>
              <span className="text-[10px] text-slate-400">
                Pauta de asistencia
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
                  className={`px-2.5 py-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                    tipoFrecuencia === frec.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {frec.label}
                </button>
              ))}
            </div>

            {tipoFrecuencia === "SEMANA_POR_MEDIO" && (
              <div className="flex items-center gap-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mt-2 text-xs">
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

            {(tipoFrecuencia === "MENSUAL" || tipoFrecuencia === "ANUAL") && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl mt-2">
                <span className="text-xs text-slate-700 font-medium shrink-0">
                  Cantidad requerida:
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="1"
                    max={tipoFrecuencia === "MENSUAL" ? 31 : 365}
                    value={repeticionesPeriodo}
                    onChange={(e) =>
                      setRepeticionesPeriodo(parseInt(e.target.value, 10) || 1)
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

          {/* Días en que Aplica */}
          {tipoAsignacionTurno === "ESPECIFICO" && (
            <div className="pt-2">
              <div className="font-bold text-slate-700 mb-2">
                Días en que Aplica
              </div>
              <div className="flex gap-1.5">
                {diasMap.map(({ clave }) => {
                  const sel = (diasEspecificos || []).includes(clave);
                  return (
                    <button
                      type="button"
                      key={clave}
                      onClick={() => onToggleDiaEspecifico(clave)}
                      className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer ${
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
            >
              Guardar en Cronograma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
