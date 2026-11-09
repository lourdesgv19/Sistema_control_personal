import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";

export default function TarjetasKpiExcepciones({
  metricas = {
    enCursoHoy: 0,
    proximas: 0,
    finalizadas: 0,
    pendientesRrhh: 0,
    totalRegistros: 0,
  },
  filtroKpi = "TODOS",
  onSeleccionarKpi,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
      {/* 1. EN CURSO HOY */}
      <button
        type="button"
        onClick={() => onSeleccionarKpi("EN_CURSO")}
        className={`p-3 sm:p-4 rounded-2xl transition cursor-pointer text-left border ${
          filtroKpi === "EN_CURSO"
            ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
            : "bg-white border-slate-200 hover:border-emerald-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            EN CURSO HOY
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2 font-mono">
          {metricas.enCursoHoy}
        </div>
        <span className="text-[10px] sm:text-xs text-emerald-700 font-medium truncate block">
          Vigentes en la fecha actual
        </span>
      </button>

      {/* 2. PRÓXIMAS */}
      <button
        type="button"
        onClick={() => onSeleccionarKpi("PROXIMA")}
        className={`p-3 sm:p-4 rounded-2xl transition cursor-pointer text-left border ${
          filtroKpi === "PROXIMA"
            ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20 shadow-sm"
            : "bg-white border-slate-200 hover:border-sky-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            PRÓXIMAS
          </span>
          <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2 font-mono">
          {metricas.proximas}
        </div>
        <span className="text-[10px] sm:text-xs text-sky-700 font-medium truncate block">
          Programadas por iniciar
        </span>
      </button>

      {/* 3. FINALIZADAS */}
      <button
        type="button"
        onClick={() => onSeleccionarKpi("FINALIZADA")}
        className={`p-3 sm:p-4 rounded-2xl transition cursor-pointer text-left border ${
          filtroKpi === "FINALIZADA"
            ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-sm"
            : "bg-white border-slate-200 hover:border-slate-400"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            FINALIZADAS
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2 font-mono">
          {metricas.finalizadas}
        </div>
        <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate block">
          Historial concluido
        </span>
      </button>

      {/* 4. PENDIENTES RRHH */}
      <button
        type="button"
        onClick={() => onSeleccionarKpi("PENDIENTES_RRHH")}
        className={`p-3 sm:p-4 rounded-2xl transition cursor-pointer text-left border ${
          filtroKpi === "PENDIENTES_RRHH"
            ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
            : "bg-white border-slate-200 hover:border-amber-400"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 truncate">
            PENDIENTES RRHH
          </span>
          <span className="w-3.5 h-3.5 rounded-full border border-amber-500 text-amber-600 flex items-center justify-center text-[9px] font-bold shrink-0">
            !
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1 sm:mt-2 font-mono">
          {metricas.pendientesRrhh}
        </div>
        <span className="text-[10px] sm:text-xs text-amber-700 font-medium truncate block">
          Requieren dictamen
        </span>
      </button>

      {/* 5. TOTAL REGISTROS */}
      <button
        type="button"
        onClick={() => onSeleccionarKpi("TODOS")}
        className={`p-3 sm:p-4 rounded-2xl transition cursor-pointer text-left border col-span-2 sm:col-span-1 ${
          filtroKpi === "TODOS"
            ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm"
            : "bg-white border-indigo-200 hover:border-indigo-400"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 truncate">
            TOTAL REGISTROS
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-indigo-950 mt-1 sm:mt-2 font-mono">
          {metricas.totalRegistros}
        </div>
        <span className="text-[10px] sm:text-xs text-indigo-600 font-medium truncate block">
          Ver todos los casos
        </span>
      </button>
    </div>
  );
}
