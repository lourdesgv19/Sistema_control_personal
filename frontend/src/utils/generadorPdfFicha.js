import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatearFecha(fechaIso) {
  if (!fechaIso) return "--/--/----";
  const str = String(fechaIso).split("T")[0].split(" ")[0].trim();
  const partes = str.split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fechaIso;
}

function sanitizarTextoParaPdf(texto) {
  if (!texto) return "";
  return String(texto)
    .replace(/→/g, "a")
    .replace(/←/g, "desde")
    .replace(/•/g, "-")
    .replace(/[✓✔]/g, "OK")
    .replace(/[⚠!]/g, "[!]");
}

/**
 * Compacta las jornadas del período:
 * 1. OMITIR TOTALMENTE los días sin horario asignado y sin actividad (francos/futuros sin turno).
 * 2. Mostrar días sin horario pero CON actividad registrada indicando que fue jornada libre.
 * 3. Agrupar ausencias consecutivas de días que sí tenían horario obligatorio en un solo rango con colSpan.
 * 4. Fila especial para Licencias con colSpan.
 */
function compactarDiasPeriodo(dias, esColor) {
  if (!Array.isArray(dias) || dias.length === 0) return [];

  const resultado = [];
  let grupoAusencia = null;

  for (let i = 0; i < dias.length; i++) {
    const dia = dias[i];

    const tienePresencia =
      (dia.presenciaNetaMinutos && dia.presenciaNetaMinutos > 0) ||
      (dia.primeraEntrada && dia.primeraEntrada !== "--:--");

    const esLicencia =
      dia.tieneLicencia ||
      dia.estadoGeneral === "LICENCIA" ||
      dia.estadoGeneral === "ASUETO";

    // Si NO tenía horario programado y NO asistió -> Se omite por completo
    const esFrancoSinHorarioNiPresencia =
      !tienePresencia &&
      !esLicencia &&
      (dia.estadoGeneral === "FRANCO" ||
        dia.estadoGeneral === "FUTURO" ||
        (dia.horasClaseTeoricas === 0 && !dia.totalIncidentes));

    if (esFrancoSinHorarioNiPresencia) {
      if (grupoAusencia) {
        resultado.push(formatearFilaAusenciaAgrupada(grupoAusencia, esColor));
        grupoAusencia = null;
      }
      continue;
    }

    // Caso de Ausencia Real: sin presencia, sin licencia, con falta computada
    const esAusenciaObligatoria =
      !tienePresencia &&
      !esLicencia &&
      (dia.estadoGeneral === "INFRACCION" ||
        dia.estadoGeneral === "SIN_REGISTRO" ||
        (dia.totalIncidentes && dia.totalIncidentes > 0));

    if (esAusenciaObligatoria) {
      if (!grupoAusencia) {
        grupoAusencia = {
          fechaInicio: dia.fecha,
          fechaFin: dia.fecha,
          diaInicioSemana: dia.diaSemana,
          diaFinSemana: dia.diaSemana,
          cantidad: 1,
          totalIncidentes: dia.totalIncidentes || 0,
        };
      } else {
        grupoAusencia.fechaFin = dia.fecha;
        grupoAusencia.diaFinSemana = dia.diaSemana;
        grupoAusencia.cantidad += 1;
        grupoAusencia.totalIncidentes += dia.totalIncidentes || 0;
      }
    } else {
      if (grupoAusencia) {
        resultado.push(formatearFilaAusenciaAgrupada(grupoAusencia, esColor));
        grupoAusencia = null;
      }

      if (esLicencia && !tienePresencia) {
        // Fila de Licencia con colSpan
        resultado.push(formatearFilaLicencia(dia, esColor));
      } else if (
        tienePresencia &&
        (dia.estadoGeneral === "EXTRA" || dia.horasClaseTeoricas === 0)
      ) {
        // Día trabajado pero SIN jornada obligatoria asignada
        resultado.push(formatearFilaDiaSinHorarioConActividad(dia, esColor));
      } else {
        // Día con presencia normal y horario asignado
        resultado.push(formatearFilaDiaRegular(dia));
      }
    }
  }

  if (grupoAusencia) {
    resultado.push(formatearFilaAusenciaAgrupada(grupoAusencia, esColor));
  }

  return resultado;
}

/**
 * Fila de Ausencia agrupada (fusiona columnas vacías)
 */
