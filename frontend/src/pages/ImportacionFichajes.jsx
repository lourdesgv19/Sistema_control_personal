import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
  Lock,
  RotateCcw,
  Clock,
  CalendarDays,
  Radio,
} from "lucide-react";
import {
  getHistorialImportaciones,
  getSinVincularCount,
  getPendientesVinculacion,
  getFichajesPorImportacion,
  uploadArchivoFichajes,
  deleteHistorialImportacion,
  reactivarHistorialImportacion,
  previsualizarVinculaciones,
  guardarVinculaciones,
} from "../services/importacionService";
import { getEmpleados, createEmpleado } from "../services/empleadoService";
import { getCategorias, getCargos } from "../services/configuracionService";
import apiClient from "../services/api";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalRegistroEmpleado from "../components/personal/ModalRegistroEmpleado";
import { useAuth } from "../context/AuthContext";

// Obtener fecha hoy en formato YYYY-MM-DD
const getHoyIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
};

// Formato 24 horas estricto (DD/MM/AAAA, HH:mm:ss)
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

// Formateador con nombre de día y fecha legible
const formatearDiaYFecha = (fechaIso) => {
  if (!fechaIso)
    return { diaCapitalizado: "-", fechaCorta: "-", textoCompleto: "-" };
  const d = new Date(fechaIso);
  if (isNaN(d.getTime()))
    return {
      diaCapitalizado: "-",
      fechaCorta: fechaIso,
      textoCompleto: fechaIso,
    };

  const diaNombre = d.toLocaleDateString("es-AR", { weekday: "long" });
  const diaCapitalizado =
    diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);
  const fechaCorta = d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    diaCapitalizado,
    fechaCorta,
    textoCompleto: `${diaCapitalizado}, ${fechaCorta}`,
  };
};

const esRegistroActivo = (activo) => {
  return activo === true || activo === 1 || activo === "1";
};

