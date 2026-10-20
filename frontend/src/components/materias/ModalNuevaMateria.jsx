import React, { useState, useEffect, useMemo } from "react";
import { X, Clock, Users, Loader2, DollarSign, Calculator } from "lucide-react";
import { postNuevaMateria } from "../../services/gestionMateriasService";
import { updateMateria } from "../../services/configuracionService";
import {
  getEmpleadosActivos,
  addEmpleadoHorario,
  removeEmpleadoHorario,
} from "../../services/empleadoService";
import ModalAlerta from "../comunes/ModalAlerta";

const DIAS_OPCIONES = [
  { id: 1, label: "Lunes" },
  { id: 2, label: "Martes" },
  { id: 3, label: "Miércoles" },
  { id: 4, label: "Jueves" },
  { id: 5, label: "Viernes" },
  { id: 6, label: "Sábado" },
];

export default function ModalNuevaMateria({
  onClose,
  onCreado,
  materiaAEditar = null,
}) {
  const esEdicion = Boolean(materiaAEditar);

  const [docentes, setDocentes] = useState([]);
  const [loadingDocentes, setLoadingDocentes] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Modo de ingreso de tarifa: "HORA" | "CLASE"
  const [tipoIngresoTarifa, setTipoIngresoTarifa] = useState("HORA");
  const [tarifaClaseInput, setTarifaClaseInput] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    codigo: "",
    departamento: "Ciencias Básicas",
    aula: "",
    diasSemana: [1],
    horaInicio: "08:30",
    horaFin: "12:30",
    idDocenteTitular: "",
    tarifaHora: 5200,
    observaciones: "",
    forzarGuardado: false,
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

  // Cálculo de duración en horas de la clase
  const duracionHoras = useMemo(() => {
    if (!form.horaInicio || !form.horaFin) return 1;
    const [hIni, mIni] = form.horaInicio.split(":").map(Number);
    const [hFin, mFin] = form.horaFin.split(":").map(Number);
    const minTotales = hFin * 60 + mFin - (hIni * 60 + mIni);
    return minTotales > 0 ? minTotales / 60 : 1;
  }, [form.horaInicio, form.horaFin]);

  // Carga de datos de edición cuando se pasa una materia/horario existente
  useEffect(() => {
    if (materiaAEditar) {
      const diasArray = materiaAEditar.diaSemana
        ? [Number(materiaAEditar.diaSemana)]
        : materiaAEditar.diasSemana || [1];

      const tarifaBase = Number(
        materiaAEditar.tarifaHora || materiaAEditar.tarifaHoraCatedra || 5200,
      );

      setForm({
        nombre: materiaAEditar.nombre || materiaAEditar.nombreMateria || "",
        codigo: materiaAEditar.codigo || "",
        departamento: materiaAEditar.departamento || "Ciencias Básicas",
        aula: materiaAEditar.aula || materiaAEditar.aulaPredeterminada || "",
        diasSemana: diasArray,
        horaInicio: materiaAEditar.horaInicio
          ? materiaAEditar.horaInicio.slice(0, 5)
          : "08:30",
        horaFin: materiaAEditar.horaFin
          ? materiaAEditar.horaFin.slice(0, 5)
          : "12:30",
        idDocenteTitular:
          materiaAEditar.idDocente || materiaAEditar.idDocenteTitular || "",
        tarifaHora: tarifaBase,
        observaciones: materiaAEditar.observaciones || "",
        forzarGuardado: false,
      });

      setTarifaClaseInput(Math.round(tarifaBase * duracionHoras));
    }
  }, [materiaAEditar]);

  // Recalcular la tarifa total por clase cuando cambia la hora o la tarifa hora
  useEffect(() => {
    if (tipoIngresoTarifa === "HORA") {
      setTarifaClaseInput(Math.round(form.tarifaHora * duracionHoras));
    }
  }, [form.tarifaHora, duracionHoras, tipoIngresoTarifa]);

  // Carga del listado real de docentes
  useEffect(() => {
    const cargarDocentes = async () => {
      try {
        const data = await getEmpleadosActivos();
        const lista = Array.isArray(data) ? data : [];
        setDocentes(lista);
        if (lista.length > 0 && !materiaAEditar) {
          setForm((f) => ({ ...f, idDocenteTitular: lista[0].id }));
        }
      } catch (e) {
        mostrarAviso(
          "danger",
          "Error",
          "No se pudo cargar la lista de docentes.",
        );
      } finally {
        setLoadingDocentes(false);
      }
    };
    cargarDocentes();
  }, [materiaAEditar]);

  const toggleDia = (id) => {
    setForm((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(id)
        ? prev.diasSemana.filter((d) => d !== id)
        : [...prev.diasSemana, id].sort((a, b) => a - b),
    }));
  };

  // Manejo de ingreso por hora
  const handleCambioTarifaHora = (valorHora) => {
    const num = Number(valorHora);
    setForm((prev) => ({ ...prev, tarifaHora: num }));
    setTarifaClaseInput(Math.round(num * duracionHoras));
  };

  // Manejo de ingreso por clase (calcula automáticamente $/hora)
  const handleCambioTarifaClase = (valorClase) => {
    setTarifaClaseInput(valorClase);
    const numClase = Number(valorClase);
    if (numClase >= 0 && duracionHoras > 0) {
      const calculadaHora = Math.round(numClase / duracionHoras);
      setForm((prev) => ({ ...prev, tarifaHora: calculadaHora }));
    }
  };

  const handleGuardar = async (forzar = false) => {
    if (!form.nombre.trim()) {
      mostrarAviso(
        "warning",
        "Campo Requerido",
        "Ingrese el nombre de la materia.",
      );
      return;
    }
    if (form.diasSemana.length === 0) {
      mostrarAviso(
        "warning",
        "Días Requeridos",
        "Debe seleccionar al menos un día de dictado.",
      );
      return;
    }
    if (!form.idDocenteTitular) {
      mostrarAviso(
        "warning",
        "Docente Requerido",
        "Seleccione el docente titular a cargo.",
      );
      return;
    }

    setGuardando(true);
    try {
      if (esEdicion) {
        const materiaId = materiaAEditar.idMateria || materiaAEditar.id;

        // 1. Actualizar los datos maestros de la cátedra
        await updateMateria(materiaId, {
          id: materiaId,
          nombre: form.nombre.trim(),
          codigo: form.codigo.trim(),
          departamento: form.departamento,
          aulaPredeterminada: form.aula.trim(),
          tarifaHoraCatedra: form.tarifaHora,
          activo: true,
        });

        // 2. Si se editó una comisión puntual (tenía idHorario)
        if (materiaAEditar.idHorario) {
          await removeEmpleadoHorario(materiaAEditar.idHorario);
          await addEmpleadoHorario(form.idDocenteTitular, {
            diasSemana: form.diasSemana,
            horaEntrada:
              form.horaInicio.length === 5
                ? `${form.horaInicio}:00`
                : form.horaInicio,
            horaSalida:
              form.horaFin.length === 5 ? `${form.horaFin}:00` : form.horaFin,
            materiaId: materiaId,
            etiqueta: form.nombre.trim(),
            aula: form.aula.trim(),
            forzarGuardado: forzar,
            tipoFrecuencia: "SEMANAL",
            repeticionesPeriodo: 1,
          });
        }
      } else {
        // Alta nueva estándar
        const payload = {
          ...form,
          forzarGuardado: forzar,
        };
        await postNuevaMateria(payload);
      }

      onCreado();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "";

      if (
        msg.includes("SOLAPAMIENTO_DOCENTE") ||
        msg.includes("SOLAPAMIENTO_AULA") ||
        msg.includes("SOLAPAMIENTO")
      ) {
        const esDocente =
          msg.includes("SOLAPAMIENTO_DOCENTE") || msg.includes("DOCENTE");
        const detalle = msg
          .replace("SOLAPAMIENTO_DOCENTE: ", "")
          .replace("SOLAPAMIENTO_AULA: ", "")
          .replace("SOLAPAMIENTO: ", "");

        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: esDocente
            ? "¿Superposición de Horario Docente?"
            : "¿Conflicto de Aula Ocupada?",
          mensaje: `${detalle} ¿Desea continuar y guardar los cambios de todas formas?`,
          textoConfirmar: "Sí, guardar igual",
          textoCancelar: "Corregir datos",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((p) => ({ ...p, isOpen: false }));
            await handleGuardar(true);
          },
        });
      } else {
        mostrarAviso(
          "danger",
          "Conflicto",
          msg || "No se pudo procesar la materia.",
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleGuardar(false);
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 flex flex-col cursor-default"
        >
          {/* HEADER DEL MODAL */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {esEdicion
                  ? "Editar Materia / Cátedra"
                  : "Alta de Nueva Materia"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {esEdicion
                  ? "Modifique los parámetros pedagógicos, días, horarios y valores de liquidación."
                  : "Se registrará en el catálogo institucional y en los horarios asignados."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* FORMULARIO */}
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]"
          >
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nombre de la Cátedra / Asignatura *
              </label>
              <input
                required
                placeholder="Ej. Álgebra y Geometría Analítica"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Código (Opcional)
                </label>
                <input
                  placeholder="Ej. MAT-101"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Aula / Laboratorio *
                </label>
                <input
                  required
                  placeholder="Ej. Aula Magna 3"
                  value={form.aula}
                  onChange={(e) => setForm({ ...form, aula: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            </div>

            {/* DÍAS DE DICTADO */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-700">
                  Días de Cursada *
                </span>
                <span className="text-[11px] text-indigo-600 font-medium">
                  {form.diasSemana.length} seleccionados
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {DIAS_OPCIONES.map((d) => {
                  const activo = form.diasSemana.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggleDia(d.id)}
                      className={`py-2 rounded-xl font-bold border transition text-center cursor-pointer ${
                        activo
                          ? "bg-[#4b35e6] text-white border-[#4b35e6] shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[10px]">{d.label.slice(0, 3)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HORARIOS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Hora Inicio *
                </label>
                <input
                  type="time"
                  required
                  value={form.horaInicio}
                  onChange={(e) =>
                    setForm({ ...form, horaInicio: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Hora Fin *
                </label>
                <input
                  type="time"
                  required
                  value={form.horaFin}
                  onChange={(e) =>
                    setForm({ ...form, horaFin: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* DOCENTE A CARGO */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Docente Titular a Cargo *
              </label>
              {loadingDocentes ? (
                <div className="text-slate-400 py-2 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando
                  nómina...
                </div>
              ) : (
                <select
                  required
                  value={form.idDocenteTitular}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      idDocenteTitular: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium bg-white"
                >
                  <option value="">Seleccione docente...</option>
                  {docentes.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.apellido}, {doc.nombre}{" "}
                      {doc.nroLegajo ? `(Leg: ${doc.nroLegajo})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* SECCIÓN FLEXIBLE: TARIFA POR HORA O POR CLASE CON CÁLCULO AUTOMÁTICO */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  Liquidación de Cátedra
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Duración: {duracionHoras.toFixed(1)}h por jornada
                </span>
              </div>

              {/* Selector de modo: Por Hora vs Por Clase */}
              <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTipoIngresoTarifa("HORA")}
                  className={`py-1 text-center font-bold rounded-lg transition cursor-pointer text-[11px] ${
                    tipoIngresoTarifa === "HORA"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tarifa por Hora ($/h)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoIngresoTarifa("CLASE")}
                  className={`py-1 text-center font-bold rounded-lg transition cursor-pointer text-[11px] ${
                    tipoIngresoTarifa === "CLASE"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tarifa por Clase ($ total)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                {/* Input Tarifa por Hora */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                    Valor por Hora Cátedra *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      required
                      disabled={tipoIngresoTarifa === "CLASE"}
                      value={form.tarifaHora}
                      onChange={(e) => handleCambioTarifaHora(e.target.value)}
                      className={`w-full pl-7 pr-3 py-1.5 border rounded-xl font-bold font-mono outline-none ${
                        tipoIngresoTarifa === "HORA"
                          ? "bg-white border-indigo-400 text-indigo-950 focus:border-indigo-600"
                          : "bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed"
                      }`}
                    />
                  </div>
                </div>

                {/* Input Tarifa por Clase */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                    Valor Total por Clase *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      disabled={tipoIngresoTarifa === "HORA"}
                      value={tarifaClaseInput}
                      onChange={(e) => handleCambioTarifaClase(e.target.value)}
                      className={`w-full pl-7 pr-3 py-1.5 border rounded-xl font-bold font-mono outline-none ${
                        tipoIngresoTarifa === "CLASE"
                          ? "bg-white border-indigo-400 text-indigo-950 focus:border-indigo-600"
                          : "bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/60">
                <Calculator className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  {tipoIngresoTarifa === "CLASE"
                    ? `Calculado automáticamente: $${tarifaClaseInput || 0} ÷ ${duracionHoras.toFixed(1)}h = $${form.tarifaHora.toLocaleString("es-AR")}/h`
                    : `Cálculo de liquidación: $${form.tarifaHora.toLocaleString("es-AR")}/h × ${duracionHoras.toFixed(1)}h = $${tarifaClaseInput || 0} por clase`}
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 rounded-xl bg-[#4b35e6] hover:bg-[#3f2bc9] text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {esEdicion ? "Guardar Cambios" : "Crear Materia y Asignar"}
              </button>
            </div>
          </form>
        </div>
      </div>

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
    </>
  );
}