function formatearFilaAusenciaAgrupada(grupo, esColor) {
  const rangoFechas =
    grupo.cantidad === 1
      ? formatearFecha(grupo.fechaInicio)
      : `${formatearFecha(grupo.fechaInicio)} al ${formatearFecha(grupo.fechaFin)}`;

  const rangoDias =
    grupo.cantidad === 1
      ? grupo.diaInicioSemana
      : `${grupo.diaInicioSemana} a ${grupo.diaFinSemana}`;

  const textoAusencia =
    grupo.cantidad === 1
      ? "[!] Inasistencia en jornada obligatoria"
      : `[!] Inasistencias consecutivas en jornada obligatoria (${grupo.cantidad} días)`;

  return [
    { content: rangoFechas, styles: { fontStyle: "bold" } },
    rangoDias,
    {
      content: textoAusencia,
      colSpan: 5,
      styles: {
        halign: "center",
        fontStyle: "bold",
        textColor: esColor ? [190, 18, 60] : [71, 85, 105],
        fillColor: esColor ? [255, 241, 242] : [248, 250, 252],
      },
    },
    grupo.totalIncidentes > 0 ? `[!] ${grupo.totalIncidentes}` : "-",
    {
      content: "0%",
      styles: {
        fontStyle: "bold",
        textColor: esColor ? [190, 18, 60] : [30, 41, 59],
      },
    },
  ];
}

/**
 * Fila de Licencia / Asueto
 */
function formatearFilaLicencia(dia, esColor) {
  const etiqueta =
    dia.tipoLicenciaEtiqueta || "Licencia / Asueto Institucional";

  return [
    { content: formatearFecha(dia.fecha), styles: { fontStyle: "bold" } },
    dia.diaSemana || "-",
    {
      content: `[OK] ${etiqueta} - Jornada eximida de asistencia`,
      colSpan: 5,
      styles: {
        halign: "center",
        fontStyle: "bold",
        textColor: esColor ? [3, 105, 161] : [71, 85, 105],
        fillColor: esColor ? [240, 249, 255] : [248, 250, 252],
      },
    },
    "-",
    {
      content: "Eximido",
      styles: {
        fontStyle: "bold",
        textColor: esColor ? [3, 105, 161] : [30, 41, 59],
      },
    },
  ];
}

/**
 * Fila para días trabajados sin horario obligatorio asignado
 */
function formatearFilaDiaSinHorarioConActividad(dia, esColor) {
  const presencia =
    dia.presenciaNetaTexto &&
    dia.presenciaNetaTexto !== "0h 0m" &&
    dia.presenciaNetaTexto !== "0h 00m"
      ? dia.presenciaNetaTexto
      : "-";

  return [
    formatearFecha(dia.fecha),
    dia.diaSemana || "-",
    dia.primeraEntrada && dia.primeraEntrada !== "--:--"
      ? dia.primeraEntrada
      : "-",
    dia.ultimoEgreso && dia.ultimoEgreso !== "--:--" ? dia.ultimoEgreso : "-",
    presencia,
    {
      content: "Sin jornada obligatoria pautada para este día",
      colSpan: 3,
      styles: {
        fontStyle: "italic",
        textColor: [100, 116, 139],
      },
    },
    "-",
  ];
}

/**
 * Fila regular con jornada y presencia efectiva
 */
function formatearFilaDiaRegular(dia) {
  const dif = dia.minutosDiferencia || 0;
  let saldoTexto = "-";
  if (dif > 0) {
    saldoTexto = `+${Math.floor(dif / 60)}h ${dif % 60}m`;
  } else if (dif < 0) {
    saldoTexto = `-${Math.floor(Math.abs(dif) / 60)}h ${Math.abs(dif) % 60}m`;
  }

  const presencia =
    dia.presenciaNetaTexto &&
    dia.presenciaNetaTexto !== "0h 0m" &&
    dia.presenciaNetaTexto !== "0h 00m"
      ? dia.presenciaNetaTexto
      : "-";

  const salidas =
    dia.salidasIntermedias > 0
      ? `${dia.salidasIntermedias} (${dia.minutosFuera}m)`
      : "-";

  const incidentes =
    dia.totalIncidentes > 0 ? `[!] ${dia.totalIncidentes}` : "-";

  return [
    formatearFecha(dia.fecha),
    dia.diaSemana || "-",
    dia.primeraEntrada && dia.primeraEntrada !== "--:--"
      ? dia.primeraEntrada
      : "-",
    dia.ultimoEgreso && dia.ultimoEgreso !== "--:--" ? dia.ultimoEgreso : "-",
    presencia,
    saldoTexto,
    salidas,
    incidentes,
    `${dia.porcentajeCumplimiento}%`,
  ];
}

