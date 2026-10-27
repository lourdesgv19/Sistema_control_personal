import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Pencil,
  Search,
  ChevronDown,
  Check,
  Building,
  User,
} from "lucide-react";

export default function ModalCrearExcepcion({
  isOpen,
  onClose,
  empleados = [],
  onGuardar,
  licenciaEditando = null,
}) {
  const hoyStr = new Date().toISOString().split("T")[0];

  const [idEmpleado, setIdEmpleado] = useState("INSTITUCIONAL");
  const [tipo, setTipo] = useState("LICENCIA_MEDICA");
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [motivoDictamen, setMotivoDictamen] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Estados del selector desplegable con búsqueda
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState("");
  const dropdownRef = useRef(null);

  const esEdicion = Boolean(licenciaEditando);

  useEffect(() => {
    if (licenciaEditando) {
      setIdEmpleado(
        licenciaEditando.esInstitucional || !licenciaEditando.idEmpleado
          ? "INSTITUCIONAL"
          : String(licenciaEditando.idEmpleado),
      );
      setTipo(licenciaEditando.tipo || "LICENCIA_MEDICA");
      setFechaInicio(licenciaEditando.fechaInicio || hoyStr);
      setFechaFin(licenciaEditando.fechaFin || hoyStr);
      setMotivoDictamen(licenciaEditando.motivoDictamen || "");
    } else {
      setIdEmpleado("INSTITUCIONAL");
      setTipo("LICENCIA_MEDICA");
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
      setMotivoDictamen("");
    }
    setBusquedaEmpleado("");
    setDropdownAbierto(false);
  }, [licenciaEditando, isOpen, hoyStr]);

  // Cerrar el desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  // Empleado actualmente seleccionado
  const empleadoSeleccionadoObj = useMemo(() => {
    if (idEmpleado === "INSTITUCIONAL") return null;
    return empleados.find((e) => String(e.id) === String(idEmpleado));
  }, [empleados, idEmpleado]);

  // Lista filtrada en tiempo real según lo que escribe el usuario
  const empleadosFiltrados = useMemo(() => {
    if (!busquedaEmpleado.trim()) return empleados;
    const q = busquedaEmpleado.toLowerCase().trim();
    return empleados.filter(
      (e) =>
        e.nombre?.toLowerCase().includes(q) ||
        e.apellido?.toLowerCase().includes(q) ||
        e.nroLegajo?.toLowerCase().includes(q) ||
        e.dni?.includes(q),
    );
  }, [empleados, busquedaEmpleado]);

  // Previsualización de vigencia
  const previsualizacion = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    const dIni = new Date(fechaInicio + "T00:00:00");
    const dFin = new Date(fechaFin + "T00:00:00");
    const dHoy = new Date(hoyStr + "T00:00:00");

    const diffTime = dFin.getTime() - dIni.getTime();
    const diffDias = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    const totalDias = Math.max(1, diffDias);

    if (dHoy < dIni) {
      const faltan = Math.round(
        (dIni.getTime() - dHoy.getTime()) / (1000 * 3600 * 24),
      );
      return {
        badge: `${totalDias} ${totalDias === 1 ? "día" : "días"}`,
        texto: `Inicia en ${faltan} días • Comienza el ${fechaInicio}`,
      };
    }
    if (dHoy > dFin) {
      return {
        badge: `${totalDias} ${totalDias === 1 ? "día" : "días"}`,
        texto: "Período pasado ya concluido",
      };
    }
    if (totalDias === 1) {
      return {
        badge: "1 día único",
        texto:
          "En curso hoy (vigencia de 1 día) • ¡Último día de vigencia! Concluye hoy a las 23:59 hs",
      };
    }
    const trans =
      Math.round((dHoy.getTime() - dIni.getTime()) / (1000 * 3600 * 24)) + 1;
    const restan = Math.round(
      (dFin.getTime() - dHoy.getTime()) / (1000 * 3600 * 24),
    );
    return {
      badge: `${totalDias} días totales`,
      texto: `En curso: van ${trans} de ${totalDias} días • Restan ${restan} días para que finalice`,
    };
  }, [fechaInicio, fechaFin, hoyStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivoDictamen.trim()) return;
    setSubmitting(true);
    try {
      await onGuardar(
        {
          idEmpleado:
            idEmpleado === "INSTITUCIONAL" || !idEmpleado
              ? null
              : Number(idEmpleado),
          esInstitucional: idEmpleado === "INSTITUCIONAL",
          tipo,
          fechaInicio,
          fechaFin,
          motivoDictamen: motivoDictamen.trim(),
        },
        licenciaEditando?.id || null,
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              {esEdicion ? (
                <Pencil className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Plus className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {esEdicion
                  ? "Editar Excepción o Licencia"
                  : "Registrar Excepción o Licencia"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {esEdicion
                  ? "Modifique los parámetros o justificación del registro"
                  : "Carga formal para justificación de ausencias o franquicias"}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* SELECCIONADOR CON BÚSQUEDA PREDICTIVA */}
          <div className="relative" ref={dropdownRef}>
            <label className="font-bold text-slate-700 block mb-1">
              Agente o Alcance Institucional *
            </label>

            {/* Botón Trigger del Dropdown */}
            <button
              type="button"
              onClick={() => {
                setDropdownAbierto(!dropdownAbierto);
                setBusquedaEmpleado("");
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-xl text-slate-800 transition shadow-2xs cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 truncate">
                {idEmpleado === "INSTITUCIONAL" ? (
                  <>
                    <Building className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="font-semibold text-purple-900">
                      Toda la Institución (Asuetos y Feriados Institucionales)
                    </span>
                  </>
                ) : empleadoSeleccionadoObj ? (
                  <>
                    <User className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-900">
                      {empleadoSeleccionadoObj.apellido},{" "}
                      {empleadoSeleccionadoObj.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (#{empleadoSeleccionadoObj.nroLegajo || "S/L"})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">
                    -- Seleccionar colaborador --
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {/* Menú Desplegable con Input de Búsqueda */}
            {dropdownAbierto && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-2 animate-in fade-in-50 zoom-in-95">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Escriba nombre, apellido o legajo..."
                    value={busquedaEmpleado}
                    onChange={(e) => setBusquedaEmpleado(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 text-slate-800"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
                  {/* Opción 1: Toda la Institución */}
                  <button
                    type="button"
                    onClick={() => {
                      setIdEmpleado("INSTITUCIONAL");
                      setDropdownAbierto(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition text-left cursor-pointer ${
                      idEmpleado === "INSTITUCIONAL"
                        ? "bg-purple-50 text-purple-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-purple-600" />
                      <span>🏛 Toda la Institución (Asuetos y Feriados)</span>
                    </div>
                    {idEmpleado === "INSTITUCIONAL" && (
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    )}
                  </button>

                  {/* Listado filtrado de empleados */}
                  {empleadosFiltrados.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-[11px] italic">
                      No se encontraron colaboradores que coincidan con "
                      {busquedaEmpleado}"
                    </div>
                  ) : (
                    empleadosFiltrados.map((emp) => {
                      const esSeleccionado =
                        String(emp.id) === String(idEmpleado);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setIdEmpleado(String(emp.id));
                            setDropdownAbierto(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition text-left cursor-pointer ${
                            esSeleccionado
                              ? "bg-indigo-50 text-indigo-700 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-semibold">
                              {emp.apellido}, {emp.nombre}
                            </span>{" "}
                            <span className="text-[10px] text-slate-400 font-mono">
                              (#{emp.nroLegajo || "S/L"})
                            </span>
                            {emp.rolSistema && (
                              <span className="ml-1 text-[10px] text-slate-400">
                                • {emp.rolSistema}
                              </span>
                            )}
                          </div>
                          {esSeleccionado && (
                            <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Tipo de Licencia o Excepción *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="LICENCIA_MEDICA">
                🩺 Licencia Médica (Reposo / Cirugía)
              </option>
              <option value="VACACIONES">
                🏖 Vacaciones Anuales Ordinarias
              </option>
              <option value="CAMBIO_HORARIO">
                ⏱ Cambio de Horario / Permuta de Turno
              </option>
              <option value="COMISION_SERVICIO">
                💼 Comisión de Servicio / Capacitación
              </option>
              <option value="FERIADO_ASUETO">
                🏛 Feriado / Asueto Institucional
              </option>
              <option value="OTRA_FRANQUICIA">
                ✨ Otra / Examen / Franquicia Horaria
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  if (e.target.value > fechaFin) setFechaFin(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Fecha de Finalización *
              </label>
              <input
                type="date"
                min={fechaInicio}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {previsualizacion && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 text-indigo-950">
              <div>
                <span className="font-bold text-[10px] uppercase text-indigo-600 block">
                  Previsualización de Vigencia:
                </span>
                <span className="text-[11px] font-medium">
                  {previsualizacion.texto}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-indigo-200/60 text-indigo-800 rounded-lg font-bold text-[10px] shrink-0">
                {previsualizacion.badge}
              </span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Descripción, Dictamen o Certificado Médico *
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Reposo médico por 5 días según Certificado N° 9812 expedido por Sanatorio Central..."
              value={motivoDictamen}
              onChange={(e) => setMotivoDictamen(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !motivoDictamen.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? "Guardando..."
                : esEdicion
                  ? "Guardar Cambios"
                  : "Confirmar Registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
