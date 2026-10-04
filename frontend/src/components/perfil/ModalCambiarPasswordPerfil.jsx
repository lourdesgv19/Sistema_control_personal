import React, { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import apiClient from "../../services/api";

export default function ModalCambiarPasswordPerfil({
  isOpen,
  onClose,
  onPasswordCambiada,
}) {
  if (!isOpen) return null;

  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (passNueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (passNueva !== passConfirm) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.put("/usuarios/mi-perfil/cambiar-password", {
        passwordActual: passActual,
        passwordNueva: passNueva.trim(),
      });
      onPasswordCambiada();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al actualizar la contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              Cambiar Contraseña
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contraseña Actual *
            </label>
            <div className="relative">
              <input
                type={verActual ? "text" : "password"}
                required
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="Ingrese contraseña actual"
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setVerActual(!verActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                {verActual ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={verNueva ? "text" : "password"}
                required
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setVerNueva(!verNueva)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
              >
                {verNueva ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              required
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              placeholder="Reingrese la nueva clave"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Guardar Clave
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
