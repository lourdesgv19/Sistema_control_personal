import React, { useState, useMemo } from "react";
import { X, ShieldCheck, UserCheck, KeyRound, Info } from "lucide-react";

const ROLES_SISTEMA = [
  {
    id: "ADMINISTRADOR",
    nombre: "Administrador General",
    descripcion:
      "Acceso total: configuración, personal, fichajes, reportes y usuarios.",
    color: "border-purple-200 bg-purple-50 text-purple-800",
  },
  {
    id: "AUDITOR",
    nombre: "Auditor",
    descripcion:
      "Control y auditoría de fichajes, gestión de horarios, e informes.",
    color: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
  {
    id: "CONSULTA",
    nombre: "Consulta / Visualizador",
    descripcion: "Acceso de solo lectura a su propia ficha y cronograma.",
    color: "border-slate-200 bg-slate-50 text-slate-800",
  },
];

export default function ModalCrearUsuario({
  isOpen,
  onClose,
  onSubmit,
  empleadosSinUsuario = [],
}) {
  const [empleadoId, setEmpleadoId] = useState("");
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState("AUDITOR");

  const empleadoSeleccionado = useMemo(() => {
    return empleadosSinUsuario.find((e) => String(e.id) === String(empleadoId));
  }, [empleadosSinUsuario, empleadoId]);

  // Sugerencia de contraseña reactiva
  const passSugerida = useMemo(() => {
    if (!empleadoSeleccionado) return "";
    const ape = (empleadoSeleccionado.apellido || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    const dni = (empleadoSeleccionado.dni || "").replace(/\D/g, "");
    const dosDni = dni.length >= 2 ? dni.substring(0, 2) : "00";
    return ape + dosDni;
  }, [empleadoSeleccionado]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!empleadoId) return;
    onSubmit({
      empleadoId: parseInt(empleadoId),
      username: username.trim() || undefined,
      rol,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 font-sans">
        {/* Cabecera */}
        <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Habilitar Acceso al Sistema</h3>
              <p className="text-[11px] text-slate-400">
                Cree un usuario y asigne permisos operativos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Selector de Empleado */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Seleccionar Colaborador *
            </label>
            <select
              required
              value={empleadoId}
              onChange={(e) => {
                setEmpleadoId(e.target.value);
                const emp = empleadosSinUsuario.find(
                  (x) => String(x.id) === e.target.value,
                );
                if (emp) {
                  setUsername(emp.email || emp.nroLegajo || "");
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
            >
              <option value="">-- Elija un colaborador sin cuenta --</option>
              {empleadosSinUsuario.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.apellido}, {emp.nombre} (DNI: {emp.dni} • Legajo:{" "}
                  {emp.nroLegajo})
                </option>
              ))}
            </select>
          </div>

          {/* Nombre de Usuario / Login */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre de Usuario / Login
            </label>
            <input
              type="text"
              placeholder="Ej: santiago.jorge o LEG-002"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Si se deja vacío, tomará el email del empleado.
            </span>
          </div>

          {/* Selector de Roles y Permisos */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Rol y Nivel de Permisos *
            </label>
            <div className="space-y-2">
              {ROLES_SISTEMA.map((r) => (
                <label
                  key={r.id}
                  onClick={() => setRol(r.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    rol === r.id
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    checked={rol === r.id}
                    onChange={() => setRol(r.id)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{r.nombre}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {r.descripcion}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Contraseña predeterminada informativa */}
          {empleadoSeleccionado && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[11px] block">
                  Contraseña Predeterminada
                </span>
                <span className="text-[11px]">
                  La clave inicial será:{" "}
                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">
                    {passSugerida}
                  </strong>{" "}
                  (apellido + primeros 2 dígitos del DNI).
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!empleadoId}
              className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Habilitar Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
