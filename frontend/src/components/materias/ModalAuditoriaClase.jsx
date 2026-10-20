import React from "react";
import {
  X,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  formatearFechaVisual,
  formatearHorasYMinutos,
  formatearHora24,
} from "../../utils/fechasFichaUtils";

export default function ModalAuditoriaClase({ isOpen, onClose, clase }) {
  const navigate = useNavigate();

  if (!isOpen || !clase) return null;

  // Minutos exactos a partir de los datos recibidos (sin decimales ni redondeos destructivos)
  const minutosFijados = Math.round(Number(clase.horasProgramadas || 0) * 60);
  const minutosDictados = Math.round(Number(clase.horasEfectivas || 0) * 60);
  const minutosDesvio = Math.max(0, minutosFijados - minutosDictados);

  const porcentajeCumplimiento =
    minutosFijados > 0
      ? Math.min(100, Math.round((minutosDictados / minutosFijados) * 100))
      : 0;

  const tarifaHora = Number(clase.tarifaHora || 5200);
  const pagoLiquidable = Number(
    clase.montoLiquidado || Math.round((minutosDictados / 60) * tarifaHora),
  );

  const horaInicioFormateada = clase.horaInicio
    ? clase.horaInicio.slice(0, 5)
    : "--:--";
  const horaFinFormateada = clase.horaFin ? clase.horaFin.slice(0, 5) : "--:--";

  const renderCabeceraSemaforo = () => {
    if (clase.estadoSemaforo === "VERDE") {
      return (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Semáforo Verde: Cumplimiento del 100% de la Clase</span>
          </div>
          <p className="text-emerald-700 leading-relaxed text-[11px]">
            El docente cumplió con todas las horas pautadas según la marcación
            biométrica efectiva sin salidas intermedias ni llegadas tardías.
          </p>
        </div>
      );
    }

    if (clase.estadoSemaforo === "AMBAR") {
      return (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Semáforo Ámbar: Dictado Parcial con Desvíos</span>
          </div>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            El docente registró llegada tardía, retiro anticipado o salida
            intermedia durante el período de clase. Solo se computan los minutos
            netos efectivamente dictados para el pago.
          </p>
        </div>
      );
    }

    if (clase.estadoSemaforo === "PENDIENTE") {
      return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Clase Programada (Pendiente de Dictado)</span>
          </div>
          <p className="text-slate-500 leading-relaxed text-[11px]">
            Esta jornada aún no ha transcurrido. Las horas efectivas se
            liquidarán tras procesar los fichajes biométricos.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-rose-950 mb-1">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Semáforo Rojo: Clase No Dictada / Sin Registro</span>
        </div>
        <p className="text-rose-800 leading-relaxed text-[11px]">
          No se registraron marcaciones biométricas válidas en el horario
          asignado. Se computa ausencia y no se liquidan honorarios por esta
          clase.
        </p>
      </div>
    );
  };

  const getPuntoColor = () => {
    if (clase.estadoSemaforo === "VERDE") return "bg-emerald-500";
    if (clase.estadoSemaforo === "AMBAR") return "bg-amber-500";
    if (clase.estadoSemaforo === "PENDIENTE") return "bg-slate-400";
    return "bg-rose-500";
  };

  return (
    /* Fondo con cierre al hacer clic exterior */
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      {/* Contenedor modal con propagación detenida */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-150 cursor-default"
      >
        {/* CABECERA PRINCIPAL */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${getPuntoColor()}`}
            />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Auditoría de Dictado de Clase
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {clase.fechaClase
                  ? `${formatearFechaVisual(clase.fechaClase)} • `
                  : ""}
                Horario: {horaInicioFormateada} a {horaFinFormateada} hs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[85vh]">
          {/* TARJETA DE MATERIA Y AULA */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {clase.nombreMateria}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{clase.aula || "Aula sin asignar"}</span>
              </div>
            </div>

            <div className="text-right border-l border-slate-100 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tarifa Asignada
              </span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                ${tarifaHora.toLocaleString("es-AR")}/h
              </span>
            </div>
          </div>

          {/* BANNER DINÁMICO DE SEMÁFORO */}
          {renderCabeceraSemaforo()}

          {/* GRILLA DE 4 TARJETAS MÉTRICAS EN FORMATO Xh YYm */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {/* 1. HORAS FIJADAS */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Horas Fijadas
              </span>
              <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {formatearHorasYMinutos(minutosFijados / 60)}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {minutosFijados} minutos
              </span>
            </div>

            {/* 2. HORAS DICTADAS */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Horas Dictadas
              </span>
              <div className="text-lg font-bold text-emerald-600 mt-1 font-mono">
                {formatearHorasYMinutos(minutosDictados / 60)}
              </div>
              <span className="text-[10px] text-emerald-700 mt-0.5 font-semibold">
                {porcentajeCumplimiento}% dictado
              </span>
            </div>

            {/* 3. DESVÍO / PÉRDIDA */}
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Desvío / Pérdida
              </span>
              <div className="text-lg font-bold text-rose-600 mt-1 font-mono">
                {formatearHorasYMinutos(minutosDesvio / 60)}
              </div>
              <span className="text-[10px] text-rose-500 mt-0.5 font-medium">
                {minutosDesvio > 0
                  ? `${minutosDesvio} min no computados`
                  : "Sin desvíos"}
              </span>
            </div>

            {/* 4. PAGO LIQUIDABLE */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Pago Liquidable
              </span>
              <div className="text-lg font-bold text-indigo-950 mt-1 font-mono">
                ${pagoLiquidable.toLocaleString("es-AR")}
              </div>
              <span className="text-[10px] text-indigo-600 mt-0.5 font-medium">
                Por esta clase
              </span>
            </div>
          </div>

          {/* TARJETA DEL DOCENTE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                {clase.nombreDocente ? (
                  clase.nombreDocente[0]
                ) : (
                  <User className="w-4 h-4" />
                )}
                {clase.apellidoDocente ? clase.apellidoDocente[0] : ""}
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-xs">
                  {clase.nombreDocente} {clase.apellidoDocente}
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Profesor Titular a Cargo
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (clase.idDocente) {
                  onClose();
                  navigate(
                    `/fichas-comportamiento?empleadoId=${clase.idDocente}`,
                    {
                      state: {
                        empleadoId: clase.idDocente,
                        fecha: clase.fechaClase,
                        modalidad: "DIARIO",
                      },
                    },
                  );
                }
              }}
              className="px-4 py-2 bg-[#4b35e6] hover:bg-[#3e2bc0] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              Ver Ficha del Docente
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
