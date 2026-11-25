import React from "react";
import { UserPlus } from "lucide-react";
import BuscadorEmpleadoSelect from "./BuscadorEmpleadoSelect";

export default function VistaAsistenteVinculacion({
  vinculaciones = [],
  empleados = [],
  puedeVincular = false,
  puedeCrearEmpleado = false,
  onCambiarEmpleadoAsignado,
  onAbrirRegistroNuevo,
  onGuardarVinculaciones,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Asistente de Vinculación Biometría ↔ Empleados
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Selecciona un colaborador existente o crea uno nuevo directamente
            desde cada fila pendiente.
          </p>
        </div>
        {puedeVincular && (
          <button
            type="button"
            onClick={onGuardarVinculaciones}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer text-center"
          >
            Guardar Vinculaciones
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">ID en Lector</th>
              <th className="py-3 px-4">Nombre en Lector</th>
              <th className="py-3 px-4">Empleado en Sistema</th>
              <th className="py-3 px-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vinculaciones.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="text-center py-8 text-slate-400 italic"
                >
                  No se encontraron registros pendientes.
                </td>
              </tr>
            ) : (
              vinculaciones.map((v) => (
                <tr key={v.sJobNo} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                    {v.sJobNo}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {v.sName}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <BuscadorEmpleadoSelect
                        empleados={empleados}
                        valorSeleccionado={v.sugeridoEmpleadoId}
                        onSeleccionar={(nuevoId) =>
                          onCambiarEmpleadoAsignado(v.sJobNo, nuevoId)
                        }
                        disabled={v.yaVinculado || !puedeVincular}
                        sJobNo={v.sJobNo}
                        sName={v.sName}
                        onRegistrarNuevo={onAbrirRegistroNuevo}
                        puedeCrearEmpleado={puedeCrearEmpleado}
                      />

                      {!v.yaVinculado &&
                        puedeCrearEmpleado &&
                        onAbrirRegistroNuevo && (
                          <button
                            type="button"
                            onClick={() =>
                              onAbrirRegistroNuevo({
                                sJobNo: v.sJobNo,
                                sName: v.sName,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
                            title="Dar de alta nuevo colaborador con este ID biométrico"
                          >
                            <UserPlus className="w-3.5 h-3.5 shrink-0" />
                            <span>Crear empleado</span>
                          </button>
                        )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {v.yaVinculado ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        Vinculado
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
