import React from "react";
import { Clock, Eye, ShieldCheck } from "lucide-react";
import { formatearFechaVisual } from "../../utils/fechasFichaUtils";

export default function FichaVistaSemanal({
  fichaData,
  inicioSemanaStr,
  finSemanaStr,
  esFlexible,
  horasObjetivoSemana,
  metricas,
  renderCardInspeccionDiaria,
  obtenerHorariosDeFecha,
  hoyIso,
  diaInspeccionado,
  setDiaInspeccionado,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Desglose Semanal • ({formatearFechaVisual(inicioSemanaStr)} al{" "}
            {formatearFechaVisual(finSemanaStr)})
          </h3>
          <p className="text-[11px] text-slate-500">
            {esFlexible
              ? `Régimen flexible: ~${horasObjetivoSemana} hs semanales.`
              : 'Haga clic en "Ver Día" para abrir la inspección detallada.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {esFlexible && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs">
              Meta: ~{horasObjetivoSemana} hs
            </span>
          )}
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs">
            Total: {metricas.presenciaNetaTexto}
          </span>
        </div>
      </div>

      {renderCardInspeccionDiaria()}

      {esFlexible &&
      (fichaData?.diasPeriodo || []).filter(
        (d) =>
          d.presenciaNetaMinutos > 0 ||
          (d.primeraEntrada && d.primeraEntrada !== "--:--"),
      ).length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <div className="text-xs font-bold text-slate-700">
            Sin marcaciones registradas en esta semana
          </div>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            El colaborador cuenta con esquema libre y debe cubrir
            aproximadamente{" "}
            <strong>{horasObjetivoSemana} horas semanales</strong>.
          </p>
        </div>
      ) : (
        <>
          {/* CARDS MÓVIL (< md) */}
          <div className="grid grid-cols-1 gap-2.5 md:hidden">
            {(fichaData?.diasPeriodo || [])
              .filter((dia) => {
                if (!esFlexible) return true;
                const huboActividad =
                  dia.presenciaNetaMinutos > 0 ||
                  (dia.primeraEntrada && dia.primeraEntrada !== "--:--");
                const esLic =
                  dia.tieneLicencia ||
                  dia.estadoGeneral === "LICENCIA" ||
                  dia.estadoGeneral === "ASUETO";
                return huboActividad || esLic;
              })
              .map((dia) => {
                const estaInspeccionado = diaInspeccionado?.fecha === dia.fecha;
                const esLicencia =
                  dia.tieneLicencia ||
                  dia.estadoGeneral === "LICENCIA" ||
                  dia.estadoGeneral === "ASUETO";
                const esFuturo = dia.fecha > hoyIso;
                const horariosProgramados = obtenerHorariosDeFecha(dia.fecha);
                const tieneHorario = horariosProgramados.length > 0;
                const huboActividad =
                  dia.presenciaNetaMinutos > 0 ||
                  (dia.primeraEntrada && dia.primeraEntrada !== "--:--");

                const tieneIncidenteAusenciaReal = (
                  fichaData?.incidentes || []
                ).some(
                  (inc) =>
                    String(inc.fecha || "").split("T")[0] === dia.fecha &&
                    ((inc.tipo || "").toLowerCase().includes("inasistencia") ||
                      (inc.tipo || "").toLowerCase().includes("ausencia") ||
                      (inc.categoriaRegla || "").toUpperCase() === "AUSENCIAS"),
                );

                const esFalta =
                  tieneHorario &&
                  !huboActividad &&
                  !esFuturo &&
                  !esFlexible &&
                  tieneIncidenteAusenciaReal;

                const esSinHorarioConActividad =
                  !tieneHorario && huboActividad && !esLicencia;
                const esSinHorarioSinActividad =
                  !tieneHorario && !huboActividad && !esLicencia;

                // Día futuro sin horario o pasado sin horario ni marcas
                if ((esFuturo && !tieneHorario) || esSinHorarioSinActividad) {
                  return (
                    <div
                      key={dia.fecha}
                      className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 text-xs flex items-center justify-between"
                    >
                      <span className="font-mono font-bold text-slate-500">
                        {formatearFechaVisual(dia.fecha)} ({dia.diaSemana})
                      </span>
                      <span className="text-[11px] text-slate-400 italic">
                        Sin horario asignado para este día / Sin actividad
                        registrada
                      </span>
                    </div>
                  );
                }

                // Día futuro CON horario asignado (fondo azul suave)
                if (esFuturo && tieneHorario) {
                  return (
                    <div
                      key={dia.fecha}
                      className={`p-3 rounded-2xl border text-xs space-y-2 bg-indigo-50/50 border-indigo-200/80 ${
                        estaInspeccionado ? "ring-2 ring-indigo-400" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-950">
                          {formatearFechaVisual(dia.fecha)} ({dia.diaSemana})
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          Programado
                        </span>
                      </div>
                      <div className="space-y-1">
                        {horariosProgramados.map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-indigo-900 text-[11px] font-medium"
                          >
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>
                              <strong>{h.nombre}:</strong> {h.entrada} hs →{" "}
                              {h.salida} hs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={dia.fecha}
                    className={`p-3 rounded-2xl border text-xs space-y-2 ${
                      estaInspeccionado
                        ? "bg-indigo-50/70 border-indigo-400"
                        : esLicencia
                          ? "bg-sky-50/50 border-sky-200"
                          : esFalta
                            ? "bg-rose-50/50 border-rose-200"
                            : esSinHorarioConActividad
                              ? "bg-emerald-50/40 border-emerald-200/70"
                              : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {formatearFechaVisual(dia.fecha)} ({dia.diaSemana})
                      </span>
                      <button
                        type="button"
                        disabled={esFuturo && !estaInspeccionado}
                        onClick={() => {
                          if (diaInspeccionado?.fecha === dia.fecha)
                            setDiaInspeccionado(null);
                          else if (!esFuturo) setDiaInspeccionado(dia);
                        }}
                        title={
                          esFuturo
                            ? "No disponible para fechas futuras"
                            : undefined
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          esFuturo && !estaInspeccionado
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed select-none opacity-60 border border-slate-200"
                            : "bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer hover:bg-slate-50"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{estaInspeccionado ? "Cerrar" : "Ver"}</span>
                      </button>
                    </div>

                    {esLicencia ? (
                      <div className="text-sky-800 font-bold text-[11px]">
                        {dia.tipoLicenciaEtiqueta || "Licencia / Asueto"} •
                        Eximido
                      </div>
                    ) : esFalta ? (
                      <div className="text-rose-700 font-bold text-[11px]">
                        ⚠ Ausencia (
                        {horariosProgramados[0]?.nombre || "Horario programado"}
                        )
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-mono">
                            {dia.primeraEntrada} → {dia.ultimoEgreso}
                          </span>
                          <span className="font-bold text-emerald-700">
                            {dia.presenciaNetaTexto}
                          </span>
                        </div>
                        {esSinHorarioConActividad && (
                          <div className="text-[10px] text-emerald-800 bg-emerald-100/60 border border-emerald-200/80 px-2 py-0.5 rounded-md italic">
                            Sin jornada obligatoria registrada para este día
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* TABLA ESCRITORIO (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Día</th>
                  <th className="px-4 py-3">1ra Entrada</th>
                  <th className="px-4 py-3">Último Egreso</th>
                  <th className="px-4 py-3">Horas Realizadas</th>
                  <th className="px-4 py-3">Salidas Interm.</th>
                  <th className="px-4 py-3">Incidentes</th>
                  <th className="px-4 py-3">Cumplimiento</th>
                  <th className="px-4 py-3 text-right no-print">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(fichaData?.diasPeriodo || [])
                  .filter((dia) => {
                    if (!esFlexible) return true;
                    const huboActividad =
                      dia.presenciaNetaMinutos > 0 ||
                      (dia.primeraEntrada && dia.primeraEntrada !== "--:--");
                    const esLic =
                      dia.tieneLicencia ||
                      dia.estadoGeneral === "LICENCIA" ||
                      dia.estadoGeneral === "ASUETO";
                    return huboActividad || esLic;
                  })
                  .map((dia) => {
                    const estaInspeccionado =
                      diaInspeccionado?.fecha === dia.fecha;
                    const esLicencia =
                      dia.tieneLicencia ||
                      dia.estadoGeneral === "LICENCIA" ||
                      dia.estadoGeneral === "ASUETO";
                    const esFuturo = dia.fecha > hoyIso;
                    const horariosProgramados = obtenerHorariosDeFecha(
                      dia.fecha,
                    );
                    const tieneHorario = horariosProgramados.length > 0;
                    const huboActividad =
                      dia.presenciaNetaMinutos > 0 ||
                      (dia.primeraEntrada && dia.primeraEntrada !== "--:--");

                    // CASO 1: Licencia / Asueto
                    if (esLicencia) {
                      return (
                        <tr
                          key={dia.fecha}
                          className={`transition ${
                            estaInspeccionado
                              ? "bg-sky-100/70 font-semibold"
                              : "bg-sky-50/50 hover:bg-sky-50/80"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-sky-950">
                            {formatearFechaVisual(dia.fecha)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-sky-900">
                            {dia.diaSemana}
                          </td>
                          <td colSpan={4} className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-sky-800 border border-sky-300 font-bold text-[11px] shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                              {dia.tipoLicenciaEtiqueta ||
                                "Licencia / Asueto Institucional"}{" "}
                              • Eximido de asistencia
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                              Justificada
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-sky-900">
                            100%
                          </td>
                          <td className="px-4 py-3 text-right no-print">
                            <button
                              type="button"
                              onClick={() => {
                                if (diaInspeccionado?.fecha === dia.fecha)
                                  setDiaInspeccionado(null);
                                else setDiaInspeccionado(dia);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                                estaInspeccionado
                                  ? "bg-sky-700 text-white shadow-xs"
                                  : "bg-white hover:bg-sky-100 text-sky-800 border border-sky-300"
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {estaInspeccionado ? "Cerrar" : "Ver Día"}
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // CASO 2: Día futuro CON horario programado (fondo azul suave y botón deshabilitado)
                    if (esFuturo && tieneHorario) {
                      return (
                        <tr
                          key={dia.fecha}
                          className={`transition ${
                            estaInspeccionado
                              ? "bg-indigo-100/70 font-semibold"
                              : "bg-indigo-50/45 hover:bg-indigo-50/70"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-indigo-950">
                            {formatearFechaVisual(dia.fecha)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-indigo-900">
                            {dia.diaSemana}
                          </td>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                                Programado
                              </span>
                              {horariosProgramados.map((h, hIdx) => (
                                <span
                                  key={hIdx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-900 font-medium text-[11px] shadow-2xs"
                                >
                                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                  <strong>{h.nombre}:</strong> {h.entrada} hs →{" "}
                                  {h.salida} hs
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right no-print">
                            <button
                              type="button"
                              disabled={!estaInspeccionado}
                              onClick={() => {
                                if (estaInspeccionado)
                                  setDiaInspeccionado(null);
                              }}
                              title="No disponible para fechas futuras"
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                estaInspeccionado
                                  ? "bg-indigo-700 text-white shadow-xs cursor-pointer"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-60"
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {estaInspeccionado ? "Cerrar" : "Ver Día"}
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const tieneIncidenteAusenciaReal = (
                      fichaData?.incidentes || []
                    ).some(
                      (inc) =>
                        String(inc.fecha || "").split("T")[0] === dia.fecha &&
                        ((inc.tipo || "")
                          .toLowerCase()
                          .includes("inasistencia") ||
                          (inc.tipo || "").toLowerCase().includes("ausencia") ||
                          (inc.categoriaRegla || "").toUpperCase() ===
                            "AUSENCIAS"),
                    );

                    const esFalta =
                      tieneHorario &&
                      !huboActividad &&
                      !esFuturo &&
                      !esFlexible &&
                      tieneIncidenteAusenciaReal;

                    const esSinHorarioConActividad =
                      !tieneHorario && huboActividad && !esLicencia;
                    const esSinHorarioSinActividad =
                      !tieneHorario && !huboActividad && !esLicencia;

                    // CASO 3: Sin horario y sin actividad (o futuro sin turno)
                    if (
                      (esFuturo && !tieneHorario) ||
                      esSinHorarioSinActividad
                    ) {
                      return (
                        <tr
                          key={dia.fecha}
                          className={`transition ${
                            estaInspeccionado
                              ? "bg-slate-200/70"
                              : "bg-slate-50/60 hover:bg-slate-100/60"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-500">
                            {formatearFechaVisual(dia.fecha)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-500">
                            {dia.diaSemana}
                          </td>
                          <td
                            colSpan={6}
                            className="px-4 py-3 text-center text-slate-400 italic text-[11px]"
                          >
                            Sin horario asignado para este día / Sin actividad
                            registrada
                          </td>
                          <td className="px-4 py-3 text-right no-print">
                            <button
                              type="button"
                              disabled
                              title="Sin datos para inspeccionar"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Día
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // CASO 4: Sin horario pero CON actividad
                    if (esSinHorarioConActividad) {
                      return (
                        <tr
                          key={dia.fecha}
                          className={`transition ${
                            estaInspeccionado
                              ? "bg-indigo-50/70 font-semibold"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {formatearFechaVisual(dia.fecha)}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {dia.diaSemana}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {dia.primeraEntrada}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {dia.ultimoEgreso}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-700">
                            {dia.presenciaNetaTexto}
                          </td>
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-slate-400 italic text-[11px]"
                          >
                            Sin jornada obligatoria registrada para este día
                          </td>
                          <td className="px-4 py-3 text-right no-print">
                            <button
                              type="button"
                              onClick={() => {
                                if (diaInspeccionado?.fecha === dia.fecha)
                                  setDiaInspeccionado(null);
                                else setDiaInspeccionado(dia);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                                estaInspeccionado
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {estaInspeccionado ? "Cerrar" : "Ver Día"}
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // CASO 5: Jornada normal o inasistencia
                    return (
                      <tr
                        key={dia.fecha}
                        className={`transition ${
                          estaInspeccionado
                            ? "bg-indigo-50/70 font-semibold"
                            : esFalta
                              ? "bg-rose-50/40 hover:bg-rose-50/70"
                              : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {formatearFechaVisual(dia.fecha)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {dia.diaSemana}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {esFalta ? (
                            <span className="text-rose-600 font-bold">
                              --:--
                            </span>
                          ) : (
                            dia.primeraEntrada
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {esFalta ? (
                            <span className="text-rose-600 font-bold">
                              --:--
                            </span>
                          ) : (
                            dia.ultimoEgreso
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {esFalta ? (
                            <span className="text-rose-600 font-bold">
                              0h 00m
                            </span>
                          ) : (
                            <span className="text-emerald-700">
                              {dia.presenciaNetaTexto}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {dia.salidasIntermedias > 0 ? (
                            `${dia.salidasIntermedias} (${dia.minutosFuera} min)`
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {esFalta ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                              ⚠ Falta
                            </span>
                          ) : dia.totalIncidentes > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              ⚠ {dia.totalIncidentes} desvío(s)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          <span
                            className={
                              esFalta || dia.porcentajeCumplimiento < 100
                                ? "text-rose-600"
                                : "text-emerald-700"
                            }
                          >
                            {esFlexible
                              ? "Acredita Bolsa"
                              : esFalta
                                ? "0%"
                                : `${dia.porcentajeCumplimiento}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right no-print">
                          <button
                            type="button"
                            disabled={esFuturo && !estaInspeccionado}
                            onClick={() => {
                              if (diaInspeccionado?.fecha === dia.fecha)
                                setDiaInspeccionado(null);
                              else if (!esFuturo) setDiaInspeccionado(dia);
                            }}
                            title={
                              esFuturo
                                ? "No disponible para fechas futuras"
                                : undefined
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                              esFuturo && !estaInspeccionado
                                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-60"
                                : estaInspeccionado
                                  ? "bg-indigo-600 text-white shadow-xs cursor-pointer"
                                  : esFalta
                                    ? "bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold cursor-pointer"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {estaInspeccionado ? "Cerrar" : "Ver Día"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
