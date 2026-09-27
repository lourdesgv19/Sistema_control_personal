import React from "react";
import { X } from "lucide-react";

export default function ModalAsignarClase({
  isOpen,
  onClose,
  onSubmit,
  formClase,
  setFormClase,
  empleado,
  materiasActivas = [],
}) {
  if (!isOpen || !empleado) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="bg-[#6b21a8] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">
              Asignar Clase al Cronograma Docente
            </h3>
            <p className="text-[11px] text-purple-200">
              {empleado.apellido}, {empleado.nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Materia *
            </label>
            <select
              required
              value={formClase.materiaId || ""}
              onChange={(e) => {
                const idSel = e.target.value;
                const mat = materiasActivas.find(
                  (m) => String(m.id) === String(idSel),
                );
                setFormClase({
                  ...formClase,
                  materiaId: idSel,
                  materia: mat ? mat.nombre : "",
                  comision: mat?.comision || formClase.comision,
                  aula: mat?.aulaPredeterminada || formClase.aula,
                });
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-600 bg-white"
            >
              <option value="">Seleccione una cátedra del catálogo...</option>
              {materiasActivas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.comision ? `(${m.comision})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Días de Dictado (Selección Múltiple) *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
              ].map((dia) => {
                const diasActuales = formClase.diasSemana || [];
                const sel = diasActuales.includes(dia);

                return (
                  <button
                    type="button"
                    key={dia}
                    onClick={() => {
                      const nuevosDias = sel
                        ? diasActuales.filter((d) => d !== dia)
                        : [...diasActuales, dia];
                      setFormClase({
                        ...formClase,
                        diasSemana: nuevosDias,
                      });
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                      sel
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {dia.substring(0, 3)}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Días marcados:{" "}
              {(formClase.diasSemana || []).join(", ") || "Ninguno"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hora Inicio *
              </label>
              <input
                type="time"
                required
                value={formClase.horaInicio}
                onChange={(e) =>
                  setFormClase({ ...formClase, horaInicio: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hora Fin *
              </label>
              <input
                type="time"
                required
                value={formClase.horaFin}
                onChange={(e) =>
                  setFormClase({ ...formClase, horaFin: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Comisión / Curso
              </label>
              <input
                type="text"
                value={formClase.comision}
                onChange={(e) =>
                  setFormClase({ ...formClase, comision: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Aula / Laboratorio
              </label>
              <input
                type="text"
                value={formClase.aula}
                onChange={(e) =>
                  setFormClase({ ...formClase, aula: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md"
            >
              + Asignar al Cronograma
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
