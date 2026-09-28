import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  X,
  Search,
  List,
  ChevronDown,
  Check,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getHistorialImportaciones,
  getMarcacionesPaginadas,
  getSinVincularCount,
  getPendientesVinculacion,
  getFichajesPorImportacion,
  uploadArchivoFichajes,
  deleteHistorialImportacion,
  previsualizarVinculaciones,
  guardarVinculaciones,
} from "../services/importacionService";
import { getEmpleados, createEmpleado } from "../services/empleadoService";
import { getCategorias, getCargos } from "../services/configuracionService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalRegistroEmpleado from "../components/personal/ModalRegistroEmpleado";

const formatearFechaHora24 = (fechaIso) => {
  if (!fechaIso) return "-";
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return fechaIso;

  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const ESTADO_INICIAL_EMPLEADO = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  nroLegajo: "",
  idBiometrico: "",
  categoriasIds: [],
  cargosIds: [],
  rolSistema: "Consulta / Empleado (Visualiza su ficha)",
  toleranciaIngresoMin: 15,
  toleranciaEgresoMin: 10,
};

function BuscadorEmpleadoSelect({
  empleados = [],
  valorSeleccionado,
  onSeleccionar,
  disabled = false,
  onRegistrarNuevo,
  sJobNo,
  sName,
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const dropdownRef = useRef(null);

  const empActual = useMemo(() => {
    return empleados.find((e) => String(e.id) === String(valorSeleccionado));
  }, [empleados, valorSeleccionado]);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return empleados;
    const q = busqueda.toLowerCase();
    return empleados.filter(
      (e) =>
        e.nombre?.toLowerCase().includes(q) ||
        e.apellido?.toLowerCase().includes(q) ||
        e.nroLegajo?.toLowerCase().includes(q) ||
        (e.dni && String(e.dni).includes(q)),
    );
  }, [empleados, busqueda]);

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
            : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 shadow-2xs cursor-pointer"
        }`}
      >
        <span className="truncate font-medium">
          {empActual
            ? `${empActual.nombre} ${empActual.apellido} (Legajo: ${empActual.nroLegajo})`
            : "-- Sin asignar --"}
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

      {abierto && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar por nombre o legajo..."
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
              className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-400 hover:bg-slate-50 rounded-lg transition italic cursor-pointer"
            >
              -- Sin asignar --
            </button>

            {filtrados.length === 0 ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-slate-400 text-[11px]">
                  No se hallaron coincidencias
                </p>
                {onRegistrarNuevo && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(false);
                      onRegistrarNuevo({
                        sJobNo,
                        sName: busqueda.trim() || sName,
                      });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    <span>+ Registrar a "{busqueda.trim() || sName}"</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filtrados.map((emp) => {
                  const esActivo = String(emp.id) === String(valorSeleccionado);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        onSeleccionar(emp.id);
                        setAbierto(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition text-left cursor-pointer ${
                        esActivo
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="truncate">
                        {emp.nombre} {emp.apellido}{" "}
                        <span className="text-[10px] text-slate-400 font-mono">
                          (Legajo: {emp.nroLegajo})
                        </span>
                      </span>
                      {esActivo && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}

                {onRegistrarNuevo && (
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAbierto(false);
                        onRegistrarNuevo({ sJobNo, sName });
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    >
                      + Registrar nuevo empleado
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportacionFichajes() {
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [conteoSinVincular, setConteoSinVincular] = useState(0);

  // Catálogos para el modal de registro de empleados
  const [categoriasActivas, setCategoriasActivas] = useState([]);
  const [cargosActivos, setCargosActivos] = useState([]);

  // Estados de Marcaciones Paginadas en Servidor
  const [fichajesPaginados, setFichajesPaginados] = useState([]);
  const [paginaFichajes, setPaginaFichajes] = useState(0);
  const [totalPaginasFichajes, setTotalPaginasFichajes] = useState(1);
  const [totalElementosFichajes, setTotalElementosFichajes] = useState(0);
  const [busquedaFichaje, setBusquedaFichaje] = useState("");
  const [cargandoFichajes, setCargandoFichajes] = useState(false);

  // Vistas y subida
  const [archivo, setArchivo] = useState(null);
  const [vistaActual, setVistaActual] = useState("historial"); // 'historial' | 'asistente' | 'marcaciones'
  const [resultadoSubida, setResultadoSubida] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState("");

  // Modal Detalle Lote (Ojito)
  const [modalArchivo, setModalArchivo] = useState({
    isOpen: false,
    item: null,
  });
  const [filtroModalNombre, setFiltroModalNombre] = useState("");
  const [filtroModalFecha, setFiltroModalFecha] = useState("");
  const [fichajesLote, setFichajesLote] = useState([]);
  const [cargandoModalFichajes, setCargandoModalFichajes] = useState(false);

  // Asistente de Vinculación
  const [vinculaciones, setVinculaciones] = useState([]);
  const [cargandoAsistente, setCargandoAsistente] = useState(false);

  // Modal Registro Empleado Reutilizado
  const [modalRegistro, setModalRegistro] = useState(false);
  const [formEmpleado, setFormEmpleado] = useState(ESTADO_INICIAL_EMPLEADO);

  // Modal Alerta Centralizado
  const [modalAlerta, setModalAlerta] = useState({
    isOpen: false,
    tipo: "info",
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    textoCancelar: "Cancelar",
    mostrarCancelar: false,
    onConfirmar: () => {},
  });

  const mostrarAviso = (tipo, titulo, mensaje) => {
    setModalAlerta({
      isOpen: true,
      tipo,
      titulo,
      mensaje,
      textoConfirmar: "Aceptar",
      mostrarCancelar: false,
      onConfirmar: () => setModalAlerta((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const cargarDatos = async () => {
    setLoading(true);
    setErrorGlobal("");
    try {
      const [histRes, empRes, sinVincularRes, catRes, cargoRes] =
        await Promise.all([
          getHistorialImportaciones(),
          getEmpleados(),
          getSinVincularCount().catch(() => 0),
          getCategorias ? getCategorias().catch(() => []) : [],
          getCargos ? getCargos().catch(() => []) : [],
        ]);
      setHistorial(Array.isArray(histRes) ? histRes : []);
      setEmpleados(Array.isArray(empRes) ? empRes : []);
      setConteoSinVincular(
        typeof sinVincularRes === "number" ? sinVincularRes : 0,
      );
      setCategoriasActivas(Array.isArray(catRes) ? catRes : []);
      setCargosActivos(Array.isArray(cargoRes) ? cargoRes : []);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setErrorGlobal("Error al sincronizar datos con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarMarcacionesServidor = async (q = "", page = 0) => {
    setCargandoFichajes(true);
    try {
      const data = await getMarcacionesPaginadas(q, page, 25);
      if (data && data.content) {
        setFichajesPaginados(data.content);
        setTotalPaginasFichajes(data.totalPages || 1);
        setTotalElementosFichajes(data.totalElements || 0);
        setPaginaFichajes(data.number || 0);
      } else {
        setFichajesPaginados(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error al cargar marcaciones paginadas:", err);
    } finally {
      setCargandoFichajes(false);
    }
  };

  useEffect(() => {
    if (vistaActual === "marcaciones") {
      cargarMarcacionesServidor(busquedaFichaje, paginaFichajes);
    }
  }, [vistaActual, paginaFichajes]);

  useEffect(() => {
    if (vistaActual === "marcaciones") {
      const timer = setTimeout(() => {
        setPaginaFichajes(0);
        cargarMarcacionesServidor(busquedaFichaje, 0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [busquedaFichaje]);

  const consultarFichajesDelLote = async (id, nombre, fecha) => {
    setCargandoModalFichajes(true);
    try {
      const data = await getFichajesPorImportacion(id, nombre, fecha);
      setFichajesLote(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al obtener fichajes del lote:", err);
      setFichajesLote([]);
    } finally {
      setCargandoModalFichajes(false);
    }
  };

  const handleAbrirModalLote = (item) => {
    setFiltroModalNombre("");
    setFiltroModalFecha("");
    setModalArchivo({ isOpen: true, item });
    consultarFichajesDelLote(item.id, "", "");
  };

  useEffect(() => {
    if (modalArchivo.isOpen && modalArchivo.item) {
      const timer = setTimeout(() => {
        consultarFichajesDelLote(
          modalArchivo.item.id,
          filtroModalNombre,
          filtroModalFecha,
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filtroModalNombre, filtroModalFecha, modalArchivo.isOpen]);

  const handleSeleccionarArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
      setResultadoSubida(null);
      setErrorGlobal("");
    }
  };

  const handleImportar = async () => {
    if (!archivo) return;
    setLoading(true);
    setErrorGlobal("");
    try {
      const res = await uploadArchivoFichajes(archivo);
      setResultadoSubida(res);
      const archivoSubido = archivo;
      setArchivo(null);
      await cargarDatos();

      try {
        const previ = await previsualizarVinculaciones(archivoSubido);
        const pendientes = previ.filter((p) => !p.yaVinculado);
        setVinculaciones(previ);

        if (pendientes.length > 0) {
          setModalAlerta({
            isOpen: true,
            tipo: "warning",
            titulo: "Marcaciones Guardadas con Pendientes",
            mensaje: `Se guardaron ${res.procesadasOk} marcaciones, pero se detectaron ${pendientes.length} colaboradores del reloj aún no vinculados. ¿Deseas vincularlos ahora?`,
            textoConfirmar: "Vincular Ahora",
            textoCancelar: "Más tarde",
            mostrarCancelar: true,
            onConfirmar: () => {
              setModalAlerta((prev) => ({ ...prev, isOpen: false }));
              setVistaActual("asistente");
            },
          });
          return;
        }
      } catch (errAnalisis) {
        console.warn("No se pudo previsualizar vinculaciones:", errAnalisis);
      }

      mostrarAviso(
        "success",
        "Importación Exitosa",
        `Se procesaron ${res.procesadasOk} marcaciones correctamente.`,
      );
    } catch (err) {
      const msg =
        err.response?.data?.mensajesErrores?.[0] ||
        "Error al procesar el archivo en el servidor.";
      setErrorGlobal(msg);
      mostrarAviso("danger", "Error de Procesamiento", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarHistorial = (id, nombre) => {
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja importación?",
      mensaje: `¿Desea dar de baja la importación de "${nombre}" y desestimar sus marcaciones asociadas?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteHistorialImportacion(id);
          await cargarDatos();
          if (vistaActual === "marcaciones") {
            cargarMarcacionesServidor(busquedaFichaje, paginaFichajes);
          }
          mostrarAviso(
            "success",
            "Baja Confirmada",
            `El registro de "${nombre}" fue dado de baja.`,
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            "No se pudo dar de baja el registro.",
          );
        }
      },
    });
  };

  const handleAbrirAsistenteDesdeCabecera = async () => {
    if (vistaActual === "asistente") {
      setVistaActual("historial");
      return;
    }

    setCargandoAsistente(true);
    try {
      if (archivo) {
        const datosSugeridos = await previsualizarVinculaciones(archivo);
        setVinculaciones(Array.isArray(datosSugeridos) ? datosSugeridos : []);
      } else {
        const datos = await getPendientesVinculacion();
        setVinculaciones(Array.isArray(datos) ? datos : []);
      }
      setVistaActual("asistente");
    } catch (err) {
      console.error("Error al obtener vinculaciones:", err);
      mostrarAviso(
        "danger",
        "Error",
        "No se pudieron obtener las asignaciones biométricas.",
      );
    } finally {
      setCargandoAsistente(false);
    }
  };

  const handleCambiarEmpleadoAsignado = (sJobNo, nuevoEmpleadoId) => {
    setVinculaciones((prev) =>
      prev.map((v) =>
        v.sJobNo === sJobNo
          ? {
              ...v,
              sugeridoEmpleadoId: nuevoEmpleadoId
                ? Number(nuevoEmpleadoId)
                : null,
            }
          : v,
      ),
    );
  };

  // Disparar alta rápida abriendo ModalRegistroEmpleado
  const handleAbrirRegistroNuevo = ({ sJobNo, sName }) => {
    const partes = (sName || "").trim().split(" ");
    const nombre = partes[0] || "";
    const apellido = partes.slice(1).join(" ") || "";

    setFormEmpleado({
      ...ESTADO_INICIAL_EMPLEADO,
      nombre,
      apellido,
      idBiometrico: String(sJobNo || ""),
      nroLegajo: sJobNo ? `LEG-${String(sJobNo).padStart(3, "0")}` : "",
    });
    setModalRegistro(true);
  };

  // Envío del ModalRegistroEmpleado
  const handleGuardarNuevoEmpleado = async (e) => {
    e.preventDefault();
    try {
      const nuevo = await createEmpleado(formEmpleado);

      const empsActualizados = await getEmpleados();
      setEmpleados(empsActualizados);

      handleCambiarEmpleadoAsignado(formEmpleado.idBiometrico, nuevo.id);

      setModalRegistro(false);
      setFormEmpleado(ESTADO_INICIAL_EMPLEADO);

      mostrarAviso(
        "success",
        "Empleado Registrado",
        `Se dio de alta a ${nuevo.nombre} ${nuevo.apellido} y se asignó automáticamente en la fila.`,
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "No se pudo registrar el empleado. Verifique que DNI o Legajo no existan previamente.";
      mostrarAviso("danger", "Error de Registro", msg);
    }
  };

  const handleGuardarVinculaciones = async () => {
    try {
      const payload = vinculaciones
        .filter(
          (v) =>
            v.sugeridoEmpleadoId != null && String(v.sugeridoEmpleadoId) !== "",
        )
        .map((v) => ({
          empleadoId: Number(v.sugeridoEmpleadoId),
          idBiometrico: v.sJobNo,
        }));

      if (payload.length === 0) {
        mostrarAviso(
          "warning",
          "Atención",
          "No hay vinculaciones seleccionadas para guardar.",
        );
        return;
      }

      await guardarVinculaciones(payload);
      mostrarAviso(
        "success",
        "Vinculaciones Guardadas",
        "Los IDs biométricos fueron asignados correctamente a los empleados y marcas históricas.",
      );
      await cargarDatos();
      setVistaActual("historial");
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        "Ocurrió un error al intentar guardar las vinculaciones.",
      );
    }
  };

  const vinculacionesOrdenadas = useMemo(() => {
    return [...vinculaciones].sort((a, b) => {
      if (a.yaVinculado === b.yaVinculado) {
        return a.sJobNo.localeCompare(b.sJobNo, undefined, { numeric: true });
      }
      return a.yaVinculado ? 1 : -1;
    });
  }, [vinculaciones]);

  const pendientesCount = useMemo(
    () => vinculaciones.filter((v) => !v.yaVinculado).length,
    [vinculaciones],
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <UploadCloud className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Ingesta & Carga de Marcaciones Biométricas
            </h1>
            <p className="text-xs text-slate-500">
              Procesamiento y almacenamiento de marcaciones válidas del reloj de
              asistencia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setVistaActual(
                vistaActual === "historial" ? "marcaciones" : "historial",
              )
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              vistaActual === "historial"
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                : "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
            }`}
          >
            {vistaActual === "historial" ? (
              <>
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Ver Historial de Fichadas</span>
              </>
            ) : (
              <>
                <List className="w-4 h-4 text-white" />
                <span>Ver Lista de Importaciones</span>
              </>
            )}
          </button>

          {(conteoSinVincular > 0 || vistaActual === "asistente") && (
            <button
              onClick={handleAbrirAsistenteDesdeCabecera}
              disabled={cargandoAsistente}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                vistaActual === "asistente"
                  ? "bg-slate-100 border-slate-300 text-slate-700"
                  : "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-100 font-bold"
              }`}
            >
              {cargandoAsistente ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : vistaActual === "asistente" ? (
                <UserCheck className="w-4 h-4 text-slate-600" />
              ) : (
                <UserX className="w-4 h-4 text-white" />
              )}
              {vistaActual === "asistente"
                ? "Volver a Importaciones"
                : `Empleados sin vincular (${conteoSinVincular})`}
            </button>
          )}
        </div>
      </div>

      {/* 2. ZONA DE CARGA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <label className="flex-1 w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-indigo-50/20 transition group">
            <FileSpreadsheet className="w-10 h-10 text-indigo-500 group-hover:scale-110 transition duration-200 mb-2 stroke-[1.5]" />
            <span className="font-semibold text-slate-700 text-sm">
              {archivo
                ? archivo.name
                : "Haz clic para seleccionar o arrastra tu archivo aquí"}
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Admite exportaciones directas del reloj (.csv, .xlsx, .xls o .txt)
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleSeleccionarArchivo}
              className="hidden"
            />
          </label>

          <div className="w-full md:w-56">
            <button
              onClick={handleImportar}
              disabled={!archivo || loading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#4b35e6] hover:bg-[#3f2bc9] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              Importar lista fichaje
            </button>
          </div>
        </div>

        {errorGlobal && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorGlobal}</span>
          </div>
        )}

        {resultadoSubida && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Resultado de la importación</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center pt-2">
              <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">
                  Total Filas Archivo
                </div>
                <div className="text-base font-black text-slate-800">
                  {resultadoSubida.totalFilas}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">
                  Guardadas con Éxito
                </div>
                <div className="text-base font-black text-emerald-800">
                  {resultadoSubida.procesadasOk}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-amber-700 font-bold uppercase">
                  Nulos / Omitidos
                </div>
                <div className="text-base font-black text-amber-800">
                  {resultadoSubida.registrosNulos}
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-700 font-bold uppercase">
                  Errores de Conversión
                </div>
                <div className="text-base font-black text-rose-800">
                  {resultadoSubida.errores}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. VISTAS CONDICIONALES */}
      {vistaActual === "asistente" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Asistente de Vinculación Biometría ↔ Empleados
                </h2>
                {pendientesCount > 0 ? (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendientesCount} pendientes de confirmar
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Todos vinculados
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Los registros pendientes y sugeridos se ubican al inicio.
                Escribe en el buscador para asociar o dar de alta al empleado y
                pulsa guardar.
              </p>
            </div>
            <button
              onClick={handleGuardarVinculaciones}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              Guardar Vinculaciones
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">ID en Lector</th>
                  <th className="py-3 px-4">Nombre en Lector</th>
                  <th className="py-3 px-4">Empleado en Sistema</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vinculacionesOrdenadas.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center py-8 text-slate-400 italic"
                    >
                      No se encontraron registros para vincular.
                    </td>
                  </tr>
                ) : (
                  vinculacionesOrdenadas.map((v) => (
                    <tr
                      key={v.sJobNo}
                      className={`transition ${
                        v.yaVinculado
                          ? "bg-slate-50/50 hover:bg-slate-50"
                          : "bg-white hover:bg-indigo-50/20"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {v.sJobNo}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {v.sName}
                      </td>
                      <td className="py-3 px-4">
                        <BuscadorEmpleadoSelect
                          empleados={empleados}
                          valorSeleccionado={v.sugeridoEmpleadoId}
                          onSeleccionar={(nuevoId) =>
                            handleCambiarEmpleadoAsignado(v.sJobNo, nuevoId)
                          }
                          disabled={v.yaVinculado}
                          sJobNo={v.sJobNo}
                          sName={v.sName}
                          onRegistrarNuevo={handleAbrirRegistroNuevo}
                        />
                      </td>
                      <td className="py-3 px-4">
                        {v.yaVinculado ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Ya Vinculado
                          </span>
                        ) : v.sugeridoEmpleadoId ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Sugerido
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : vistaActual === "marcaciones" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Padrón Completo de Marcaciones Almacenadas en BD
              </h2>
              <p className="text-xs text-slate-500">
                Total de {totalElementosFichajes} registros guardados en la base
                de datos.
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, ID o Serial..."
                value={busquedaFichaje}
                onChange={(e) => setBusquedaFichaje(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Serial</th>
                  <th className="py-3 px-4">ID Biométrico</th>
                  <th className="py-3 px-4">Nombre Reloj</th>
                  <th className="py-3 px-4">Colaborador Vinculado</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Tipo Evento</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargandoFichajes ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-10 text-slate-400"
                    >
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                      Cargando marcaciones desde el servidor...
                    </td>
                  </tr>
                ) : fichajesPaginados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-10 text-slate-400 italic"
                    >
                      No se encontraron registros de marcaciones.
                    </td>
                  </tr>
                ) : (
                  fichajesPaginados.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        {f.serialNo || "-"}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                        {f.idBiometrico}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {f.nombreReloj || "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        {f.empleado ? (
                          <span className="text-emerald-700 font-semibold">
                            {f.empleado.nombre} {f.empleado.apellido}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Sin vincular
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-mono font-medium">
                        {formatearFechaHora24(f.horaFichaje)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-indigo-600">
                        {f.tipoEvento}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {f.estadoFichaje}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Página{" "}
              <strong className="text-slate-800">{paginaFichajes + 1}</strong>{" "}
              de{" "}
              <strong className="text-slate-800">{totalPaginasFichajes}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaginaFichajes((p) => Math.max(0, p - 1))}
                disabled={paginaFichajes === 0 || cargandoFichajes}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPaginaFichajes((p) =>
                    Math.min(totalPaginasFichajes - 1, p + 1),
                  )
                }
                disabled={
                  paginaFichajes >= totalPaginasFichajes - 1 || cargandoFichajes
                }
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Historial de Importaciones
              </h2>
              <p className="text-xs text-slate-500">
                Auditoría de lotes procesados, ordenados de forma descendente
                por fecha de carga.
              </p>
            </div>
            <button
              onClick={cargarDatos}
              disabled={loading}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition disabled:opacity-50 cursor-pointer"
              title="Actualizar listado"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Archivo</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Procesadas</th>
                  <th className="py-3 px-4">Nulos/Omitidos</th>
                  <th className="py-3 px-4">Errores</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-8 text-slate-400 italic"
                    >
                      {loading
                        ? "Cargando historial..."
                        : "No se registran importaciones previas en el sistema."}
                    </td>
                  </tr>
                ) : (
                  historial.map((h) => (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50/60 transition group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatearFechaHora24(h.fechaImportacion)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{h.nombreArchivo}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {h.totalFilas}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                          {h.procesadasOk}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">
                          {h.registrosNulos || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${
                            h.errores > 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "text-slate-400"
                          }`}
                        >
                          {h.errores}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {h.usuarioResponsable || "Sistema"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleAbrirModalLote(h)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Ver filas y detalle de esta importación"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleEliminarHistorial(h.id, h.nombreArchivo)
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Dar de baja este registro de importación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DEL LOTE (OJITO) */}
      {modalArchivo.isOpen && modalArchivo.item && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Detalle del Lote: {modalArchivo.item.nombreArchivo}</span>
              </div>
              <button
                onClick={() => setModalArchivo({ isOpen: false, item: null })}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Fecha de Carga
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatearFechaHora24(modalArchivo.item.fechaImportacion)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Total Marcaciones
                  </span>
                  <span className="font-bold text-indigo-700 text-sm">
                    {modalArchivo.item.totalFilas}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Guardadas Válidas
                  </span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {modalArchivo.item.procesadasOk}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Nulos Omitidos
                  </span>
                  <span className="font-bold text-amber-600 text-sm">
                    {modalArchivo.item.registrosNulos || 0}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
                <div>
                  <h4 className="font-bold text-slate-800">
                    Marcaciones Importadas:
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500">
                      Mostrando{" "}
                      <span className="font-extrabold text-indigo-700">
                        {fichajesLote.length}
                      </span>{" "}
                      de {modalArchivo.item.procesadasOk} marcaciones del lote
                    </span>
                    {(filtroModalNombre || filtroModalFecha) && (
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
                        Filtrado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={filtroModalFecha}
                    onChange={(e) => setFiltroModalFecha(e.target.value)}
                    className="pl-3 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white text-slate-700 font-medium"
                    title="Filtrar por fecha"
                  />

                  <div className="relative w-48 sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={filtroModalNombre}
                      onChange={(e) => setFiltroModalNombre(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white text-slate-800"
                    />
                  </div>

                  {(filtroModalNombre || filtroModalFecha) && (
                    <button
                      onClick={() => {
                        setFiltroModalNombre("");
                        setFiltroModalFecha("");
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-semibold transition cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase sticky top-0 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Serial</th>
                      <th className="py-2.5 px-3">ID Biométrico</th>
                      <th className="py-2.5 px-3">Nombre Reloj</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cargandoModalFichajes ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-8 text-slate-400"
                        >
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-1" />
                          Consultando marcaciones del lote...
                        </td>
                      </tr>
                    ) : fichajesLote.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-8 text-slate-400 italic"
                        >
                          No se encontraron marcaciones para este lote con los
                          filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      fichajesLote.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 font-mono text-slate-500">
                            {f.serialNo || "-"}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-600">
                            {f.idBiometrico}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {f.nombreReloj || "-"}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-mono font-medium">
                            {formatearFechaHora24(f.horaFichaje)}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-indigo-600">
                            {f.tipoEvento}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setModalArchivo({ isOpen: false, item: null });
                    setVistaActual("marcaciones");
                  }}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Abrir vista completa general &rarr;
                </button>
                <button
                  onClick={() => setModalArchivo({ isOpen: false, item: null })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium cursor-pointer transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REUTILIZADO DE REGISTRO DE EMPLEADOS */}
      <ModalRegistroEmpleado
        isOpen={modalRegistro}
        onClose={() => setModalRegistro(false)}
        onSubmit={handleGuardarNuevoEmpleado}
        formEmpleado={formEmpleado}
        setFormEmpleado={setFormEmpleado}
        editandoEmpleadoId={null}
        categoriasActivas={categoriasActivas}
        cargosFiltradosForm={cargosActivos}
      />

      {/* MODAL ALERTA */}
      <ModalAlerta
        isOpen={modalAlerta.isOpen}
        tipo={modalAlerta.tipo}
        titulo={modalAlerta.titulo}
        mensaje={modalAlerta.mensaje}
        textoConfirmar={modalAlerta.textoConfirmar}
        textoCancelar={modalAlerta.textoCancelar}
        mostrarCancelar={modalAlerta.mostrarCancelar}
        onConfirmar={modalAlerta.onConfirmar}
        onCancelar={() =>
          setModalAlerta((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
