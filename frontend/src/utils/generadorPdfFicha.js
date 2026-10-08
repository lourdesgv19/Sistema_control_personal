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

/**
 * Genera el documento PDF institucional en versión Blanco y Negro o Color.
 * @param {Object} params
 * @param {Object} params.fichaData Datos completos de la ficha.
 * @param {string} params.modalidad DIARIO | SEMANAL | MENSUAL | RANGO_FECHAS.
 * @param {string} params.fechaConsulta Fecha de inicio/base.
 * @param {string} params.fechaHastaRango Fecha límite para rangos.
 * @param {boolean} [params.esColor=false] true para PDF con colores vivos, false para monocromo B&W.
 */
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

  // Paleta dinámica según modo seleccionado
  const theme = esColor
    ? {
        primary: [67, 56, 202], // Índigo #4338ca
        primaryLight: [238, 242, 255], // Índigo tenue
        secondary: [79, 70, 229],
        darkText: [30, 41, 59], // Slate 800
        subText: [100, 116, 139],
        cardBg: [248, 250, 252],
        border: [226, 232, 240],
        headerBg: [241, 245, 249],
        alertBg: [225, 29, 72], // Rose 600
        badgeBorder: [67, 56, 202],
        accentHeader: [67, 56, 202],
      }
    : {
        primary: [30, 41, 59], // Slate grafito
        primaryLight: [255, 255, 255],
        secondary: [71, 85, 105],
        darkText: [30, 41, 59],
        subText: [100, 116, 139],
        cardBg: [248, 250, 252],
        border: [203, 213, 225],
        headerBg: [241, 245, 249],
        alertBg: [71, 85, 105], // Gris intermedio para fotocopia
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
  };

  // ==========================================
  // 1. ENCABEZADO INSTITUCIONAL
  // ==========================================
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, 210, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...theme.primary);
  doc.text("INFORME DE COMPORTAMIENTO Y ASISTENCIA LABORAL", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...theme.subText);
  doc.text("SISTEMA DE CONTROL HORARIO Y AUDITORÍA INSTITUCIONAL", 14, 21);
  doc.text(`Emisión: ${formatearFecha(hoyIso)}`, 196, 21, { align: "right" });

  doc.setDrawColor(...theme.primary);
  doc.setLineWidth(0.6);
  doc.line(14, 24, 196, 24);

  // ==========================================
  // 2. FICHA TÉCNICA DEL COLABORADOR
  // ==========================================
  doc.setDrawColor(...theme.border);
  doc.setLineWidth(0.3);
  doc.setFillColor(...theme.cardBg);
  doc.roundedRect(14, 27, 182, 32, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...theme.darkText);
  doc.text(
    String(fichaData.nombreCompleto || "Personal Institucional"),
    18,
    34,
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.subText);
  doc.text("LEGAJO: ", 18, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...theme.darkText);
  doc.text(`${fichaData.nroLegajo || "-"}`, 33, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.subText);
  doc.text("DNI: ", 70, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...theme.darkText);
  doc.text(`${fichaData.dni || "-"}`, 78, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.subText);
  doc.text("ESTADO: ", 120, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...theme.darkText);
  doc.text(fichaData.activo ? "ACTIVO" : "INACTIVO", 135, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.subText);
  doc.text("CARGO / ROL: ", 18, 47);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...theme.darkText);
  doc.text(
    `${fichaData.rolOArea || "Personal"} — ${fichaData.departamento || "Dpto."}`,
    42,
    47,
  );

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.subText);
  doc.text("RÉGIMEN / TURNO: ", 18, 54);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...theme.darkText);
  doc.text(`${fichaData.etiquetaTurno || "Jornada Regular"}`, 48, 54);

  // Tarjeta de Cumplimiento a la derecha
  doc.setDrawColor(...theme.badgeBorder);
  doc.setLineWidth(0.5);
  doc.setFillColor(...theme.primaryLight);
  doc.roundedRect(152, 30, 39, 26, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...(esColor ? theme.primary : theme.subText));
  doc.text("CUMPLIMIENTO", 171.5, 36, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(...(esColor ? [17, 24, 39] : theme.darkText));
  doc.text(`${fichaData.porcentajeCumplimiento || 0}%`, 171.5, 47, {
    align: "center",
  });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.subText);
  doc.text("de horas teóricas", 171.5, 52, { align: "center" });

  // ==========================================
  // 3. RESUMEN DE INDICADORES DEL PERÍODO
  // ==========================================
  const periodoTextoVisual =
    modalidad === "RANGO_FECHAS"
      ? `${formatearFecha(fechaConsulta)} AL ${formatearFecha(fechaHastaRango)}`
      : modalidad === "SEMANAL"
        ? `SEMANA (${formatearFecha(fechaConsulta)})`
        : modalidad === "MENSUAL"
          ? `MES COMPLETO (${formatearFecha(fechaConsulta)})`
          : `JORNADA (${formatearFecha(fechaConsulta)})`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...theme.darkText);
  doc.text(`RESUMEN EJECUTIVO • PERÍODO: ${periodoTextoVisual}`, 14, 66);

  autoTable(doc, {
    startY: 69,
    margin: { left: 14, right: 14 },
    theme: "plain",
    styles: {
      fontSize: 8,
      font: "helvetica",
      textColor: theme.darkText,
      cellPadding: 3,
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
        "1ra Entrada / Último Egreso",
        "Presencia Neta Total",
        "Salidas Intermedias",
        "Total Incidentes / Desvíos",
      ],
    ],
    body: [
      [
        modalidad === "DIARIO"
          ? `${metricas.primeraEntrada} hs a ${metricas.ultimoEgreso} hs`
          : `${metricas.primeraEntrada} (${metricas.ultimoEgreso})`,
        metricas.presenciaNetaTexto,
        `${metricas.salidasIntermediasCantidad} (${metricas.salidasIntermediasMinutos} min)`,
        `${metricas.totalIncidentes} (${metricas.incidentesJustificados} justificados)`,
      ],
    ],
  });

  let posY = doc.lastAutoTable.finalY + 7;

  // ==========================================
  // 4. DETALLE DE JORNADA O DESGLOSE
  // ==========================================
  if (modalidad === "DIARIO") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...theme.darkText);
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
      it.esInfraccion ? `[DESVÍO] ${it.detalle}` : it.detalle || "Normal",
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...theme.darkText);
    doc.text(
      `DESGLOSE DÍA POR DÍA (${fichaData.diasPeriodo?.length || 0} JORNADAS)`,
      14,
      posY,
    );

    const filasDias = (fichaData.diasPeriodo || []).map((dia) => [
      formatearFecha(dia.fecha),
      dia.diaSemana || "-",
      dia.primeraEntrada || "--:--",
      dia.ultimoEgreso || "--:--",
      dia.presenciaNetaTexto || "0h 0m",
      dia.salidasIntermedias > 0
        ? `${dia.salidasIntermedias} (${dia.minutosFuera}m)`
        : "0",
      dia.totalIncidentes > 0 ? `[!] ${dia.totalIncidentes}` : "0",
      `${dia.porcentajeCumplimiento}%`,
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
          "Fecha",
          "Día",
          "1ra Entrada",
          "Último Egreso",
          "Presencia",
          "Salidas Int.",
          "Incidentes",
          "Cumpl.",
        ],
      ],
      body:
        filasDias.length > 0
          ? filasDias
          : [["-", "-", "-", "-", "-", "-", "-", "-"]],
    });

    posY = doc.lastAutoTable.finalY + 7;
  }

  // ==========================================
  // 5. LISTADO DE INCIDENTES Y DESVÍOS
  // ==========================================
  if (fichaData.incidentes && fichaData.incidentes.length > 0) {
    if (posY > 215) {
      doc.addPage();
      posY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...(esColor ? [190, 18, 60] : theme.darkText));
    doc.text(
      `INCIDENCIAS REGISTRADAS (${fichaData.incidentes.length})`,
      14,
      posY,
    );

    const filasIncs = fichaData.incidentes.map((inc) => [
      inc.fecha ? formatearFecha(inc.fecha) : "--/--/----",
      inc.hora ? `${inc.hora} hs` : "--:--",
      `[${(inc.severidad || "MEDIA").toUpperCase()}]`,
      inc.tipo || "Desvío Horario",
      inc.detalle || "-",
      inc.estado || "PENDIENTE",
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
        fillColor: theme.alertBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: esColor ? [255, 241, 242] : [250, 250, 250],
      },
      head: [
        [
          "Fecha",
          "Hora",
          "Severidad",
          "Tipo de Desvío",
          "Detalle / Infracción",
          "Auditoría",
        ],
      ],
      body: filasIncs,
    });

    posY = doc.lastAutoTable.finalY + 10;
  }

  // ==========================================
  // 6. CASILLEROS DE FIRMAS INSTITUCIONALES
  // ==========================================
  if (posY > 245) {
    doc.addPage();
    posY = 25;
  } else {
    posY = Math.max(posY, 250);
  }

  doc.setDrawColor(...theme.darkText);
  doc.setLineWidth(0.4);

  // Firma empleado
  doc.line(25, posY + 15, 85, posY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.darkText);
  doc.text("Firma del Colaborador", 55, posY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...theme.subText);
  doc.text("Aclaración y DNI", 55, posY + 23, { align: "center" });

  // Firma RRHH
  doc.line(125, posY + 15, 185, posY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...theme.darkText);
  doc.text("Responsable RRHH / Autoridad", 155, posY + 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...theme.subText);
  doc.text("Firma y Sello Institucional", 155, posY + 23, { align: "center" });

  // ==========================================
  // 7. PIE DE PÁGINA Y NUMERACIÓN
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(...theme.border);
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
