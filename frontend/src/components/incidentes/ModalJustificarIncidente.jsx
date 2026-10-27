import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  X,
  Check,
  CheckCircle2,
  Clock,
  UserX,
  LogOut,
  Calendar,
  Layers,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { getEmpleadoHorarios } from "../../services/empleadoService";

const MOTIVOS_FRECUENTES = [
  "Certificado médico presentado",
  "Trámites personales autorizados",
  "Falla técnica en reloj biométrico",
  "Problemas de transporte o tránsito",
  "Razones de fuerza mayor / Urgencia",
  "Cuidado de familiar directo",
  "Mesa de examen o capacitación",
  "Cambio de horario / día",
];

function formatearFechaVisual(fechaIso) {
  if (!fechaIso) return "--/--/----";
  const soloFecha = String(fechaIso).split("T")[0].split(" ")[0].trim();
  const partes = soloFecha.split("-");
  if (partes.length === 3) {
    return `${partes[2].padStart(2, "0")}/${partes[1].padStart(2, "0")}/${partes[0].padStart(4, "0")}`;
  }
  return soloFecha;
}

export default function ModalJustificarIncidente({
  incidente,
  isOpen,
  readOnly = false,
  onClose,
  onGuardar,
}) {
  const [dictamen, setDictamen] = useState("JUSTIFICADA");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Horarios reales del empleado obtenidos del backend
  const [horariosEmpleado, setHorariosEmpleado] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);

  useEffect(() => {
    if (incidente) {
      setDictamen(
        incidente.estado && incidente.estado !== "PENDIENTE"
          ? incidente.estado
          : "JUSTIFICADA",
      );
      setMotivo(incidente.resolucionMotivo || incidente.motivo || "");
      setObservaciones(
        incidente.resolucionObservaciones || incidente.observaciones || "",
      );

      // Cargar los horarios asignados del empleado si tiene ID
      const empId = incidente.empleado?.id || incidente.empleadoId;
      if (empId) {
        setCargandoHorarios(true);
        getEmpleadoHorarios(empId)
          .then((res) => {
            setHorariosEmpleado(Array.isArray(res) ? res : []);
          })
          .catch((err) => {
            console.error("Error al cargar horarios del empleado:", err);
            setHorariosEmpleado([]);
          })
          .finally(() => setCargandoHorarios(false));
      } else {
        setHorariosEmpleado([]);
      }
    }
  }, [incidente]);

  // Filtrar los horarios que el empleado debía cumplir exactamente el día del incidente
  const horariosDelDia = useMemo(() => {
    if (!incidente?.fecha) return [];

    // Calcular día de la semana (1 = Lunes, ..., 7 = Domingo)
    const fechaPartes = String(incidente.fecha).split("T")[0].split("-");
    if (fechaPartes.length !== 3) return [];

    const d = new Date(
      parseInt(fechaPartes[0], 10),
      parseInt(fechaPartes[1], 10) - 1,
      parseInt(fechaPartes[2], 10),
    );
    const diaSemanaNumero = d.getDay() === 0 ? 7 : d.getDay();

    const mapaDias = {
      1: ["lun", "lunes"],
      2: ["mar", "martes"],
      3: ["mie", "mié", "miercoles", "miércoles"],
      4: ["jue", "jueves"],
      5: ["vie", "viernes"],
      6: ["sab", "sáb", "sabado", "sábado"],
      7: ["dom", "domingo"],
    };

    const filtrados = horariosEmpleado.filter((h) => {
      if (h.diaSemana !== undefined && h.diaSemana !== null) {
        if (typeof h.diaSemana === "number") {
          return h.diaSemana === diaSemanaNumero;
        }
        const str = String(h.diaSemana).toLowerCase().trim();
        return mapaDias[diaSemanaNumero]?.some((alias) => str.includes(alias));
      }
      return false;
    });

    // Mapear al formato visual idéntico a la Ficha de Comportamiento
    if (filtrados.length > 0) {
      return filtrados.map((h) => ({
        nombre:
          h.materia?.nombre ||
          h.materiaNombre ||
          h.etiqueta ||
          h.nombreTurno ||
          "Jornada Laboral / Turno",
        horaInicio: (h.horaEntrada || h.horaInicio || "00:00").substring(0, 5),
        horaFin: (
          h.horaEgreso ||
          h.horaSalida ||
          h.horaFin ||
          "00:00"
        ).substring(0, 5),
      }));
    }

    // Fallback: Si no vinieron de la API o es un turno general, intentar extraer del detalle del incidente
    const matchRango = (incidente.detalle || "").match(
      /(\d{1,2}:\d{2})\s*(?:a|-|hs\s*a)\s*(\d{1,2}:\d{2})/i,
    );
    if (matchRango) {
      return [
        {
          nombre: "Turno Programado",
          horaInicio: matchRango[1],
          horaFin: matchRango[2],
        },
      ];
    }

    return [];
  }, [incidente, horariosEmpleado]);

  // Clasificación visual del tipo de incidente
  const tipoDesvio = useMemo(() => {
    if (!incidente)
      return {
        badge: "Desvío Horario",
        color: "bg-amber-100 text-amber-800 border-amber-200",
      };
    const t = (incidente.tipo || "").toUpperCase();

    if (
      t.includes("AUSENCIA") ||
      t.includes("INASISTENCIA") ||
      t.includes("FALTA")
    ) {
      return {
        badge: "INASISTENCIA DETECTADA",
        subtitulo:
          "El empleado tenía jornada laboral asignada pero no registró asistencia",
        colorBadge: "bg-rose-600 text-white",
        icono: <UserX className="w-3.5 h-3.5" />,
      };
    }
    if (
      t.includes("LLEGADA TARDE") ||
      t.includes("TARDANZA") ||
      t.includes("TARDE")
    ) {
      return {
        badge: "LLEGADA TARDE",
        subtitulo:
          "El empleado ingresó posterior al inicio del turno superando la tolerancia",
        colorBadge: "bg-amber-500 text-white",
        icono: <Clock className="w-3.5 h-3.5" />,
      };
    }
    if (
      t.includes("RETIRO") ||
      t.includes("ANTICIPADO") ||
      t.includes("PREVIO")
    ) {
      return {
        badge: "RETIRO ANTICIPADO",
        subtitulo:
          "El empleado marcó su egreso antes de finalizar el turno o cátedra",
        colorBadge: "bg-amber-800 text-white",
        icono: <LogOut className="w-3.5 h-3.5" />,
      };
    }
    if (
      t.includes("CLASE") ||
      t.includes("INTERMEDIA") ||
      t.includes("EXCESIVA")
    ) {
      return {
        badge: "SALIDA EN HORARIO LABORAL / CÁTEDRA",
        subtitulo:
          "Se registraron salidas intermedias o abandono durante el transcurso del turno",
        colorBadge: "bg-purple-600 text-white",
        icono: <TrendingDown className="w-3.5 h-3.5" />,
      };
    }

    return {
      badge: incidente.tipo || "DESVÍO HORARIO",
      subtitulo:
        incidente.detalle ||
        "Desvío registrado en el cumplimiento de la jornada",
      colorBadge: "bg-slate-700 text-white",
      icono: <AlertTriangle className="w-3.5 h-3.5" />,
    };
  }, [incidente]);

  if (!isOpen || !incidente) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || !motivo.trim()) return;
    setEnviando(true);
    await onGuardar(incidente.id, {
      estado: dictamen,
      motivo: motivo.trim(),
      observaciones: observaciones.trim(),
    });
    setEnviando(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="bg-[#1e293b] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                {readOnly
                  ? "Detalle del Incidente"
                  : "Justificar / Observar Incidente"}
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoría horaria y contraste contra el turno pautado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Ficha Empleado y Fecha */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Empleado
              </span>
              <strong className="text-slate-900 text-sm">
                {incidente.empleado?.apellido || incidente.empleado?.nombre
                  ? `${incidente.empleado?.apellido || ""}, ${incidente.empleado?.nombre || ""}`
                  : "Empleado no especificado"}
              </strong>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Legajo: {incidente.empleado?.nroLegajo || "Sin Legajo"} • DNI:{" "}
                {incidente.empleado?.dni || "-"}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Fecha del Incidente
              </span>
              <div className="flex items-center justify-end gap-1 font-mono font-bold text-slate-800 text-xs mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatearFechaVisual(incidente.fecha)}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Marca:{" "}
                {incidente.hora
                  ? `${incidente.hora.substring(0, 5)} hs`
                  : "Sin marca"}
              </span>
            </div>
          </div>

          {/* Tarjeta de Anomalía y Badge de Horarios Obligatorios (Estilo Ficha de Comportamiento) */}
          <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-4 text-center space-y-3">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs ${tipoDesvio.colorBadge}`}
              >
                {tipoDesvio.icono}
                <span>{tipoDesvio.badge}</span>
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-2">
                {tipoDesvio.subtitulo}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                {incidente.detalle}
              </p>
            </div>

            {/* Bloque exacto: Horarios obligatorios que debía cumplir */}
            <div className="bg-white/95 border border-rose-200 rounded-2xl p-3.5 text-left shadow-2xs">
              <div className="text-[10px] font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>HORARIOS OBLIGATORIOS QUE DEBÍA CUMPLIR:</span>
                </div>
                {cargandoHorarios && (
                  <Loader2 className="w-3 h-3 text-rose-500 animate-spin" />
                )}
              </div>

              {horariosDelDia.length > 0 ? (
                <div className="space-y-1.5">
                  {horariosDelDia.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 font-medium text-slate-700"
                    >
                      <span className="font-bold text-slate-900 text-xs">
                        {p.nombre}
                      </span>
                      <span className="font-mono font-bold text-rose-800 text-xs">
                        {p.horaInicio} hs → {p.horaFin} hs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center italic text-[11px]">
                  {cargandoHorarios
                    ? "Consultando horarios programados del colaborador..."
                    : "Turno pautado según cronograma del día"}
                </div>
              )}
            </div>
          </div>

          {/* Formulario de Justificación */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {/* Opciones de Dictamen */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Resolución / Dictamen
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDictamen("JUSTIFICADA")}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    dictamen === "JUSTIFICADA"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Justificada
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDictamen("OBSERVADA")}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    dictamen === "OBSERVADA"
                      ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />{" "}
                  Observada
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDictamen("RECHAZADA")}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    dictamen === "RECHAZADA"
                      ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <X className="w-3.5 h-3.5 text-rose-600" /> Rechazada
                </button>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Motivo de la Justificación *
              </label>
              <input
                type="text"
                required
                disabled={readOnly}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Autorizado formalmente por Secretaría Académica..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500 text-xs"
              />
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400">Sugeridos:</span>
                  {MOTIVOS_FRECUENTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotivo(m)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md transition cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Observaciones / Nro de Constancia o Certificado
              </label>
              <textarea
                rows={2}
                disabled={readOnly}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Presentó certificado médico por mesa de entradas..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white resize-none disabled:bg-slate-50 disabled:text-slate-500 text-xs"
              />
            </div>

            {/* Acciones */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                {readOnly ? "Cerrar" : "Cancelar"}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={enviando || !motivo.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {enviando ? "Guardando..." : "Guardar Resolución"}
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
