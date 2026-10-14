import { formatearFechaVisual } from "./fechasFichaUtils";

export function exportarFichaACsv({
  fichaData,
  modalidad,
  fechaConsulta,
  fechaHastaRango,
}) {
  if (!fichaData) return;

  const metricas = fichaData.metricas || {};

  let csvContent = "\uFEFF";
  csvContent += "REPORTE DE FICHA DE COMPORTAMIENTO Y ASISTENCIA\n";
  csvContent += `Empleado;${fichaData.nombreCompleto || ""};Legajo;${fichaData.nroLegajo || ""};DNI;${fichaData.dni || ""}\n`;
  csvContent += `Cargo;${fichaData.rolOArea || ""};Departamento;${fichaData.departamento || ""}\n`;
  csvContent += `Modalidad;${modalidad};Período;${
    modalidad === "RANGO_FECHAS"
      ? `${formatearFechaVisual(fechaConsulta)} al ${formatearFechaVisual(fechaHastaRango)}`
      : formatearFechaVisual(fechaConsulta)
  }\n`;
  csvContent += `Cumplimiento de Cronograma;${fichaData.porcentajeCumplimiento || 0}%\n\n`;

  csvContent += "RESUMEN DE MÉTRICAS\n";
  csvContent += `1ra Entrada / Último Egreso;${metricas.primeraEntrada || "--:--"} a ${metricas.ultimoEgreso || "--:--"}\n`;
  csvContent += `Presencia Neta Total;${metricas.presenciaNetaTexto || "0h 0m"}\n`;
  csvContent += `Horas a Favor (Extra);+${metricas.horasAFavorTexto || "0h 0m"} (${metricas.diasConHorasExtra || 0} días)\n`;
  csvContent += `Horas en Contra (Déficit);-${metricas.horasEnContraTexto || "0h 0m"} (${metricas.diasConDeficit || 0} días)\n`;
  csvContent += `Salidas Intermedias;${metricas.salidasIntermediasCantidad || 0} (${metricas.salidasIntermediasMinutos || 0} min)\n`;
  csvContent += `Incidentes Registrados;${metricas.totalIncidentes || 0} (${metricas.incidentesJustificados || 0} justificados)\n\n`;

  if (modalidad !== "DIARIO" && fichaData.diasPeriodo?.length > 0) {
    csvContent += "DESGLOSE DE JORNADAS DEL PERÍODO\n";
    csvContent +=
      "Fecha;Día;1ra Entrada;Último Egreso;Presencia Neta;Saldo Minutos;Salidas Intermedias;Incidentes;Cumplimiento;Estado\n";
    fichaData.diasPeriodo.forEach((d) => {
      csvContent += `${formatearFechaVisual(d.fecha)};${d.diaSemana};${d.primeraEntrada};${d.ultimoEgreso};${d.presenciaNetaTexto};${d.minutosDiferencia || 0}m;${d.salidasIntermedias} (${d.minutosFuera}m);${d.totalIncidentes};${d.porcentajeCumplimiento}%;${d.estadoGeneral}\n`;
    });
    csvContent += "\n";
  }

  if (modalidad === "DIARIO" && fichaData.intervalosDetalle?.length > 0) {
    csvContent += "INTERVALOS DE JORNADA\n";
    csvContent += "Tipo;Inicio;Fin;Duración;Detalle\n";
    fichaData.intervalosDetalle.forEach((it) => {
      csvContent += `${it.tipo};${it.horaInicio};${it.horaFin};${it.duracionTexto};${it.detalle}\n`;
    });
    csvContent += "\n";
  }

  if (fichaData.incidentes?.length > 0) {
    csvContent += "DETALLE DE INCIDENTES\n";
    csvContent += "Hora;Severidad;Tipo de Infracción;Detalle;Estado\n";
    fichaData.incidentes.forEach((inc) => {
      csvContent += `${inc.hora};${inc.severidad};${inc.tipo};${inc.detalle?.replace(/;/g, ",")};${inc.estado}\n`;
    });
    csvContent += "\n";
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const nombreArchivo = `Ficha_Comportamiento_${fichaData.nroLegajo || "empleado"}_${modalidad}_${formatearFechaVisual(fechaConsulta).replace(/\//g, "-")}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
