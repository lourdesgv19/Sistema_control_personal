import React, { useState } from "react";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import apiClient from "../../services/api";

export default function ModalPrimerCambioPassword({
  isOpen,
  usuario,
  onExito,
}) {
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [mostrarPassActual, setMostrarPassActual] = useState(false);
  const [mostrarPassNueva, setMostrarPassNueva] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Validaciones visuales en tiempo real
  const tieneMinimo6 = passNueva.length >= 6;
  const noEsIgualAActual = passNueva.length > 0 && passNueva !== passActual;
  const coinciden = passNueva.length > 0 && passNueva === passConfirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!tieneMinimo6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (passNueva === passActual) {
      setError(
        "La nueva contraseña no puede ser idéntica a la clave provisoria.",
      );
      return;
    }

    if (!coinciden) {
      setError("La confirmación de la contraseña no coincide.");
      return;
    }

    setCargando(true);
    try {
      const idUsuario = usuario?.id || usuario?.idUsuario;

      // Endpoint que actualiza la clave y desactiva debe_cambiar_password
      await apiClient.put(`/usuarios/${idUsuario}/primer-cambio-password`, {
        passwordActual: passActual,
        passwordNueva: passNueva.trim(),
      });

      if (onExito) {
        onExito();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error al actualizar la contraseña. Verifique que su clave actual sea correcta.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Cabecera de Alerta de Seguridad */}
        <div className="bg-gradient-to-r from-amber-500 to-indigo-600 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <KeyRound className="w-7 h-7 text-white stroke-[2.2]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            Actualización Obligatoria de Clave
          </h2>
          <p className="text-xs text-white/90 mt-1 max-w-xs mx-auto">
            Por políticas de seguridad, debe cambiar su contraseña
            predeterminada para poder acceder al sistema.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 font-sans text-xs"
        >
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Contraseña Actual / Predeterminada */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Contraseña Provisoria Actual *
            </label>
            <div className="relative">
              <input
                type={mostrarPassActual ? "text" : "password"}
                required
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="Ingrese su clave asignada actual"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
              />
              <button
                type="button"
                onClick={() => setMostrarPassActual(!mostrarPassActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {mostrarPassActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nueva Contraseña Personal *
            </label>
            <div className="relative">
              <input
                type={mostrarPassNueva ? "text" : "password"}
                required
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
              />
              <button
                type="button"
                onClick={() => setMostrarPassNueva(!mostrarPassNueva)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {mostrarPassNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              required
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              placeholder="Vuelva a escribir su nueva clave"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          {/* Indicadores de Requisitos */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={14}
                className={tieneMinimo6 ? "text-emerald-600" : "text-slate-300"}
              />
              <span
                className={
                  tieneMinimo6
                    ? "text-emerald-900 font-semibold"
                    : "text-slate-500"
                }
              >
                Al menos 6 caracteres
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={14}
                className={
                  noEsIgualAActual ? "text-emerald-600" : "text-slate-300"
                }
              />
              <span
                className={
                  noEsIgualAActual
                    ? "text-emerald-900 font-semibold"
                    : "text-slate-500"
                }
              >
                Distinta de la contraseña actual
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={14}
                className={coinciden ? "text-emerald-600" : "text-slate-300"}
              />
              <span
                className={
                  coinciden
                    ? "text-emerald-900 font-semibold"
                    : "text-slate-500"
                }
              >
                Las contraseñas coinciden
              </span>
            </div>
          </div>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={cargando || !tieneMinimo6 || !coinciden}
            className="w-full mt-2 py-3 bg-[#4b35e6] hover:bg-[#3f2bc9] text-white font-bold rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Actualizando credenciales...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Establecer Nueva Contraseña y Entrar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
