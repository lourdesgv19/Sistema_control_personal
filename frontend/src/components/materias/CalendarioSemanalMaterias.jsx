import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getCalendarioSemanal } from "../../services/gestionMateriasService";
import ModalAuditoriaClase from "./ModalAuditoriaClase";
import { formatearFechaVisual } from "../../utils/fechasFichaUtils";

const DIAS_OPCIONES = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
];

export default function CalendarioSemanalMaterias({ onEditarMateriaParam }) {
  const [fechaLunes, setFechaLunes] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  });

  const [diasSeleccionados, setDiasSeleccionados] = useState([1, 2, 3, 4, 5]);
  const [idDocenteSeleccionado, setIdDocenteSeleccionado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [datosCalendario, setDatosCalendario] = useState(null);
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para el modal de auditoría al hacer click en una clase
  const [claseSeleccionadaAuditoria, setClaseSeleccionadaAuditoria] =
    useState(null);

  const cambiarSemana = (dias) => {
    const d = new Date(fechaLunes + "T00:00:00");
    d.setDate(d.getDate() + dias);
    setFechaLunes(d.toISOString().split("T")[0]);
  };

  const toggleDia = (idDia) => {
    setDiasSeleccionados((prev) => {
      if (prev.includes(idDia)) {
        return prev.filter((d) => d !== idDia);
      } else {
        return [...prev, idDia].sort((a, b) => a - b);
      }
    });
  };

  const seleccionarTodosLosDias = () => {
    setDiasSeleccionados([]);
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCalendarioSemanal(
        fechaLunes,
        idDocenteSeleccionado,
        diasSeleccionados,
        busqueda,
      );
      setDatosCalendario(res.data);
      if (res.data?.docentesDisponibles) {
        setDocentes(res.data.docentesDisponibles);
      }
    } catch (err) {
      console.error("Error al cargar calendario semanal", err);
    } finally {
      setLoading(false);
    }
  }, [fechaLunes, idDocenteSeleccionado, diasSeleccionados, busqueda]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const textoRangoSemana = () => {
    if (!datosCalendario?.fechaInicioSemana) return "Cargando semana...";
    return `Semana del ${formatearFechaVisual(datosCalendario.fechaInicioSemana)} al ${formatearFechaVisual(datosCalendario.fechaFinSemana)}`;
  };

  const renderBadgeSemaforo = (clase) => {
    if (clase.estadoSemaforo === "PENDIENTE") {
      return (
        <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
          {clase.motivoDesvio}
        </span>
      );
    }
    if (clase.estadoSemaforo === "VERDE") {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
          • {clase.motivoDesvio}
        </span>
      );
    }
    if (clase.estadoSemaforo === "AMBAR") {
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
          • {clase.motivoDesvio}
        </span>
      );
    }
    return (
      <span className="bg-rose-50 text-rose-600 border border-rose-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
        • {clase.motivoDesvio}
      </span>
    );
  };

  const getBordeClase = (estado) => {
    if (estado === "VERDE")
      return "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:shadow-xs";
    if (estado === "AMBAR")
      return "border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-xs";
    if (estado === "ROJO")
      return "border-rose-200 bg-rose-50 hover:border-rose-400 hover:shadow-xs";
    return "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs";
  };

  const cantidadColumnas = datosCalendario?.dias?.length || 6;
  const getGridColsClass = () => {
    if (cantidadColumnas === 1) return "grid-cols-1 max-w-2xl mx-auto";
    if (cantidadColumnas === 2) return "grid-cols-1 md:grid-cols-2";
    if (cantidadColumnas === 3) return "grid-cols-1 md:grid-cols-3";
    if (cantidadColumnas === 4)
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    if (cantidadColumnas === 5)
      return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";
  };

  return (
    <div className="space-y-4">
      {/* 1. BARRA DE FILTROS SUPERIOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Selector de Rango Semanal */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={() => cambiarSemana(-7)}
            className="p-1 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 px-2 select-none">
            {textoRangoSemana()}
          </span>
          <button
            type="button"
            onClick={() => cambiarSemana(7)}
            className="p-1 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Días Múltiples */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400 px-2 select-none">
            Días:
          </span>
          <button
            type="button"
            onClick={seleccionarTodosLosDias}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              diasSeleccionados.length === 0
                ? "bg-[#4b35e6] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Todos
          </button>

          {DIAS_OPCIONES.map((dia) => {
            const estaActivo = diasSeleccionados.includes(dia.id);
            return (
              <button
                key={dia.id}
                type="button"
                onClick={() => toggleDia(dia.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  estaActivo
                    ? "bg-[#4b35e6] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                {dia.label}
              </button>
            );
          })}
        </div>

        {/* Dropdown de Docentes */}
        <div className="relative min-w-[200px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Users className="w-3.5 h-3.5" />
          </div>
          <select
            value={idDocenteSeleccionado}
            onChange={(e) => setIdDocenteSeleccionado(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="">Todos los Docentes ({docentes.length})</option>
            {docentes.map((d) => (
              <option key={d.idEmpleado} value={d.idEmpleado}>
                {d.nombreCompleto} ({d.legajo || "S/L"})
              </option>
            ))}
          </select>
        </div>

        {/* Buscador */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar materia o aula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* 2. LEYENDA DEL SEMÁFORO */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
        <span className="text-slate-400 font-normal flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          Semáforo de Dictado de Materia:
        </span>
        <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Verde: Dio
          todas las horas correspondientes (100%)
        </span>
        <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Ámbar: Llegó
          tarde, hubo desvíos o se fue antes
        </span>
        <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Rojo: No dio la
          clase (Sin registro / Falta)
        </span>
      </div>

      {/* 3. GRILLA DE DÍAS Y MATERIAS */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          Cargando cronograma semanal...
        </div>
      ) : (
        <div className={`grid gap-3 ${getGridColsClass()}`}>
          {datosCalendario?.dias?.map((dia) => (
            <div
              key={dia.diaSemana}
              className={`rounded-2xl border p-3 flex flex-col space-y-2.5 transition-all ${
                dia.esHoy
                  ? "bg-indigo-50/30 border-indigo-300 ring-2 ring-indigo-200/50"
                  : "bg-slate-50/50 border-slate-200"
              }`}
            >
              {/* Cabecera del Día */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    {dia.nombreDia}
                  </span>
                  {dia.esHoy && (
                    <span className="px-1.5 py-0.2 rounded-md bg-[#4b35e6] text-white text-[9px] font-bold">
                      Hoy
                    </span>
                  )}
                  {/* Fecha exacta en formato dd/mm/aaaa */}
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatearFechaVisual(dia.fecha)}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded-md font-semibold text-slate-600">
                  {dia.totalMaterias} materias
                </span>
              </div>

              {/* Lista de Tarjetas de Clases */}
              <div className="space-y-2 flex-1">
                {dia.clases.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-400 italic">
                    Sin materias asignadas
                  </div>
                ) : (
                  dia.clases.map((clase) => (
                    <div
                      key={clase.idHorario}
                      onClick={() => setClaseSeleccionadaAuditoria(clase)}
                      className={`border rounded-xl p-3 shadow-2xs space-y-2 transition-all cursor-pointer select-none active:scale-[0.99] ${getBordeClase(clase.estadoSemaforo)}`}
                      title="Haga clic para ver la auditoría de dictado de clase"
                    >
                      {/* Horario y Estado Semáforo */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-slate-700 font-semibold font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {clase.horaInicio
                            ? clase.horaInicio.slice(0, 5)
                            : "--:--"}{" "}
                          -{" "}
                          {clase.horaFin ? clase.horaFin.slice(0, 5) : "--:--"}
                        </span>
                        {renderBadgeSemaforo(clase)}
                      </div>

                      {/* Nombre y Aula */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {clase.nombreMateria}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span className="truncate">{clase.aula}</span>
                        </div>
                      </div>

                      {/* Docente */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium truncate max-w-[110px]">
                          {clase.apellidoDocente}{" "}
                          {clase.nombreDocente ? clase.nombreDocente : ""}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL DE AUDITORÍA DETALLADA */}
      <ModalAuditoriaClase
        isOpen={Boolean(claseSeleccionadaAuditoria)}
        onClose={() => setClaseSeleccionadaAuditoria(null)}
        clase={claseSeleccionadaAuditoria}
      />
    </div>
  );
}
