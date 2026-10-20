// Convierte fecha ISO YYYY-MM-DD a formato dd/mm/aaaa
export function formatearFechaVisual(fechaIso) {
  if (!fechaIso) return "--/--/----";
  const str = String(fechaIso).split("T")[0].split(" ")[0].trim();
  const partes = str.split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fechaIso;
}

// Nombre del día en español
export function obtenerNombreDia(fechaIso) {
  if (!fechaIso) return "";
  const partes = fechaIso.split("-");
  if (partes.length !== 3) return "";
  const d = new Date(
    parseInt(partes[0], 10),
    parseInt(partes[1], 10) - 1,
    parseInt(partes[2], 10),
  );
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return dias[d.getDay()];
}

// Nombre del mes en español
export function obtenerNombreMes(fechaIso) {
  if (!fechaIso) return "";
  const partes = fechaIso.split("-");
  if (partes.length !== 3) return "";
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${meses[parseInt(partes[1], 10) - 1]} De ${partes[0]}`;
}

// Fecha completa en texto (ej: "Lunes, 12 De Octubre De 2026")
export function formatearFechaLarga(fechaIso) {
  if (!fechaIso) return "";
  const partes = fechaIso.split("-");
  if (partes.length !== 3) return fechaIso;
  const nombreDia = obtenerNombreDia(fechaIso);
  const diaNum = parseInt(partes[2], 10);
  const nombreMes = obtenerNombreMes(fechaIso);
  return `${nombreDia}, ${diaNum} De ${nombreMes}`;
}

// Calcula lunes y domingo de la semana consultada
export function calcularRangoSemana(fechaIso) {
  const partes = fechaIso.split("-");
  const cur = new Date(
    parseInt(partes[0], 10),
    parseInt(partes[1], 10) - 1,
    parseInt(partes[2], 10),
  );
  const day = cur.getDay();
  const diff = cur.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(cur.setDate(diff));
  const sunday = new Date(cur.setDate(diff + 6));

  const fIso = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    inicioSemanaStr: fIso(monday),
    finSemanaStr: fIso(sunday),
  };
}

// Calcula primer y último día del mes consultado
export function calcularRangoMes(fechaIso) {
  const partes = fechaIso.split("-");
  const y = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimoDiaNum = new Date(y, m, 0).getDate();
  const ultimoDia = `${y}-${String(m).padStart(2, "0")}-${String(ultimoDiaNum).padStart(2, "0")}`;

  return {
    inicioMesStr: primerDia,
    finMesStr: ultimoDia,
  };
}

// Retorna el desfase (0 a 6) para alinear el día 1 con LUN - DOM
export function calcularOffsetPrimerDia(fechaIso) {
  if (!fechaIso) return 0;
  const partes = fechaIso.split("-");
  const d = new Date(
    parseInt(partes[0], 10),
    parseInt(partes[1], 10) - 1,
    parseInt(partes[2], 10),
  );
  return (d.getDay() + 6) % 7;
}

// Formato duración en horas y minutos exactos (ej: 2.7 -> "2h 42m", 3 -> "3h 00m", 0.083 -> "0h 05m")
export function formatearHorasYMinutos(horasODecimal) {
  if (horasODecimal == null || isNaN(horasODecimal)) return "0h 00m";
  const totalMinutos = Math.round(Number(horasODecimal) * 60);
  const h = Math.floor(Math.abs(totalMinutos) / 60);
  const m = Math.abs(totalMinutos) % 60;
  const signo = totalMinutos < 0 ? "-" : "";
  return `${signo}${h}h ${String(m).padStart(2, "0")}m`;
}

// Convierte minutos enteros directos a "Xh YYm" (ej: 162 -> "2h 42m")
export function formatearMinutosVisuales(minutosTotales) {
  if (minutosTotales == null || isNaN(minutosTotales)) return "0h 00m";
  const mins = Math.round(Number(minutosTotales));
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  const signo = mins < 0 ? "-" : "";
  return `${signo}${h}h ${String(m).padStart(2, "0")}m`;
}

// Formato reloj militar / 24 horas estricto (ej: "19:16:00" -> "19:16 hs" o Date -> "19:16 hs")
export function formatearHora24(horaStrODate) {
  if (!horaStrODate) return "--:--";
  if (typeof horaStrODate === "string") {
    const parteHora = horaStrODate.includes("T")
      ? horaStrODate.split("T")[1].substring(0, 5)
      : horaStrODate.trim().substring(0, 5);
    return `${parteHora} hs`;
  }
  const d = new Date(horaStrODate);
  if (isNaN(d.getTime())) return "--:--";
  return (
    d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " hs"
  );
}