/**
 * Agrupa incidentes continuos idénticos en un rango de fechas
 */
function compactarIncidentes(incidentes) {
  if (!Array.isArray(incidentes) || incidentes.length === 0) return [];

  const agrupados = [];
  let actual = null;

  for (let i = 0; i < incidentes.length; i++) {
    const inc = incidentes[i];
    const fechaInc = inc.fecha ? String(inc.fecha).split("T")[0] : null;

    if (!actual) {
      actual = {
        fechaInicio: fechaInc,
        fechaFin: fechaInc,
        hora: inc.hora,
        severidad: inc.severidad,
        tipo: inc.tipo,
        detalle: inc.detalle,
        estado: inc.estado,
        cantidad: 1,
      };
    } else {
      const mismoTipo =
        actual.tipo === inc.tipo &&
        actual.severidad === inc.severidad &&
        actual.estado === inc.estado &&
        actual.detalle === inc.detalle;

      if (mismoTipo) {
        actual.fechaFin = fechaInc;
        actual.cantidad += 1;
      } else {
        agrupados.push(formatearFilaIncidenteAgrupado(actual));
        actual = {
          fechaInicio: fechaInc,
          fechaFin: fechaInc,
          hora: inc.hora,
          severidad: inc.severidad,
          tipo: inc.tipo,
          detalle: inc.detalle,
          estado: inc.estado,
          cantidad: 1,
        };
      }
    }
  }

  if (actual) {
    agrupados.push(formatearFilaIncidenteAgrupado(actual));
  }

  return agrupados;
}

function formatearFilaIncidenteAgrupado(grupo) {
  const rangoFecha =
    grupo.cantidad === 1 || grupo.fechaInicio === grupo.fechaFin
      ? formatearFecha(grupo.fechaInicio)
      : `${formatearFecha(grupo.fechaInicio)} al ${formatearFecha(grupo.fechaFin)}`;

  const horaTexto =
    grupo.hora && grupo.hora !== "00:00" && grupo.hora !== "00:00:00"
      ? `${grupo.hora.substring(0, 5)} hs`
      : "-";

  const tipoTexto =
    grupo.cantidad > 1
      ? `${sanitizarTextoParaPdf(grupo.tipo)} (x${grupo.cantidad} días)`
      : sanitizarTextoParaPdf(grupo.tipo);

  return [
    rangoFecha,
    horaTexto,
    `[${(grupo.severidad || "MEDIA").toUpperCase()}]`,
    tipoTexto,
    sanitizarTextoParaPdf(grupo.detalle) || "-",
    grupo.estado || "PENDIENTE",
  ];
}

