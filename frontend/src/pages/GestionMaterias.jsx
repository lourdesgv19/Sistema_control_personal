import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Calendar,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { formatearHorasYMinutos } from "../utils/fechasFichaUtils";
import CalendarioSemanalMaterias from "../components/materias/CalendarioSemanalMaterias";
import CatalogoMateriasABM from "../components/materias/CatalogoMateriasABM";
import ModalNuevaMateria from "../components/materias/ModalNuevaMateria";
import ModalAlerta from "../components/comunes/ModalAlerta";
import { useAuth } from "../context/AuthContext";
import {
  getResumenMaterias,
  getImpactoBajaMateria,
  deleteMateriaEnCascada,
} from "../services/gestionMateriasService";

export default function GestionMaterias() {
  const { tienePermiso } = useAuth();
  const location = useLocation();

  // 1. Matriz de Permisos Unificada
  const puedeVerCalendario =
    tienePermiso("MATERIAS_CALENDARIO_VER") ||
    tienePermiso("MATERIAS_VER") ||
    tienePermiso("HORARIOS_VER") ||
    tienePermiso("HORARIOS_GESTIONAR") ||
    tienePermiso("PERM_ADMIN_TOTAL");

  const puedeVerCatalogo =
    tienePermiso("MATERIAS_VER") ||
    tienePermiso("HORARIOS_GESTIONAR") ||
    tienePermiso("PERM_ADMIN_TOTAL");

  const puedeCrearMateria =
    tienePermiso("MATERIAS_CREAR") ||
    tienePermiso("HORARIOS_GESTIONAR") ||
    tienePermiso("PERM_ADMIN_TOTAL");

  const puedeEditarMateria =
    tienePermiso("MATERIAS_EDITAR") ||
    tienePermiso("HORARIOS_GESTIONAR") ||
    tienePermiso("PERM_ADMIN_TOTAL");

  const puedeGestionarDocentes =
    tienePermiso("HORARIOS_GESTIONAR") ||
    tienePermiso("HORARIOS_EDITAR") ||
    tienePermiso("HORARIOS_CREAR") ||
    tienePermiso("PERM_ADMIN_TOTAL");

  const puedeEliminarMateria =
    tienePermiso("MATERIAS_ELIMINAR") || tienePermiso("PERM_ADMIN_TOTAL");

  // 2. Tab inicial inteligente
  const [tab, setTab] = useState(() => {
    if (location.state?.tab === "catalogo" && puedeVerCatalogo) {
      return "catalogo";
    }
    return puedeVerCalendario ? "calendario" : "catalogo";
  });

  useEffect(() => {
    if (location.state?.tab === "catalogo") {
      if (puedeVerCatalogo) {
        setTab("catalogo");
      } else if (puedeVerCalendario) {
        setTab("calendario");
      }
    }
  }, [location.state, puedeVerCatalogo, puedeVerCalendario]);

  const [docenteSeleccionadoId] = useState(
    () => location.state?.docenteId || null,
  );
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [modalMateria, setModalMateria] = useState(false);
  const [materiaAEditar, setMateriaAEditar] = useState(null);

  const [fechaLunes] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  });

  const [metricas, setMetricas] = useState({
    horasDictadas: 0.0,
    horasFijadas: 0.0,
    porcentajeCumplimiento: 0,
    clasesCompletas: 0,
    clasesDesvios: 0,
    clasesFaltas: 0,
  });

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
    try {
      const finSemana = new Date(fechaLunes + "T00:00:00");
      finSemana.setDate(finSemana.getDate() + 5);
      const fechaFinStr = finSemana.toISOString().split("T")[0];

      const resuRes = await getResumenMaterias(fechaLunes, fechaFinStr);
      if (resuRes?.data) {
        setMetricas(resuRes.data);
      }
    } catch (err) {
      console.error("Error al sincronizar métricas de materias:", err);
    }
  }, [fechaLunes]);

  useEffect(() => {
    if (puedeVerCalendario || puedeVerCatalogo) {
      cargarDatos();
    }
  }, [puedeVerCalendario, puedeVerCatalogo, cargarDatos]);

  useEffect(() => {
    let timerSync = null;
    const handleSincronizacion = () => {
      if (timerSync) clearTimeout(timerSync);
      timerSync = setTimeout(() => {
        cargarDatos();
      }, 250);
    };

    window.addEventListener("datos:actualizados", handleSincronizacion);
    return () => {
      if (timerSync) clearTimeout(timerSync);
      window.removeEventListener("datos:actualizados", handleSincronizacion);
    };
  }, [cargarDatos]);

  const handleEliminarMateria = async (id, nombre) => {
    if (!puedeEliminarMateria) return;

    try {
      const res = await getImpactoBajaMateria(id);
      const data = res.data;

      let mensajeAviso = `¿Está seguro de dar de baja la materia "${nombre}"?`;
      if (data.totalHorariosAfectados > 0) {
        const detalleHorarios = data.horariosAfectados
          .slice(0, 5)
          .map(
            (h) =>
              `• ${h.diaNombre} ${h.horaInicio} a ${h.horaFin} hs (${h.docenteNombre})`,
          )
          .join("\n");

        const sufijoMas =
          data.totalHorariosAfectados > 5
            ? `\n... y ${data.totalHorariosAfectados - 5} comisiones más.`
            : "";

        mensajeAviso = `ADVERTENCIA: Esta cátedra tiene ${data.totalHorariosAfectados} comisiones activas que también se darán de baja del cronograma:\n\n${detalleHorarios}${sufijoMas}\n\n¿Desea confirmar la baja en cascada?`;
      }

      setModalAlerta({
        isOpen: true,
        tipo: "danger",
        titulo: "¿Dar de baja cátedra y horarios?",
        mensaje: mensajeAviso,
        textoConfirmar: "Sí, dar de baja",
        textoCancelar: "Cancelar",
        mostrarCancelar: true,
        onConfirmar: async () => {
          setModalAlerta((p) => ({ ...p, isOpen: false }));
          try {
            await deleteMateriaEnCascada(id);
            window.dispatchEvent(new CustomEvent("datos:actualizados"));
            await cargarDatos();
            mostrarAviso(
              "success",
              "Baja Exitosa",
              `La materia "${nombre}" y sus horarios asociados fueron dados de baja correctamente.`,
            );
          } catch (err) {
            mostrarAviso(
              "danger",
              "Error",
              "No se pudo dar de baja la materia.",
            );
          }
        },
      });
    } catch (err) {
      mostrarAviso(
        "danger",
        "Error",
        "No se pudo verificar el impacto de la materia.",
      );
    }
  };

  const handleAbrirCrear = () => {
    if (!puedeCrearMateria) return;
    setMateriaAEditar(null);
    setModalMateria(true);
  };

  const handleAbrirEditarHorario = (horario, materia) => {
    if (!puedeEditarMateria && !puedeGestionarDocentes) return;
    setMateriaAEditar({
      idMateria: materia.idMateria,
      nombre: materia.nombre,
      codigo: materia.codigo,
      aula: horario.aula,
      diaSemana: horario.diaSemana,
      diasSemana: [horario.diaSemana],
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      idDocenteTitular: horario.idDocente || materia.idDocenteTitular,
      idDocenteAuxiliar: materia.idDocenteAuxiliar || null,
      idHorario: horario.idHorario,
      tipoFrecuencia: horario.tipoFrecuencia || "SEMANAL",
      repeticionesPeriodo: horario.repeticionesPeriodo || 1,
      semanaAlterna: horario.semanaAlterna || "PAR",
    });
    setModalMateria(true);
  };

  const handleAbrirAsignarDocente = (materia) => {
    if (!puedeGestionarDocentes && !puedeEditarMateria) return;
    const primerHorario =
      materia.desgloseHorarios && materia.desgloseHorarios.length > 0
        ? materia.desgloseHorarios[0]
        : null;

    setMateriaAEditar({
      idMateria: materia.idMateria,
      nombre: materia.nombre,
      codigo: materia.codigo,
      aula: primerHorario?.aula || materia.aulaPredeterminada || "",
      diaSemana: primerHorario?.diaSemana || 1,
      diasSemana: primerHorario ? [primerHorario.diaSemana] : [1],
      horaInicio: primerHorario?.horaInicio || "08:30",
      horaFin: primerHorario?.horaFin || "12:30",
      idDocenteTitular: materia.idDocenteTitular || "",
      idDocenteAuxiliar: materia.idDocenteAuxiliar || "",
      idHorario: primerHorario?.idHorario || null,
      tipoFrecuencia: primerHorario?.tipoFrecuencia || "SEMANAL",
      repeticionesPeriodo: primerHorario?.repeticionesPeriodo || 1,
      semanaAlterna: primerHorario?.semanaAlterna || "PAR",
    });
    setModalMateria(true);
  };

  if (!puedeVerCalendario && !puedeVerCatalogo) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Acceso Restringido
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No cuenta con permisos para consultar la gestión de materias ni el
            cronograma semanal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4b35e6] shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Gestión de Materias
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Calendario semanal, semáforo de horas de clase dictadas y
              cumplimiento de cátedras.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setMostrarResumen(!mostrarResumen)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {mostrarResumen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {mostrarResumen ? "Ocultar resumen" : "Ver resumen"}
          </button>

          {puedeCrearMateria && (
            <button
              type="button"
              onClick={handleAbrirCrear}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Materia</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI METRICS */}
      {mostrarResumen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Horas Dictadas
            </span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono">
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
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
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
            <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
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
            <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
              {metricas.clasesFaltas}{" "}
              <span className="text-xs font-normal text-slate-400">
                sin registro
              </span>
            </div>
            <span className="text-xs font-medium text-rose-500 mt-2 block truncate">
              -{(metricas.horasFijadas - metricas.horasDictadas).toFixed(1)}h no
              computadas
            </span>
          </div>
        </div>
      )}

      {/* SELECTOR DE PESTAÑAS */}
      {(puedeVerCalendario || puedeVerCatalogo) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex items-center justify-between">
          <div className="flex w-full sm:w-auto bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {puedeVerCalendario && (
              <button
                type="button"
                onClick={() => setTab("calendario")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition cursor-pointer ${
                  tab === "calendario"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Calendario Semanal</span>
              </button>
            )}

            {puedeVerCatalogo && (
              <button
                type="button"
                onClick={() => setTab("catalogo")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition cursor-pointer ${
                  tab === "catalogo"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Catálogo & ABM</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {tab === "calendario" && puedeVerCalendario && (
        <CalendarioSemanalMaterias
          onEditarMateriaParam={(clase) => {
            if (!puedeEditarMateria && !puedeGestionarDocentes) return;
            setMateriaAEditar({
              idMateria: clase.idMateria,
              nombre: clase.nombreMateria,
              aula: clase.aula,
              diaSemana: clase.diaSemana,
              diasSemana: [clase.diaSemana],
              horaInicio: clase.horaInicio,
              horaFin: clase.horaFin,
              idDocenteTitular: clase.idDocente,
              idHorario: clase.idHorario,
            });
            setModalMateria(true);
          }}
        />
      )}

      {tab === "catalogo" && puedeVerCatalogo && (
        <CatalogoMateriasABM
          docenteInicialId={docenteSeleccionadoId}
          onNuevaMateria={handleAbrirCrear}
          onEditarMateria={(materia) => {
            if (!puedeEditarMateria) return;
            setMateriaAEditar({
              idMateria: materia.idMateria,
              nombre: materia.nombre,
              codigo: materia.codigo,
              aula: materia.aulaPredeterminada,
              idDocenteTitular: materia.idDocenteTitular,
            });
            setModalMateria(true);
          }}
          onEditarHorario={(horario, materia) => {
            if (!puedeEditarMateria && !puedeGestionarDocentes) return;
            handleAbrirEditarHorario(horario, materia);
          }}
          onAsignarDocente={handleAbrirAsignarDocente}
          onEliminarMateria={handleEliminarMateria}
          puedeCrear={puedeCrearMateria}
          puedeEditar={puedeEditarMateria}
          puedeGestionarDocente={puedeGestionarDocentes}
          puedeEliminar={puedeEliminarMateria}
        />
      )}

      {/* MODAL DE NUEVA / EDICIÓN DE MATERIA */}
      {modalMateria &&
        (puedeCrearMateria || puedeEditarMateria || puedeGestionarDocentes) && (
          <ModalNuevaMateria
            materiaAEditar={materiaAEditar}
            onClose={() => {
              setModalMateria(false);
              setMateriaAEditar(null);
            }}
            onCreado={async () => {
              await cargarDatos();
              mostrarAviso(
                "success",
                "Operación Exitosa",
                materiaAEditar
                  ? "La cátedra y sus horarios fueron actualizados correctamente."
                  : "La nueva materia fue registrada en el cronograma institucional.",
              );
            }}
          />
        )}

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
