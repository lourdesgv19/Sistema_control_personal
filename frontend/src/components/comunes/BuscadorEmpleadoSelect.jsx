import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export default function BuscadorEmpleadoSelect({
  empleados = [],
  valorSeleccionado,
  onSeleccionar,
  disabled = false,
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const dropdownRef = useRef(null);

  // Empleado seleccionado actualmente
  const empActual = useMemo(() => {
    return empleados.find((e) => String(e.id) === String(valorSeleccionado));
  }, [empleados, valorSeleccionado]);

  // Filtrar lista mientras el administrador escribe
  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return empleados;
    const q = busqueda.toLowerCase();
    return empleados.filter(
      (e) =>
        e.nombre?.toLowerCase().includes(q) ||
        e.apellido?.toLowerCase().includes(q) ||
        e.nroLegajo?.toLowerCase().includes(q) ||
        e.dni?.includes(q),
    );
  }, [empleados, busqueda]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  return (
    <div className="relative w-72" ref={dropdownRef}>
      {/* Botón trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setAbierto(!abierto);
            setBusqueda("");
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl border transition ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 shadow-2xs"
        }`}
      >
        <span className="truncate font-medium">
          {empActual
            ? `${empActual.nombre} ${empActual.apellido} (${empActual.nroLegajo})`
            : "-- Seleccionar empleado --"}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {empActual && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSeleccionar(null);
              }}
              className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
              title="Quitar asignación"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </button>

      {/* Menú desplegable con input de texto */}
      {abierto && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              autoFocus
              placeholder="Escribe para filtrar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-slate-50"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
            <button
              type="button"
              onClick={() => {
                onSeleccionar(null);
                setAbierto(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-400 hover:bg-slate-50 rounded-lg transition italic"
            >
              -- Sin asignar --
            </button>

            {filtrados.length === 0 ? (
              <div className="text-center py-3 text-slate-400 text-[11px]">
                No se hallaron coincidencias
              </div>
            ) : (
              filtrados.map((emp) => {
                const esActivo = String(emp.id) === String(valorSeleccionado);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      onSeleccionar(emp.id);
                      setAbierto(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition text-left ${
                      esActivo
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate">
                      {emp.nombre} {emp.apellido}{" "}
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({emp.nroLegajo})
                      </span>
                    </span>
                    {esActivo && (
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
  );
}
