import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Users, Search, Loader2, X, ChevronLeft } from "lucide-react";
import { getEmpleadosActivos } from "../../services/empleadoService";
import { getCategorias } from "../../services/configuracionService";
import {
  getPestanaBgClass,
  getBadgeColorClasses,
} from "../../utils/categoriasHorariosUtils";

// Helper para obtener estilo de botón no seleccionado según color configurado
const getBotonInactivoClasses = (color) => {
  switch (color?.toLowerCase()) {
    case "emerald":
      return "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
    case "amber":
      return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
    case "purple":
      return "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100";
    case "cyan":
      return "bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100";
    case "rose":
      return "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100";
    case "indigo":
    default:
      return "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100";
  }
};

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

  const callbackSeleccionarRef = useRef(onSeleccionarEmpleado);
  callbackSeleccionarRef.current = onSeleccionarEmpleado;

  const idSeleccionadoRef = useRef(empleadoSeleccionadoId);
  idSeleccionadoRef.current = empleadoSeleccionadoId;

  const yaInicializadoRef = useRef(false);

  const cargarDatos = useCallback(async (forzar = false) => {
    try {
      const [empData, catData] = await Promise.all([
        getEmpleadosActivos(forzar),
        getCategorias(),
      ]);

      const listaEmp = Array.isArray(empData) ? empData : [];
      const listaCat = Array.isArray(catData)
        ? catData.filter((c) => c.activo !== false)
        : [];

      setEmpleados(listaEmp);
      setCategorias(listaCat);

      if (!yaInicializadoRef.current && listaEmp.length > 0) {
        if (
          !idSeleccionadoRef.current ||
          !listaEmp.some((e) => e.id === idSeleccionadoRef.current)
        ) {
          callbackSeleccionarRef.current?.(listaEmp[0]);
        }
        yaInicializadoRef.current = true;
      }
    } catch (err) {
      console.error("Error al cargar datos en ListaEmpleadosSidebar:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos(false);
  }, [cargarDatos]);

  useEffect(() => {
    let timerSync = null;

    const handleSincronizacion = () => {
      if (timerSync) clearTimeout(timerSync);
      timerSync = setTimeout(() => {
        cargarDatos(false);
      }, 500);
    };

    window.addEventListener("datos:actualizados", handleSincronizacion);
    return () => {
      if (timerSync) clearTimeout(timerSync);
      window.removeEventListener("datos:actualizados", handleSincronizacion);
    };
  }, [cargarDatos]);

  // Mapa rápido de ID/Nombre de categoría a objeto categoría (para colores)
  const mapaCategorias = useMemo(() => {
    const mapa = new Map();
    categorias.forEach((c) => {
      mapa.set(String(c.id), c);
      if (c.nombre) mapa.set(c.nombre.toLowerCase().trim(), c);
    });
    return mapa;
  }, [categorias]);

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
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden ${
          isOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
      />

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
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Listado de Personal</span>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {empleados.length}
              </span>
            </div>

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

          {/* BOTONES DE FILTRO CON EL COLOR DE CONFIGURACIÓN */}
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
              const colorId = cat.colorIdentificacion || "indigo";

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(cat.id)}
                  className={`px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                    seleccionada
                      ? `${getPestanaBgClass(colorId)} border-transparent`
                      : getBotonInactivoClasses(colorId)
                  }`}
                >
                  {cat.nombre}
                </button>
              );
            })}
          </div>

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

                // Obtener color de categoría del empleado para su badge
                const catEmp =
                  (emp.categorias && emp.categorias[0]) || emp.categoria;
                const catObj = catEmp
                  ? mapaCategorias.get(String(catEmp.id)) ||
                    mapaCategorias.get(catEmp.nombre?.toLowerCase()?.trim())
                  : null;
                const colorCat = catObj?.colorIdentificacion || "indigo";

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
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs leading-tight truncate">
                        {emp.apellido}, {emp.nombre}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {catObj && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase border ${
                              esSeleccionado
                                ? "bg-white/20 text-white border-white/30"
                                : getBadgeColorClasses(colorCat)
                            }`}
                          >
                            {catObj.codigoTag?.toUpperCase() || catObj.nombre}
                          </span>
                        )}
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
