import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Tag,
  Briefcase,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlignLeft,
  X,
  Check,
  Loader2,
  RotateCcw,
  BookOpen,
  Lock,
} from "lucide-react";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  reactivarCategoria,
  getCargos,
  createCargo,
  updateCargo,
  deleteCargo,
  reactivarCargo,
  getHorarios,
  createHorario,
  updateHorario,
  deleteHorario,
  reactivarHorario,
  getMaterias,
  createMateria,
  updateMateria,
  deleteMateria,
  reactivarMateria,
} from "../services/configuracionService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import { buscarSimilar } from "../utils/textSimilarity";
import { useAuth } from "../context/AuthContext";

const PALETA_COLORES = [
  { id: "indigo", bg: "bg-[#4338ca]", ring: "ring-[#4338ca]" },
  { id: "emerald", bg: "bg-[#10b981]", ring: "ring-[#10b981]" },
  { id: "amber", bg: "bg-[#f59e0b]", ring: "ring-[#f59e0b]" },
  { id: "purple", bg: "bg-[#a855f7]", ring: "ring-[#a855f7]" },
  { id: "cyan", bg: "bg-[#06b6d4]", ring: "ring-[#06b6d4]" },
  { id: "rose", bg: "bg-[#f43f5e]", ring: "ring-[#f43f5e]" },
];

const FORM_CAT_INICIAL = {
  nombre: "",
  estado: "Activo",
  codigoTag: "",
  colorIdentificacion: "indigo",
  descripcion: "",
};

const FORM_CARGO_INICIAL = {
  nombre: "",
  categoriaId: "",
  estado: "Activo",
  descripcion: "",
};

const FORM_HORARIO_INICIAL = {
  nombre: "",
  categoriaId: "",
  estado: "Activo",
  horaEntrada: "08:00",
  horaEgreso: "16:00",
  dias: ["Lun", "Mar", "Mié", "Jue", "Vie"],
  tolEntrada: 15,
  tolEgreso: 10,
  maxSalidas: 2,
  tiempoMaxFuera: 45,
};

const FORM_MATERIA_INICIAL = {
  nombre: "",
  codigo: "",
  departamento: "",
  aulaPredeterminada: "",
  estado: "Activo",
};

export const getBadgeColorClasses = (color) => {
  switch (color?.toLowerCase()) {
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border-emerald-300";
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-300";
    case "purple":
      return "bg-purple-50 text-purple-700 border-purple-300";
    case "cyan":
      return "bg-cyan-50 text-cyan-700 border-cyan-300";
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-300";
    case "indigo":
    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-300";
  }
};

const StatusBadge = ({ activo }) => {
  const isActivo = activo !== false;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
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
      {isActivo ? "Activo" : "Inactivo"}
    </span>
  );
};

