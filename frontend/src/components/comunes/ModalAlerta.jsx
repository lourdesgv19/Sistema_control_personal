import React from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

const CONFIG_VARIANTES = {
  danger: {
    icono: AlertCircle,
    colorIcono: "text-rose-600",
    bgIcono: "bg-rose-50 border border-rose-100",
    btnConfirmar: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    icono: AlertTriangle,
    colorIcono: "text-amber-600",
    bgIcono: "bg-amber-50 border border-amber-100",
    btnConfirmar: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  success: {
    icono: CheckCircle2,
    colorIcono: "text-emerald-600",
    bgIcono: "bg-emerald-50 border border-emerald-100",
    btnConfirmar: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  info: {
    icono: Info,
    colorIcono: "text-indigo-600",
    bgIcono: "bg-indigo-50 border border-indigo-100",
    btnConfirmar: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
};

export default function ModalAlerta({
  isOpen,
  tipo = "danger", // "danger" | "warning" | "success" | "info"
  titulo = "¿Está seguro?",
  mensaje = "Esta acción no se puede deshacer.",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  mostrarCancelar = true, // false para errores/alertas informativas
  onConfirmar,
  onCancelar,
}) {
  if (!isOpen) return null;

  const estilo = CONFIG_VARIANTES[tipo] || CONFIG_VARIANTES.info;
  const Icono = estilo.icono;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-150 relative">
        {/* Botón cerrar esquina superior */}
        <button
          onClick={onCancelar}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icono temático */}
        <div className={`p-3.5 rounded-2xl mb-4 ${estilo.bgIcono}`}>
          <Icono size={28} className={estilo.colorIcono} />
        </div>

        {/* Título y Mensaje */}
        <h3 className="text-base font-bold text-slate-900 mb-1.5">{titulo}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-6 px-2">
          {mensaje}
        </p>

        {/* Acciones */}
        <div className="flex items-center justify-center gap-3 w-full">
          {mostrarCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {textoCancelar}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirmar}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors ${estilo.btnConfirmar}`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