const StatusBadge = ({ activo }) => {
  const isActivo = esRegistroActivo(activo);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
        isActivo
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActivo ? "bg-emerald-500" : "bg-rose-500"
        }`}
      ></span>
      {isActivo ? "Activo" : "Eliminado"}
    </span>
  );
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
  puedeCrearEmpleado = false,
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
    <div className="relative w-full sm:w-72" ref={dropdownRef}>
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
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95 left-0">
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
                {onRegistrarNuevo && puedeCrearEmpleado && (
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

                {onRegistrarNuevo && puedeCrearEmpleado && (
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
  const { tienePermiso } = useAuth();

  const puedeImportar = tienePermiso("FICHAJES_IMPORTAR");
  const puedeVincular = tienePermiso("FICHAJES_VINCULAR");
  const puedeEliminarLote = tienePermiso("FICHAJES_ELIMINAR_LOTE");
  const puedeCrearEmpleado = tienePermiso("PERSONAL_CREAR");

  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [conteoSinVincular, setConteoSinVincular] = useState(0);

  // Vistas: 'hoy' (Padrón Diario por Defecto) | 'historial' | 'asistente'
  const [vistaActual, setVistaActual] = useState("hoy");

  // Filtros de fecha en vista Historial
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState("ACTIVOS");
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState("");

  // Catálogos auxiliares
  const [categoriasActivas, setCategoriasActivas] = useState([]);
  const [cargosActivos, setCargosActivos] = useState([]);

  // Padrón del Día ("Hoy")
  const [fechaConsultaHoy, setFechaConsultaHoy] = useState(getHoyIso());
  const [fichajesHoy, setFichajesHoy] = useState([]);
  const [busquedaHoy, setBusquedaHoy] = useState("");
  const [cargandoHoy, setCargandoHoy] = useState(false);

  // Subida de archivos
  const [archivo, setArchivo] = useState(null);
  const [resultadoSubida, setResultadoSubida] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState("");

  // Modal Detalle de Lote (Ojito)
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

  // Modal Registro Empleado
  const [modalRegistro, setModalRegistro] = useState(false);
  const [formEmpleado, setFormEmpleado] = useState(ESTADO_INICIAL_EMPLEADO);

  // Modal Alerta
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

  // Cargar datos base
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setErrorGlobal("");
    try {
      const [histRes, empRes, sinVincularRes, catRes, cargoRes] =
        await Promise.allSettled([
          getHistorialImportaciones(),
          getEmpleados(),
          getSinVincularCount(),
          getCategorias(),
          getCargos(),
        ]);

      setHistorial(
        histRes.status === "fulfilled" && Array.isArray(histRes.value)
          ? histRes.value
          : [],
      );
      setEmpleados(
        empRes.status === "fulfilled" && Array.isArray(empRes.value)
          ? empRes.value
          : [],
      );
      setConteoSinVincular(
        sinVincularRes.status === "fulfilled" &&
          typeof sinVincularRes.value === "number"
          ? sinVincularRes.value
          : 0,
      );
      setCategoriasActivas(
        catRes.status === "fulfilled" && Array.isArray(catRes.value)
          ? catRes.value
          : [],
      );
      setCargosActivos(
        cargoRes.status === "fulfilled" && Array.isArray(cargoRes.value)
          ? cargoRes.value
          : [],
      );
    } catch (err) {
      console.error("Error cargando datos:", err);
      setErrorGlobal("Error al sincronizar datos con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar fichajes del día puntual
  const cargarMarcacionesDia = useCallback(async (fecha, q = "") => {
    setCargandoHoy(true);
    try {
      const res = await apiClient.get("/dispositivo/fichajes/dia", {
        params: { fecha, q },
      });
      setFichajesHoy(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error cargando fichajes del día:", err);
      setFichajesHoy([]);
    } finally {
      setCargandoHoy(false);
    }
  }, []);

  // Consultar fichajes por lote (modal)
  const consultarFichajesDelLote = useCallback(async (id, nombre, fecha) => {
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
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (vistaActual === "hoy") {
      const timer = setTimeout(() => {
        cargarMarcacionesDia(fechaConsultaHoy, busquedaHoy);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [vistaActual, fechaConsultaHoy, busquedaHoy, cargarMarcacionesDia]);

  // Actualización en tiempo real con debounce
  useEffect(() => {
    let timerActualizacion = null;
    const ejecutarActualizacionSilenciosa = () => {
      if (timerActualizacion) clearTimeout(timerActualizacion);
      timerActualizacion = setTimeout(() => {
        cargarDatos();
        if (vistaActual === "hoy") {
          cargarMarcacionesDia(fechaConsultaHoy, busquedaHoy);
        } else if (vistaActual === "asistente" && !archivo) {
          getPendientesVinculacion().then((datos) =>
            setVinculaciones(Array.isArray(datos) ? datos : []),
          );
        }
        if (modalArchivo.isOpen && modalArchivo.item) {
          consultarFichajesDelLote(
            modalArchivo.item.id,
            filtroModalNombre,
            filtroModalFecha,
          );
        }
      }, 200);
    };

    window.addEventListener(
      "datos:actualizados",
      ejecutarActualizacionSilenciosa,
    );
    window.addEventListener(
      "conexion:restaurada",
      ejecutarActualizacionSilenciosa,
    );

    return () => {
      if (timerActualizacion) clearTimeout(timerActualizacion);
      window.removeEventListener(
        "datos:actualizados",
        ejecutarActualizacionSilenciosa,
      );
      window.removeEventListener(
        "conexion:restaurada",
        ejecutarActualizacionSilenciosa,
      );
    };
  }, [
    cargarDatos,
    cargarMarcacionesDia,
    consultarFichajesDelLote,
    vistaActual,
    fechaConsultaHoy,
    busquedaHoy,
    archivo,
    modalArchivo.isOpen,
    modalArchivo.item,
    filtroModalNombre,
    filtroModalFecha,
  ]);

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
  }, [
    modalArchivo.isOpen,
    modalArchivo.item,
    filtroModalNombre,
    filtroModalFecha,
    consultarFichajesDelLote,
  ]);

  const handleAbrirModalLote = (item) => {
    setFiltroModalNombre("");
    setFiltroModalFecha("");
    setModalArchivo({ isOpen: true, item });
    consultarFichajesDelLote(item.id, "", "");
  };

  const moverDia = (delta) => {
    const partes = fechaConsultaHoy.split("-");
    const d = new Date(
      parseInt(partes[0], 10),
      parseInt(partes[1], 10) - 1,
      parseInt(partes[2], 10),
    );
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    setFechaConsultaHoy(`${y}-${m}-${dia}`);
  };

  const handleSeleccionarArchivo = (e) => {
    if (!puedeImportar) return;
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
      setResultadoSubida(null);
      setErrorGlobal("");
    }
  };

  const handleImportar = async () => {
    if (!puedeImportar || !archivo) return;
    setLoading(true);
    setErrorGlobal("");
    try {
      const res = await uploadArchivoFichajes(archivo);
      setResultadoSubida(res);
      const archivoSubido = archivo;
      setArchivo(null);

      if (puedeVincular) {
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
      }

      mostrarAviso(
        "success",
        "Importación Exitosa",
        `Se procesaron ${res.procesadasOk} marcaciones correctamente.`,
      );
    } catch (err) {
      const msg =
        err.response?.data?.mensajesErrores?.[0] ||
        err.response?.data?.message ||
        "Error al procesar el archivo en el servidor.";
      setErrorGlobal(msg);
      mostrarAviso("danger", "Error de Procesamiento", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarHistorial = (id, nombre) => {
    if (!puedeEliminarLote) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja importación?",
      mensaje: `¿Desea dar de baja lógica el lote "${nombre}" y desestimar temporalmente sus marcaciones asociadas?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteHistorialImportacion(id);
          mostrarAviso(
            "success",
            "Baja Confirmada",
            `El lote "${nombre}" fue dado de baja correctamente.`,
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            err.response?.data?.message ||
              "No se pudo dar de baja el registro.",
          );
        }
      },
    });
  };

  const handleReactivarHistorial = (id, nombre) => {
    if (!puedeEliminarLote) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar importación?",
      mensaje: `¿Desea reactivar la importación de "${nombre}" y restablecer sus marcaciones asociadas en los cómputos?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarHistorialImportacion(id);
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            `El lote "${nombre}" y sus marcaciones han sido reactivados.`,
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            err.response?.data?.message || "No se pudo reactivar el registro.",
          );
        }
      },
    });
  };

  const handleAbrirAsistenteDesdeCabecera = async () => {
    if (!puedeVincular) return;
    if (vistaActual === "asistente") {
      setVistaActual("hoy");
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
    if (!puedeVincular) return;
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

  const handleAbrirRegistroNuevo = ({ sJobNo, sName }) => {
    if (!puedeCrearEmpleado) return;
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
        `Se dio de alta a ${nuevo.nombre} ${nuevo.apellido} y se asignó automáticamente.`,
      );
    } catch (err) {
      const msg =
        err.response?.data?.message || "No se pudo registrar el empleado.";
      mostrarAviso("danger", "Error de Registro", msg);
    }
  };

  const handleGuardarVinculaciones = async () => {
    if (!puedeVincular) return;
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
        "Los IDs biométricos fueron asignados correctamente.",
      );
      cargarDatos();
      setVistaActual("hoy");
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        err.response?.data?.message ||
          "Ocurrió un error al guardar vinculaciones.",
      );
    }
  };

  // Historial filtrado
  const historialFiltrado = useMemo(() => {
    return historial.filter((h) => {
      const activo = esRegistroActivo(h.activo);
      const coincideEstado =
        filtroEstadoHistorial === "TODOS" ||
        (filtroEstadoHistorial === "ACTIVOS" && activo) ||
        (filtroEstadoHistorial === "INACTIVOS" && !activo);

      const fStr = h.fechaImportacion ? h.fechaImportacion.split("T")[0] : "";
      const coincideFecha =
        !filtroFechaHistorial || fStr === filtroFechaHistorial;

      return coincideEstado && coincideFecha;
    });
  }, [historial, filtroEstadoHistorial, filtroFechaHistorial]);

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

  const hoyInfo = useMemo(() => {
    return formatearDiaYFecha(fechaConsultaHoy + "T12:00:00");
  }, [fechaConsultaHoy]);

  // Cálculo del último fichaje registrado (en las marcaciones de la jornada o en el historial)
  const ultimoFichaje = useMemo(() => {
    if (fichajesHoy && fichajesHoy.length > 0) {
      const ordenados = [...fichajesHoy].sort(
        (a, b) => new Date(b.horaFichaje) - new Date(a.horaFichaje),
      );
      return ordenados[0];
    }
    if (historial && historial.length > 0) {
      const ordenadosHistorial = [...historial].sort(
        (a, b) => new Date(b.fechaImportacion) - new Date(a.fechaImportacion),
      );
      return {
        horaFichaje: ordenadosHistorial[0].fechaImportacion,
        nombreReloj: ordenadosHistorial[0].nombreArchivo,
        empleado: null,
      };
    }
    return null;
  }, [fichajesHoy, historial]);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* 0. BARRA SUPERIOR: ÚLTIMO FICHAJE REGISTRADO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:px-5 sm:py-3 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-white animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Último Fichaje Registrado
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                En línea
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-white mt-0.5">
              {ultimoFichaje?.horaFichaje
                ? formatearFechaHora24(ultimoFichaje.horaFichaje)
                : "Sin registros recientes"}
            </div>
          </div>
        </div>

        {ultimoFichaje && (
          <div className="text-left sm:text-right border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-800 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Colaborador / Terminal
            </span>
            <div className="text-xs font-semibold text-slate-200 flex items-center sm:justify-end gap-1.5 mt-0.5 truncate max-w-xs sm:max-w-md">
              {ultimoFichaje.empleado ? (
                <span className="text-emerald-400 font-bold truncate">
                  {ultimoFichaje.empleado.nombre}{" "}
                  {ultimoFichaje.empleado.apellido}
                </span>
              ) : (
                <span className="text-slate-300 font-medium truncate">
                  {ultimoFichaje.nombreReloj ||
                    `ID: ${ultimoFichaje.idBiometrico || "-"}`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1. HEADER CON TOGGLE Y ACCESO A ASISTENTE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
            <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Control & Carga de Marcaciones Biométricas
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Padrón de fichadas en vivo por día, ingesta de lotes y auditoría
              histórica.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Botón para alternar vista Principal (Hoy) e Historial */}
          <button
            onClick={() =>
              setVistaActual(vistaActual === "hoy" ? "historial" : "hoy")
            }
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-xs ${
              vistaActual === "historial"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {vistaActual === "historial" ? (
              <>
                <Clock className="w-4 h-4 text-white shrink-0" />
                <span>Ver Padrón del Día (Hoy)</span>
              </>
            ) : (
              <>
                <List className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Ver Lista de Importaciones</span>
              </>
            )}
          </button>

          {/* Botón Empleados sin vincular */}
          {puedeVincular ? (
            (conteoSinVincular > 0 || vistaActual === "asistente") && (
              <button
                onClick={handleAbrirAsistenteDesdeCabecera}
                disabled={cargandoAsistente}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  vistaActual === "asistente"
                    ? "bg-slate-100 border-slate-300 text-slate-700 font-bold"
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
                <span>
                  {vistaActual === "asistente"
                    ? "Volver a Marcaciones"
                    : `Empleados sin vincular (${conteoSinVincular})`}
                </span>
              </button>
            )
          ) : (
            <span
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
              title="Requiere permiso FICHAJES_VINCULAR"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Vinculación Restringida</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. ZONA DE CARGA DE ARCHIVO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        {puedeImportar ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <label className="flex-1 w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-indigo-50/20 transition group text-center">
              <FileSpreadsheet className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 group-hover:scale-110 transition duration-200 mb-2 stroke-[1.5]" />
              <span className="font-semibold text-slate-700 text-xs sm:text-sm break-all">
                {archivo
                  ? archivo.name
                  : "Haz clic para seleccionar o arrastra tu archivo aquí"}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Admite exportaciones directas del reloj (.csv, .xlsx, .xls o
                .txt)
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
                className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 bg-[#4b35e6] hover:bg-[#3f2bc9] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>Importar Marcaciones</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/60 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">
              Carga e Ingesta de Archivos Restringida
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Su cuenta tiene acceso de solo lectura (FICHAJES_VER). Se requiere
              el permiso <strong>FICHAJES_IMPORTAR</strong> para subir lotes.
            </span>
          </div>
        )}

        {errorGlobal && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorGlobal}</span>
          </div>
        )}

        {resultadoSubida && (
          <div className="mt-4 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Resultado de la importación</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-center pt-2">
              <div className="bg-white border border-slate-200 p-2 sm:p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">
                  Total Filas
                </div>
                <div className="text-sm sm:text-base font-black text-slate-800">
                  {resultadoSubida.totalFilas}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2 sm:p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">
                  Guardadas OK
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-800">
                  {resultadoSubida.procesadasOk}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2 sm:p-2.5 rounded-xl">
                <div className="text-[10px] text-amber-700 font-bold uppercase">
                  Nulos / Omitidos
                </div>
                <div className="text-sm sm:text-base font-black text-amber-800">
                  {resultadoSubida.registrosNulos}
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-2 sm:p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-700 font-bold uppercase">
                  Errores Conversión
                </div>
                <div className="text-sm sm:text-base font-black text-rose-800">
                  {resultadoSubida.errores}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. VISTAS CONDICIONALES */}
      {vistaActual === "asistente" ? (
        /* VISTA 1: ASISTENTE DE VINCULACIÓN */
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">
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
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Escribe en el buscador para asociar o dar de alta al empleado y
                pulsa guardar.
              </p>
            </div>
            {puedeVincular && (
              <button
                onClick={handleGuardarVinculaciones}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer text-center"
              >
                Guardar Vinculaciones
              </button>
            )}
          </div>

          {/* VISTA MÓVIL ASISTENTE (md:hidden) */}
          <div className="md:hidden divide-y divide-slate-100">
            {vinculacionesOrdenadas.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No se encontraron registros para vincular.
              </div>
            ) : (
              vinculacionesOrdenadas.map((v) => (
                <div
                  key={v.sJobNo}
                  className={`p-4 space-y-2.5 transition rounded-xl my-1 border ${
                    v.yaVinculado
                      ? "bg-slate-50/50 border-slate-200/60"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Lector Biométrico
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-indigo-700 text-xs">
                          ID: {v.sJobNo}
                        </span>
                        <span className="text-slate-700 font-medium text-xs">
                          • {v.sName}
                        </span>
                      </div>
                    </div>

                    <div>
                      {v.yaVinculado ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Ya Vinculado
                        </span>
                      ) : v.sugeridoEmpleadoId ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Sugerido
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Asignar a Empleado
                    </span>
                    <BuscadorEmpleadoSelect
                      empleados={empleados}
                      valorSeleccionado={v.sugeridoEmpleadoId}
                      onSeleccionar={(nuevoId) =>
                        handleCambiarEmpleadoAsignado(v.sJobNo, nuevoId)
                      }
                      disabled={v.yaVinculado || !puedeVincular}
                      sJobNo={v.sJobNo}
                      sName={v.sName}
                      onRegistrarNuevo={handleAbrirRegistroNuevo}
                      puedeCrearEmpleado={puedeCrearEmpleado}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO ASISTENTE (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
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
                          disabled={v.yaVinculado || !puedeVincular}
                          sJobNo={v.sJobNo}
                          sName={v.sName}
                          onRegistrarNuevo={handleAbrirRegistroNuevo}
                          puedeCrearEmpleado={puedeCrearEmpleado}
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
      ) : vistaActual === "hoy" ? (
        /* VISTA 2 (PRINCIPAL): PADRÓN DEL DÍA CON DATOS DE TABLA DE FICHAJES */
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Padrón de Marcaciones:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                  {hoyInfo.textoCompleto}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Total de {fichajesHoy.length} marcaciones registradas para esta
                jornada.
              </p>
            </div>

            {/* Navegación de día y buscador */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => moverDia(-1)}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                  title="Día anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={fechaConsultaHoy}
                  onChange={(e) => setFechaConsultaHoy(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 font-semibold px-2 outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => moverDia(1)}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                  title="Día siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {fechaConsultaHoy !== getHoyIso() && (
                <button
                  type="button"
                  onClick={() => setFechaConsultaHoy(getHoyIso())}
                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer text-center"
                >
                  Ir a Hoy
                </button>
              )}

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar colaborador o ID..."
                  value={busquedaHoy}
                  onChange={(e) => setBusquedaHoy(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* VISTA MÓVIL DEL PADRÓN DEL DÍA (md:hidden) */}
          <div className="md:hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {cargandoHoy ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                Cargando marcaciones de la jornada...
              </div>
            ) : fichajesHoy.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                No se registran fichajes para el {hoyInfo.textoCompleto}.
              </div>
            ) : (
              fichajesHoy.map((f) => (
                <div key={f.id} className="p-3.5 space-y-2 bg-white text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-600">
                      ID: {f.idBiometrico}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {f.estadoFichaje}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-800 text-xs">
                      {f.empleado ? (
                        <span className="text-emerald-700 font-semibold">
                          {f.empleado.nombre} {f.empleado.apellido}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">
                          Sin vincular
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Reloj: {f.nombreReloj || "-"} (Serial: {f.serialNo || "-"}
                      )
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-700 font-mono font-bold">
                      Hora:{" "}
                      {formatearFechaHora24(f.horaFichaje).split(",")[1] || "-"}
                    </span>
                    <span className="font-mono text-indigo-600 font-bold">
                      {f.tipoEvento}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO DEL PADRÓN DEL DÍA (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">ID Biométrico</th>
                  <th className="py-3 px-4">Colaborador Vinculado</th>
                  <th className="py-3 px-4">Nombre en Reloj</th>
                  <th className="py-3 px-4">Tipo Evento</th>
                  <th className="py-3 px-4">Serial</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargandoHoy ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400"
                    >
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                      Cargando marcaciones de la jornada...
                    </td>
                  </tr>
                ) : fichajesHoy.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400 italic"
                    >
                      No se registran fichajes para el {hoyInfo.textoCompleto}.
                    </td>
                  </tr>
                ) : (
                  fichajesHoy.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800 text-xs">
                        {formatearFechaHora24(f.horaFichaje).split(",")[1] ||
                          "-"}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                        {f.idBiometrico}
                      </td>
                      <td className="py-2.5 px-4">
                        {f.empleado ? (
                          <span className="text-slate-800 font-semibold">
                            {f.empleado.nombre} {f.empleado.apellido}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium italic">
                            Sin vincular
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {f.nombreReloj || "-"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-indigo-600 font-medium">
                        {f.tipoEvento}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">
                        {f.serialNo || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
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
        </div>
      ) : (
        /* VISTA 3: HISTORIAL DE IMPORTACIONES POR DÍA */
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Historial de Importaciones por Fecha
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Auditoría de lotes procesados organizados por fecha y día de
                semana.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Estado:</span>
                <select
                  value={filtroEstadoHistorial}
                  onChange={(e) => setFiltroEstadoHistorial(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-indigo-600 transition shadow-xs cursor-pointer"
                >
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="TODOS">Todos los lotes</option>
                  <option value="INACTIVOS">Solo Eliminados</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={filtroFechaHistorial}
                  onChange={(e) => setFiltroFechaHistorial(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
                />
                {filtroFechaHistorial && (
                  <button
                    type="button"
                    onClick={() => setFiltroFechaHistorial("")}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
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
          </div>

          {/* VISTA MÓVIL HISTORIAL (md:hidden) */}
          <div className="md:hidden divide-y divide-slate-100">
            {historialFiltrado.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                {loading
                  ? "Cargando historial..."
                  : "No se registran importaciones con el filtro seleccionado."}
              </div>
            ) : (
              historialFiltrado.map((h) => {
                const estaActivo = esRegistroActivo(h.activo);
                const diaInfo = formatearDiaYFecha(h.fechaImportacion);
                return (
                  <div
                    key={h.id}
                    className={`p-4 space-y-3 transition rounded-xl my-1 border ${
                      !estaActivo
                        ? "bg-slate-50/75 border-slate-200/60 opacity-80"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                        <FileText
                          className={`w-4 h-4 shrink-0 ${estaActivo ? "text-indigo-500" : "text-slate-400"}`}
                        />
                        <span
                          className={`break-all ${!estaActivo ? "line-through text-slate-500" : ""}`}
                        >
                          {h.nombreArchivo}
                        </span>
                      </div>
                      <StatusBadge activo={h.activo} />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-800">
                        {diaInfo.diaCapitalizado}
                      </span>
                      <span>•</span>
                      <span>{diaInfo.fechaCorta}</span>
                      <span className="text-slate-400">
                        (
                        {formatearFechaHora24(h.fechaImportacion)
                          .split(",")[1]
                          ?.trim() || "-"}
                        )
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">
                          Total
                        </span>
                        <span className="font-bold text-slate-800">
                          {h.totalFilas}
                        </span>
                      </div>
                      <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                        <span className="text-[9px] text-emerald-700 font-bold uppercase block">
                          Ok
                        </span>
                        <span className="font-bold text-emerald-800">
                          {h.procesadasOk}
                        </span>
                      </div>
                      <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                        <span className="text-[9px] text-amber-700 font-bold uppercase block">
                          Nulos
                        </span>
                        <span className="font-bold text-amber-800">
                          {h.registrosNulos || 0}
                        </span>
                      </div>
                      <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                        <span className="text-[9px] text-rose-700 font-bold uppercase block">
                          Errores
                        </span>
                        <span className="font-bold text-rose-800">
                          {h.errores}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400">
                        Por: {h.usuarioResponsable || "Sistema"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirModalLote(h)}
                          className="px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>

                        {puedeEliminarLote ? (
                          estaActivo ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleEliminarHistorial(h.id, h.nombreArchivo)
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Dar de baja este registro"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleReactivarHistorial(h.id, h.nombreArchivo)
                              }
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Reactivar importación"
                            >
                              <RotateCcw className="w-4 h-4 text-emerald-600" />
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* VISTA ESCRITORIO HISTORIAL (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Día de Semana y Fecha</th>
                  <th className="py-3 px-4">Hora Carga</th>
                  <th className="py-3 px-4">Archivo / Dispositivo</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center">Procesadas</th>
                  <th className="py-3 px-4 text-center">Nulos/Omitidos</th>
                  <th className="py-3 px-4 text-center">Errores</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historialFiltrado.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="text-center py-8 text-slate-400 italic"
                    >
                      {loading
                        ? "Cargando historial..."
                        : "No se registran importaciones con el filtro seleccionado."}
                    </td>
                  </tr>
                ) : (
                  historialFiltrado.map((h) => {
                    const estaActivo = esRegistroActivo(h.activo);
                    const diaInfo = formatearDiaYFecha(h.fechaImportacion);
                    return (
                      <tr
                        key={h.id}
                        className={`transition group ${!estaActivo ? "bg-slate-50/75 opacity-75" : "hover:bg-slate-50/60"}`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-800">
                              {diaInfo.diaCapitalizado}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-slate-600">
                              {diaInfo.fechaCorta}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {formatearFechaHora24(h.fechaImportacion)
                            .split(",")[1]
                            ?.trim() || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <FileText
                              className={`w-3.5 h-3.5 shrink-0 ${estaActivo ? "text-indigo-500" : "text-slate-400"}`}
                            />
                            <span
                              className={
                                !estaActivo ? "line-through text-slate-500" : ""
                              }
                            >
                              {h.nombreArchivo}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          {h.totalFilas}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                            {h.procesadasOk}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">
                            {h.registrosNulos || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md ${h.errores > 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "text-slate-400"}`}
                          >
                            {h.errores}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge activo={h.activo} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {h.usuarioResponsable || "Sistema"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleAbrirModalLote(h)}
                              className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Ver filas y detalle de esta importación"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {puedeEliminarLote ? (
                              estaActivo ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEliminarHistorial(
                                      h.id,
                                      h.nombreArchivo,
                                    )
                                  }
                                  className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Dar de baja este registro"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReactivarHistorial(
                                      h.id,
                                      h.nombreArchivo,
                                    )
                                  }
                                  className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                  title="Reactivar importación"
                                >
                                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                                </button>
                              )
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DEL LOTE (OJITO) */}
      {modalArchivo.isOpen && modalArchivo.item && (
        <div
          onClick={() => setModalArchivo({ isOpen: false, item: null })}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 cursor-default flex flex-col max-h-[92vh]"
          >
            <div className="bg-[#111827] px-4 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="truncate">
                  Detalle del Lote: {modalArchivo.item.nombreArchivo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalArchivo({ isOpen: false, item: null })}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Fecha Carga
                  </span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px] sm:text-xs">
                    {formatearFechaHora24(modalArchivo.item.fechaImportacion)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Total Marcaciones
                  </span>
                  <span className="font-bold text-indigo-700 text-xs sm:text-sm">
                    {modalArchivo.item.totalFilas}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Guardadas Válidas
                  </span>
                  <span className="font-bold text-emerald-600 text-xs sm:text-sm">
                    {modalArchivo.item.procesadasOk}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Nulos Omitidos
                  </span>
                  <span className="font-bold text-amber-600 text-xs sm:text-sm">
                    {modalArchivo.item.registrosNulos || 0}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
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
                      de {modalArchivo.item.procesadasOk} marcaciones
                    </span>
                    {(filtroModalNombre || filtroModalFecha) && (
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
                        Filtrado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="date"
                    value={filtroModalFecha}
                    onChange={(e) => setFiltroModalFecha(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white text-slate-700 font-medium"
                    title="Filtrar por fecha"
                  />

                  <div className="relative flex-1 sm:w-56">
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
                      type="button"
                      onClick={() => {
                        setFiltroModalNombre("");
                        setFiltroModalFecha("");
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-semibold transition cursor-pointer text-center"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* LISTADO MODAL MÓVIL (sm:hidden) */}
              <div className="sm:hidden divide-y divide-slate-100 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-white">
                {cargandoModalFichajes ? (
                  <div className="text-center py-8 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-1" />
                    Consultando marcaciones del lote...
                  </div>
                ) : fichajesLote.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic">
                    No se encontraron marcaciones para este lote con los filtros
                    aplicados.
                  </div>
                ) : (
                  fichajesLote.map((f) => (
                    <div key={f.id} className="py-2.5 px-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-600">
                          ID: {f.idBiometrico}
                        </span>
                        <span className="font-mono text-indigo-600 font-bold text-[10px]">
                          {f.tipoEvento}
                        </span>
                      </div>
                      <div className="text-slate-800 font-medium truncate">
                        {f.nombreReloj || "Reloj sin nombre"} (Serial:{" "}
                        {f.serialNo || "-"})
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {formatearFechaHora24(f.horaFichaje)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* TABLA MODAL ESCRITORIO (hidden sm:block) */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
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

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalArchivo({ isOpen: false, item: null })}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium cursor-pointer transition text-center"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO EMPLEADO */}
      <ModalRegistroEmpleado
        isOpen={modalRegistro}
        onClose={() => setModalRegistro(false)}
        onSubmit={handleGuardarNuevoEmpleado}
        formEmpleado={formEmpleado}
        setFormEmpleado={setFormEmpleado}
        editandoEmpleadoId={null}
        categoriasActivas={categoriasActivas}
        cargosFiltradosForm={cargosActivos}
        empleadosExistentes={empleados}
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
