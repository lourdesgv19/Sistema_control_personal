import React from "react";
import {
  Users,
  FileCheck,
  ChevronUp,
  ChevronDown,
  Eye,
  Sparkles,
} from "lucide-react";

export default function FichaKpisHeader({
  fichaData,
  empleadoSeleccionado,
  esFlexible,
  franjaFlexible,
  metricas,
  mostrarKpis,
  setMostrarKpis,
  onAbrirAuditoria,
  onAbrirIncidentes,
  modalidad,
  estadoJornadaDiaria,
  esDocente,
}) {
  const mostrarGridKpis =
    mostrarKpis &&
    (modalidad !== "DIARIO" ||
      (!estadoJornadaDiaria.esSinHorario &&
        !estadoJornadaDiaria.esFuturoConHorario));

  return (
    <div className="space-y-4">
      {/* CABECERA PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white font-bold text-base shadow-md shrink-0">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {fichaData?.nombreCompleto ||
                  `${empleadoSeleccionado?.apellido || ""}, ${empleadoSeleccionado?.nombre || ""}`}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Activo
              </span>
              {esFlexible && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Flexible ({franjaFlexible?.horasObjetivo} hs)
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              <span className="font-semibold text-purple-700">
                {fichaData?.rolOArea}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-center justify-between md:justify-end flex-wrap pt-2 md:pt-0 border-t border-slate-100 md:border-none">
          <button
            type="button"
            onClick={onAbrirAuditoria}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition border border-indigo-200 cursor-pointer shadow-2xs flex-1 md:flex-initial justify-center"
          >
            <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Auditoría (
              {metricas.incidentesJustificados + metricas.incidentesObservados})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMostrarKpis(!mostrarKpis)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition border border-slate-200/80 cursor-pointer shadow-2xs justify-center"
          >
            {mostrarKpis ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Ocultar Métricas</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Mostrar Métricas</span>
              </>
            )}
          </button>

          <div className="border border-slate-100 bg-slate-50/60 p-2 sm:p-3 rounded-2xl text-right shrink-0 min-w-[100px] sm:min-w-[120px]">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CUMPLIMIENTO
            </div>
            <div className="text-lg sm:text-2xl font-black mt-0.5 text-slate-900">
              {fichaData?.porcentajeCumplimiento || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* BANNER FLEXIBLE MULTI-DÍA */}
      {esFlexible && modalidad !== "DIARIO" && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Colaborador con Horario Flexible / Bolsa de Horas
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Cumplimiento Libre
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Meta contractual asignada:{" "}
                <strong>
                  {franjaFlexible?.horasObjetivo} horas (
                  {franjaFlexible?.tipoFrecuencia?.toLowerCase() || "mensual"})
                </strong>
                . Cumplimiento libre sin penalización en días no concurridos.
              </p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white/90 border border-emerald-200 text-xs font-bold text-emerald-900 shadow-2xs shrink-0 self-start sm:self-center">
            Horas Realizadas: {metricas.presenciaNetaTexto}
          </div>
        </div>
      )}

      {/* GRID DE KPIS */}
      {mostrarGridKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3 animate-fadeIn">
          <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              {modalidad === "DIARIO" ? "ENTRADA → EGRESO" : "DÍAS EN SEDE"}
            </span>
            <div className="text-xs sm:text-sm font-black text-slate-900 mt-2 font-mono truncate">
              {modalidad === "DIARIO"
                ? `${metricas.primeraEntrada} hs → ${metricas.ultimoEgreso} hs`
                : metricas.primeraEntrada}
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block truncate">
              HORAS NETAS
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-950 mt-1">
              {metricas.presenciaNetaTexto}
            </div>
          </div>

          <div className="bg-sky-50/70 border border-sky-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block truncate">
              LICENCIAS
            </span>
            <div>
              <div className="text-lg sm:text-xl font-black text-sky-950 mt-1">
                {metricas.horasLicenciaTexto || "0h 0m"}
              </div>
              <div className="text-[10px] font-semibold text-sky-700 mt-0.5 truncate">
                {metricas.diasLicenciaPeriodo || 0} eximidos
              </div>
            </div>
          </div>

          {esDocente && (
            <div className="bg-purple-50/60 border border-purple-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block truncate">
                CLASES DICTADAS
              </span>
              <div className="text-lg sm:text-xl font-black text-purple-950 mt-1 font-mono">
                {String(metricas.clasesDictadasTexto || "0h 0m / 0h 0m (0%)")
                  .split("/")[0]
                  .trim()}
              </div>
            </div>
          )}

          <div className="bg-rose-50/60 border border-rose-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block truncate">
              HORAS EN CONTRA
            </span>
            <div className="text-lg sm:text-xl font-black text-rose-950 mt-1">
              -{metricas.horasEnContraTexto || "0h 0m"}
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/70 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block truncate">
              SALIDAS INTERMEDIAS
            </span>
            <div className="text-sm sm:text-base font-black text-amber-950 mt-1">
              {metricas.salidasIntermediasCantidad} (
              {metricas.salidasIntermediasMinutos} min)
            </div>
          </div>

          <div
            onClick={onAbrirIncidentes}
            className="p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between transition cursor-pointer select-none border bg-white hover:bg-rose-50/40 border-rose-200 col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-600 truncate">
                INCIDENTES
              </span>
              <Eye className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black mt-1 text-slate-900">
                {metricas.totalIncidentes}
              </div>
              <div className="text-[10px] font-semibold mt-0.5 text-slate-400">
                {metricas.incidentesJustificados} justif.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
