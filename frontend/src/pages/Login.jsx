import React, { useState } from "react";
import {
  Clock,
  Lock,
  User,
  AlertCircle,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const [errorInfo, setErrorInfo] = useState(null); // { tipo: 'credenciales' | 'suspendida' | 'servidor', mensaje: '' }
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorInfo(null);
    setLoading(true);

    const form = new FormData(e.target);
    const username = form.get("username");
    const password = form.get("password");

    try {
      const res = await apiClient.post("/auth/login", {
        username: username.trim(),
        password: password,
      });

      const token = res.data?.token;
      if (token) {
        login(token);
      }
    } catch (err) {
      const status = err.response?.status;
      const mensajeServidor =
        err.response?.data?.message || err.response?.data?.reason || "";

      const esCuentaSuspendida =
        status === 403 && mensajeServidor.toLowerCase().includes("suspendid");

      if (esCuentaSuspendida) {
        setErrorInfo({
          tipo: "suspendida",
          mensaje:
            mensajeServidor ||
            "La cuenta se encuentra suspendida. Contacte al Administrador.",
        });
      } else if (status === 401 || status === 403) {
        // Si es 401 o un 403 sin mensaje de suspensión explícito, es credencial errónea
        setErrorInfo({
          tipo: "credenciales",
          mensaje:
            mensajeServidor && !esCuentaSuspendida
              ? mensajeServidor
              : "Usuario o contraseña incorrectos.",
        });
      } else {
        setErrorInfo({
          tipo: "servidor",
          mensaje:
            "No se pudo conectar con el servidor. Intente nuevamente más tarde.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-slate-50 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
            <Clock className="w-7 h-7 stroke-[2]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Control de Asistencia
          </h2>
          <p className="text-xs text-slate-500">
            Inicia sesión para auditar marcaciones, gestionar horarios y
            personal.
          </p>
        </div>

        {/* ALERTA DE ERROR DIFERENCIADA */}
        {errorInfo && (
          <div
            className={`mb-6 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              errorInfo.tipo === "suspendida"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            {errorInfo.tipo === "suspendida" ? (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">
                {errorInfo.tipo === "suspendida"
                  ? "Acceso Inhabilitado"
                  : "Error de Autenticación"}
              </span>
              <span>{errorInfo.mensaje}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Usuario o Identificador
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="username"
                name="username"
                type="text"
                required
                placeholder="Ej: santiago.jorge o admin"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#4b35e6] hover:bg-[#3f2bc9] text-white font-semibold rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
