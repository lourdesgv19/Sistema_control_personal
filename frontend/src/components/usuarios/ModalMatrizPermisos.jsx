import React, { useState, useEffect } from "react";
import {
  X,
  CheckSquare,
  Square,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Save,
  Loader2,
} from "lucide-react";
import { MODULOS_PERMISOS } from "../../constants/permisosCatalogo";
import {
  getPermisosUsuario,
  asignarPermisosUsuario,
} from "../../services/seguridadService";

export default function ModalMatrizPermisos({
  isOpen,
  onClose,
  usuario,
  onExito,
  mostrarAviso,
}) {
  const [permisosSeleccionados, setPermisosSeleccionados] = useState({});
  const [esTemporalGlobal, setEsTemporalGlobal] = useState(false);
  const [duracionDias, setDuracionDias] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);

  const usuarioId = usuario?.id || usuario?.idUsuario;

  useEffect(() => {
    if (isOpen && usuarioId) {
      cargarPermisos();
    }
  }, [isOpen, usuarioId]);

  const cargarPermisos = async () => {
    setCargando(true);
    try {
      const data = await getPermisosUsuario(usuarioId);
      const mapa = {};
      if (Array.isArray(data)) {
        data.forEach((p) => {
          const esVigente = p.vigente !== undefined ? p.vigente : p.estaVigente;
          if (p.activo !== false && esVigente !== false) {
            mapa[p.codigoPermiso] = {
              esTemporal: Boolean(p.esTemporal),
              fechaExpiracion: p.fechaExpiracion,
            };
          }
        });
      }
      setPermisosSeleccionados(mapa);
    } catch (err) {
      console.error(err);
      mostrarAviso(
        "danger",
        "Error",
        "No se pudieron consultar los permisos actuales.",
      );
    } finally {
      setCargando(false);
    }
  };

  const togglePermiso = (codigo) => {
    setPermisosSeleccionados((prev) => {
      const nuevo = { ...prev };
      if (nuevo[codigo]) {
        delete nuevo[codigo];
      } else {
        nuevo[codigo] = { esTemporal: esTemporalGlobal };
      }
      return nuevo;
    });
  };

  const toggleModuloCompleto = (modulo) => {
    const codigosModulo = modulo.permisos.map((p) => p.codigo);
    const todosSeleccionados = codigosModulo.every(
      (c) => !!permisosSeleccionados[c],
    );

    setPermisosSeleccionados((prev) => {
      const nuevo = { ...prev };
      if (todosSeleccionados) {
        codigosModulo.forEach((c) => delete nuevo[c]);
      } else {
        codigosModulo.forEach((c) => {
          nuevo[c] = { esTemporal: esTemporalGlobal };
        });
      }
      return nuevo;
    });
  };

  const handleGuardar = async () => {
    if (!usuarioId) return;

    setGuardando(true);
    try {
      // Si se desmarcaron todos, Object.keys produce [] y el backend desactiva todos los accesos
      const payload = Object.keys(permisosSeleccionados).map((codigo) => ({
        codigoPermiso: codigo,
        esTemporal: esTemporalGlobal,
        duracionDias: esTemporalGlobal ? parseInt(duracionDias, 10) : null,
        motivo:
          motivo.trim() ||
          (esTemporalGlobal
            ? "Permiso temporal concedido"
            : "Permiso permanente"),
      }));

      await asignarPermisosUsuario(usuarioId, payload);

      mostrarAviso(
        "success",
        "Permisos Actualizados",
        `Se actualizaron las facultades para ${
          usuario.nombreCompleto ||
          usuario.nombreCompletoEmpleado ||
          usuario.username
        }.`,
      );
      if (onExito) onExito();
      onClose();
    } catch (err) {
      console.error(err);
      mostrarAviso(
        "danger",
        "Error",
        err.response?.data?.message ||
          "No se pudieron actualizar los permisos del usuario.",
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Matriz de Permisos & Control Granular
              </h2>
              <p className="text-xs text-slate-500">
                Colaborador:{" "}
                <span className="font-semibold text-slate-700">
                  {usuario?.nombreCompleto ||
                    usuario?.nombreCompletoEmpleado ||
                    usuario?.username}
                </span>{" "}
                • Rol:{" "}
                <span className="font-semibold text-indigo-600">
                  {usuario?.rol}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Configuración Temporal */}
        <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-200/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 select-none">
            <input
              type="checkbox"
              checked={esTemporalGlobal}
              onChange={(e) => setEsTemporalGlobal(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Asignar como Permiso Temporal (Auto-desactivable)</span>
          </label>

          {esTemporalGlobal && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-800 font-semibold">Duración:</span>
                <select
                  value={duracionDias}
                  onChange={(e) => setDuracionDias(Number(e.target.value))}
                  className="bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-amber-900 outline-none"
                >
                  <option value={1}>1 día (24 horas)</option>
                  <option value={3}>3 días</option>
                  <option value={7}>7 días (1 semana)</option>
                  <option value={30}>30 días</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Motivo (ej: Cubre suplencia / Auditoría)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-slate-700 placeholder-slate-400 w-56 outline-none"
              />
            </div>
          )}
        </div>

        {/* Contenido Modular con Checkboxes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span>Cargando matriz de seguridad...</span>
            </div>
          ) : (
            MODULOS_PERMISOS.map((mod) => {
              const codigos = mod.permisos.map((p) => p.codigo);
              const seleccionadosEnModulo = codigos.filter(
                (c) => !!permisosSeleccionados[c],
              ).length;
              const todos = seleccionadosEnModulo === codigos.length;

              return (
                <div
                  key={mod.id}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                >
                  {/* Encabezado del Módulo */}
                  <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200/80">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {mod.nombre}
                      </span>
                      <p className="text-[11px] text-slate-500 font-normal">
                        {mod.descripcion}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleModuloCompleto(mod)}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      {todos ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>
                        {todos ? "Deseleccionar todos" : "Seleccionar todos"}
                      </span>
                    </button>
                  </div>

                  {/* Acciones individuales */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                    {mod.permisos.map((p) => {
                      const activo = !!permisosSeleccionados[p.codigo];
                      return (
                        <label
                          key={p.codigo}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            activo
                              ? "bg-indigo-50/50 border-indigo-200 text-indigo-950"
                              : "hover:bg-slate-50 border-slate-200/70 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={() => togglePermiso(p.codigo)}
                            className="mt-0.5 w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold">
                                {p.label}
                              </span>
                              {p.critico && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">
                                  <ShieldAlert className="w-2.5 h-2.5" />{" "}
                                  Crítico
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                              {p.codigo}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500">
            {Object.keys(permisosSeleccionados).length} facultades habilitadas
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {guardando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{guardando ? "Guardando..." : "Aplicar Matriz"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
