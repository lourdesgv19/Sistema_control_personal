import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export default function SelectorAccionFiltro({
  acciones = [],
  valorSeleccionado = "",
  onSeleccionar,
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const dropdownRef = useRef(null);

  // Filtrar catálogo según lo que el usuario tipea
  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return acciones;
    const q = busqueda.toLowerCase();
    return acciones.filter((acc) => acc.toLowerCase().includes(q));
  }, [acciones, busqueda]);

  // Cerrar al hacer clic fuera del componente
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
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botón Trigger */}
      <button
        type="button"
        onClick={() => {
          setAbierto(!abierto);
          setBusqueda("");
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:border-indigo-400 focus:border-indigo-500 shadow-2xs transition cursor-pointer text-left"
      >
        <span
          className={`truncate font-medium ${valorSeleccionado ? "text-slate-800 font-bold" : "text-slate-500"}`}
        >
          {valorSeleccionado || "Todas las acciones"}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-1.5">
          {valorSeleccionado && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSeleccionar("");
              }}
              className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition"
              title="Quitar filtro de acción"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Menú Desplegable con Input de Búsqueda */}
      {abierto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              autoFocus
              placeholder="Escribe para buscar acción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-slate-50 text-slate-800"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
            <button
              type="button"
              onClick={() => {
                onSeleccionar("");
                setAbierto(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-lg transition italic cursor-pointer ${
                !valorSeleccionado
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              -- Todas las acciones --
            </button>

            {filtradas.length === 0 ? (
              <div className="text-center py-3 text-slate-400 text-[11px] italic">
                No se encontraron acciones coincidentes
              </div>
            ) : (
              filtradas.map((acc) => {
                const esActivo = acc === valorSeleccionado;
                return (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => {
                      onSeleccionar(acc);
                      setAbierto(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition text-left cursor-pointer ${
                      esActivo
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{acc}</span>
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
