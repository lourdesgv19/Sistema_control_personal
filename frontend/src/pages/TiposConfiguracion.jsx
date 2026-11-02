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
  Loader2,
  RotateCcw,
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
} from "../services/configuracionService";
import ModalAlerta from "../components/comunes/ModalAlerta";
import ModalCategoria from "../components/configuracion/ModalCategoria";
import ModalCargo from "../components/configuracion/ModalCargo";
import ModalHorario from "../components/configuracion/ModalHorario";
import { buscarSimilar } from "../utils/textSimilarity";
import { useAuth } from "../context/AuthContext";

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
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${
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

  const puedeEditarCategorias = tienePermiso("CONFIG_EDITAR_CATEGORIAS");
  const puedeEditarCargos = tienePermiso("CONFIG_EDITAR_CARGOS");
  const puedeEditarTurnos = tienePermiso("CONFIG_EDITAR_MATERIAS_TURNOS");

  const [activeTab, setActiveTab] = useState("categorias");
  const [loading, setLoading] = useState(true);

  const [categorias, setCategorias] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [horarios, setHorarios] = useState([]);

  const [filtroEstadoCat, setFiltroEstadoCat] = useState("TODOS");
  const [filtroEstadoCargo, setFiltroEstadoCargo] = useState("TODOS");
  const [filtroEstadoHorario, setFiltroEstadoHorario] = useState("TODOS");

  const [cargoSearch, setCargoSearch] = useState("");
  const [cargoCategoryFilter, setCargoCategoryFilter] = useState("TODAS");
  const [horarioCategoryFilter, setHorarioCategoryFilter] = useState("TODOS");

  const [modalCat, setModalCat] = useState(false);
  const [editandoCatId, setEditandoCatId] = useState(null);

  const [modalCargo, setModalCargo] = useState(false);
  const [editandoCargoId, setEditandoCargoId] = useState(null);

  const [modalHorario, setModalHorario] = useState(false);
  const [editandoHorarioId, setEditandoHorarioId] = useState(null);

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

  const [formCat, setFormCat] = useState(FORM_CAT_INICIAL);
  const [formCargo, setFormCargo] = useState(FORM_CARGO_INICIAL);
  const [formHorario, setFormHorario] = useState(FORM_HORARIO_INICIAL);

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
      const [catsRes, cargosRes, horariosRes] = await Promise.allSettled([
        getCategorias(),
        getCargos(),
        getHorarios(),
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

      setCategorias(listaCats);
      setCargos(listaCargos);
      setHorarios(listaHorarios);

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

  const categoriasActivas = categorias.filter((c) => c.activo !== false);

  // --- HANDLERS CATEGORÍAS ---
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
          `Ya existe una categoría registrada como "${coincidencia.item.nombre}".`,
        );
        return;
      }
      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formCat.nombre}" es similar a "${coincidencia.item.nombre}". ¿Desea guardarlo de todas formas?`,
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
      mensaje: `¿Desea dar de baja la categoría "${nombre}"?`,
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
      mensaje: `¿Desea reactivar la categoría "${nombre}"?`,
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

  // --- HANDLERS CARGOS ---
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
            "Los cambios se guardaron exitosamente.",
          );
        } else {
          await createCargo(payload);
          mostrarAviso(
            "success",
            "Cargo Registrado",
            "El cargo se ha creado correctamente.",
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
          err.response?.data?.message || "No se pudo guardar el cargo.",
        );
      }
    };

    if (coincidencia) {
      if (coincidencia.tipo === "EXACTO") {
        mostrarAviso(
          "danger",
          "Cargo Duplicado",
          `Ya existe un cargo registrado como "${coincidencia.item.nombre}".`,
        );
        return;
      }
      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formCargo.nombre}" es similar a "${coincidencia.item.nombre}". ¿Desea guardarlo?`,
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

  // --- HANDLERS HORARIOS ---
  const abrirModalCrearHorario = () => {
    if (!puedeEditarTurnos) return;
    setEditandoHorarioId(null);
    setFormHorario({
      ...FORM_HORARIO_INICIAL,
      categoriaId: categoriasActivas[0]?.id || "",
    });
    setModalHorario(true);
  };

  const abrirModalEditarHorario = (h) => {
    if (!puedeEditarTurnos) return;
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
    if (!puedeEditarTurnos) return;

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
        "La hora de egreso debe ser posterior a la de entrada.",
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
          tolEntradaMin: parseInt(formHorario.tolEntrada, 10) || 15,
          tolEgresoMin: parseInt(formHorario.tolEgreso, 10) || 10,
          maxSalidasIntermedias: parseInt(formHorario.maxSalidas, 10) || 2,
          tiempoMaxFueraMin: parseInt(formHorario.tiempoMaxFuera, 10) || 45,
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
          `Ya existe un horario registrado como "${coincidencia.item.nombre}".`,
        );
        return;
      }
      if (coincidencia.tipo === "SIMILAR") {
        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: "¿Desea continuar?",
          mensaje: `El nombre "${formHorario.nombre}" es similar al horario "${coincidencia.item.nombre}". ¿Desea guardarlo?`,
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
    if (!puedeEditarTurnos) return;
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
    if (!puedeEditarTurnos) return;
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

  // --- FILTROS DE LISTAS ---
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
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* 1. HEADER PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#4b35e6] flex items-center justify-center text-white shadow-md shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Configuración del Sistema
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Gestión centralizada de Categorías, Cargos y Tabla de Horarios
              Preestablecidos
            </p>
          </div>
        </div>

        {/* Subpestañas fluidas */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("categorias")}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === "categorias"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Categorías</span>
            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {categorias.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cargos")}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === "cargos"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Cargos y Puestos</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {cargos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("horarios")}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === "horarios"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Tabla de Horarios</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {horarios.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================
          VISTA 1: CATEGORÍAS DE PERSONAL
         ======================================================== */}
      {activeTab === "categorias" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 sm:pb-2 gap-3 sm:gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Categorías de Personal
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Listado de categorías con nombre y estado de vigencia
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs flex-1 sm:flex-initial">
                <span className="text-slate-500 font-medium">Estado:</span>
                <select
                  value={filtroEstadoCat}
                  onChange={(e) => setFiltroEstadoCat(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs cursor-pointer flex-1 sm:flex-initial"
                >
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="TODOS">Todos</option>
                  <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
                </select>
              </div>

              {puedeEditarCategorias ? (
                <button
                  onClick={abrirModalCrearCategoria}
                  className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nueva Categoría</span>
                </button>
              ) : (
                <span
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                  title="Requiere permiso CONFIG_EDITAR_CATEGORIAS"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Creación Restringida</span>
                </span>
              )}
            </div>
          </div>

          {/* VISTA MÓVIL CATEGORÍAS (md:hidden) — TARJETAS TÁCTILES */}
          <div className="md:hidden divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {filteredCategorias.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No se encontraron categorías registradas con este estado.
              </div>
            ) : (
              filteredCategorias.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-4 space-y-2.5 transition-colors ${
                    cat.activo === false
                      ? "bg-slate-50/60 opacity-80"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {cat.nombre}
                      </h3>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase border ${getBadgeColorClasses(
                            cat.colorIdentificacion,
                          )}`}
                        >
                          {cat.codigoTag?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <StatusBadge activo={cat.activo} />
                  </div>

                  {cat.descripcion && (
                    <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {cat.descripcion}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-slate-400">
                    {puedeEditarCategorias ? (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirModalEditarCategoria(cat)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        {cat.activo !== false ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleEliminarCategoria(cat.id, cat.nombre)
                            }
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Baja</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleReactivarCategoria(cat.id, cat.nombre)
                            }
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reactivar</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="p-1 text-slate-300">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO CATEGORÍAS (hidden md:block) — TABLA COMPLETA */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 sm:pb-2 gap-3 sm:gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Catálogo de Cargos y Puestos
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Estructura de cargos asignables a los colaboradores con vigencia
                y descripción
              </p>
            </div>
            {puedeEditarCargos ? (
              <button
                onClick={abrirModalCrearCargo}
                className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md transition cursor-pointer w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo Cargo</span>
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                title="Requiere permiso CONFIG_EDITAR_CARGOS"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Creación Restringida</span>
              </span>
            )}
          </div>

          <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-medium text-slate-500">Categoría:</span>
                <select
                  value={cargoCategoryFilter}
                  onChange={(e) => setCargoCategoryFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs bg-white outline-none focus:border-indigo-500 flex-1 sm:flex-initial"
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
                  className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 sm:py-2 text-xs outline-none focus:border-indigo-600 transition shadow-xs flex-1 sm:flex-initial"
                >
                  <option value="ACTIVOS">Solo Activos</option>
                  <option value="TODOS">Todos</option>
                  <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
                </select>
              </div>
            </div>
          </div>

          {/* VISTA MÓVIL CARGOS (md:hidden) — TARJETAS TÁCTILES */}
          <div className="md:hidden divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {filteredCargos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No se encontraron cargos coincidentes con los filtros aplicados.
              </div>
            ) : (
              filteredCargos.map((cg) => (
                <div
                  key={cg.id}
                  className={`p-4 space-y-2.5 transition-colors ${
                    cg.activo === false
                      ? "bg-slate-50/60 opacity-80"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {cg.nombre}
                      </h3>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase border ${getBadgeColorClasses(
                            cg.categoria?.colorIdentificacion,
                          )}`}
                        >
                          {cg.categoria?.codigoTag?.toUpperCase() ||
                            cg.categoria?.nombre?.toUpperCase() ||
                            "DOCENTES"}
                        </span>
                      </div>
                    </div>
                    <StatusBadge activo={cg.activo} />
                  </div>

                  <div className="text-slate-600 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                    <AlignLeft className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {cg.descripcion || (
                        <em className="text-slate-400">Sin descripción</em>
                      )}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-slate-400">
                    {puedeEditarCargos ? (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirModalEditarCargo(cg)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        {cg.activo !== false ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleEliminarCargo(cg.id, cg.nombre)
                            }
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Baja</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleReactivarCargo(cg.id, cg.nombre)
                            }
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reactivar</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="p-1 text-slate-300">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO CARGOS (hidden md:block) — TABLA COMPLETA */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
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
                          {cg.descripcion || (
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 sm:pb-2 gap-3 sm:gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Tabla de Horarios Preestablecidos
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Horarios corporativos y parámetros de tolerancia para asignación
                directa o por régimen
              </p>
            </div>
            {puedeEditarTurnos ? (
              <button
                onClick={abrirModalCrearHorario}
                className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-md transition cursor-pointer w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo Horario Preestablecido</span>
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold select-none cursor-not-allowed"
                title="Requiere permiso CONFIG_EDITAR_MATERIAS_TURNOS"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Creación Restringida</span>
              </span>
            )}
          </div>

          <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-slate-500 font-medium shrink-0">
                Categoría:
              </span>
              {["TODOS", ...categoriasActivas.map((c) => c.nombre)].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setHorarioCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 whitespace-nowrap ${
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

            <div className="flex items-center gap-2 text-slate-600 self-start sm:self-auto">
              <span className="font-medium text-slate-500">Estado:</span>
              <select
                value={filtroEstadoHorario}
                onChange={(e) => setFiltroEstadoHorario(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-indigo-600 transition shadow-xs"
              >
                <option value="ACTIVOS">Solo Activos</option>
                <option value="TODOS">Todos</option>
                <option value="INACTIVOS">Solo Bajas (Inactivos)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredHorarios.map((h) => {
              const diasArray = h.diasLaborables
                ? h.diasLaborables.split(",")
                : [];
              return (
                <div
                  key={h.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between transition-colors ${
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
                        {puedeEditarTurnos ? (
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

                    <h3 className="text-sm font-bold text-slate-900 mb-2.5 sm:mb-3">
                      {h.nombre}
                    </h3>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 mb-3 sm:mb-4">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {h.horaEntrada?.substring(0, 5)} →{" "}
                        {h.horaEgreso?.substring(0, 5)} hs
                      </span>
                    </div>

                    <div className="mb-4 sm:mb-5">
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

                  {/* BLOQUE INFERIOR: TOLERANCIAS Y SALIDAS */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-[#f8fafc] p-2 rounded-xl">
                      <div className="text-[9px] font-bold uppercase text-slate-400">
                        Tol. Entrada
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {h.tolEntradaMin ?? 15}m
                      </div>
                    </div>
                    <div className="bg-[#f8fafc] p-2 rounded-xl">
                      <div className="text-[9px] font-bold uppercase text-slate-400">
                        Tol. Salida
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {h.tolEgresoMin ?? 10}m
                      </div>
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/60">
                      <div className="text-[9px] font-bold uppercase text-indigo-700">
                        Máx. Salidas
                      </div>
                      <div className="text-xs font-bold text-indigo-900 mt-0.5">
                        {h.maxSalidasIntermedias ?? 2}
                      </div>
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/60">
                      <div className="text-[9px] font-bold uppercase text-indigo-700">
                        Tiempo Fuera
                      </div>
                      <div className="text-xs font-bold text-indigo-900 mt-0.5">
                        {h.tiempoMaxFueraMin ?? 45}m
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
          MODALES DE FORMULARIO MODULARIZADOS
         ======================================================== */}
      <ModalCategoria
        isOpen={modalCat}
        onClose={() => setModalCat(false)}
        onSubmit={handleGuardarCategoria}
        formCat={formCat}
        setFormCat={setFormCat}
        editandoCatId={editandoCatId}
      />

      <ModalCargo
        isOpen={modalCargo}
        onClose={() => setModalCargo(false)}
        onSubmit={handleGuardarCargo}
        formCargo={formCargo}
        setFormCargo={setFormCargo}
        editandoCargoId={editandoCargoId}
        categoriasActivas={categoriasActivas}
      />

      <ModalHorario
        isOpen={modalHorario}
        onClose={() => setModalHorario(false)}
        onSubmit={handleGuardarHorario}
        formHorario={formHorario}
        setFormHorario={setFormHorario}
        editandoHorarioId={editandoHorarioId}
        categoriasActivas={categoriasActivas}
      />

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
