import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Loader2,
  List,
  UserX,
  Lock,
  Clock,
  Radio,
  Layers,
} from "lucide-react";
import {
  getUltimoRegistroResumen,
  getFichajesDelDiaPaginado,
  getHistorialImportacionesPaginado,
  getSinVincularCount,
  getPendientesVinculacion,
  getFichajesPorImportacion,
  uploadArchivoFichajes,
  deleteHistorialImportacion,
  reactivarHistorialImportacion,
  previsualizarVinculaciones,
  guardarVinculaciones,
} from "../services/importacionService";
import {
  getEmpleadosPaginados,
  createEmpleado,
} from "../services/empleadoService";
import { getCategorias, getCargos } from "../services/configuracionService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalRegistroEmpleado from "../components/personal/ModalRegistroEmpleado";
import VistaPadronHoy from "../components/importacion/VistaPadronHoy";
import VistaHistorialImportaciones from "../components/importacion/VistaHistorialImportaciones";
import VistaAsistenteVinculacion from "../components/importacion/VistaAsistenteVinculacion";
import ModalDetalleLote from "../components/importacion/ModalDetalleLote";
import { useAuth } from "../context/AuthContext";
import {
  obtenerNombreDia,
  formatearFechaVisual,
  formatearHora24,
} from "../utils/fechasFichaUtils";

const ITEMS_POR_PAGINA = 15;

const getHoyIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
};

