import React from "react";
import { X } from "lucide-react";
import MultiSelectDropdown from "../comunes/MultiSelectDropdown";

export default function ModalRegistroEmpleado({
  isOpen,
  onClose,
  onSubmit,
  formEmpleado,
  setFormEmpleado,
  editandoEmpleadoId,
  categoriasActivas = [],
  cargosFiltradosForm = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">
              {editandoEmpleadoId
                ? "Editar Empleado"
                : "Registrar Nuevo Empleado"}
            </h3>
            <p className="text-[11px] text-slate-400">
              Defina datos personales, legajo institucional e ID biométrico.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos"
                value={formEmpleado.nombre}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, nombre: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Benítez"
                value={formEmpleado.apellido}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, apellido: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                DNI / Documento (Sin puntos) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 28455912"
                value={formEmpleado.dni}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, dni: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="carlos.benitez@instituto.edu.ar"
                value={formEmpleado.email || ""}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, email: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                placeholder="+54 11 4821-9901"
                value={formEmpleado.telefono || ""}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, telefono: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nº Legajo *
              </label>
              <input
                type="text"
                required
                placeholder="001"
                value={formEmpleado.nroLegajo}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    nroLegajo: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ID Biométrico (Reloj) *
              </label>
              <input
                type="text"
                required
                placeholder="19"
                value={formEmpleado.idBiometrico}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    idBiometrico: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <MultiSelectDropdown
              label="Categorías Laborales *"
              placeholder="Seleccionar categorías..."
              options={categoriasActivas}
              selectedIds={formEmpleado.categoriasIds || []}
              onChange={(newIds) =>
                setFormEmpleado({ ...formEmpleado, categoriasIds: newIds })
              }
            />
          </div>

          <MultiSelectDropdown
            label="Cargos / Puestos Asignados"
            placeholder="Seleccionar cargos asignados..."
            options={cargosFiltradosForm}
            selectedIds={formEmpleado.cargosIds || []}
            onChange={(newIds) =>
              setFormEmpleado({ ...formEmpleado, cargosIds: newIds })
            }
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rol en Sistema *
              </label>
              <select
                value={formEmpleado.rolSistema}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    rolSistema: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
              >
                <option value="Consulta / Empleado (Visualiza su ficha)">
                  Consulta / Empleado
                </option>
                <option value="Administrador">Administrador General</option>
                <option value="Recursos Humanos">
                  Recursos Humanos / Auditor
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tol. Ingreso (min)
              </label>
              <input
                type="number"
                value={formEmpleado.toleranciaIngresoMin}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    toleranciaIngresoMin: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tol. Egreso (min)
              </label>
              <input
                type="number"
                value={formEmpleado.toleranciaEgresoMin}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    toleranciaEgresoMin: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
            >
              {editandoEmpleadoId ? "Guardar Cambios" : "Registrar Empleado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
