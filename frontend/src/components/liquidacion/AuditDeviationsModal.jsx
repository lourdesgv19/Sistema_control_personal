import React from "react";
import { X, AlertTriangle, AlertCircle } from "lucide-react";
import {
  formatearFechaVisual,
  formatearHorasYMinutos,
  formatearMinutosVisuales,
} from "../../utils/fechasFichaUtils";

function obtenerIniciales(nombreCompleto = "") {
  if (!nombreCompleto) return "D";
  const partes = nombreCompleto.trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function obtenerColorIniciales(texto = "") {
  const paletas = [
    "bg-indigo-50 text-indigo-700 border-indigo-200",
    "bg-slate-100 text-slate-700 border-slate-300",
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-purple-50 text-purple-700 border-purple-200",
    "bg-zinc-100 text-zinc-700 border-zinc-300",
  ];
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  return paletas[Math.abs(hash) % paletas.length];
}

export default function AuditDeviationsModal({
  isOpen,
  onClose,
  docente,
  materiaSeleccionada = null,
  periodoTexto = "",
}) {
  if (!isOpen || !docente) return null;

  const esDetalleMateria = Boolean(materiaSeleccionada);
  const desviosMostrar = esDetalleMateria
    ? materiaSeleccionada.desvios || []
    : docente.desvios || [];

  const totalHorasDesc = esDetalleMateria
    ? materiaSeleccionada.horasDescontadas || 0
    : docente.horasDescontadas || 0;

  const montoDesc = esDetalleMateria
    ? materiaSeleccionada.montoDescontado || 0
    : docente.montoDescontado || 0;

  const desviosFaltas = desviosMostrar.filter((d) => d.tipoDesvio === "FALTA");
  const desviosTardanzas = desviosMostrar.filter(
    (d) => d.tipoDesvio === "LLEGADA_TARDE",
  );
  const desviosRetirosSalidas = desviosMostrar.filter(
    (d) =>
      d.tipoDesvio === "RETIRO_ANTICIPADO" ||
      d.tipoDesvio === "SALIDA_INTERMEDIA",
  );

  const horasFaltas = desviosFaltas.reduce(
    (acc, d) => acc + (d.horasDescontadas || 0),
    0,
  );
  const horasTardanzas = desviosTardanzas.reduce(
    (acc, d) => acc + (d.horasDescontadas || 0),
    0,
  );
  const horasRetiros = desviosRetirosSalidas.reduce(
    (acc, d) => acc + (d.horasDescontadas || 0),
    0,
  );

  const obtenerEstiloDesvio = (tipoDesvio) => {
    switch (tipoDesvio) {
      case "FALTA":
        return {
          iconoContenedor: "bg-rose-50 text-rose-600 border border-rose-200",
          badgeClase: "bg-rose-100 text-rose-700 border border-rose-200",
          esFalta: true,
          label: "FALTA",
        };
      case "LLEGADA_TARDE":
        return {
          iconoContenedor: "bg-amber-50 text-amber-600 border border-amber-200",
          badgeClase: "bg-amber-100 text-amber-800 border border-amber-200",
          esFalta: false,
          label: "LLEGADA TARDE",
        };
      case "RETIRO_ANTICIPADO":
        return {
          iconoContenedor: "bg-amber-50 text-amber-600 border border-amber-200",
          badgeClase: "bg-amber-100 text-amber-800 border border-amber-200",
          esFalta: false,
          label: "RETIRO ANTICIPADO",
        };
      case "SALIDA_INTERMEDIA":
      default:
        return {
          iconoContenedor:
            "bg-purple-50 text-purple-700 border border-purple-200",
          badgeClase: "bg-purple-100 text-purple-800 border border-purple-200",
          esFalta: false,
          label: "SALIDA INTERMEDIA",
        };
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* ENCABEZADO */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full border flex items-center justify-center font-bold text-sm shadow-xs select-none shrink-0 ${obtenerColorIniciales(
                docente.nombreDocente,
              )}`}
            >
              {obtenerIniciales(docente.nombreDocente)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {esDetalleMateria
                  ? `Detalle de Desvíos: ${materiaSeleccionada.nombreMateria}`
                  : "Bitácora Consolidada de Desvíos del Docente"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {docente.nombreDocente} • Leg. {docente.nroLegajo}
                {periodoTexto ? ` • ${periodoTexto}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TARJETA DE MATERIA ESPECÍFICA */}
          {esDetalleMateria && (
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {materiaSeleccionada.nombreMateria}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                  <span className="font-semibold text-slate-700 font-sans">
                    Días:{" "}
                    {materiaSeleccionada.diasNombres?.join(", ") || "Lun - Vie"}
                  </span>
                  <span>•</span>
                  <span>Horario: {materiaSeleccionada.horarioTexto}</span>
                  <span>•</span>
                  <span className="italic font-sans">
                    {materiaSeleccionada.aula}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Tarifa Cátedra
                </span>
                <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                  $
                  {Math.round(
                    materiaSeleccionada.tarifaHora || 0,
                  ).toLocaleString("es-AR")}
                  /h
                </div>
              </div>
            </div>
          )}

          {/* TARJETAS DE TOTALES */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-rose-50/60 border border-rose-100 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                Total Descontado
              </span>
              <div className="text-lg font-black text-rose-600 mt-1 font-mono">
                -{formatearHorasYMinutos(totalHorasDesc)}
              </div>
              <div className="text-[11px] font-bold text-rose-400 mt-0.5">
                -${Math.round(montoDesc).toLocaleString("es-AR")}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Por Faltas
              </span>
              <div className="text-lg font-black text-slate-700 mt-1 font-mono">
                {formatearHorasYMinutos(horasFaltas)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Por Tardanzas
              </span>
              <div className="text-lg font-black text-slate-700 mt-1 font-mono">
                {formatearHorasYMinutos(horasTardanzas)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Por Retiros / Salidas
              </span>
              <div className="text-lg font-black text-slate-700 mt-1 font-mono">
                {formatearHorasYMinutos(horasRetiros)}
              </div>
            </div>
          </div>

          {/* CRONOLOGÍA DE DESVÍOS FORENSES */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Bitácora de Desvíos Registrados ({desviosMostrar.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Auditoría cronológica
              </span>
            </div>

            {desviosMostrar.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Sin incidencias ni desvíos registrados para este período.
              </div>
            ) : (
              <div className="space-y-2.5">
                {desviosMostrar.map((desv, idx) => {
                  const estilo = obtenerEstiloDesvio(desv.tipoDesvio);

                  // Limpieza estricta: se quitan prefijos de fecha o día del renglón de abajo para evitar duplicación
                  const detalleLimpio = desv.detalleForense
                    ? desv.detalleForense
                        .replace(/^\d{1,2}[-/]\d{1,2}(\s*\([^)]*\))?:\s*/i, "")
                        .replace(
                          /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo):\s*/i,
                          "",
                        )
                        .trim()
                    : "";

                  return (
                    <div
                      key={idx}
                      className="border border-slate-200/90 rounded-2xl p-3 flex items-start justify-between bg-white hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 p-1.5 rounded-xl shrink-0 ${estilo.iconoContenedor}`}
                        >
                          {estilo.esFalta ? (
                            <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>

                        <div>
                          {/* PRIMER RENGLÓN: FECHA dd/mm/aaaa • Día de la semana + BADGES */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {formatearFechaVisual(desv.fecha)}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              • {desv.diaSemanaTexto}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${estilo.badgeClase}`}
                            >
                              {estilo.label}
                            </span>

                            {!esDetalleMateria && (
                              <span className="text-xs text-slate-500 font-medium">
                                ({desv.materiaNombre})
                              </span>
                            )}
                          </div>

                          {/* SEGUNDO RENGLÓN: ÚNICAMENTE EL DETALLE EXPLICATIVO */}
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {detalleLimpio}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <span className="text-xs font-bold text-rose-600 font-mono">
                          -{formatearHorasYMinutos(desv.horasDescontadas)}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          ({formatearMinutosVisuales(desv.minutosPerdidos)})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PIE */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
