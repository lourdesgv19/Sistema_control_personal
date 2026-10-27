import React from "react";
import { X, FileText } from "lucide-react";
import {
  formatearFechaVisual,
  formatearHora24,
} from "../../utils/fechasFichaUtils";

export default function ModalFichaDetalleLicencia({
  licencia,
  isOpen,
  onClose,
}) {
  if (!isOpen || !licencia) return null;

  const fechaRegistroVisual = licencia.creadoEn
    ? `${formatearFechaVisual(licencia.creadoEn)}, ${formatearHora24(licencia.creadoEn)}`
    : "--/--/----";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 text-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Ficha de Detalle de Licencia
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                ID de Registro: #{licencia.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Card del Agente */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 font-black flex items-center justify-center text-xs">
              {licencia.esInstitucional
                ? "TF"
                : licencia.nombreEmpleado
                  ? licencia.nombreEmpleado.substring(0, 2).toUpperCase()
                  : "AG"}
            </div>
            <div>
              <h4 className="font-bold text-slate-900">
                {licencia.nombreEmpleado}
              </h4>
              <p className="text-[11px] text-slate-500">
                {licencia.esInstitucional
                  ? "Alcance General a toda la Facultad"
                  : licencia.rolArea}
              </p>
            </div>
          </div>

          {/* Condición Temporal Actual con Barra */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 text-[11px]">
                Condición Temporal Actual
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-bold text-[10px]">
                {licencia.textoProgreso}
              </span>
            </div>
            <div className="font-bold text-slate-800 text-xs">
              {licencia.condicionTemporal === "FINALIZADA"
                ? `Completada (${licencia.textoProgreso})`
                : licencia.condicionTemporal === "PROXIMA"
                  ? "Programada para iniciar"
                  : `En curso: van ${licencia.diasTranscurridos} de ${licencia.diasDuracion} días`}
            </div>
            <p className="text-[11px] text-slate-500">
              {licencia.condicionTemporal === "EN_CURSO"
                ? `Restan ${licencia.diasRestantes} días para que finalice`
                : licencia.condicionTemporal === "FINALIZADA"
                  ? `Concluyó el ${formatearFechaVisual(licencia.fechaFin)} • Duró ${licencia.diasDuracion} ${licencia.diasDuracion === 1 ? "día" : "días"}`
                  : `Comienza el ${formatearFechaVisual(licencia.fechaInicio)}`}
            </p>

            {licencia.condicionTemporal === "EN_CURSO" && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Días transcurridos: {licencia.diasTranscurridos}</span>
                  <span>Restantes: {licencia.diasRestantes}</span>
                </div>
                <div className="w-full bg-indigo-200/50 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${licencia.porcentajeProgreso}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Datos tipo cuadrícula */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Tipo de Licencia
              </span>
              <span className="font-bold text-slate-800">
                {licencia.tipoEtiqueta}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Dictamen RRHH
              </span>
              <span className="font-bold text-slate-800">
                {licencia.estado}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Desde
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {formatearFechaVisual(licencia.fechaInicio)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Hasta
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {formatearFechaVisual(licencia.fechaFin)}
              </span>
            </div>
          </div>

          {/* Justificación */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Justificación / Certificado Médico / Constancia:
            </span>
            <p className="text-slate-700 leading-relaxed">
              {licencia.motivoDictamen}
            </p>
          </div>

          <div className="text-[10px] text-right text-slate-400 font-mono">
            Registrado en el sistema: {fechaRegistroVisual}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
