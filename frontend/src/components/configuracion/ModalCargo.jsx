import React from "react";
import { Briefcase, X } from "lucide-react";

export default function ModalCargo({
  isOpen,
  onClose,
  onSubmit,
  formCargo,
  setFormCargo,
  editandoCargoId,
  categoriasActivas = [],
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] cursor-default animate-in zoom-in-95"
      >
        <div className="bg-[#111827] px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              {editandoCargoId
                ? "Editar Cargo / Puesto"
                : "Nuevo Cargo / Puesto"}
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
              Nombre del Cargo *
            </label>
            <input
              type="text"
              required
              placeholder="ej. Profesor Titular, Bedel, Coordinador"
              value={formCargo.nombre}
              onChange={(e) =>
                setFormCargo({ ...formCargo, nombre: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Categoría Institucional *
            </label>
            <select
              value={formCargo.categoriaId}
              onChange={(e) =>
                setFormCargo({ ...formCargo, categoriaId: e.target.value })
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
              value={formCargo.estado}
              onChange={(e) =>
                setFormCargo({ ...formCargo, estado: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
            >
              <option value="Activo">Activo (Habilitado)</option>
              <option value="Inactivo">Inactivo (Baja lógica)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              rows="3"
              placeholder="Responsabilidades y perfil del puesto..."
              value={formCargo.descripcion}
              onChange={(e) =>
                setFormCargo({ ...formCargo, descripcion: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 resize-none"
            ></textarea>
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
              {editandoCargoId ? "Guardar Cambios" : "Guardar Cargo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