export function generarPdfFichaComportamiento({
  fichaData,
  modalidad,
  fechaConsulta,
  fechaHastaRango,
  esColor = false,
}) {
  if (!fichaData) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const hoyIso = new Date().toISOString().split("T")[0];

  const theme = esColor
    ? {
        primary: [67, 56, 202],
        primaryLight: [238, 242, 255],
        secondary: [79, 70, 229],
        darkText: [30, 41, 59],
        subText: [100, 116, 139],
        cardBg: [248, 250, 252],
        border: [226, 232, 240],
        headerBg: [241, 245, 249],
        alertBg: [225, 29, 72],
        badgeBorder: [67, 56, 202],
        accentHeader: [67, 56, 202],
      }
    : {
        primary: [30, 41, 59],
        primaryLight: [255, 255, 255],
        secondary: [71, 85, 105],
        darkText: [30, 41, 59],
        subText: [100, 116, 139],
        cardBg: [248, 250, 252],
        border: [203, 213, 225],
        headerBg: [241, 245, 249],
        alertBg: [71, 85, 105],
        badgeBorder: [30, 41, 59],
        accentHeader: [30, 41, 59],
      };

  const metricas = fichaData.metricas || {
    primeraEntrada: "--:--",
    ultimoEgreso: "--:--",
    presenciaNetaTexto: "0h 0m",
    salidasIntermediasCantidad: 0,
    salidasIntermediasMinutos: 0,
    totalIncidentes: 0,
    incidentesJustificados: 0,
    horasAFavorTexto: "0h 0m",
    horasEnContraTexto: "0h 0m",
    diasConDeficit: 0,
    diasConHorasExtra: 0,
    diasLicenciaPeriodo: 0,
    horasLicenciaTexto: "0h 0m",
  };

  // 1. Encabezado institucional
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.rect(0, 0, 210, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.text("INFORME DE COMPORTAMIENTO Y ASISTENCIA LABORAL", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("SISTEMA DE CONTROL HORARIO Y AUDITORÍA INSTITUCIONAL", 14, 21);
  doc.text(`Emisión: ${formatearFecha(hoyIso)}`, 196, 21, { align: "right" });

  doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.setLineWidth(0.6);
  doc.line(14, 24, 196, 24);

  // 2. Ficha Técnica del Colaborador
  doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
  doc.setLineWidth(0.3);
  doc.setFillColor(theme.cardBg[0], theme.cardBg[1], theme.cardBg[2]);
  doc.roundedRect(14, 27, 182, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(
    String(fichaData.nombreCompleto || "Personal Institucional"),
    18,
    34,
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("LEGAJO: ", 18, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(`${fichaData.nroLegajo || "-"}`, 33, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("DNI: ", 70, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(`${fichaData.dni || "-"}`, 78, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("ESTADO: ", 120, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(fichaData.activo ? "ACTIVO" : "INACTIVO", 135, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("CARGO / ROL: ", 18, 47);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(`${fichaData.rolOArea || "Personal"}`, 42, 47);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("RÉGIMEN / TURNO: ", 18, 54);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(`${fichaData.etiquetaTurno || "Jornada Regular"}`, 48, 54);

  // Cumplimiento
  doc.setDrawColor(
    theme.badgeBorder[0],
    theme.badgeBorder[1],
    theme.badgeBorder[2],
  );
  doc.setLineWidth(0.5);
  doc.setFillColor(
    theme.primaryLight[0],
    theme.primaryLight[1],
    theme.primaryLight[2],
  );
  doc.roundedRect(152, 30, 39, 26, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(
    esColor ? theme.primary[0] : theme.subText[0],
    esColor ? theme.primary[1] : theme.subText[1],
    esColor ? theme.primary[2] : theme.subText[2],
  );
  doc.text("CUMPLIMIENTO", 171.5, 36, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(
    esColor ? 17 : theme.darkText[0],
    esColor ? 24 : theme.darkText[1],
    esColor ? 39 : theme.darkText[2],
  );
  doc.text(`${fichaData.porcentajeCumplimiento || 0}%`, 171.5, 47, {
    align: "center",
  });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("de cronograma útil", 171.5, 52, { align: "center" });

  // 3. Resumen Ejecutivo
  const periodoTextoVisual = sanitizarTextoParaPdf(
    modalidad === "RANGO_FECHAS"
      ? `${formatearFecha(fechaConsulta)} AL ${formatearFecha(fechaHastaRango)}`
      : modalidad === "SEMANAL"
        ? `SEMANA (${formatearFecha(fechaConsulta)})`
        : modalidad === "MENSUAL"
          ? `MES COMPLETO (${formatearFecha(fechaConsulta)})`
          : `JORNADA (${formatearFecha(fechaConsulta)})`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text(`RESUMEN EJECUTIVO - PERÍODO: ${periodoTextoVisual}`, 14, 66);

  autoTable(doc, {
    startY: 69,
    margin: { left: 14, right: 14 },
    theme: "plain",
    styles: {
      fontSize: 7.5,
      font: "helvetica",
      textColor: theme.darkText,
      cellPadding: 2.5,
      lineColor: theme.border,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: theme.headerBg,
      textColor: theme.darkText,
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: theme.border,
    },
    head: [
      [
        "Presencia Neta",
        "Licencias / Asuetos",
        "Horas a Favor (+)",
        "Horas Deuda (-)",
        "Salidas Int.",
        "Incidentes",
      ],
    ],
    body: [
      [
        metricas.presenciaNetaTexto && metricas.presenciaNetaTexto !== "0h 0m"
          ? metricas.presenciaNetaTexto
          : "-",
        metricas.diasLicenciaPeriodo > 0
          ? `${metricas.horasLicenciaTexto} (${metricas.diasLicenciaPeriodo} d)`
          : "-",
        metricas.diasConHorasExtra > 0
          ? `+${metricas.horasAFavorTexto} (${metricas.diasConHorasExtra} d)`
          : "-",
        metricas.diasConDeficit > 0
          ? `-${metricas.horasEnContraTexto} (${metricas.diasConDeficit} d)`
          : "-",
        metricas.salidasIntermediasCantidad > 0
          ? `${metricas.salidasIntermediasCantidad} (${metricas.salidasIntermediasMinutos} min)`
          : "-",
        metricas.totalIncidentes > 0
          ? `${metricas.totalIncidentes} (${metricas.incidentesJustificados || 0} justif.)`
          : "-",
      ],
    ],
  });

  // Espaciado generoso tras la tabla de resumen
  let posY = doc.lastAutoTable.finalY + 7;

  // 4. DETECCIÓN DE HORARIO HISTÓRICO Y NOTA ACLARATORIA EN EL PDF
  const listaPlanificados = Array.isArray(fichaData.planificado)
    ? fichaData.planificado
    : Array.isArray(fichaData.planificados)
      ? fichaData.planificados
      : [];

  const horarioHistoricoDetectado = listaPlanificados.find((p) =>
    Boolean(p && p.esHistorico),
  );

  if (horarioHistoricoDetectado) {
    const bgHist = esColor ? [254, 243, 199] : [248, 250, 252];
    const borderHist = esColor ? [245, 158, 11] : [203, 213, 225];
    const textHist = esColor ? [146, 64, 14] : [30, 41, 59];

    // Limpiar etiquetas redundantes para que no duplique "(Histórico)"
    const nombreTurno = (
      horarioHistoricoDetectado.etiqueta || "Turno Programado"
    )
      .replace(/\s*\(Histórico\)\s*/gi, "")
      .trim();
    const hIni = horarioHistoricoDetectado.horaInicio || "--:--";
    const hFin = horarioHistoricoDetectado.horaFin || "--:--";
    const fAlta = formatearFecha(horarioHistoricoDetectado.fechaAlta);
    const fBaja = horarioHistoricoDetectado.fechaBaja
      ? ` hasta el ${formatearFecha(horarioHistoricoDetectado.fechaBaja)}`
      : "";

    const textoVigencia = `Durante este período rigió un esquema horario anterior (${nombreTurno} de ${hIni} a ${hFin} hs) vigente desde el ${fAlta}${fBaja}. Las marcas y posibles ausencias se auditan conforme a dicho régimen.`;

    // Ajuste dinámico de texto al ancho útil de la caja (172 mm)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    const lineasTexto = doc.splitTextToSize(textoVigencia, 172);

    // Altura calculada dinámicamente según la cantidad de líneas
    const altoCaja = 8 + lineasTexto.length * 3.6;

    doc.setFillColor(bgHist[0], bgHist[1], bgHist[2]);
    doc.setDrawColor(borderHist[0], borderHist[1], borderHist[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, posY, 182, altoCaja, 1.5, 1.5, "FD");

    // Título en negrita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(textHist[0], textHist[1], textHist[2]);
    doc.text("[!] RÉGIMEN HORARIO HISTÓRICO APLICABLE", 18, posY + 4.8);

    // Párrafo con salto automático contenido dentro de los bordes
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.text(lineasTexto, 18, posY + 8.8);

    // Separación adecuada hacia el título de la siguiente sección
    posY += altoCaja + 7;
  }

  // 5. Detalle de Jornada o Desglose
  if (modalidad === "DIARIO") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
    doc.text(
      `INTERVALOS RECONSTRUIDOS DEL DÍA (${fichaData.intervalosDetalle?.length || 0})`,
      14,
      posY,
    );

    const filasIntervalos = (fichaData.intervalosDetalle || []).map((it) => [
      it.tipo ? it.tipo.toUpperCase() : "-",
      `${it.horaInicio} hs`,
      `${it.horaFin} hs`,
      it.duracionTexto || "-",
      it.esInfraccion
        ? `[DESVÍO] ${sanitizarTextoParaPdf(it.detalle)}`
        : sanitizarTextoParaPdf(it.detalle) || "Normal",
    ]);

    autoTable(doc, {
      startY: posY + 2.5,
      margin: { left: 14, right: 14 },
      theme: esColor ? "striped" : "grid",
      styles: {
        fontSize: 7.5,
        font: "helvetica",
        textColor: theme.darkText,
        cellPadding: 2,
        lineColor: theme.border,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: theme.accentHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: esColor ? [248, 250, 252] : [250, 250, 250],
      },
      head: [
        [
          "Tipo de Registro",
          "Hora Inicio",
          "Hora Fin",
          "Duración",
          "Observación",
        ],
      ],
      body:
        filasIntervalos.length > 0
          ? filasIntervalos
          : [["-", "-", "-", "-", "Sin intervalos registrados"]],
    });

    posY = doc.lastAutoTable.finalY + 7;
  } else {
    const filasDiasCompactadas = compactarDiasPeriodo(
      fichaData.diasPeriodo,
      esColor,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
    doc.text(
      `DESGLOSE DE JORNADAS OBLIGATORIAS Y ACTIVIDAD (${filasDiasCompactadas.length} REGISTROS)`,
      14,
      posY,
    );

    autoTable(doc, {
      startY: posY + 2.5,
      margin: { left: 14, right: 14 },
      theme: esColor ? "striped" : "grid",
      styles: {
        fontSize: 7.2,
        font: "helvetica",
        textColor: theme.darkText,
        cellPadding: 2,
        lineColor: theme.border,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: theme.accentHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: esColor ? [248, 250, 252] : [250, 250, 250],
      },
      head: [
        [
          "Fecha / Período",
          "Día",
          "1ra Entrada",
          "Último Egreso",
          "Presencia",
          "Saldo",
          "Salidas Int.",
          "Incidentes",
          "Cumpl.",
        ],
      ],
      body:
        filasDiasCompactadas.length > 0
          ? filasDiasCompactadas
          : [
              [
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "Sin jornadas que reportar",
              ],
            ],
    });

    posY = doc.lastAutoTable.finalY + 7;
  }

  // 6. Listado de Incidentes Agrupados
  if (fichaData.incidentes && fichaData.incidentes.length > 0) {
    if (posY > 215) {
      doc.addPage();
      posY = 20;
    }

    const filasIncsCompactadas = compactarIncidentes(fichaData.incidentes);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(
      esColor ? 190 : theme.darkText[0],
      esColor ? 18 : theme.darkText[1],
      esColor ? 60 : theme.darkText[2],
    );
    doc.text(
      `INCIDENCIAS Y DESVÍOS CONSOLIDADOS (${filasIncsCompactadas.length})`,
      14,
      posY,
    );

    autoTable(doc, {
      startY: posY + 2.5,
      margin: { left: 14, right: 14 },
      theme: esColor ? "striped" : "grid",
      styles: {
        fontSize: 7.2,
        font: "helvetica",
        textColor: theme.darkText,
        cellPadding: 2,
        lineColor: theme.border,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: theme.alertBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: esColor ? [255, 241, 242] : [250, 250, 250],
      },
      head: [
        [
          "Fecha / Rango",
          "Hora",
          "Severidad",
          "Tipo de Desvío",
          "Detalle / Observación",
          "Auditoría",
        ],
      ],
      body: filasIncsCompactadas,
    });

    posY = doc.lastAutoTable.finalY + 10;
  }

  // 7. Firmas Institucionales
  if (posY > 245) {
    doc.addPage();
    posY = 25;
  } else {
    posY = Math.max(posY, 250);
  }

  doc.setDrawColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.setLineWidth(0.4);

  // Firma empleado
  doc.line(25, posY + 15, 85, posY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text("Firma del Colaborador", 55, posY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("Aclaración y DNI", 55, posY + 23, { align: "center" });

  // Firma RRHH
  doc.line(125, posY + 15, 185, posY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(theme.darkText[0], theme.darkText[1], theme.darkText[2]);
  doc.text("Responsable RRHH / Autoridad", 155, posY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(theme.subText[0], theme.subText[1], theme.subText[2]);
  doc.text("Firma y Sello Institucional", 155, posY + 23, { align: "center" });

  // 8. Pie de Página y Numeración
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.setLineWidth(0.2);
    doc.line(14, 285, 196, 285);

    doc.text(
      `Documento oficial de control de asistencia (${esColor ? "Versión Color" : "Versión B&W para Impresión"}).`,
      14,
      289,
    );
    doc.text(`Página ${i} de ${totalPages}`, 196, 289, { align: "right" });
  }

  const sufijo = esColor ? "Color" : "Impresion_BN";
  const nombreArchivo = `Ficha_Asistencia_${fichaData.nroLegajo || "empleado"}_${sufijo}_${formatearFecha(fechaConsulta).replace(/\//g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
