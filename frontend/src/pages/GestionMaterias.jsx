import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Plus,
  FileDown,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
} from "lucide-react";
import { formatearHorasYMinutos } from "../utils/fechasFichaUtils";
import CalendarioSemanalMaterias from "../components/materias/CalendarioSemanalMaterias";
import TablaLiquidacionDocente from "../components/materias/TablaLiquidacionDocente";
import ModalNuevaMateria from "../components/materias/ModalNuevaMateria";
import ModalAlerta from "../components/comunes/ModalAlerta";
import { useAuth } from "../context/AuthContext";
import {
  getMaterias,
  updateMateria,
  deleteMateria,
  reactivarMateria,
} from "../services/configuracionService";
import { getResumenMaterias } from "../services/gestionMateriasService";

export default function GestionMaterias() {
  const { tienePermiso } = useAuth();

  const puedeVerMaterias =
    tienePermiso("MATERIAS_VER") || tienePermiso("PERM_ADMIN_TOTAL");
  const puedeCrear =
    tienePermiso("MATERIAS_CREAR") || tienePermiso("PERM_ADMIN_TOTAL");
  const puedeEditar =
    tienePermiso("MATERIAS_EDITAR") || tienePermiso("PERM_ADMIN_TOTAL");
  const puedeEliminar =
    tienePermiso("MATERIAS_ELIMINAR") || tienePermiso("PERM_ADMIN_TOTAL");
  const puedeLiquidar =
    tienePermiso("LIQUIDACION_DOCENTE") || tienePermiso("PERM_ADMIN_TOTAL");

  const [tab, setTab] = useState("calendario");
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [modalAlta, setModalAlta] = useState(false);

  // Fecha de referencia semanal (Lunes actual)
  const [fechaLunes] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  });

  // Métricas superiores obtenidas 100% desde la BD
  const [metricas, setMetricas] = useState({
    horasDictadas: 0.0,
    horasFijadas: 0.0,
    porcentajeCumplimiento: 0,
    clasesCompletas: 0,
    clasesDesvios: 0,
    clasesFaltas: 0,
    totalLiquidar: 0,
    totalDeduccion: 0,
  });

  // Catálogo ABM
  const [materias, setMaterias] = useState([]);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [loading, setLoading] = useState(false);

  // Modal para Edición Rápida en ABM
  const [materiaAEditar, setMateriaAEditar] = useState(null);

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
      onConfirmar: () => setModalAlerta((p) => ({ ...p, isOpen: false })),
    });
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const finSemana = new Date(fechaLunes + "T00:00:00");
      finSemana.setDate(finSemana.getDate() + 5);
      const fechaFinStr = finSemana.toISOString().split("T")[0];

      const [matsRes, resuRes] = await Promise.allSettled([
        getMaterias(),
        getResumenMaterias(fechaLunes, fechaFinStr),
      ]);

      if (matsRes.status === "fulfilled" && Array.isArray(matsRes.value)) {
        setMaterias(matsRes.value);
      }
      if (resuRes.status === "fulfilled" && resuRes.value?.data) {
        setMetricas(resuRes.value.data);
      }
    } catch (err) {
      console.error("Error al sincronizar datos:", err);
    } finally {
      setLoading(false);
    }
  }, [fechaLunes]);

  useEffect(() => {
    if (puedeVerMaterias) {
      cargarDatos();
    }
  }, [puedeVerMaterias, cargarDatos]);

  const handleEliminarMateria = (id, nombre) => {
    if (!puedeEliminar) return;
    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja materia?",
      mensaje: `¿Está seguro de dar de baja la materia "${nombre}"?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await deleteMateria(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Éxito",
            `La materia "${nombre}" fue dada de baja.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo dar de baja la materia.");
        }
      },
    });
  };

  const handleReactivarMateria = (id, nombre) => {
    if (!puedeEliminar) return;
    setModalAlerta({
      isOpen: true,
      tipo: "info",
      titulo: "¿Reactivar materia?",
      mensaje: `¿Desea reactivar la materia "${nombre}" en el catálogo?`,
      textoConfirmar: "Sí, reactivar",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((p) => ({ ...p, isOpen: false }));
        try {
          await reactivarMateria(id);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Éxito",
            `La materia "${nombre}" fue reactivada.`,
          );
        } catch (err) {
          mostrarAviso("danger", "Error", "No se pudo reactivar la materia.");
        }
      },
    });
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!materiaAEditar) return;
    try {
      await updateMateria(materiaAEditar.id, materiaAEditar);
      setMateriaAEditar(null);
      await cargarDatos();
      mostrarAviso(
        "success",
        "Modificación Exitosa",
        "Los datos de la cátedra fueron actualizados.",
      );
    } catch (err) {
      mostrarAviso("danger", "Error", "No se pudo guardar la modificación.");
    }
  };

  const materiasFiltradas = useMemo(() => {
    return materias.filter((m) => {
      const cumpleEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVOS" && m.activo !== false) ||
        (filtroEstado === "INACTIVOS" && m.activo === false);

      const q = busquedaCatalogo.toLowerCase().trim();
      const cumpleBusqueda =
        !q ||
        m.nombre?.toLowerCase().includes(q) ||
        m.codigo?.toLowerCase().includes(q) ||
        m.departamento?.toLowerCase().includes(q) ||
        m.aulaPredeterminada?.toLowerCase().includes(q);

      return cumpleEstado && cumpleBusqueda;
    });
  }, [materias, filtroEstado, busquedaCatalogo]);

  if (!puedeVerMaterias) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Acceso Restringido
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No cuenta con permisos para consultar la gestión de materias.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4b35e6] shrink-0">
            <BookOpen className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Gestión de Materias
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Calendario semanal, semáforo de horas de clase dictadas y cálculo
              de pago a docentes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMostrarResumen(!mostrarResumen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {mostrarResumen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {mostrarResumen ? "Ocultar resumen" : "Ver resumen"}
          </button>

          {puedeCrear && (
            <button
              type="button"
              onClick={() => setModalAlta(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Nueva Materia
            </button>
          )}

          {puedeLiquidar && (
            <button
              type="button"
              onClick={() => setTab("liquidacion")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              Exportar Liquidación
            </button>
          )}
        </div>
      </div>
      {/* 2. TARJETAS KPI DE RESUMEN */}
      {mostrarResumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Horas Dictadas
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatearHorasYMinutos(metricas.horasDictadas)}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {formatearHorasYMinutos(metricas.horasFijadas)} fijadas
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-600 mt-2 block">
              Cumplimiento: {metricas.porcentajeCumplimiento}%
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Dictadas al 100%
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {metricas.clasesCompletas}{" "}
              <span className="text-xs font-normal text-slate-400">
                clases completas
              </span>
            </div>
            <span className="text-xs font-medium text-slate-500 mt-2 block">
              Sin retrasos ni salidas
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Con Desvíos / Tarde
            </span>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {metricas.clasesDesvios}{" "}
              <span className="text-xs font-normal text-slate-400">
                con incidencias
              </span>
            </div>
            <span className="text-xs font-medium text-slate-500 mt-2 block">
              Llegada tarde o retiro
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              No Dictadas / Falta
            </span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {metricas.clasesFaltas}{" "}
              <span className="text-xs font-normal text-slate-400">
                sin registro
              </span>
            </div>
            <span className="text-xs font-medium text-rose-500 mt-2 block">
              -{(metricas.horasFijadas - metricas.horasDictadas).toFixed(1)}h no
              computadas
            </span>
          </div>

          <div className="bg-[#1e1e38] text-white rounded-2xl p-4 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total a Liquidar
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                ${metricas.totalLiquidar.toLocaleString("es-AR")}
              </div>
            </div>
            <span className="text-[11px] font-medium text-rose-300">
              Deducción: -${metricas.totalDeduccion.toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      )}
      {/* 3. TABS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setTab("calendario")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
              tab === "calendario"
                ? "bg-white text-indigo-700 shadow-xs"
                : "hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4" /> Calendario Semanal
          </button>

          <button
            type="button"
            onClick={() => setTab("catalogo")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
              tab === "catalogo"
                ? "bg-white text-indigo-700 shadow-xs"
                : "hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Catálogo & ABM ({materias.length})
          </button>

          {puedeLiquidar && (
            <button
              type="button"
              onClick={() => setTab("liquidacion")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
                tab === "liquidacion"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-4 h-4" /> Liquidación & Pago Docente
            </button>
          )}
        </div>
      </div>
      {/* 4. CONTENIDO */}
      {tab === "calendario" && <CalendarioSemanalMaterias />}
      {tab === "catalogo" && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busquedaCatalogo}
                onChange={(e) => setBusquedaCatalogo(e.target.value)}
                placeholder="Buscar por materia, código o aula..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Estado:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-600 bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVOS">Solo Activos</option>
                <option value="INACTIVOS">Solo Bajas</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">Materia / Asignatura</th>
                  <th className="px-6 py-3.5">Aula Base</th>
                  <th className="px-6 py-3.5">Tarifa Cátedra</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {materiasFiltradas.length > 0 ? (
                  materiasFiltradas.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {m.nombre}
                        {m.codigo && (
                          <span className="text-slate-400 font-mono text-[11px] block">
                            {m.codigo}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {m.aulaPredeterminada || "Sin asignar"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 font-mono">
                        $
                        {Number(m.tarifaHoraCatedra || 5200).toLocaleString(
                          "es-AR",
                        )}
                        /h
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.activo !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {m.activo !== false ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          {puedeEditar && (
                            <button
                              type="button"
                              onClick={() => setMateriaAEditar({ ...m })}
                              className="p-1 hover:text-indigo-600 transition cursor-pointer"
                              title="Editar materia"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {puedeEliminar &&
                            (m.activo !== false ? (
                              <button
                                type="button"
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
                                type="button"
                                onClick={() =>
                                  handleReactivarMateria(m.id, m.nombre)
                                }
                                className="p-1 hover:text-emerald-600 transition cursor-pointer"
                                title="Reactivar materia"
                              >
                                <RotateCcw className="w-4 h-4 text-emerald-600" />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-slate-400 text-xs"
                    >
                      {loading
                        ? "Cargando materias..."
                        : "No se encontraron materias registradas con los filtros actuales."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "liquidacion" && puedeLiquidar && <TablaLiquidacionDocente />}
      {/* MODAL ALTA DE MATERIA */}
      {modalAlta && puedeCrear && (
        <ModalNuevaMateria
          onClose={() => setModalAlta(false)}
          onCreado={async () => {
            await cargarDatos();
            mostrarAviso(
              "success",
              "Cátedra Asignada",
              "La materia y sus horarios fueron registrados en el cronograma institucional.",
            );
          }}
        />
      )}
      {/* MODAL DE EDICIÓN EN ABM */}
      {materiaAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Editar Cátedra
            </h3>
            <form onSubmit={handleGuardarEdicion} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nombre
                </label>
                <input
                  required
                  value={materiaAEditar.nombre}
                  onChange={(e) =>
                    setMateriaAEditar({
                      ...materiaAEditar,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Aula Predeterminada
                </label>
                <input
                  value={materiaAEditar.aulaPredeterminada || ""}
                  onChange={(e) =>
                    setMateriaAEditar({
                      ...materiaAEditar,
                      aulaPredeterminada: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tarifa Cátedra ($/hora)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={materiaAEditar.tarifaHoraCatedra || 0}
                  onChange={(e) =>
                    setMateriaAEditar({
                      ...materiaAEditar,
                      tarifaHoraCatedra: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-bold"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMateriaAEditar(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Guardar Cambios
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
        onCancelar={() => setModalAlerta((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
