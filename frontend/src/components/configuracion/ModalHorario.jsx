import React from "react";
import { Clock, X } from "lucide-react";

export default function ModalHorario({
  isOpen,
  onClose,
  onSubmit,
  formHorario,
  setFormHorario,
  editandoHorarioId,
  categoriasActivas = [],
}) {
  if (!isOpen) return null;

  const toggleDia = (dia) => {
    if (formHorario.dias.includes(dia)) {
      setFormHorario({
        ...formHorario,
        dias: formHorario.dias.filter((d) => d !== dia),
      });
    } else {
      setFormHorario({ ...formHorario, dias: [...formHorario.dias, dia] });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] cursor-default animate-in zoom-in-95"
      >
        <div className="bg-[#111827] px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              {editandoHorarioId
                ? "Editar Horario Preestablecido"
                : "Nuevo Horario Preestablecido"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre del Horario *
            </label>
            <input
              type="text"
              required
              placeholder="ej. Administrativo Central (08:00 a 16:00)"
              value={formHorario.nombre}
              onChange={(e) =>
                setFormHorario({ ...formHorario, nombre: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Categoría Aplicable *
            </label>
            <select
              value={formHorario.categoriaId}
              onChange={(e) =>
                setFormHorario({
                  ...formHorario,
                  categoriaId: e.target.value,
                })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
            >
              {categoriasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.codigoTag})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Estado *
            </label>
            <select
              value={formHorario.estado}
              onChange={(e) =>
                setFormHorario({ ...formHorario, estado: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
            >
              <option value="Activo">Activo (Habilitado)</option>
              <option value="Inactivo">Inactivo (Baja lógica)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hora Entrada (Fija) *
              </label>
              <input
                type="time"
                required
                value={formHorario.horaEntrada}
                onChange={(e) =>
                  setFormHorario({
                    ...formHorario,
                    horaEntrada: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hora Salida (Fija) *
              </label>
              <input
                type="time"
                required
                value={formHorario.horaEgreso}
                onChange={(e) =>
                  setFormHorario({
                    ...formHorario,
                    horaEgreso: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Días Laborables Semanales *
            </label>
            <div className="grid grid-cols-4 sm:flex gap-1.5">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => {
                const sel = formHorario.dias.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDia(d)}
                    className={`py-2 px-2 sm:flex-1 rounded-xl font-bold transition cursor-pointer text-center ${
                      sel
                        ? "bg-[#4b35e6] text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN DE TOLERANCIAS Y SALIDAS INTERMEDIAS */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Parámetros de Auditoría y Salidas Intermedias (RF11)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                  Tolerancia Entrada (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formHorario.tolEntrada}
                  onChange={(e) =>
                    setFormHorario({
                      ...formHorario,
                      tolEntrada: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                  Tolerancia Salida (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formHorario.tolEgreso}
                  onChange={(e) =>
                    setFormHorario({
                      ...formHorario,
                      tolEgreso: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                  Máx. Salidas Intermedias
                </label>
                <input
                  type="number"
                  min="0"
                  value={formHorario.maxSalidas}
                  onChange={(e) =>
                    setFormHorario({
                      ...formHorario,
                      maxSalidas: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-600 font-semibold text-indigo-700"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                  Tiempo Máx. Fuera (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formHorario.tiempoMaxFuera}
                  onChange={(e) =>
                    setFormHorario({
                      ...formHorario,
                      tiempoMaxFuera: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-600 font-semibold text-indigo-700"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer text-center"
            >
              {editandoHorarioId ? "Guardar Cambios" : "Guardar Horario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
