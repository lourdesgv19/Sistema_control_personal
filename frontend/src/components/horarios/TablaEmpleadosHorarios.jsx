import React from "react";
import {
  Sliders,
  Loader2,
  Lock,
  ArrowRight,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getBadgeColorClasses } from "../../utils/categoriasHorariosUtils";
import CronogramaSemanalDesplegable from "./CronogramaSemanalDesplegable";

export default function TablaEmpleadosHorarios({
  loading = false,
  empleados = [],
  categoriaActiva = "TODAS",
  esVistaDocentePura = false,
  filasExpandidas = {},
  cargandoDetalle = {},
  detallesPorEmpleado = {},
  puedeCrear = false,
  puedeEditar = false,
  puedeEliminar = false,
  onToggleExpandir,
  onAbrirTurno,
  onIrAMaterias,
  onEliminarFranja,
}) {
  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
        <span className="text-xs font-medium">
          Cargando nómina de horarios...
        </span>
      </div>
    );
  }

  if (empleados.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs italic">
        No se encontraron empleados registrados en{" "}
        {categoriaActiva === "TODAS"
          ? "el sistema"
          : `la categoría ${categoriaActiva}`}
        .
      </div>
    );
  }

  const esEmpleadoDocente = (emp) =>
    (emp.categorias || []).some((c) =>
      (c.nombre || c.codigoTag || "").toLowerCase().includes("docente"),
    ) || (emp.categoria?.nombre || "").toLowerCase().includes("docente");

  const obtenerCategoriasEmpleado = (emp) =>
    emp.categorias && emp.categorias.length > 0
      ? emp.categorias
      : emp.categoria
        ? [emp.categoria]
        : [];

  return (
    <>
      {/* VISTA MÓVIL */}
      <div className="md:hidden divide-y divide-slate-200">
        {empleados.map((emp) => {
          const cargosList = emp.cargos || [];
          const estaExpandido = !!filasExpandidas[emp.id];
          const esDocente = esEmpleadoDocente(emp);
          const categoriasEmp = obtenerCategoriasEmpleado(emp);
          const infoDetalle = detallesPorEmpleado[emp.id] || {
            clases: [],
            metricas: null,
          };

          return (
            <div
              key={emp.id}
              className={`transition-colors ${
                estaExpandido ? "bg-indigo-50/20" : "bg-white"
              }`}
            >
              <div className="p-4 flex flex-col gap-3">
                <div
                  onClick={() => onToggleExpandir(emp)}
                  className="flex items-start justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {emp.apellido}, {emp.nombre}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Legajo:{" "}
                        <span className="font-semibold text-slate-700">
                          {emp.nroLegajo || "Sin asignar"}
                        </span>{" "}
                        • DNI: {emp.dni || "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpandir(emp);
                    }}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      estaExpandido
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                    aria-label="Mostrar u ocultar detalle semanal"
                  >
                    {estaExpandido ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  {categoriaActiva === "TODAS" && (
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {categoriasEmp.length > 0 ? (
                        categoriasEmp.map((cat, idx) => (
                          <span
                            key={cat.id || idx}
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getBadgeColorClasses(
                              cat.colorIdentificacion,
                            )}`}
                          >
                            {cat.nombre || "General"}
                          </span>
                        ))
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-50 text-slate-600 border-slate-200">
                          General
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Cargo:
                    </span>
                    {cargosList.length > 0 ? (
                      cargosList.map((c, i) => (
                        <span
                          key={c.id || i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
                        >
                          {c.nombre || c}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        Sin cargos asignados
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/80">
                  <button
                    type="button"
                    onClick={() => onToggleExpandir(emp)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      estaExpandido
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {estaExpandido ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                        <span>Ocultar detalle</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                        <span>Ver cronograma</span>
                      </>
                    )}
                  </button>

                  {puedeCrear || puedeEditar ? (
                    esVistaDocentePura ? (
                      <button
                        type="button"
                        onClick={() => onIrAMaterias(emp.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 font-bold rounded-xl text-xs transition cursor-pointer border border-purple-200"
                      >
                        <span>Materias</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAbrirTurno(emp)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                        >
                          <Sliders className="w-3.5 h-3.5 shrink-0" />
                          <span>Asignar Horario</span>
                        </button>
                        {categoriaActiva === "TODAS" && esDocente && (
                          <button
                            type="button"
                            onClick={() => onIrAMaterias(emp.id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition cursor-pointer border border-purple-200"
                          >
                            <span>Materias</span>
                            <ArrowRight className="w-3 h-3 shrink-0" />
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-400 font-bold rounded-xl text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Bloqueado</span>
                    </div>
                  )}
                </div>
              </div>

              {estaExpandido && (
                <CronogramaSemanalDesplegable
                  empleado={emp}
                  cargando={!!cargandoDetalle[emp.id]}
                  clases={infoDetalle.clases}
                  metricas={infoDetalle.metricas}
                  esVistaDocentePura={esVistaDocentePura}
                  puedeEditar={puedeEditar}
                  puedeEliminar={puedeEliminar}
                  onAbrirTurno={onAbrirTurno}
                  onIrAMaterias={onIrAMaterias}
                  onEliminarFranja={onEliminarFranja}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* VISTA ESCRITORIO */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
            <tr>
              <th className="w-10 px-4 py-3.5"></th>
              <th className="px-4 py-3.5 tracking-wider">Empleado</th>
              <th className="px-6 py-3.5 tracking-wider">Cargos / Puestos</th>
              <th className="px-6 py-3.5 tracking-wider">Cronograma Semanal</th>
              <th className="px-6 py-3.5 tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {empleados.map((emp) => {
              const cargosList = emp.cargos || [];
              const estaExpandido = !!filasExpandidas[emp.id];
              const esDocente = esEmpleadoDocente(emp);
              const categoriasEmp = obtenerCategoriasEmpleado(emp);
              const infoDetalle = detallesPorEmpleado[emp.id] || {
                clases: [],
                metricas: null,
              };

              return (
                <React.Fragment key={emp.id}>
                  <tr
                    onClick={() => onToggleExpandir(emp)}
                    className={`transition-colors cursor-pointer ${
                      estaExpandido ? "bg-indigo-50/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpandir(emp);
                        }}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          estaExpandido
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                        title={
                          estaExpandido
                            ? "Ocultar detalle semanal"
                            : "Desplegar detalle semanal"
                        }
                      >
                        {estaExpandido ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {emp.apellido}, {emp.nombre}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Legajo: {emp.nroLegajo || "Sin asignar"} • DNI:{" "}
                        {emp.dni || "-"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {categoriaActiva === "TODAS" && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {categoriasEmp.length > 0 ? (
                            categoriasEmp.map((cat, idx) => (
                              <span
                                key={cat.id || idx}
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getBadgeColorClasses(
                                  cat.colorIdentificacion,
                                )}`}
                              >
                                {cat.nombre || "General"}
                              </span>
                            ))
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-slate-50 text-slate-600 border-slate-200">
                              General
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {cargosList.length > 0 ? (
                          cargosList.map((cg, i) => (
                            <span
                              key={cg.id || i}
                              className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium"
                            >
                              {cg.nombre || cg}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Sin cargos asignados
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpandir(emp);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                          estaExpandido
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {estaExpandido ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Ocultar detalle semanal</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Ver cronograma semanal</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="px-6 py-4 text-right whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {puedeCrear || puedeEditar ? (
                          esVistaDocentePura ? (
                            <button
                              type="button"
                              onClick={() => onIrAMaterias(emp.id)}
                              className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition cursor-pointer border border-purple-200"
                            >
                              <span>Gestionar Materias</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onAbrirTurno(emp)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Asignar Horario</span>
                              </button>

                              {categoriaActiva === "TODAS" && esDocente && (
                                <button
                                  type="button"
                                  onClick={() => onIrAMaterias(emp.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition cursor-pointer border border-purple-200"
                                >
                                  <span>Materias</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )
                        ) : (
                          <span className="p-1 text-slate-300 cursor-not-allowed">
                            <Lock className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {estaExpandido && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <CronogramaSemanalDesplegable
                          empleado={emp}
                          cargando={!!cargandoDetalle[emp.id]}
                          clases={infoDetalle.clases}
                          metricas={infoDetalle.metricas}
                          esVistaDocentePura={esVistaDocentePura}
                          puedeEditar={puedeEditar}
                          puedeEliminar={puedeEliminar}
                          onAbrirTurno={onAbrirTurno}
                          onIrAMaterias={onIrAMaterias}
                          onEliminarFranja={onEliminarFranja}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