export default function TiposConfiguracion() {
  const { tienePermiso } = useAuth();

  // Facultades de mutación PBAC
  const puedeEditarCategorias = tienePermiso("CONFIG_EDITAR_CATEGORIAS");
  const puedeEditarCargos = tienePermiso("CONFIG_EDITAR_CARGOS");
  const puedeEditarMateriasTurnos = tienePermiso(
    "CONFIG_EDITAR_MATERIAS_TURNOS",
  );

  const [activeTab, setActiveTab] = useState("categorias");
  const [loading, setLoading] = useState(true);

  // Listas de datos
  const [categorias, setCategorias] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [materias, setMaterias] = useState([]);

  // Filtros por estado
  const [filtroEstadoCat, setFiltroEstadoCat] = useState("TODOS");
  const [filtroEstadoCargo, setFiltroEstadoCargo] = useState("TODOS");
  const [filtroEstadoHorario, setFiltroEstadoHorario] = useState("TODOS");
  const [filtroEstadoMateria, setFiltroEstadoMateria] = useState("TODOS");

  // Otros filtros
  const [cargoSearch, setCargoSearch] = useState("");
  const [cargoCategoryFilter, setCargoCategoryFilter] = useState("TODAS");
  const [horarioCategoryFilter, setHorarioCategoryFilter] = useState("TODOS");
  const [materiaSearch, setMateriaSearch] = useState("");

  // Modales
  const [modalCat, setModalCat] = useState(false);
  const [editandoCatId, setEditandoCatId] = useState(null);

  const [modalCargo, setModalCargo] = useState(false);
  const [editandoCargoId, setEditandoCargoId] = useState(null);

  const [modalHorario, setModalHorario] = useState(false);
  const [editandoHorarioId, setEditandoHorarioId] = useState(null);

  const [modalMateria, setModalMateria] = useState(false);
  const [editandoMateriaId, setEditandoMateriaId] = useState(null);

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

  // Formularios
  const [formCat, setFormCat] = useState(FORM_CAT_INICIAL);
  const [formCargo, setFormCargo] = useState(FORM_CARGO_INICIAL);
  const [formHorario, setFormHorario] = useState(FORM_HORARIO_INICIAL);
  const [formMateria, setFormMateria] = useState(FORM_MATERIA_INICIAL);

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

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, cargosRes, horariosRes, materiasRes] =
        await Promise.allSettled([
          getCategorias(),
          getCargos(),
          getHorarios(),
          getMaterias(),
        ]);

      const listaCats =
        catsRes.status === "fulfilled" && Array.isArray(catsRes.value)
          ? catsRes.value
          : [];
      const listaCargos =
        cargosRes.status === "fulfilled" && Array.isArray(cargosRes.value)
          ? cargosRes.value
          : [];
      const listaHorarios =
        horariosRes.status === "fulfilled" && Array.isArray(horariosRes.value)
          ? horariosRes.value
          : [];
      const listaMaterias =
        materiasRes.status === "fulfilled" && Array.isArray(materiasRes.value)
          ? materiasRes.value
          : [];

      setCategorias(listaCats);
      setCargos(listaCargos);
      setHorarios(listaHorarios);
      setMaterias(listaMaterias);

      const catsActivas = listaCats.filter((c) => c.activo !== false);
      if (catsActivas.length > 0) {
        setFormCargo((prev) => ({
          ...prev,
          categoriaId: prev.categoriaId || catsActivas[0].id,
        }));
        setFormHorario((prev) => ({
          ...prev,
          categoriaId: prev.categoriaId || catsActivas[0].id,
        }));
      }
    } catch (err) {
      console.error("Error al obtener los datos:", err);
      mostrarAviso(
        "danger",
        "Error de Servidor",
        "No se pudieron cargar los datos de configuración.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const handleRecuperacion = () => {
      cargarDatos();
    };

    window.addEventListener("conexion:restaurada", handleRecuperacion);
    return () => {
      window.removeEventListener("conexion:restaurada", handleRecuperacion);
    };
  }, [cargarDatos]);

  const categoriasActivas = categorias.filter((c) => c.activo !== false);

  // --- HANDLERS: CATEGORÍAS ---
  const abrirModalCrearCategoria = () => {
    if (!puedeEditarCategorias) return;
    setEditandoCatId(null);
    setFormCat(FORM_CAT_INICIAL);
    setModalCat(true);
  };

  const abrirModalEditarCategoria = (cat) => {
    if (!puedeEditarCategorias) return;
    setEditandoCatId(cat.id);
    setFormCat({
      nombre: cat.nombre || "",
      estado: cat.activo !== false ? "Activo" : "Inactivo",
      codigoTag: cat.codigoTag || "",
      colorIdentificacion: cat.colorIdentificacion || "indigo",
      descripcion: cat.descripcion || "",
    });
    setModalCat(true);
  };

  const procederGuardarCategoria = async () => {
    if (!puedeEditarCategorias) return;
    try {
      const payload = {
        nombre: formCat.nombre.trim(),
        codigoTag:
          formCat.codigoTag?.trim() ||
          formCat.nombre.trim().toLowerCase().replace(/\s+/g, "-"),
        colorIdentificacion: formCat.colorIdentificacion,
        descripcion: formCat.descripcion?.trim() || "",
        activo: formCat.estado === "Activo",
      };

      if (editandoCatId) {
        await updateCategoria(editandoCatId, payload);
        mostrarAviso(
          "success",
          "Categoría Actualizada",
          "Los datos se guardaron correctamente.",
        );
      } else {
        await createCategoria(payload);
        mostrarAviso(
          "success",
          "Categoría Creada",
          "La nueva categoría se registró con éxito.",
        );
      }

      await cargarDatos();
      setModalCat(false);
      setEditandoCatId(null);
      setFormCat(FORM_CAT_INICIAL);
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error al Guardar",
        err.response?.data?.message ||
          "No se pudo procesar la categoría en el servidor.",
      );
    }
  };

  const handleGuardarCategoria = async (e) => {
    e.preventDefault();
    if (!puedeEditarCategorias) return;

    const coincidencia = buscarSimilar(
      formCat.nombre,
      categorias,
      editandoCatId,
    );

    if (coincidencia) {
      if (coincidencia.tipo === "EXACTO") {
        mostrarAviso(
          "danger",
          "Categoría Duplicada",
          `Ya existe una categoría registrada exactamente como "${coincidencia.item.nombre}".`,
        );
        return;
      }

      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formCat.nombre}" es muy similar a la categoría existente "${coincidencia.item.nombre}". ¿Desea guardarlo de todas formas?`,
          textoConfirmar: "Sí, registrar de todos modos",
          textoCancelar: "Revisar nombre",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((prev) => ({ ...prev, isOpen: false }));
            await procederGuardarCategoria();
          },
        });
        return;
      }
    }

    await procederGuardarCategoria();
  };

  const handleEliminarCategoria = (id, nombre) => {
    if (!puedeEditarCategorias) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja categoría?",
      mensaje: `¿Desea dar de baja lógica la categoría "${nombre}"? Sus registros históricos permanecerán guardados.`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteCategoria(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Baja Exitosa",
            `La categoría "${nombre}" fue dada de baja.`,
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            err.response?.data?.message ||
              "No se pudo dar de baja la categoría.",
          );
        }
      },
    });
  };

  const handleReactivarCategoria = (id, nombre) => {
    if (!puedeEditarCategorias) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar categoría?",
      mensaje: `¿Desea reactivar la categoría "${nombre}" para volver a habilitarla en el sistema?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarCategoria(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            `La categoría "${nombre}" fue reactivada.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar la categoría.");
        }
      },
    });
  };

  // --- HANDLERS: CARGOS ---
  const abrirModalCrearCargo = () => {
    if (!puedeEditarCargos) return;
    setEditandoCargoId(null);
    setFormCargo({
      nombre: "",
      categoriaId: categoriasActivas[0]?.id || "",
      estado: "Activo",
      descripcion: "",
    });
    setModalCargo(true);
  };

  const abrirModalEditarCargo = (cargo) => {
    if (!puedeEditarCargos) return;
    setEditandoCargoId(cargo.id);
    setFormCargo({
      nombre: cargo.nombre || "",
      categoriaId: cargo.categoria?.id || categoriasActivas[0]?.id || "",
      estado: cargo.activo !== false ? "Activo" : "Inactivo",
      descripcion: cargo.descripcion || "",
    });
    setModalCargo(true);
  };

  const handleGuardarCargo = async (e) => {
    e.preventDefault();
    if (!puedeEditarCargos) return;

    if (!formCargo.nombre.trim()) {
      mostrarAviso(
        "warning",
        "Atención",
        "El nombre del cargo es obligatorio.",
      );
      return;
    }

    if (!formCargo.categoriaId) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe asignar una categoría institucional.",
      );
      return;
    }

    const coincidencia = buscarSimilar(
      formCargo.nombre,
      cargos,
      editandoCargoId,
    );

    const ejecutarPeticion = async () => {
      try {
        const payload = {
          nombre: formCargo.nombre.trim(),
          descripcion: formCargo.descripcion?.trim() || "",
          activo: formCargo.estado === "Activo",
          categoria: { id: parseInt(formCargo.categoriaId, 10) },
        };

        if (editandoCargoId) {
          await updateCargo(editandoCargoId, payload);
          mostrarAviso(
            "success",
            "Cargo Actualizado",
            "Los cambios del cargo se guardaron exitosamente.",
          );
        } else {
          await createCargo(payload);
          mostrarAviso(
            "success",
            "Cargo Registrado",
            "El nuevo cargo se ha creado correctamente.",
          );
        }

        await cargarDatos();
        setModalCargo(false);
        setEditandoCargoId(null);
        setFormCargo(FORM_CARGO_INICIAL);
      } catch (err) {
        mostrarAviso(
          "danger",
          "Error",
          err.response?.data?.message ||
            "No se pudo guardar el cargo en el servidor.",
        );
      }
    };

    if (coincidencia) {
      if (coincidencia.tipo === "EXACTO") {
        mostrarAviso(
          "danger",
          "Cargo Duplicado",
          `Ya existe un cargo registrado con el nombre "${coincidencia.item.nombre}".`,
        );
        return;
      }

      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formCargo.nombre}" es muy similar al cargo existente "${coincidencia.item.nombre}". ¿Desea guardarlo de todas formas?`,
          textoConfirmar: "Sí, registrar de todos modos",
          textoCancelar: "Revisar nombre",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((prev) => ({ ...prev, isOpen: false }));
            await ejecutarPeticion();
          },
        });
        return;
      }
    }

    await ejecutarPeticion();
  };

  const handleEliminarCargo = (id, nombre) => {
    if (!puedeEditarCargos) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja cargo?",
      mensaje: `¿Desea dar de baja lógica el cargo "${nombre}"?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteCargo(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Baja Exitosa",
            `El cargo "${nombre}" fue dado de baja.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo dar de baja el cargo.");
        }
      },
    });
  };

  const handleReactivarCargo = (id, nombre) => {
    if (!puedeEditarCargos) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar cargo?",
      mensaje: `¿Desea reactivar el puesto "${nombre}"?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarCargo(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            `El cargo "${nombre}" fue reactivado.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar el cargo.");
        }
      },
    });
  };

  // --- HANDLERS: HORARIOS ---
  const abrirModalCrearHorario = () => {
    if (!puedeEditarMateriasTurnos) return;
    setEditandoHorarioId(null);
    setFormHorario({
      ...FORM_HORARIO_INICIAL,
      categoriaId: categoriasActivas[0]?.id || "",
    });
    setModalHorario(true);
  };

  const abrirModalEditarHorario = (h) => {
    if (!puedeEditarMateriasTurnos) return;
    setEditandoHorarioId(h.id);
    setFormHorario({
      nombre: h.nombre || "",
      categoriaId: h.categoria?.id || categoriasActivas[0]?.id || "",
      estado: h.activo !== false ? "Activo" : "Inactivo",
      horaEntrada: h.horaEntrada ? h.horaEntrada.substring(0, 5) : "08:00",
      horaEgreso: h.horaEgreso ? h.horaEgreso.substring(0, 5) : "16:00",
      dias: h.diasLaborables
        ? h.diasLaborables.split(",")
        : ["Lun", "Mar", "Mié", "Jue", "Vie"],
      tolEntrada: h.tolEntradaMin ?? 15,
      tolEgreso: h.tolEgresoMin ?? 10,
      maxSalidas: h.maxSalidasIntermedias ?? 2,
      tiempoMaxFuera: h.tiempoMaxFueraMin ?? 45,
    });
    setModalHorario(true);
  };

  const handleGuardarHorario = async (e) => {
    e.preventDefault();
    if (!puedeEditarMateriasTurnos) return;

    if (!formHorario.nombre.trim()) {
      mostrarAviso(
        "warning",
        "Atención",
        "El nombre del horario es obligatorio.",
      );
      return;
    }

    if (!formHorario.categoriaId) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe seleccionar una categoría aplicable.",
      );
      return;
    }

    if (!formHorario.dias || formHorario.dias.length === 0) {
      mostrarAviso(
        "warning",
        "Atención",
        "Debe marcar al menos un día laborable.",
      );
      return;
    }

    if (formHorario.horaEntrada >= formHorario.horaEgreso) {
      mostrarAviso(
        "danger",
        "Rango Inválido",
        "La hora de egreso debe ser posterior a la hora de entrada.",
      );
      return;
    }

    const coincidencia = buscarSimilar(
      formHorario.nombre,
      horarios,
      editandoHorarioId,
    );

    const ejecutarPeticion = async () => {
      try {
        const payload = {
          nombre: formHorario.nombre.trim(),
          categoria: { id: parseInt(formHorario.categoriaId, 10) },
          activo: formHorario.estado === "Activo",
          horaEntrada:
            formHorario.horaEntrada.length === 5
              ? `${formHorario.horaEntrada}:00`
              : formHorario.horaEntrada,
          horaEgreso:
            formHorario.horaEgreso.length === 5
              ? `${formHorario.horaEgreso}:00`
              : formHorario.horaEgreso,
          diasLaborables: formHorario.dias.join(","),
          tolEntradaMin: parseInt(formHorario.tolEntrada, 10),
          tolEgresoMin: parseInt(formHorario.tolEgreso, 10),
          maxSalidasIntermedias: parseInt(formHorario.maxSalidas || 2, 10),
          tiempoMaxFueraMin: parseInt(formHorario.tiempoMaxFuera || 45, 10),
        };

        if (editandoHorarioId) {
          await updateHorario(editandoHorarioId, payload);
          mostrarAviso(
            "success",
            "Horario Actualizado",
            "Los parámetros del horario se actualizaron con éxito.",
          );
        } else {
          await createHorario(payload);
          mostrarAviso(
            "success",
            "Horario Registrado",
            "El horario ha sido registrado en el sistema.",
          );
        }

        await cargarDatos();
        setModalHorario(false);
        setEditandoHorarioId(null);
        setFormHorario(FORM_HORARIO_INICIAL);
      } catch (err) {
        mostrarAviso(
          "danger",
          "Error",
          err.response?.data?.message ||
            "No se pudo guardar la plantilla de horario.",
        );
      }
    };

    if (coincidencia) {
      if (coincidencia.tipo === "EXACTO") {
        mostrarAviso(
          "danger",
          "Horario Duplicado",
          `Ya existe un horario registrado con el nombre "${coincidencia.item.nombre}".`,
        );
        return;
      }

      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formHorario.nombre}" es muy similar al horario existente "${coincidencia.item.nombre}". ¿Desea guardarlo de todas formas?`,
          textoConfirmar: "Sí, registrar de todos modos",
          textoCancelar: "Revisar nombre",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((prev) => ({ ...prev, isOpen: false }));
            await ejecutarPeticion();
          },
        });
        return;
      }
    }

    await ejecutarPeticion();
  };

  const handleEliminarHorario = (id, nombre) => {
    if (!puedeEditarMateriasTurnos) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja horario?",
      mensaje: `¿Confirma la baja lógica del horario "${nombre}"?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteHorario(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Baja Exitosa",
            `El horario "${nombre}" fue dado de baja.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo dar de baja el horario.");
        }
      },
    });
  };

  const handleReactivarHorario = (id, nombre) => {
    if (!puedeEditarMateriasTurnos) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar horario?",
      mensaje: `¿Desea reactivar el horario preestablecido "${nombre}"?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarHorario(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            `El horario "${nombre}" fue reactivado.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar el horario.");
        }
      },
    });
  };

  const toggleDia = (dia) => {
    if (formHorario.dias.includes(dia)) {
      setFormHorario({
        ...formHorario,
        dias: formHorario.dias.filter((d) => d !== dia),
      });
    } else {
      setFormHorario({ ...formHorario, dias: [...formHorario.dias, dia] });
    }
  };

  // --- HANDLERS: MATERIAS / CÁTEDRAS ---
  const abrirModalCrearMateria = () => {
    if (!puedeEditarMateriasTurnos) return;
    setEditandoMateriaId(null);
    setFormMateria(FORM_MATERIA_INICIAL);
    setModalMateria(true);
  };

  const abrirModalEditarMateria = (m) => {
    if (!puedeEditarMateriasTurnos) return;
    setEditandoMateriaId(m.id);
    setFormMateria({
      nombre: m.nombre || "",
      codigo: m.codigo || "",
      departamento: m.departamento || "",
      aulaPredeterminada: m.aulaPredeterminada || "",
      estado: m.activo !== false ? "Activo" : "Inactivo",
    });
    setModalMateria(true);
  };

  const handleGuardarMateria = async (e) => {
    e.preventDefault();
    if (!puedeEditarMateriasTurnos) return;

    if (!formMateria.nombre.trim()) {
      mostrarAviso(
        "warning",
        "Atención",
        "El nombre de la materia es obligatorio.",
      );
      return;
    }

    const coincidencia = buscarSimilar(
      formMateria.nombre,
      materias,
      editandoMateriaId,
    );

    const ejecutarPeticion = async () => {
      try {
        const payload = {
          nombre: formMateria.nombre.trim(),
          codigo: formMateria.codigo?.trim() || null,
          departamento: formMateria.departamento?.trim() || null,
          aulaPredeterminada: formMateria.aulaPredeterminada?.trim() || null,
          activo: formMateria.estado === "Activo",
        };

        if (editandoMateriaId) {
          await updateMateria(editandoMateriaId, payload);
          mostrarAviso(
            "success",
            "Cátedra Actualizada",
            "Los datos de la materia se actualizaron correctamente.",
          );
        } else {
          await createMateria(payload);
          mostrarAviso(
            "success",
            "Cátedra Registrada",
            "La nueva materia se ha registrado en el catálogo.",
          );
        }

        await cargarDatos();
        setModalMateria(false);
        setEditandoMateriaId(null);
        setFormMateria(FORM_MATERIA_INICIAL);
      } catch (err) {
        mostrarAviso(
          "danger",
          "Error",
          err.response?.data?.message ||
            "No se pudo guardar la materia o cátedra.",
        );
      }
    };

    if (coincidencia) {
      if (coincidencia.tipo === "EXACTO") {
        mostrarAviso(
          "danger",
          "Materia Duplicada",
          `Ya existe una materia registrada con el nombre "${coincidencia.item.nombre}".`,
        );
        return;
      }

      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formMateria.nombre}" es muy similar a la materia existente "${coincidencia.item.nombre}". ¿Desea guardarla de todas formas?`,
          textoConfirmar: "Sí, registrar de todos modos",
          textoCancelar: "Revisar nombre",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((prev) => ({ ...prev, isOpen: false }));
            await ejecutarPeticion();
          },
        });
        return;
      }
    }

    await ejecutarPeticion();
  };

  const handleEliminarMateria = (id, nombre) => {
    if (!puedeEditarMateriasTurnos) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja cátedra?",
      mensaje: `¿Desea dar de baja lógica la cátedra "${nombre}"?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteMateria(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Baja Exitosa",
            `La cátedra "${nombre}" fue dada de baja.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo dar de baja la materia.");
        }
      },
    });
  };

  const handleReactivarMateria = (id, nombre) => {
    if (!puedeEditarMateriasTurnos) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar cátedra?",
      mensaje: `¿Desea reactivar la materia "${nombre}" en el catálogo institucional?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await reactivarMateria(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Reactivación Exitosa",
            `La cátedra "${nombre}" fue reactivada.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar la materia.");
        }
      },
    });
  };

  // --- FILTROS DE LISTADO ---
  const filteredCategorias = categorias.filter((cat) => {
    if (filtroEstadoCat === "ACTIVOS") return cat.activo !== false;
    if (filtroEstadoCat === "INACTIVOS") return cat.activo === false;
    return true;
  });

  const filteredCargos = cargos.filter((c) => {
    const matchEstado =
      filtroEstadoCargo === "TODOS" ||
      (filtroEstadoCargo === "ACTIVOS" && c.activo !== false) ||
      (filtroEstadoCargo === "INACTIVOS" && c.activo === false);

    const matchSearch =
      c.nombre?.toLowerCase().includes(cargoSearch.toLowerCase()) ||
      c.descripcion?.toLowerCase().includes(cargoSearch.toLowerCase());

    const matchCat =
      cargoCategoryFilter === "TODAS" ||
      c.categoria?.nombre?.toLowerCase() === cargoCategoryFilter.toLowerCase();

    return matchEstado && matchSearch && matchCat;
  });

  const filteredHorarios = horarios.filter((h) => {
    const matchEstado =
      filtroEstadoHorario === "TODOS" ||
      (filtroEstadoHorario === "ACTIVOS" && h.activo !== false) ||
      (filtroEstadoHorario === "INACTIVOS" && h.activo === false);

    const matchCat =
      horarioCategoryFilter === "TODOS" ||
      h.categoria?.codigoTag
        ?.toLowerCase()
        .includes(horarioCategoryFilter.toLowerCase()) ||
      h.categoria?.nombre
        ?.toLowerCase()
        .includes(horarioCategoryFilter.toLowerCase());

    return matchEstado && matchCat;
  });

  const filteredMaterias = materias.filter((m) => {
    const matchEstado =
      filtroEstadoMateria === "TODOS" ||
      (filtroEstadoMateria === "ACTIVOS" && m.activo !== false) ||
      (filtroEstadoMateria === "INACTIVOS" && m.activo === false);

    const query = materiaSearch.toLowerCase();
    const matchSearch =
      m.nombre?.toLowerCase().includes(query) ||
      m.codigo?.toLowerCase().includes(query) ||
      m.departamento?.toLowerCase().includes(query);

    return matchEstado && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">
            Cargando configuración del sistema...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#4b35e6] flex items-center justify-center text-white shadow-md">
            <Settings className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Configuración del Sistema
            </h1>
            <p className="text-xs text-slate-500">
              Gestión centralizada de Categorías, Cargos, Tabla de Horarios y
              Catálogo de Materias
            </p>
          </div>
        </div>

        {/* Subpestañas */}
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab("categorias")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "categorias"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "hover:text-slate-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            Categorías
            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {categorias.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("cargos")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "cargos"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            Cargos y Puestos
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {cargos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("horarios")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "horarios"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Tabla de Horarios
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {horarios.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("materias")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "materias"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            Materias
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {materias.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================
          VISTA 1: CATEGORÍAS DE PERSONAL
         ======================================================== */}
      {activeTab === "categorias" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Categorías de Personal
              </h2>
              <p className="text-xs text-slate-500">
                Listado de categorías con nombre y estado de vigencia
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Estado:</span>
                <select
                  value={filtroEstadoCat}
                  onChange={(e) => setFiltroEstadoCat(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs"
                >
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="TODOS">Todos</option>
                  <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
                </select>
              </div>

              {puedeEditarCategorias ? (
                <button
                  onClick={abrirModalCrearCategoria}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Nueva Categoría
                </button>
              ) : (
                <span
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                  title="Requiere permiso CONFIG_EDITAR_CATEGORIAS"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Creación Restringida
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 tracking-wider">Nombre</th>
                  <th className="px-6 py-3.5 tracking-wider">Identificador</th>
                  <th className="px-6 py-3.5 tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCategorias.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`transition-colors ${
                      cat.activo === false
                        ? "bg-slate-50/60 opacity-80"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {cat.nombre}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase border ${getBadgeColorClasses(
                          cat.colorIdentificacion,
                        )}`}
                      >
                        {cat.codigoTag?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge activo={cat.activo} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {puedeEditarCategorias ? (
                          <>
                            <button
                              onClick={() => abrirModalEditarCategoria(cat)}
                              className="p-1 hover:text-indigo-600 transition cursor-pointer"
                              title="Editar Categoría"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {cat.activo !== false ? (
                              <button
                                onClick={() =>
                                  handleEliminarCategoria(cat.id, cat.nombre)
                                }
                                className="p-1 hover:text-rose-600 transition cursor-pointer"
                                title="Dar de baja"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleReactivarCategoria(cat.id, cat.nombre)
                                }
                                className="p-1 hover:text-emerald-600 transition cursor-pointer"
                                title="Reactivar Categoría"
                              >
                                <RotateCcw className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span
                            className="p-1 text-slate-300 cursor-not-allowed select-none"
                            title="Requiere permiso CONFIG_EDITAR_CATEGORIAS"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          VISTA 2: CATÁLOGO DE CARGOS Y PUESTOS
         ======================================================== */}
      {activeTab === "cargos" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Catálogo de Cargos y Puestos
              </h2>
              <p className="text-xs text-slate-500">
                Estructura de cargos asignables a los colaboradores con vigencia
                y descripción
              </p>
            </div>
            {puedeEditarCargos ? (
              <button
                onClick={abrirModalCrearCargo}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Nuevo Cargo
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                title="Requiere permiso CONFIG_EDITAR_CARGOS"
              >
                <Lock className="w-3.5 h-3.5" />
                Creación Restringida
              </span>
            )}
          </div>

          <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={cargoSearch}
                onChange={(e) => setCargoSearch(e.target.value)}
                placeholder="Buscar cargo o por descripción..."
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-medium text-slate-500">Categoría:</span>
                <select
                  value={cargoCategoryFilter}
                  onChange={(e) => setCargoCategoryFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:border-indigo-500"
                >
                  <option value="TODAS">Todas las categorías</option>
                  {categoriasActivas.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-medium text-slate-500">Estado:</span>
                <select
                  value={filtroEstadoCargo}
                  onChange={(e) => setFiltroEstadoCargo(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs"
                >
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="TODOS">Todos</option>
                  <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 tracking-wider w-1/4">
                    Cargo / Puesto
                  </th>
                  <th className="px-6 py-3.5 tracking-wider w-1/3">
                    Descripción
                  </th>
                  <th className="px-6 py-3.5 tracking-wider">Categoría</th>
                  <th className="px-6 py-3.5 tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCargos.map((cg) => (
                  <tr
                    key={cg.id}
                    className={`transition-colors ${
                      cg.activo === false
                        ? "bg-slate-50/60 opacity-80"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {cg.nombre}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <AlignLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-2">
                          {cg.descripcion ? (
                            cg.descripcion
                          ) : (
                            <em className="text-slate-400">Sin descripción</em>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase border ${getBadgeColorClasses(
                          cg.categoria?.colorIdentificacion,
                        )}`}
                      >
                        {cg.categoria?.codigoTag?.toUpperCase() ||
                          cg.categoria?.nombre?.toUpperCase() ||
                          "DOCENTES"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge activo={cg.activo} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        {puedeEditarCargos ? (
                          <>
                            <button
                              onClick={() => abrirModalEditarCargo(cg)}
                              className="p-1 hover:text-indigo-600 transition cursor-pointer"
                              title="Editar Cargo"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {cg.activo !== false ? (
                              <button
                                onClick={() =>
                                  handleEliminarCargo(cg.id, cg.nombre)
                                }
                                className="p-1 hover:text-rose-600 transition cursor-pointer"
                                title="Dar de baja"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleReactivarCargo(cg.id, cg.nombre)
                                }
                                className="p-1 hover:text-emerald-600 transition cursor-pointer"
                                title="Reactivar Cargo"
                              >
                                <RotateCcw className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span
                            className="p-1 text-slate-300 cursor-not-allowed select-none"
                            title="Requiere permiso CONFIG_EDITAR_CARGOS"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          VISTA 3: TABLA DE HORARIOS PREESTABLECIDOS
         ======================================================== */}
      {activeTab === "horarios" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tabla de Horarios Preestablecidos
              </h2>
              <p className="text-xs text-slate-500">
                Horarios corporativos y de cátedra preestablecidos para
                asignación directa o general
              </p>
            </div>
            {puedeEditarMateriasTurnos ? (
              <button
                onClick={abrirModalCrearHorario}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md shadow-indigo-100 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Nuevo Horario Preestablecido
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                title="Requiere permiso CONFIG_EDITAR_MATERIAS_TURNOS"
              >
                <Lock className="w-3.5 h-3.5" />
                Creación Restringida
              </span>
            )}
          </div>

          <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-medium mr-1">
                Categoría:
              </span>
              {["TODOS", ...categoriasActivas.map((c) => c.nombre)].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setHorarioCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                      horarioCategoryFilter === cat
                        ? "bg-[#4338ca] text-white font-semibold shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat === "TODOS" ? "Todos" : cat}
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-600 self-start md:self-auto">
              <span className="font-medium text-slate-500">Estado:</span>
              <select
                value={filtroEstadoHorario}
                onChange={(e) => setFiltroEstadoHorario(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs"
              >
                <option value="ACTIVOS">Solo Activos</option>
                <option value="TODOS">Todos</option>
                <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHorarios.map((h) => {
              const diasArray = h.diasLaborables
                ? h.diasLaborables.split(",")
                : [];
              return (
                <div
                  key={h.id}
                  className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-colors ${
                    h.activo === false
                      ? "border-dashed border-rose-300 bg-rose-50/15"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getBadgeColorClasses(
                            h.categoria?.colorIdentificacion,
                          )}`}
                        >
                          {h.categoria?.codigoTag?.toUpperCase() ||
                            h.categoria?.nombre?.toUpperCase() ||
                            "GENERAL"}
                        </span>
                        <StatusBadge activo={h.activo} />
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400">
                        {puedeEditarMateriasTurnos ? (
                          <>
                            <button
                              onClick={() => abrirModalEditarHorario(h)}
                              className="p-1 hover:text-indigo-600 transition cursor-pointer"
                              title="Editar Horario"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {h.activo !== false ? (
                              <button
                                onClick={() =>
                                  handleEliminarHorario(h.id, h.nombre)
                                }
                                className="p-1 hover:text-rose-600 transition cursor-pointer"
                                title="Dar de baja"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleReactivarHorario(h.id, h.nombre)
                                }
                                className="p-1 hover:text-emerald-600 transition cursor-pointer"
                                title="Reactivar Horario"
                              >
                                <RotateCcw className="w-4 h-4 text-emerald-600" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span
                            className="p-1 text-slate-300 cursor-not-allowed select-none"
                            title="Requiere permiso CONFIG_EDITAR_MATERIAS_TURNOS"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mb-3">
                      {h.nombre}
                    </h3>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 mb-4">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {h.horaEntrada?.substring(0, 5)} →{" "}
                        {h.horaEgreso?.substring(0, 5)} hs
                      </span>
                    </div>

                    <div className="mb-5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Días Laborables:
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                          (d) => {
                            const activo = diasArray.includes(d);
                            return (
                              <span
                                key={d}
                                className={`px-2 py-0.5 rounded-md ${
                                  activo
                                    ? "bg-[#111827] text-white"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {d}
                              </span>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-[#f8fafc] p-2 rounded-xl">
                      <div className="text-[9px] font-bold uppercase text-slate-400">
                        Tolerancia Entrada
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {h.tolEntradaMin}m
                      </div>
                    </div>
                    <div className="bg-[#f8fafc] p-2 rounded-xl">
                      <div className="text-[9px] font-bold uppercase text-slate-400">
                        Tolerancia Salida
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {h.tolEgresoMin}m
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          VISTA 4: CATÁLOGO DE CÁTEDRAS Y MATERIAS
         ======================================================== */}
      {activeTab === "materias" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Catálogo de Cátedras y Materias
              </h2>
              <p className="text-xs text-slate-500">
                Listado de materias, departamentos y comisiones institucionales
                para asignación docente
              </p>
            </div>
            {puedeEditarMateriasTurnos ? (
              <button
                onClick={abrirModalCrearMateria}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Nueva Materia
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                title="Requiere permiso CONFIG_EDITAR_MATERIAS_TURNOS"
              >
                <Lock className="w-3.5 h-3.5" />
                Creación Restringida
              </span>
            )}
          </div>

          <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={materiaSearch}
                onChange={(e) => setMateriaSearch(e.target.value)}
                placeholder="Buscar por materia, código, departamento o comisión..."
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Estado:</span>
              <select
                value={filtroEstadoMateria}
                onChange={(e) => setFiltroEstadoMateria(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs"
              >
                <option value="ACTIVOS">Solo Activos</option>
                <option value="TODOS">Todos</option>
                <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 tracking-wider">
                    Materia / Asignatura
                  </th>
                  <th className="px-6 py-3.5 tracking-wider">Código / Depto</th>
                  <th className="px-6 py-3.5 tracking-wider">Aula Base</th>
                  <th className="px-6 py-3.5 tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredMaterias.length > 0 ? (
                  filteredMaterias.map((m) => (
                    <tr
                      key={m.id}
                      className={`transition-colors ${
                        m.activo === false
                          ? "bg-slate-50/60 opacity-80"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                        {m.nombre}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {m.codigo ? (
                          <span className="font-mono font-semibold text-slate-700">
                            {m.codigo} •{" "}
                          </span>
                        ) : (
                          ""
                        )}
                        {m.departamento || "General"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {m.aulaPredeterminada || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge activo={m.activo} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          {puedeEditarMateriasTurnos ? (
                            <>
                              <button
                                onClick={() => abrirModalEditarMateria(m)}
                                className="p-1 hover:text-indigo-600 transition cursor-pointer"
                                title="Editar Materia"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {m.activo !== false ? (
                                <button
                                  onClick={() =>
                                    handleEliminarMateria(m.id, m.nombre)
                                  }
                                  className="p-1 hover:text-rose-600 transition cursor-pointer"
                                  title="Dar de baja"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleReactivarMateria(m.id, m.nombre)
                                  }
                                  className="p-1 hover:text-emerald-600 transition cursor-pointer"
                                  title="Reactivar Materia"
                                >
                                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span
                              className="p-1 text-slate-300 cursor-not-allowed select-none"
                              title="Requiere permiso CONFIG_EDITAR_MATERIAS_TURNOS"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-slate-400 text-xs"
                    >
                      No se encontraron materias con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALES DE FORMULARIO
         ======================================================== */}
      {/* Modal 1: Categoría */}
      {modalCat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>
                  {editandoCatId
                    ? "Editar Categoría de Personal"
                    : "Nueva Categoría de Personal"}
                </span>
              </div>
              <button
                onClick={() => setModalCat(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleGuardarCategoria}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Docentes, Administrativos, Investigadores"
                  value={formCat.nombre}
                  onChange={(e) =>
                    setFormCat({ ...formCat, nombre: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado *
                </label>
                <select
                  value={formCat.estado}
                  onChange={(e) =>
                    setFormCat({ ...formCat, estado: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="Activo">
                    Activo (Habilitada en el sistema)
                  </option>
                  <option value="Inactivo">Inactivo (Deshabilitada)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código Identificador (único)
                </label>
                <input
                  type="text"
                  placeholder="ej. docente, investigacion, maestranza"
                  value={formCat.codigoTag}
                  onChange={(e) =>
                    setFormCat({ ...formCat, codigoTag: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Si se deja en blanco se generará automáticamente a partir del
                  nombre.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Color de Identificación
                </label>
                <div className="flex items-center gap-3">
                  {PALETA_COLORES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setFormCat({ ...formCat, colorIdentificacion: c.id })
                      }
                      className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center text-white transition-transform cursor-pointer ${
                        formCat.colorIdentificacion === c.id
                          ? "scale-110 ring-3 ring-offset-2 " + c.ring
                          : "opacity-90"
                      }`}
                    >
                      {formCat.colorIdentificacion === c.id && (
                        <Check className="w-4 h-4 stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Alcance, funciones o tipo de régimen institucional..."
                  value={formCat.descripcion}
                  onChange={(e) =>
                    setFormCat({ ...formCat, descripcion: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalCat(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
                >
                  {editandoCatId ? "Guardar Cambios" : "Guardar Categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Cargo */}
      {modalCargo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>
                  {editandoCargoId
                    ? "Editar Cargo / Puesto"
                    : "Nuevo Cargo / Puesto"}
                </span>
              </div>
              <button
                onClick={() => setModalCargo(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleGuardarCargo}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre del Cargo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Profesor Titular, Bedel, Coordinador"
                  value={formCargo.nombre}
                  onChange={(e) =>
                    setFormCargo({ ...formCargo, nombre: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Categoría Institucional *
                </label>
                <select
                  value={formCargo.categoriaId}
                  onChange={(e) =>
                    setFormCargo({ ...formCargo, categoriaId: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                >
                  {categoriasActivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.codigoTag})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado *
                </label>
                <select
                  value={formCargo.estado}
                  onChange={(e) =>
                    setFormCargo({ ...formCargo, estado: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="Activo">Activo (Habilitado)</option>
                  <option value="Inactivo">Inactivo (Baja lógica)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Responsabilidades y perfil del puesto..."
                  value={formCargo.descripcion}
                  onChange={(e) =>
                    setFormCargo({ ...formCargo, descripcion: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalCargo(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
                >
                  {editandoCargoId ? "Guardar Cambios" : "Guardar Cargo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Horario */}
      {modalHorario && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>
                  {editandoHorarioId
                    ? "Editar Horario Preestablecido"
                    : "Nuevo Horario Preestablecido"}
                </span>
              </div>
              <button
                onClick={() => setModalHorario(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleGuardarHorario}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre del Horario *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Administrativo Central (08:00 a 16:00)"
                  value={formHorario.nombre}
                  onChange={(e) =>
                    setFormHorario({ ...formHorario, nombre: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Categoría Aplicable *
                </label>
                <select
                  value={formHorario.categoriaId}
                  onChange={(e) =>
                    setFormHorario({
                      ...formHorario,
                      categoriaId: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                >
                  {categoriasActivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.codigoTag})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado *
                </label>
                <select
                  value={formHorario.estado}
                  onChange={(e) =>
                    setFormHorario({ ...formHorario, estado: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="Activo">Activo (Habilitado)</option>
                  <option value="Inactivo">Inactivo (Baja lógica)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Entrada (Fija) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorario.horaEntrada}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        horaEntrada: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Salida (Fija) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorario.horaEgreso}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        horaEgreso: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Días Laborables Semanales *
                </label>
                <div className="flex gap-1.5">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                    (d) => {
                      const sel = formHorario.dias.includes(d);
                      return (
                        <button
                          type="button"
                          key={d}
                          onClick={() => toggleDia(d)}
                          className={`flex-1 py-2 rounded-xl font-bold transition cursor-pointer ${
                            sel
                              ? "bg-[#4b35e6] text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tolerancia Entrada (minutos)
                  </label>
                  <input
                    type="number"
                    value={formHorario.tolEntrada}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        tolEntrada: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tolerancia Salida (minutos)
                  </label>
                  <input
                    type="number"
                    value={formHorario.tolEgreso}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        tolEgreso: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Máx. Salidas Intermedias
                  </label>
                  <input
                    type="number"
                    value={formHorario.maxSalidas}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        maxSalidas: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tiempo Máx. Fuera (min)
                  </label>
                  <input
                    type="number"
                    value={formHorario.tiempoMaxFuera}
                    onChange={(e) =>
                      setFormHorario({
                        ...formHorario,
                        tiempoMaxFuera: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalHorario(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
                >
                  {editandoHorarioId ? "Guardar Cambios" : "Guardar Horario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Materia / Cátedra */}
      {modalMateria && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>
                  {editandoMateriaId ? "Editar Materia" : "Nueva Materia"}
                </span>
              </div>
              <button
                onClick={() => setModalMateria(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleGuardarMateria}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de la Materia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Álgebra Lineal Aplicada, Física I"
                  value={formMateria.nombre}
                  onChange={(e) =>
                    setFormMateria({ ...formMateria, nombre: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código de Cátedra
                  </label>
                  <input
                    type="text"
                    placeholder="ej. MAT-101"
                    value={formMateria.codigo}
                    onChange={(e) =>
                      setFormMateria({ ...formMateria, codigo: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Departamento / Carrera
                </label>
                <input
                  type="text"
                  placeholder="ej. Departamento de Ciencias Básicas"
                  value={formMateria.departamento}
                  onChange={(e) =>
                    setFormMateria({
                      ...formMateria,
                      departamento: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Aula / Laboratorio Predeterminado
                </label>
                <input
                  type="text"
                  placeholder="ej. Aula Magna 1, Laboratorio 3"
                  value={formMateria.aulaPredeterminada}
                  onChange={(e) =>
                    setFormMateria({
                      ...formMateria,
                      aulaPredeterminada: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado *
                </label>
                <select
                  value={formMateria.estado}
                  onChange={(e) =>
                    setFormMateria({ ...formMateria, estado: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="Activo">
                    Activo (Habilitada en el sistema)
                  </option>
                  <option value="Inactivo">Inactivo (Baja lógica)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMateria(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
                >
                  {editandoMateriaId ? "Guardar Cambios" : "Guardar Cátedra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA UNIFICADO */}
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
