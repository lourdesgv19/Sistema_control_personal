import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { formatearMinutosVisuales } from "../../utils/fechasFichaUtils";

export default function FichaVistaDiaria({
  fichaData,
  fechaConsulta,
  tabInferior,
  setTabInferior,
  tablaDetalleRef,
  renderItemIncidenteInteractivo,
  estadoJornadaDiaria,
}) {
  return (
    <>
      {!estadoJornadaDiaria.esInasistencia && (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Línea de Tiempo (06:00 a 22:00 hs)</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 overflow-x-auto">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 border-b border-slate-200 pb-1 min-w-[700px]">
              {[
                6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
              ].map((h) => (
                <span key={h}>{h}:00</span>
              ))}
            </div>

            <div className="relative h-8 bg-slate-200/60 rounded-xl overflow-hidden min-w-[700px]">
              {(fichaData?.planificado || []).map((p, idx) => {
                const leftPct = ((p.inicioMinutos - 360) / 960) * 100;
                const widthPct = (p.duracionMinutos / 960) * 100;
                return (
                  <div
                    key={idx}
                    style={{
                      left: `${Math.max(0, leftPct)}%`,
                      width: `${widthPct}%`,
                    }}
                    className="absolute top-1 bottom-1 bg-purple-600 text-white rounded-lg px-2 flex items-center text-[10px] font-bold shadow-xs truncate"
                    title={`${p.etiqueta}: ${p.horaInicio} - ${p.horaFin}`}
                  >
                    {p.etiqueta} ({p.horaInicio} a {p.horaFin})
                  </div>
                );
              })}
            </div>

            <div className="relative h-8 bg-slate-200/60 rounded-xl overflow-hidden min-w-[700px]">
              {(fichaData?.presenciaReal || []).map((r, idx) => {
                const leftPct = ((r.inicioMinutos - 360) / 960) * 100;
                const widthPct = (r.duracionMinutos / 960) * 100;
                const bg =
                  r.tipo === "PRESENCIA"
                    ? "bg-emerald-500"
                    : r.tipo === "INFRACCION"
                      ? "bg-rose-500"
                      : "bg-amber-400";

                const textoDuracion = r.duracionMinutos
                  ? formatearMinutosVisuales(r.duracionMinutos)
                  : r.etiqueta;

                return (
                  <div
                    key={idx}
                    style={{
                      left: `${Math.max(0, leftPct)}%`,
                      width: `${widthPct}%`,
                    }}
                    title={`${r.tipo}: ${textoDuracion}`}
                    className={`absolute top-1 bottom-1 ${bg} text-white rounded-lg px-2 flex items-center justify-center text-[10px] font-bold shadow-xs truncate`}
                  >
                    {textoDuracion}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE DETALLES INFERIOR */}
      <div
        ref={tablaDetalleRef}
        className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs scroll-mt-6"
      >
        <div className="flex border-b border-slate-100 bg-[#f8fafc] px-3 sm:px-4 pt-3 gap-1 sm:gap-2 text-xs font-bold no-print overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setTabInferior("INTERVALOS")}
            className={`pb-2.5 px-2.5 sm:px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              tabInferior === "INTERVALOS"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Intervalos ({fichaData?.intervalosDetalle?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setTabInferior("INCIDENTES")}
            className={`pb-2.5 px-2.5 sm:px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              tabInferior === "INCIDENTES"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Incidentes ({fichaData?.incidentes?.length || 0})</span>
            {fichaData?.incidentes?.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTabInferior("BRUTOS")}
            className={`pb-2.5 px-2.5 sm:px-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              tabInferior === "BRUTOS"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Fichajes ({fichaData?.fichajesBrutos?.length || 0})
          </button>
        </div>

        <div className="p-3 sm:p-4">
          {tabInferior === "INTERVALOS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Inicio</th>
                    <th className="py-2">Fin</th>
                    <th className="py-2">Duración</th>
                    <th className="py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(fichaData?.intervalosDetalle || []).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 font-bold">
                        {it.tipo === "Presencia" ? (
                          <span className="text-emerald-600">→] Presencia</span>
                        ) : (
                          <span className="text-amber-600">
                            [→ Salida Intermedia
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono">{it.horaInicio}</td>
                      <td className="py-3 font-mono">{it.horaFin}</td>
                      <td className="py-3 font-bold font-mono">
                        {typeof it.duracionMinutos === "number"
                          ? formatearMinutosVisuales(it.duracionMinutos)
                          : it.duracionTexto ||
                            formatearMinutosVisuales(it.duracion)}
                      </td>
                      <td
                        className={`py-3 ${it.esInfraccion ? "text-rose-600 font-bold" : "text-slate-500"}`}
                      >
                        {it.detalle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tabInferior === "INCIDENTES" && (
            <div className="space-y-2">
              {(fichaData?.incidentes || [])
                .filter(
                  (inc) =>
                    !inc.fecha ||
                    String(inc.fecha).split("T")[0] === fechaConsulta,
                )
                .map((inc) => renderItemIncidenteInteractivo(inc, false))}
              {(fichaData?.incidentes || []).filter(
                (inc) =>
                  !inc.fecha ||
                  String(inc.fecha).split("T")[0] === fechaConsulta,
              ).length === 0 && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sin incidentes registrados en esta fecha.</span>
                </div>
              )}
            </div>
          )}

          {tabInferior === "BRUTOS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[450px]">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2">Hora</th>
                    <th className="py-2">Evento</th>
                    <th className="py-2">Dispositivo / Reloj</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(fichaData?.fichajesBrutos || []).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold">{b.hora} hs</td>
                      <td className="py-2.5 uppercase font-semibold text-indigo-700">
                        {b.tipoEvento}
                      </td>
                      <td className="py-2.5 text-slate-600">{b.nombreReloj}</td>
                      <td className="py-2.5 text-emerald-600 font-bold">
                        ✓ {b.estado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
