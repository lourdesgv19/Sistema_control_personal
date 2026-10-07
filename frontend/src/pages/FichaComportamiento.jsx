import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Printer,
  FileSpreadsheet,
  Eye,
  Users,
  Sliders,
  ArrowRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import ListaEmpleadosSidebar from "../components/comunes/ListaEmpleadosSidebar";
import { getFichaComportamiento } from "../services/fichaComportamientoService";

// Helper para convertir cualquier fecha ISO YYYY-MM-DD a formato estricto dd/mm/aaaa
function formatearFechaVisual(fechaIso) {
  if (!fechaIso) return "--/--/----";
  const str = String(fechaIso).split("T")[0];
  const partes = str.split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fechaIso;
}

export default function FichaComportamiento() {
  const hoyIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  // Control de apertura del sidebar
  const [sidebarAbierto, setSidebarAbierto] = useState(true);

  // Modalidades: DIARIO | SEMANAL | MENSUAL | RANGO_FECHAS
  const [modalidad, setModalidad] = useState("DIARIO");
  const [fechaConsulta, setFechaConsulta] = useState(hoyIso);
  const [fechaHastaRango, setFechaHastaRango] = useState(hoyIso);

  const [tabInferior, setTabInferior] = useState("INTERVALOS");

  const [loadingFicha, setLoadingFicha] = useState(false);
  const [fichaData, setFichaData] = useState(null);

  // Cargar datos de la ficha
  const cargarFicha = useCallback(async () => {
    if (!empleadoSeleccionado?.id) return;
    setLoadingFicha(true);
    try {
      const params = {
        modalidad: modalidad === "RANGO_FECHAS" ? "RANGO" : modalidad,
        fecha: fechaConsulta,
      };

      if (modalidad === "RANGO_FECHAS") {
        params.fechaDesde = fechaConsulta;
        params.fechaHasta = fechaHastaRango;
      }

      const data = await getFichaComportamiento(
        empleadoSeleccionado.id,
        params,
      );
      setFichaData(data);
    } catch (err) {
      console.error("Error al cargar ficha de comportamiento:", err);
    } finally {
      setLoadingFicha(false);
    }
  }, [empleadoSeleccionado, modalidad, fechaConsulta, fechaHastaRango]);

  useEffect(() => {
    cargarFicha();
  }, [cargarFicha]);

  const metricas = fichaData?.metricas || {
    primeraEntrada: "--:--",
    ultimoEgreso: "--:--",
    presenciaNetaTexto: "0h 0m",
    salidasIntermediasCantidad: 0,
    salidasIntermediasMinutos: 0,
    totalIncidentes: 0,
    incidentesJustificados: 0,
  };

  // Función para exportar a Excel / CSV estructurado
  const handleExportarExcel = () => {
    if (!fichaData) return;

    let csvContent = "\uFEFF"; // BOM UTF-8
    csvContent += "REPORTE DE FICHA DE COMPORTAMIENTO Y ASISTENCIA\n";
    csvContent += `Empleado;${fichaData.nombreCompleto || ""};Legajo;${fichaData.nroLegajo || ""};DNI;${fichaData.dni || ""}\n`;
    csvContent += `Cargo;${fichaData.rolOArea || ""};Departamento;${fichaData.departamento || ""}\n`;
    csvContent += `Modalidad;${modalidad};Período;${
      modalidad === "RANGO_FECHAS"
        ? `${formatearFechaVisual(fechaConsulta)} al${formatearFechaVisual(fechaHastaRango)}`
        : formatearFechaVisual(fechaConsulta)
    }\n`;
    csvContent += `Cumplimiento de Jornada;${fichaData.porcentajeCumplimiento || 0}%\n\n`;

    csvContent += "RESUMEN DE MÉTRICAS\n";
    csvContent += `1ra Entrada / Último Egreso;${metricas.primeraEntrada} a ${metricas.ultimoEgreso}\n`;
    csvContent += `Presencia Neta Total;${metricas.presenciaNetaTexto}\n`;
    csvContent += `Salidas Intermedias;${metricas.salidasIntermediasCantidad} (${metricas.salidasIntermediasMinutos} min)\n`;
    csvContent += `Incidentes Registrados;${metricas.totalIncidentes} (${metricas.incidentesJustificados} justificados)\n\n`;

    if (modalidad !== "DIARIO" && fichaData.diasPeriodo?.length > 0) {
      csvContent += "DESGLOSE DE JORNADAS DEL PERÍODO\n";
      csvContent +=
        "Fecha;Día;1ra Entrada;Último Egreso;Presencia Neta;Salidas Intermedias;Incidentes;Cumplimiento;Estado\n";
      fichaData.diasPeriodo.forEach((d) => {
        csvContent += `${formatearFechaVisual(d.fecha)};${d.diaSemana};${d.primeraEntrada};${d.ultimoEgreso};${d.presenciaNetaTexto};${d.salidasIntermedias} (${d.minutosFuera}m);${d.totalIncidentes};${d.porcentajeCumplimiento}%;${d.estadoGeneral}\n`;
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
  };

  // Función para disparar la vista de impresión o guardado en PDF
  const handleGenerarPdfImprimir = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5 font-sans relative">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      {/* BOTÓN FLOTANTE PARA TOGGLE DEL SIDEBAR */}
      <div className="flex items-center justify-between no-print">
        <button
          type="button"
          onClick={() => setSidebarAbierto(!sidebarAbierto)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          {sidebarAbierto ? (
            <>
              <PanelLeftClose className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Ocultar listado</span>
              <span className="sm:hidden">Ocultar</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
              <span>Ver listado de empleados</span>
            </>
          )}
        </button>

        {!sidebarAbierto && empleadoSeleccionado && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Inspeccionando a:</span>
            <strong className="text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
              {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}
            </strong>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================
            1. SIDEBAR DESPLEGABLE
           ======================================================== */}
        <div
          className={`no-print transition-all duration-300 ${
            sidebarAbierto ? "lg:col-span-3 block" : "lg:hidden"
          }`}
        >
          <ListaEmpleadosSidebar
            isOpen={sidebarAbierto}
            onClose={() => setSidebarAbierto(false)}
            empleadoSeleccionadoId={empleadoSeleccionado?.id}
            onSeleccionarEmpleado={(emp) => setEmpleadoSeleccionado(emp)}
          />
        </div>

        {/* ========================================================
            2. CONTENIDO PRINCIPAL
           ======================================================== */}
        <div
          className={`print-full space-y-5 transition-all duration-300 ${
            sidebarAbierto ? "lg:col-span-9" : "lg:col-span-12"
          }`}
        >
          {/* SELECTOR DE MODALIDAD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Modalidad de Reporte:
              </span>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto">
              {[
                { label: "Diario", key: "DIARIO" },
                { label: "Semanal", key: "SEMANAL" },
                { label: "Mensual", key: "MENSUAL" },
                { label: "Rango de fechas", key: "RANGO_FECHAS" },
              ].map(({ label, key }) => {
                const activo = modalidad === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setModalidad(key)}
                    className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                      activo
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECTOR DE FECHAS Y ACCIONES */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-500 uppercase text-[11px]">
                {modalidad === "DIARIO"
                  ? "Jornada:"
                  : modalidad === "SEMANAL"
                    ? "Semana:"
                    : modalidad === "MENSUAL"
                      ? "Mes:"
                      : "Período:"}
              </span>

              {/* Selector para DIARIO / SEMANAL / MENSUAL */}
              {modalidad !== "RANGO_FECHAS" ? (
                <label className="relative flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white focus-within:border-indigo-500 font-mono font-bold text-slate-800 shadow-2xs cursor-pointer transition">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatearFechaVisual(fechaConsulta)}</span>
                  <input
                    type="date"
                    value={fechaConsulta}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFechaConsulta(e.target.value);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Seleccionar fecha"
                  />
                </label>
              ) : (
                /* Selector para RANGO DE FECHAS (Desde - Hasta) */
                <div className="flex items-center gap-2">
                  <label className="relative flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white focus-within:border-indigo-500 font-mono font-bold text-slate-800 shadow-2xs cursor-pointer transition">
                    <span className="text-[10px] uppercase font-sans text-slate-400">
                      Desde:
                    </span>
                    <span>{formatearFechaVisual(fechaConsulta)}</span>
                    <input
                      type="date"
                      value={fechaConsulta}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFechaConsulta(e.target.value);
                          if (e.target.value > fechaHastaRango) {
                            setFechaHastaRango(e.target.value);
                          }
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Seleccionar fecha Desde"
                    />
                  </label>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                  <label className="relative flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white focus-within:border-indigo-500 font-mono font-bold text-slate-800 shadow-2xs cursor-pointer transition">
                    <span className="text-[10px] uppercase font-sans text-slate-400">
                      Hasta:
                    </span>
                    <span>{formatearFechaVisual(fechaHastaRango)}</span>
                    <input
                      type="date"
                      value={fechaHastaRango}
                      min={fechaConsulta}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFechaHastaRango(e.target.value);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Seleccionar fecha Hasta"
                    />
                  </label>
                </div>
              )}

              <span className="text-slate-400 font-medium">
                ({formatearFechaVisual(fechaConsulta)})
              </span>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={handleExportarExcel}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer text-xs"
                title="Descargar planilla en formato Excel"
              >
                <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
                Exportar Excel
              </button>

              <button
                type="button"
                onClick={handleGenerarPdfImprimir}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition shadow-xs cursor-pointer text-xs"
                title="Generar documento imprimible o guardar en PDF"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                Generar PDF / Imprimir
              </button>
            </div>
          </div>

          {/* FICHA EMPLEADO & CUMPLIMIENTO */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1e293b] flex items-center justify-center text-white font-bold text-base shadow-md overflow-hidden shrink-0">
                <Users className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {fichaData?.nombreCompleto ||
                      `${empleadoSeleccionado?.apellido || ""}, ${
                        empleadoSeleccionado?.nombre || ""
                      }`}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Activo
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-purple-700">
                    {fichaData?.rolOArea}
                  </span>{" "}
                  • {fichaData?.departamento}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {fichaData?.etiquetaTurno}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-slate-100 bg-slate-50/60 p-4 rounded-2xl text-right shrink-0 min-w-[170px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {modalidad === "DIARIO"
                  ? "CUMPLIMIENTO JORNADA"
                  : "CUMPLIMIENTO PERÍODO"}
              </div>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {fichaData?.porcentajeCumplimiento || 0}%
              </div>
            </div>
          </div>

          {/* TARJETAS KPI ADAPTADAS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {modalidad === "DIARIO"
                  ? "1RA ENTRADA → ÚLTIMO EGRESO"
                  : "DÍAS EN SEDE / PERÍODO"}
              </span>
              <div className="text-sm font-black text-slate-900 mt-2 font-mono">
                {modalidad === "DIARIO" ? (
                  `${metricas.primeraEntrada} hs → ${metricas.ultimoEgreso} hs`
                ) : (
                  <span className="text-xl font-bold font-sans text-slate-800">
                    {metricas.primeraEntrada}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/70 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                {modalidad === "DIARIO"
                  ? "PRESENCIA NETA"
                  : "TOTAL HORAS NETAS"}
              </span>
              <div>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {metricas.presenciaNetaTexto}
                </div>
                {modalidad !== "DIARIO" && (
                  <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                    {metricas.ultimoEgreso}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/70 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                {modalidad === "DIARIO"
                  ? "SALIDAS INTERMEDIAS"
                  : "SALIDAS INTERMEDIAS TOTALES"}
              </span>
              <div className="text-lg font-black text-amber-950 mt-1">
                {metricas.salidasIntermediasCantidad}{" "}
                {metricas.salidasIntermediasCantidad === 1
                  ? "salida"
                  : "salidas"}{" "}
                ({metricas.salidasIntermediasMinutos} min)
              </div>
            </div>

            <div className="bg-rose-50/50 border border-rose-200/70 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                {modalidad === "DIARIO"
                  ? "INCIDENTES DEL DÍA"
                  : "INCIDENTES TOTALES"}
              </span>
              <div>
                <div className="text-lg font-black text-rose-950 mt-1">
                  {metricas.totalIncidentes}{" "}
                  {modalidad === "DIARIO" ? "desvío(s)" : "incidente(s)"}
                </div>
                {modalidad !== "DIARIO" && (
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    {metricas.incidentesJustificados} justificados
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VISTA 1: DIARIO */}
          {modalidad === "DIARIO" && (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Línea de Tiempo (06:00 a 22:00 hs)</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />{" "}
                      Planificado
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />{" "}
                      Presencia
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />{" "}
                      Salida Interm.
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />{" "}
                      Infracción
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 overflow-x-auto">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 border-b border-slate-200 pb-1 min-w-[700px]">
                    {[
                      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                      21, 22,
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
                      return (
                        <div
                          key={idx}
                          style={{
                            left: `${Math.max(0, leftPct)}%`,
                            width: `${widthPct}%`,
                          }}
                          className={`absolute top-1 bottom-1 ${bg} text-white rounded-lg px-2 flex items-center justify-center text-[10px] font-bold shadow-xs`}
                        >
                          {r.etiqueta}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DETALLE INFERIOR */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="flex border-b border-slate-100 bg-[#f8fafc] px-4 pt-3 gap-2 text-xs font-bold no-print">
                  <button
                    type="button"
                    onClick={() => setTabInferior("INTERVALOS")}
                    className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                      tabInferior === "INTERVALOS"
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Intervalos de Jornada (
                    {fichaData?.intervalosDetalle?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabInferior("INCIDENTES")}
                    className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                      tabInferior === "INCIDENTES"
                        ? "border-rose-600 text-rose-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>
                      Incidentes ({fichaData?.incidentes?.length || 0})
                    </span>
                    {fichaData?.incidentes?.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabInferior("BRUTOS")}
                    className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                      tabInferior === "BRUTOS"
                        ? "border-indigo-600 text-indigo-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Fichajes en Bruto ({fichaData?.fichajesBrutos?.length || 0})
                  </button>
                </div>

                <div className="p-4">
                  {tabInferior === "INTERVALOS" && (
                    <table className="w-full text-left text-xs">
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
                                <span className="text-emerald-600">
                                  →] Presencia
                                </span>
                              ) : (
                                <span className="text-amber-600">
                                  [→ Salida Intermedia
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-mono">{it.horaInicio}</td>
                            <td className="py-3 font-mono">{it.horaFin}</td>
                            <td className="py-3 font-bold">
                              {it.duracionTexto}
                            </td>
                            <td
                              className={`py-3 ${
                                it.esInfraccion
                                  ? "text-rose-600 font-bold"
                                  : "text-slate-500"
                              }`}
                            >
                              {it.detalle}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {tabInferior === "INCIDENTES" && (
                    <div className="space-y-2">
                      {(fichaData?.incidentes || []).map((inc) => (
                        <div
                          key={inc.id}
                          className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-rose-900">
                              {inc.tipo}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {inc.detalle}
                            </div>
                          </div>
                          <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase">
                            {inc.severidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tabInferior === "BRUTOS" && (
                    <table className="w-full text-left text-xs">
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
                            <td className="py-2.5 text-slate-600">
                              {b.nombreReloj}
                            </td>
                            <td className="py-2.5 text-emerald-600 font-bold">
                              ✓ {b.estado}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* VISTA 2: SEMANAL O RANGO DE FECHAS */}
          {(modalidad === "SEMANAL" || modalidad === "RANGO_FECHAS") && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Desglose de Asistencia •{" "}
                    {modalidad === "SEMANAL"
                      ? "Semanal"
                      : `Rango (${formatearFechaVisual(fechaConsulta)} al ${formatearFechaVisual(fechaHastaRango)})`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Haga clic en "Ver Día" para abrir los detalles y la línea de
                    tiempo de cualquier jornada.
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs">
                  Total: {metricas.presenciaNetaTexto} presenciales
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Fecha (dd/mm/aaaa)</th>
                      <th className="px-4 py-3">Día</th>
                      <th className="px-4 py-3">1ra Entrada</th>
                      <th className="px-4 py-3">Último Egreso</th>
                      <th className="px-4 py-3">Presencia Neta</th>
                      <th className="px-4 py-3">Salidas Interm.</th>
                      <th className="px-4 py-3">Incidentes</th>
                      <th className="px-4 py-3">Cumplimiento</th>
                      <th className="px-4 py-3 text-right no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(fichaData?.diasPeriodo || []).map((dia) => (
                      <tr
                        key={dia.fecha}
                        className="hover:bg-slate-50/70 transition"
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
                        <td className="px-4 py-3">
                          {dia.salidasIntermedias} ({dia.minutosFuera} min)
                        </td>
                        <td className="px-4 py-3">
                          {dia.totalIncidentes > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              ⚠ {dia.totalIncidentes} desvío(s)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {dia.porcentajeCumplimiento}%
                        </td>
                        <td className="px-4 py-3 text-right no-print">
                          <button
                            type="button"
                            onClick={() => {
                              setFechaConsulta(dia.fecha);
                              setModalidad("DIARIO");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Día
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 3: MENSUAL */}
          {modalidad === "MENSUAL" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Calendario Mensual • {fichaData?.periodoTexto}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Toque cualquier día para ver sus marcas, desvíos y
                    justificar incidencias en específico.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                    Normal
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />{" "}
                    Infracción Crítica
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />{" "}
                    Desvío de Horario
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    <span className="w-2 h-2 rounded-full bg-sky-500" /> Salida
                    Intermedia
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> Sin
                    Registro
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2.5">
                {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
                  <div
                    key={d}
                    className="text-center font-bold text-[11px] text-slate-500 py-1 uppercase tracking-wider"
                  >
                    {d}
                  </div>
                ))}

                {(fichaData?.diasPeriodo || []).map((dia) => {
                  const numDia = parseInt(dia.fecha.split("-")[2], 10);
                  const esHoy = dia.fecha === hoyIso;

                  const esCritica =
                    dia.estadoGeneral === "INFRACCION" ||
                    (fichaData?.incidentes || []).some(
                      (inc) =>
                        inc.fecha === dia.fecha &&
                        (inc.severidad === "CRÍTICA" ||
                          inc.tipo?.toLowerCase().includes("clase")),
                    );

                  const esDesvio =
                    !esCritica &&
                    (dia.totalIncidentes > 0 || dia.estadoGeneral === "DESVIO");

                  const esSalidaIntermedia =
                    !esCritica && !esDesvio && dia.salidasIntermedias > 0;

                  const esNormal =
                    !esCritica && !esDesvio && dia.presenciaNetaMinutos > 0;

                  const esSinRegistro = dia.estadoGeneral === "SIN_REGISTRO";

                  let cardBgClasses =
                    "bg-white border-slate-200 hover:border-slate-300";
                  if (esCritica) {
                    cardBgClasses =
                      "bg-rose-50/70 border-rose-300 hover:border-rose-400 hover:shadow-sm";
                  } else if (esDesvio) {
                    cardBgClasses =
                      "bg-amber-50/50 border-amber-300 hover:border-amber-400 hover:shadow-sm";
                  } else if (esSalidaIntermedia) {
                    cardBgClasses =
                      "bg-sky-50/50 border-sky-300 hover:border-sky-400 hover:shadow-sm";
                  } else if (esNormal) {
                    cardBgClasses =
                      "bg-emerald-50/40 border-emerald-300 hover:border-emerald-400 hover:shadow-sm";
                  } else if (esSinRegistro) {
                    cardBgClasses = "bg-slate-50/70 border-slate-200";
                  }

                  return (
                    <div
                      key={dia.fecha}
                      onClick={() => {
                        setFechaConsulta(dia.fecha);
                        setModalidad("DIARIO");
                      }}
                      className={`border rounded-2xl p-2.5 min-h-[110px] flex flex-col justify-between transition-all cursor-pointer select-none ${cardBgClasses}`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span
                            className={`text-sm font-black ${esCritica ? "text-rose-900" : ""}`}
                          >
                            {numDia}
                          </span>
                          {esHoy && (
                            <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
                              HOY
                            </span>
                          )}
                        </div>

                        {dia.presenciaNetaMinutos > 0 &&
                          dia.primeraEntrada !== "--:--" && (
                            <div className="text-[10px] font-mono font-semibold text-slate-600 mt-1 leading-tight">
                              {dia.primeraEntrada} a. m. → {dia.ultimoEgreso} p.
                              m.
                            </div>
                          )}
                      </div>

                      <div className="mt-2">
                        {esCritica ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold shadow-2xs">
                            <span>⚠ Crítica ({dia.totalIncidentes})</span>
                          </div>
                        ) : esDesvio ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-2xs">
                            <Clock className="w-3 h-3 stroke-[2.5]" />
                            <span>Desvío ({dia.totalIncidentes})</span>
                          </div>
                        ) : esSalidaIntermedia ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500 text-white text-[10px] font-bold shadow-2xs">
                            <span>Salida ({dia.salidasIntermedias})</span>
                          </div>
                        ) : esNormal ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                            <span>✓ {dia.presenciaNetaTexto}</span>
                          </div>
                        ) : esSinRegistro ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Sin Registro
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Franco
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