const formatearFechaHoraCompleta = (fechaIso) => {
  if (!fechaIso) return "-";
  return `${formatearFechaVisual(fechaIso)}, ${formatearHora24(fechaIso)}`;
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

export default function ImportacionFichajes() {
  const { tienePermiso } = useAuth();

  const puedeImportar = tienePermiso("FICHAJES_IMPORTAR");
  const puedeVincular = tienePermiso("FICHAJES_VINCULAR");
  const puedeEliminarLote = tienePermiso("FICHAJES_ELIMINAR_LOTE");
  const puedeCrearEmpleado = tienePermiso("PERSONAL_CREAR");

  const [loading, setLoading] = useState(false);
  const [resumenCabecera, setResumenCabecera] = useState({
    ultimoFichaje: null,
    ultimaImportacion: null,
  });

  const [empleados, setEmpleados] = useState([]);
  const [conteoSinVincular, setConteoSinVincular] = useState(0);

  // Vistas: 'hoy' | 'historial' | 'asistente'
  const [vistaActual, setVistaActual] = useState("hoy");

  // Padrón del Día
  const [fechaConsultaHoy, setFechaConsultaHoy] = useState(getHoyIso());
  const [fichajesHoy, setFichajesHoy] = useState([]);
  const [busquedaHoy, setBusquedaHoy] = useState("");
  const [cargandoHoy, setCargandoHoy] = useState(false);
  const [paginaHoy, setPaginaHoy] = useState(1);
  const [totalElementosHoy, setTotalElementosHoy] = useState(0);
  const [totalPaginasHoy, setTotalPaginasHoy] = useState(1);

  // Historial de Lotes
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState("ACTIVOS");
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState("");
  const [historial, setHistorial] = useState([]);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [totalElementosHistorial, setTotalElementosHistorial] = useState(0);
  const [totalPaginasHistorial, setTotalPaginasHistorial] = useState(1);

  // Catálogos
  const [categoriasActivas, setCategoriasActivas] = useState([]);
  const [cargosActivos, setCargosActivos] = useState([]);

  // Subida de archivos
  const [archivo, setArchivo] = useState(null);
  const [resultadoSubida, setResultadoSubida] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState("");

  // Modal Detalle Lote
  const [modalArchivo, setModalArchivo] = useState({
    isOpen: false,
    item: null,
  });
  const [filtroModalNombre, setFiltroModalNombre] = useState("");
  const [filtroModalFecha, setFiltroModalFecha] = useState("");
  const [fichajesLote, setFichajesLote] = useState([]);
  const [cargandoModalFichajes, setCargandoModalFichajes] = useState(false);

  // Asistente
  const [vinculaciones, setVinculaciones] = useState([]);
  const [cargandoAsistente, setCargandoAsistente] = useState(false);

  // Modales
  const [modalRegistro, setModalRegistro] = useState(false);
  const [formEmpleado, setFormEmpleado] = useState(ESTADO_INICIAL_EMPLEADO);
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

  const cargarResumenCabecera = useCallback(async () => {
    try {
      const data = await getUltimoRegistroResumen();
      if (data) {
        setResumenCabecera({
          ultimoFichaje: data.ultimoFichaje || null,
          ultimaImportacion: data.ultimaImportacion || null,
        });
      }
    } catch (err) {
      console.error("Error al cargar resumen superior:", err);
    }
  }, []);

  const cargarCatalogos = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, sinVincRes, catRes, cargoRes] = await Promise.allSettled([
        getEmpleadosPaginados({ page: 0, size: 1000 }),
        getSinVincularCount(),
        getCategorias(),
        getCargos(),
      ]);

      setEmpleados(
        empRes.status === "fulfilled" && Array.isArray(empRes.value)
          ? empRes.value
          : [],
      );
      setConteoSinVincular(
        sinVincRes.status === "fulfilled" &&
          typeof sinVincRes.value === "number"
          ? sinVincRes.value
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
      console.error("Error al sincronizar datos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarMarcacionesDiaServidor = useCallback(
    async (fecha, q = "", page = 1) => {
      setCargandoHoy(true);
      try {
        const pageIndex = Math.max(0, page - 1);
        const res = await getFichajesDelDiaPaginado(
          fecha,
          q,
          pageIndex,
          ITEMS_POR_PAGINA,
        );

        const lista = res?.content || (Array.isArray(res) ? res : []);
        const totalElem =
          res?.page?.totalElements ?? res?.totalElements ?? lista.length;
        const totalPags = res?.page?.totalPages ?? res?.totalPages ?? 1;

        setFichajesHoy(lista);
        setTotalElementosHoy(Number(totalElem) || 0);
        setTotalPaginasHoy(Math.max(1, Number(totalPags) || 1));
        setPaginaHoy(page);
      } catch (err) {
        console.error("Error al consultar padrón del día:", err);
        setFichajesHoy([]);
        setTotalElementosHoy(0);
        setTotalPaginasHoy(1);
      } finally {
        setCargandoHoy(false);
      }
    },
    [],
  );

  const cargarHistorialServidor = useCallback(
    async (estado = "ACTIVOS", fecha = "", page = 1) => {
      setLoading(true);
      try {
        const pageIndex = Math.max(0, page - 1);
        const res = await getHistorialImportacionesPaginado(
          estado,
          fecha,
          pageIndex,
          ITEMS_POR_PAGINA,
        );

        const lista = res?.content || (Array.isArray(res) ? res : []);
        const totalElem =
          res?.page?.totalElements ?? res?.totalElements ?? lista.length;
        const totalPags = res?.page?.totalPages ?? res?.totalPages ?? 1;

        setHistorial(lista);
        setTotalElementosHistorial(Number(totalElem) || 0);
        setTotalPaginasHistorial(Math.max(1, Number(totalPags) || 1));
        setPaginaHistorial(page);
      } catch (err) {
        console.error("Error al consultar historial:", err);
        setHistorial([]);
        setTotalElementosHistorial(0);
        setTotalPaginasHistorial(1);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
    cargarResumenCabecera();
    cargarCatalogos();
  }, [cargarResumenCabecera, cargarCatalogos]);

  useEffect(() => {
    if (vistaActual === "hoy") {
      const timer = setTimeout(() => {
        cargarMarcacionesDiaServidor(fechaConsultaHoy, busquedaHoy, 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    vistaActual,
    fechaConsultaHoy,
    busquedaHoy,
    cargarMarcacionesDiaServidor,
  ]);

  useEffect(() => {
    if (vistaActual === "historial") {
      cargarHistorialServidor(filtroEstadoHistorial, filtroFechaHistorial, 1);
    }
  }, [
    vistaActual,
    filtroEstadoHistorial,
    filtroFechaHistorial,
    cargarHistorialServidor,
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

  // Listener en tiempo real SSE
  useEffect(() => {
    let timerActualizacion = null;
    const ejecutarActualizacionSilenciosa = () => {
      if (timerActualizacion) clearTimeout(timerActualizacion);
      timerActualizacion = setTimeout(() => {
        cargarResumenCabecera();
        cargarCatalogos();
        if (vistaActual === "hoy") {
          cargarMarcacionesDiaServidor(
            fechaConsultaHoy,
            busquedaHoy,
            paginaHoy,
          );
        } else if (vistaActual === "historial") {
          cargarHistorialServidor(
            filtroEstadoHistorial,
            filtroFechaHistorial,
            paginaHistorial,
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
    cargarResumenCabecera,
    cargarCatalogos,
    cargarMarcacionesDiaServidor,
    cargarHistorialServidor,
    vistaActual,
    fechaConsultaHoy,
    busquedaHoy,
    paginaHoy,
    filtroEstadoHistorial,
    filtroFechaHistorial,
    paginaHistorial,
  ]);

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

  const handleImportar = async () => {
    if (!puedeImportar || !archivo) return;
    setLoading(true);
    setErrorGlobal("");
    try {
      const res = await uploadArchivoFichajes(archivo);
      setResultadoSubida(res);
      const archivoSubido = archivo;
      setArchivo(null);

      await cargarResumenCabecera();
      if (vistaActual === "hoy") {
        cargarMarcacionesDiaServidor(fechaConsultaHoy, busquedaHoy, 1);
      } else {
        cargarHistorialServidor(filtroEstadoHistorial, filtroFechaHistorial, 1);
      }

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
          cargarResumenCabecera();
          cargarHistorialServidor(
            filtroEstadoHistorial,
            filtroFechaHistorial,
            paginaHistorial,
          );
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
      mensaje: `¿Desea reactivar la importación de "${nombre}" y restablecer sus marcaciones asociadas?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarHistorialImportacion(id);
          cargarResumenCabecera();
          cargarHistorialServidor(
            filtroEstadoHistorial,
            filtroFechaHistorial,
            paginaHistorial,
          );
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
    setFormEmpleado({
      ...ESTADO_INICIAL_EMPLEADO,
      nombre: partes[0] || "",
      apellido: partes.slice(1).join(" ") || "",
      idBiometrico: String(sJobNo || ""),
      nroLegajo: sJobNo ? `LEG-${String(sJobNo).padStart(3, "0")}` : "",
    });
    setModalRegistro(true);
  };

  const handleGuardarNuevoEmpleado = async (e) => {
    e.preventDefault();
    try {
      const nuevo = await createEmpleado(formEmpleado);
      cargarCatalogos();
      handleCambiarEmpleadoAsignado(formEmpleado.idBiometrico, nuevo.id);
      setModalRegistro(false);
      setFormEmpleado(ESTADO_INICIAL_EMPLEADO);
      mostrarAviso(
        "success",
        "Empleado Registrado",
        `Se dio de alta a ${nuevo.nombre} ${nuevo.apellido}.`,
      );
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error de Registro",
        err.response?.data?.message || "No se pudo registrar.",
      );
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
          "No hay vinculaciones seleccionadas.",
        );
        return;
      }

      await guardarVinculaciones(payload);
      mostrarAviso(
        "success",
        "Vinculaciones Guardadas",
        "Asignaciones procesadas.",
      );
      cargarCatalogos();
      setVistaActual("hoy");
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        err.response?.data?.message || "Error al guardar vinculaciones.",
      );
    }
  };

  const hoyInfo = useMemo(() => {
    const strIso = String(fechaConsultaHoy).split("T")[0].split(" ")[0].trim();
    const nombre = obtenerNombreDia(strIso);
    const diaCapitalizado = nombre
      ? nombre.charAt(0).toUpperCase() + nombre.slice(1)
      : "-";
    const fechaCorta = formatearFechaVisual(strIso);
    return {
      diaCapitalizado,
      fechaCorta,
      textoCompleto: `${diaCapitalizado}, ${fechaCorta}`,
    };
  }, [fechaConsultaHoy]);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* 0. RECUADRO SUPERIOR DUAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:px-6 sm:py-3.5 shadow-md grid grid-cols-1 md:grid-cols-2 gap-4 text-white animate-in fade-in duration-200">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Último Fichaje en Sistema (empleado_fichajes)
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Marcación
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-white mt-0.5">
              {resumenCabecera.ultimoFichaje?.horaFichaje
                ? formatearFechaHoraCompleta(
                    resumenCabecera.ultimoFichaje.horaFichaje,
                  )
                : "Sin fichajes registrados"}
            </div>
            <div className="text-[11px] text-slate-300 truncate mt-0.5">
              {resumenCabecera.ultimoFichaje ? (
                resumenCabecera.ultimoFichaje.empleado ? (
                  <span className="text-emerald-400 font-semibold">
                    {resumenCabecera.ultimoFichaje.empleado.nombre}{" "}
                    {resumenCabecera.ultimoFichaje.empleado.apellido} (Legajo:{" "}
                    {resumenCabecera.ultimoFichaje.empleado.nroLegajo || "-"})
                  </span>
                ) : (
                  <span className="text-amber-300">
                    ID Bio: {resumenCabecera.ultimoFichaje.idBiometrico} •{" "}
                    {resumenCabecera.ultimoFichaje.nombreReloj ||
                      "Sin vincular"}
                  </span>
                )
              ) : (
                <span className="text-slate-500">
                  Esperando eventos del reloj...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 md:border-l md:border-slate-800 md:pl-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Última Importación / Sincronización
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Lote
              </span>
            </div>
            <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-white mt-0.5">
              {resumenCabecera.ultimaImportacion?.fechaImportacion
                ? formatearFechaHoraCompleta(
                    resumenCabecera.ultimaImportacion.fechaImportacion,
                  )
                : "Sin importaciones registradas"}
            </div>
            <div className="text-[11px] text-slate-300 truncate mt-0.5">
              {resumenCabecera.ultimaImportacion ? (
                <span>
                  <strong className="text-indigo-300">
                    {resumenCabecera.ultimaImportacion.nombreArchivo}
                  </strong>{" "}
                  ({resumenCabecera.ultimaImportacion.procesadasOk} procesadas)
                </span>
              ) : (
                <span className="text-slate-500">No hay lotes previos</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1. HEADER */}
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
              Padrón de fichadas paginado, ingesta de lotes y auditoría
              histórica.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

          {puedeVincular &&
            (conteoSinVincular > 0 || vistaActual === "asistente") && (
              <button
                onClick={handleAbrirAsistenteDesdeCabecera}
                disabled={cargandoAsistente}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  vistaActual === "asistente"
                    ? "bg-slate-100 border-slate-300 text-slate-700 font-bold"
                    : "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md font-bold"
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
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArchivo(e.target.files[0]);
                    setResultadoSubida(null);
                    setErrorGlobal("");
                  }
                }}
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
            <Lock className="w-5 h-5 text-slate-400 mb-2" />
            <span className="text-xs font-bold text-slate-700">
              Carga e Ingesta de Archivos Restringida
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

      {/* 3. VISTAS PRINCIPALES MODULARIZADAS */}
      {vistaActual === "asistente" ? (
        <VistaAsistenteVinculacion
          vinculaciones={vinculaciones}
          empleados={empleados}
          puedeVincular={puedeVincular}
          puedeCrearEmpleado={puedeCrearEmpleado}
          onCambiarEmpleadoAsignado={handleCambiarEmpleadoAsignado}
          onAbrirRegistroNuevo={handleAbrirRegistroNuevo}
          onGuardarVinculaciones={handleGuardarVinculaciones}
        />
      ) : vistaActual === "hoy" ? (
        <VistaPadronHoy
          hoyInfo={hoyInfo}
          fechaConsulta={fechaConsultaHoy}
          setFechaConsulta={setFechaConsultaHoy}
          moverDia={moverDia}
          hoyIso={getHoyIso()}
          busqueda={busquedaHoy}
          setBusqueda={setBusquedaHoy}
          fichajes={fichajesHoy}
          cargando={cargandoHoy}
          pagina={paginaHoy}
          totalPaginas={totalPaginasHoy}
          totalElementos={totalElementosHoy}
          onCambiarPagina={(pag) =>
            cargarMarcacionesDiaServidor(fechaConsultaHoy, busquedaHoy, pag)
          }
        />
      ) : (
        <VistaHistorialImportaciones
          historial={historial}
          loading={loading}
          filtroEstado={filtroEstadoHistorial}
          setFiltroEstado={setFiltroEstadoHistorial}
          filtroFecha={filtroFechaHistorial}
          setFiltroFecha={setFiltroFechaHistorial}
          pagina={paginaHistorial}
          totalPaginas={totalPaginasHistorial}
          totalElementos={totalElementosHistorial}
          onCambiarPagina={(pag) =>
            cargarHistorialServidor(
              filtroEstadoHistorial,
              filtroFechaHistorial,
              pag,
            )
          }
          onRecargar={() =>
            cargarHistorialServidor(
              filtroEstadoHistorial,
              filtroFechaHistorial,
              paginaHistorial,
            )
          }
          onAbrirModalLote={(item) => {
            setFiltroModalNombre("");
            setFiltroModalFecha("");
            setModalArchivo({ isOpen: true, item });
            consultarFichajesDelLote(item.id, "", "");
          }}
          onEliminarHistorial={handleEliminarHistorial}
          onReactivarHistorial={handleReactivarHistorial}
          puedeEliminarLote={puedeEliminarLote}
        />
      )}

      {/* MODAL DETALLE DE LOTE */}
      <ModalDetalleLote
        isOpen={modalArchivo.isOpen}
        item={modalArchivo.item}
        fichajesLote={fichajesLote}
        cargando={cargandoModalFichajes}
        filtroFecha={filtroModalFecha}
        setFiltroFecha={setFiltroModalFecha}
        filtroNombre={filtroModalNombre}
        setFiltroNombre={setFiltroModalNombre}
        onClose={() => setModalArchivo({ isOpen: false, item: null })}
      />

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
