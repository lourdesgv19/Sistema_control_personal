import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  Check,
  Edit2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import ModalCambiarPasswordPerfil from "../components/perfil/ModalCambiarPasswordPerfil";

export default function Perfil() {
  const { user, marcarPasswordCambiada } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalPass, setModalPass] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [formContacto, setFormContacto] = useState({ email: "", telefono: "" });

  const cargarPerfil = async () => {
    try {
      const res = await apiClient.get("/usuarios/mi-perfil");
      setPerfil(res.data);
      setFormContacto({
        email: res.data.email || "",
        telefono: res.data.telefono || "",
      });
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const handleGuardarContacto = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await apiClient.put("/usuarios/mi-perfil/contacto", formContacto);
      setMensaje("Datos de contacto actualizados correctamente.");
      setEditando(false);
      cargarPerfil();
    } catch (err) {
      setMensaje(err.response?.data?.message || "Error al actualizar datos.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Identificación estricta: Solo es cuenta raíz si el username es "admin"
  const esCuentaRaiz =
    perfil?.username === "admin" || user?.username === "admin";
  const tieneClavePendiente = user?.debeCambiarPassword;

  // Resolución segura del nombre completo del titular
  const nombreMostrado = esCuentaRaiz
    ? "Administrador General del Sistema"
    : perfil?.nombreCompleto ||
      perfil?.nombreCompletoEmpleado ||
      user?.nombre ||
      "Sin Asignar";

  // Resolución segura del rol
  const rolMostrado = perfil?.rol || user?.rol || "USUARIO";

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {esCuentaRaiz
            ? "Gestión de la cuenta principal de administración del sistema."
            : "Consulte sus datos registrados y gestione la seguridad de su acceso."}
        </p>
      </div>

      {mensaje && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{mensaje}</span>
          <button
            type="button"
            onClick={() => setMensaje("")}
            className="font-bold cursor-pointer hover:text-emerald-950"
          >
            ×
          </button>
        </div>
      )}

      {/* Tarjeta de Seguridad y Cambio de Clave */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-2xl ${
              tieneClavePendiente
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-indigo-50 text-indigo-600 border border-indigo-100"
            }`}
          >
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              Seguridad de la Cuenta
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {tieneClavePendiente
                ? "Cuenta con una clave provisoria asignada. Es obligatorio actualizarla."
                : "Actualice su contraseña periódicamente para resguardar el acceso."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalPass(true)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer shrink-0 ${
            tieneClavePendiente
              ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {tieneClavePendiente && (
            <AlertTriangle className="w-4 h-4 text-white" />
          )}
          <span>Cambiar Contraseña</span>
        </button>
      </div>

      {/* Tarjeta de Datos de Usuario */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">
              {esCuentaRaiz
                ? "Datos de la Cuenta Raíz"
                : "Información del Usuario"}
            </h3>
          </div>

          {!esCuentaRaiz &&
            (!editando ? (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Contacto
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setFormContacto({
                    email: perfil?.email || "",
                    telefono: perfil?.telefono || "",
                  });
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            ))}
        </div>

        <form onSubmit={handleGuardarContacto} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre Completo / Titular de Cuenta */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Lock className="w-3 h-3" />{" "}
                {esCuentaRaiz ? "Titular de Cuenta" : "Nombre Completo"}
              </label>
              <input
                type="text"
                disabled
                value={nombreMostrado}
                className="w-full px-3 py-2 bg-slate-100/70 border border-slate-200 text-slate-700 rounded-xl text-xs cursor-not-allowed font-medium"
              />
            </div>

            {/* Nombre de Usuario */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Lock className="w-3 h-3" /> Nombre de Usuario
              </label>
              <input
                type="text"
                disabled
                value={perfil?.username || user?.username || ""}
                className="w-full px-3 py-2 bg-slate-100/70 border border-slate-200 text-slate-700 rounded-xl text-xs cursor-not-allowed font-mono"
              />
            </div>

            {/* Rol Institucional */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Lock className="w-3 h-3" /> Rol en el Sistema
              </label>
              <input
                type="text"
                disabled
                value={rolMostrado}
                className="w-full px-3 py-2 bg-slate-100/70 border border-slate-200 text-indigo-700 font-semibold rounded-xl text-xs cursor-not-allowed uppercase"
              />
            </div>

            {/* Vinculación Reloj Biométrico */}
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Lock className="w-3 h-3" /> Vinculación Reloj Biométrico
              </label>
              <input
                type="text"
                disabled
                value={
                  esCuentaRaiz
                    ? "No aplica (Superusuario)"
                    : perfil?.idBiometrico || "Sin asignar"
                }
                className="w-full px-3 py-2 bg-slate-100/70 border border-slate-200 text-slate-500 rounded-xl text-xs cursor-not-allowed italic"
              />
            </div>

            {/* Campos de Contacto (Visibles solo para colaboradores reales) */}
            {!esCuentaRaiz && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    disabled={!editando}
                    value={
                      editando
                        ? formContacto.email
                        : formContacto.email || "Sin registrar"
                    }
                    onChange={(e) =>
                      setFormContacto({
                        ...formContacto,
                        email: e.target.value,
                      })
                    }
                    placeholder="ej: usuario@empresa.com"
                    className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                      editando
                        ? "border-indigo-500 bg-white text-slate-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    disabled={!editando}
                    value={
                      editando
                        ? formContacto.telefono
                        : formContacto.telefono || "Sin registrar"
                    }
                    onChange={(e) =>
                      setFormContacto({
                        ...formContacto,
                        telefono: e.target.value,
                      })
                    }
                    placeholder="ej: +54 9 385 123456"
                    className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                      editando
                        ? "border-indigo-500 bg-white text-slate-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  />
                </div>
              </>
            )}
          </div>

          {/* Botón Guardar Cambios disponible solo en modo edición */}
          {editando && !esCuentaRaiz && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Guardar Cambios
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Modal de Cambio de Contraseña */}
      <ModalCambiarPasswordPerfil
        isOpen={modalPass}
        onClose={() => setModalPass(false)}
        onPasswordCambiada={() => {
          marcarPasswordCambiada();
          setMensaje("Contraseña actualizada exitosamente.");
        }}
      />
    </div>
  );
}
