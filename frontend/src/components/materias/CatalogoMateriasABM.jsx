import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
} from "lucide-react";
import { getCatalogoMateriasAgrupadas } from "../../services/gestionMateriasService";
import { removeEmpleadoHorario } from "../../services/empleadoService";
import ModalAlerta from "../comunes/ModalAlerta";

const DIAS_ORDEN = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function CatalogoMateriasABM({
  onNuevaMateria,
  onEditarMateria,
  onEditarHorario,
  onEliminarMateria,
  filtroDocente = "",
  busqueda = "",
  puedeCrear,
  puedeEditar,
  puedeEliminar,
}) {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState([]);

  // Estado para ModalAlerta
  const [modalAlerta, setModalAlerta] = useState({
    isOpen: false,
    tipo: "info",
    titulo: "",
    mensaje: "",
    textoConfirmar: "Confirmar",
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
    try {
      const res = await getCatalogoMateriasAgrupadas();
      const lista = Array.isArray(res.data) ? res.data : [];
      setMaterias(lista);
      if (lista.length > 0) {
        setExpandidos([lista[0].idMateria]);
      }
    } catch (err) {
      console.error("Error al cargar catálogo de materias agrupadas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleExpandir = (id) => {
    setExpandidos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleTodos = () => {
    if (expandidos.length === materiasFiltradas.length) {
      setExpandidos([]);
    } else {
      setExpandidos(materiasFiltradas.map((m) => m.idMateria));
    }
  };

  const materiasFiltradas = useMemo(() => {
    return materias.filter((m) => {
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda =
        !q ||
        m.nombre?.toLowerCase().includes(q) ||
        m.codigo?.toLowerCase().includes(q) ||
        m.aulaPredeterminada?.toLowerCase().includes(q);

      const matchDocente =
        !filtroDocente || String(m.idDocenteTitular) === String(filtroDocente);

      return matchBusqueda && matchDocente;
    });
  }, [materias, busqueda, filtroDocente]);

  // Baja de comisión / franja horaria individual con ModalAlerta
  const handleConfirmarBajaHorario = (horario, nombreMateria) => {
    if (!puedeEliminar) return;

    setModalAlerta({
      isOpen: true,
      tipo: "danger",
      titulo: "¿Dar de baja comisión?",
      mensaje: `¿Desea desvincular el horario de ${horario.diaNombre} (${horario.horaInicio} - ${horario.horaFin} hs) para la cátedra "${nombreMateria}"?`,
      textoConfirmar: "Sí, dar de baja",
      textoCancelar: "Cancelar",
      mostrarCancelar: true,
      onConfirmar: async () => {
        setModalAlerta((prev) => ({ ...prev, isOpen: false }));
        try {
          await removeEmpleadoHorario(horario.idHorario);
          await cargarDatos();
          mostrarAviso(
            "success",
            "Baja Confirmada",
            "La comisión y su horario fueron dados de baja correctamente.",
          );
        } catch (err) {
          mostrarAviso(
            "danger",
            "Error",
            "No se pudo eliminar el horario asignado.",
          );
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
        Cargando catálogo de asignaturas académicas...
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
      {/* HEADER DE LA SECCIÓN */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Catálogo de Asignaturas Académicas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {materiasFiltradas.length} materias
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Materias agrupadas sin repetición de títulos. Desglose desplegable
            con los diferentes días, horarios y profesores asignados.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTodos}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {expandidos.length === materiasFiltradas.length ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                <span>Colapsar todas las materias</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                <span>Desglosar todas las materias</span>
              </>
            )}
          </button>

          {puedeCrear && (
            <button
              type="button"
              onClick={onNuevaMateria}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar Materia</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE MATERIAS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Materia / Comisiones</th>
              <th className="py-3 px-4">Aula(s)</th>
              <th className="py-3 px-4">Días & Carga Semanal</th>
              <th className="py-3 px-4">Docente(s) a Cargo</th>
              <th className="py-3 px-4 text-right">Tarifa / Hora</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {materiasFiltradas.map((materia) => {
              const estaExpandido = expandidos.includes(materia.idMateria);

              return (
                <React.Fragment key={materia.idMateria}>
                  <tr className="hover:bg-slate-50/70 transition-colors bg-white">
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpandir(materia.idMateria)}
                        className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1"
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-200 ${
                            estaExpandido ? "rotate-90 text-indigo-600" : ""
                          }`}
                        />
                      </button>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4b35e6] shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {materia.nombre}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {materia.totalHorarios} horarios
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {materia.totalHorarios} clases por semana en
                            cronograma
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{materia.aulaPredeterminada}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {DIAS_ORDEN.map((dia) => {
                          const activo = materia.diasResumen.includes(dia);
                          return (
                            <span
                              key={dia}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                activo
                                  ? "bg-slate-100 text-slate-800 border-slate-200 font-bold"
                                  : "text-slate-300 border-transparent"
                              }`}
                            >
                              {dia}
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {materia.totalHorasSemanales.toFixed(1)}h reloj / semana
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {materia.docenteTitularNombre.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800 text-xs truncate max-w-[150px]">
                          {materia.docenteTitularNombre}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="font-bold text-slate-900 text-xs font-mono">
                        ${materia.tarifaHora.toLocaleString("es-AR")}/h
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Tarifa cátedra
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpandir(materia.idMateria)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                        >
                          {estaExpandido ? "Ocultar" : "Desglosar"}
                        </button>

                        {puedeCrear && (
                          <button
                            type="button"
                            onClick={() =>
                              onEditarMateria && onEditarMateria(materia)
                            }
                            className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                            title="Agregar horario a esta cátedra"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}

                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() =>
                              onEliminarMateria &&
                              onEliminarMateria(
                                materia.idMateria,
                                materia.nombre,
                              )
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Dar de baja materia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* DESGLOSE DESPLEGABLE DE DÍAS Y HORARIOS */}
                  {estaExpandido &&
                    materia.desgloseHorarios.map((horario) => (
                      <tr
                        key={horario.idHorario}
                        className="bg-indigo-50/20 border-l-4 border-indigo-600 hover:bg-indigo-50/40 transition-colors text-xs"
                      >
                        <td className="py-3 px-4 text-center">
                          <span className="text-indigo-600 font-bold text-sm">
                            ↳
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {horario.diaNombre}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {horario.horaInicio} - {horario.horaFin} (
                            {horario.horasClase.toFixed(1)}h)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{horario.aula}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {horario.turnoEtiqueta}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {horario.nombreDocente.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {horario.nombreDocente}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Leg. {horario.legajoDocente}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-slate-900 font-mono">
                            ${horario.tarifaHora.toLocaleString("es-AR")}/h
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ${horario.totalPorClase.toLocaleString("es-AR")} por
                            clase
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-400">
                            {puedeEditar && (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditarHorario &&
                                  onEditarHorario(horario, materia)
                                }
                                className="p-1 hover:text-indigo-600 transition cursor-pointer"
                                title="Editar horario de la clase"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {puedeEliminar && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmarBajaHorario(
                                    horario,
                                    materia.nombre,
                                  )
                                }
                                className="p-1 hover:text-rose-600 transition cursor-pointer"
                                title="Eliminar este horario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL ALERTA CENTRALIZADO */}
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
