import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getEmpleadosActivos } from "../../services/empleadoService";
import { getCategorias } from "../../services/configuracionService";

export default function ListaEmpleadosSidebar({
  empleadoSeleccionadoId,
  onSeleccionarEmpleado,
  isOpen = true,
  onClose,
  className = "",
}) {
  const [empleados, setEmpleados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Cargar nómina y categorías
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [empData, catData] = await Promise.all([
        getEmpleadosActivos(),
        getCategorias(),
      ]);

      const listaEmp = Array.isArray(empData) ? empData : [];
      const listaCat = Array.isArray(catData)
        ? catData.filter((c) => c.activo !== false)
        : [];

      setEmpleados(listaEmp);
      setCategorias(listaCat);

      if (
        listaEmp.length > 0 &&
        (!empleadoSeleccionadoId ||
          !listaEmp.some((e) => e.id === empleadoSeleccionadoId))
      ) {
        onSeleccionarEmpleado?.(listaEmp[0]);
      }
    } catch (err) {
      console.error("Error al cargar datos en ListaEmpleadosSidebar:", err);
    } finally {
      setLoading(false);
    }
  }, [empleadoSeleccionadoId, onSeleccionarEmpleado]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // 2. Filtro dinámico
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      const coincideCategoria =
        categoriaFiltro === "TODOS" ||
        (emp.categorias || []).some(
          (c) =>
            c.id === categoriaFiltro ||
            c.nombre?.toLowerCase() === String(categoriaFiltro).toLowerCase(),
        ) ||
        emp.categoria?.id === categoriaFiltro ||
        emp.categoria?.nombre?.toLowerCase() ===
          String(categoriaFiltro).toLowerCase();

      const q = busqueda.trim().toLowerCase();
      const coincideBusqueda =
        !q ||
        `${emp.nombre || ""} ${emp.apellido || ""}`.toLowerCase().includes(q) ||
        (emp.nroLegajo && String(emp.nroLegajo).toLowerCase().includes(q)) ||
        (emp.dni && String(emp.dni).includes(q));

      return coincideCategoria && coincideBusqueda;
    });
  }, [empleados, categoriaFiltro, busqueda]);

  const handleSelect = (emp) => {
    onSeleccionarEmpleado?.(emp);
    // En móviles, se cierra el drawer automáticamente al elegir un empleado
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* OVERLAY PARA MÓVILES (< lg) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden ${
          isOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
      />

      {/* CONTENEDOR PRINCIPAL: Drawer en móvil, colapsable en Desktop */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-50 h-full lg:h-auto w-80 sm:w-88 lg:w-full
          bg-white border border-slate-200 rounded-r-3xl lg:rounded-3xl p-4 shadow-xl lg:shadow-xs
          transition-transform lg:transition-all duration-300 ease-in-out font-sans flex flex-col justify-between
          ${
            isOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full lg:hidden opacity-0 pointer-events-none"
          }
          ${className}
        `}
      >
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          {/* Cabecera con Botón de Cierre */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Listado de Personal</span>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {empleados.length}
              </span>
            </div>

            {/* Botón cerrar para móvil y botón colapsar para escritorio */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Cerrar listado"
            >
              <X className="w-4 h-4 lg:hidden" />
              <ChevronLeft className="w-4 h-4 hidden lg:block" />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar empleado o legajo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Filtros de Categorías */}
          <div className="flex flex-wrap gap-1 text-[11px] font-bold shrink-0">
            <button
              type="button"
              onClick={() => setCategoriaFiltro("TODOS")}
              className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                categoriaFiltro === "TODOS"
                  ? "bg-[#111827] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({empleados.length})
            </button>

            {categorias.map((cat) => {
              const seleccionada = categoriaFiltro === cat.id;
              const esDoc = (cat.nombre || "")
                .toLowerCase()
                .includes("docente");

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(cat.id)}
                  className={`px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                    seleccionada
                      ? esDoc
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : esDoc
                        ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat.nombre}
                </button>
              );
            })}
          </div>

          {/* Lista de empleados con scroll */}
          <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 select-none">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                Cargando nómina...
              </div>
            ) : empleadosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No se encontraron empleados.
              </div>
            ) : (
              empleadosFiltrados.map((emp) => {
                const esSeleccionado = emp.id === empleadoSeleccionadoId;
                const cargo =
                  (emp.cargos || []).map((c) => c.nombre || c).join(", ") ||
                  "Empleado";

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      esSeleccionado
                        ? "bg-[#4338ca] text-white border-[#4338ca] shadow-md shadow-indigo-100 scale-[1.01]"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs leading-tight">
                        {emp.apellido}, {emp.nombre}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          esSeleccionado
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        Activo
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        esSeleccionado ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      {cargo} • Legajo: {emp.nroLegajo || "-"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
