import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Check, CheckCircle2, Lock } from "lucide-react";

const MOTIVOS_FRECUENTES = [
  "Autorización formal de Decanato / Dirección Académica",
  "Comisión de servicio institucional en otra sede",
  "Urgencia de salud / consulta médica imprevista",
];

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

  useEffect(() => {
    if (incidente) {
      setDictamen(
        incidente.estado && incidente.estado !== "PENDIENTE"
          ? incidente.estado
          : "JUSTIFICADA",
      );
      setMotivo(incidente.resolucionMotivo || "");
      setObservaciones(incidente.resolucionObservaciones || "");
    }
  }, [incidente]);

  if (!isOpen || !incidente) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly || !motivo.trim()) return;
    setEnviando(true);
    await onGuardar(incidente.id, {
      estado: dictamen,
      motivo,
      observaciones,
    });
    setEnviando(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="bg-[#1e293b] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                {readOnly
                  ? "Detalle del Incidente"
                  : "Justificar / Observar Anomalía"}
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoría de marcaciones y control institucional
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

        {/* Detalle */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-xs text-slate-900 leading-snug">
                {incidente.tipo}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase tracking-wide shrink-0">
                Severidad {incidente.severidad}
              </span>
            </div>
            <p className="text-xs text-slate-600">{incidente.detalle}</p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
              <span>
                Colaborador:{" "}
                <strong className="text-slate-700">
                  {incidente.empleado?.nombre} {incidente.empleado?.apellido} (
                  {incidente.empleado?.nroLegajo})
                </strong>
              </span>
              <span>
                Hora:{" "}
                <strong className="text-slate-700">
                  {incidente.hora?.substring(0, 5)} hs
                </strong>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Opciones Dictamen */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                Resolución / Dictamen
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDictamen("JUSTIFICADA")}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    dictamen === "JUSTIFICADA"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Check className="w-3.5 h-3.5" /> Justificada
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDictamen("OBSERVADA")}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    dictamen === "OBSERVADA"
                      ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Observada
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setDictamen("RECHAZADA")}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                    dictamen === "RECHAZADA"
                      ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <X className="w-3.5 h-3.5" /> Rechazada
                </button>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Motivo de la Justificación *
              </label>
              <input
                type="text"
                required
                disabled={readOnly}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Autorizado por Secretaría Académica..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
              />
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400">
                    Frecuentes:
                  </span>
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
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Observaciones adicionales / Número de expediente
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Presentó constancia médica..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white resize-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            {/* Botones */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
