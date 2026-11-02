import React from "react";
import { Tag, X, Check } from "lucide-react";

const PALETA_COLORES = [
  { id: "indigo", bg: "bg-[#4338ca]", ring: "ring-[#4338ca]" },
  { id: "emerald", bg: "bg-[#10b981]", ring: "ring-[#10b981]" },
  { id: "amber", bg: "bg-[#f59e0b]", ring: "ring-[#f59e0b]" },
  { id: "purple", bg: "bg-[#a855f7]", ring: "ring-[#a855f7]" },
  { id: "cyan", bg: "bg-[#06b6d4]", ring: "ring-[#06b6d4]" },
  { id: "rose", bg: "bg-[#f43f5e]", ring: "ring-[#f43f5e]" },
];

export default function ModalCategoria({
  isOpen,
  onClose,
  onSubmit,
  formCat,
  setFormCat,
  editandoCatId,
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
            <Tag className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              {editandoCatId
                ? "Editar Categoría de Personal"
                : "Nueva Categoría de Personal"}
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
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              placeholder="ej. Docentes, Administrativos, Investigadores"
              value={formCat.nombre}
              onChange={(e) =>
                setFormCat({ ...formCat, nombre: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Estado *
            </label>
            <select
              value={formCat.estado}
              onChange={(e) =>
                setFormCat({ ...formCat, estado: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
            >
              <option value="Activo">Activo (Habilitada en el sistema)</option>
              <option value="Inactivo">Inactivo (Deshabilitada)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Código Identificador (único)
            </label>
            <input
              type="text"
              placeholder="ej. docente, investigacion, maestranza"
              value={formCat.codigoTag}
              onChange={(e) =>
                setFormCat({ ...formCat, codigoTag: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Si se deja en blanco se generará automáticamente a partir del
              nombre.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Color de Identificación
            </label>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              {PALETA_COLORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setFormCat({ ...formCat, colorIdentificacion: c.id })
                  }
                  className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-white transition-transform cursor-pointer ${
                    formCat.colorIdentificacion === c.id
                      ? "scale-110 ring-3 ring-offset-2 " + c.ring
                      : "opacity-90"
                  }`}
                >
                  {formCat.colorIdentificacion === c.id && (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              rows="3"
              placeholder="Alcance, funciones o tipo de régimen institucional..."
              value={formCat.descripcion}
              onChange={(e) =>
                setFormCat({ ...formCat, descripcion: e.target.value })
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
              {editandoCatId ? "Guardar Cambios" : "Guardar Categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
