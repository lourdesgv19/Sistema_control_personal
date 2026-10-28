import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock,
  Users,
  Loader2,
  DollarSign,
  Calculator,
  UserCheck,
  CalendarCheck,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { postNuevaMateria } from "../../services/gestionMateriasService";
import { getEmpleadosActivos } from "../../services/empleadoService";
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

  const [todosLosEmpleados, setTodosLosEmpleados] = useState([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [mostrarTodosLosEmpleados, setMostrarTodosLosEmpleados] =
    useState(false);
  const [guardando, setGuardando] = useState(false);

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
    idDocenteAuxiliar: "",
    tarifaHora: 5200,
    observaciones: "",
    forzarGuardado: false,
    tipoFrecuencia: "SEMANAL",
    repeticionesPeriodo: 1,
    semanaAlterna: "PAR",
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

  const duracionHoras = useMemo(() => {
    if (!form.horaInicio || !form.horaFin) return 1;
    const [hIni, mIni] = form.horaInicio.split(":").map(Number);
    const [hFin, mFin] = form.horaFin.split(":").map(Number);
    const minTotales = hFin * 60 + mFin - (hIni * 60 + mIni);
    return minTotales > 0 ? minTotales / 60 : 1;
  }, [form.horaInicio, form.horaFin]);

  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        const data = await getEmpleadosActivos();
        setTodosLosEmpleados(Array.isArray(data) ? data : []);
      } catch (e) {
        mostrarAviso(
          "danger",
          "Error",
          "No se pudo cargar la lista de personal.",
        );
      } finally {
        setLoadingEmpleados(false);
      }
    };
    cargarEmpleados();
  }, []);

  const listaEmpleadosFiltrada = useMemo(() => {
    if (mostrarTodosLosEmpleados) return todosLosEmpleados;
    return todosLosEmpleados.filter((emp) => {
      const enCategorias = (emp.categorias || []).some((c) =>
        (c.nombre || c.codigoTag || "").toLowerCase().includes("docente"),
      );
      const enCategoriaSimple = (emp.categoria?.nombre || "")
        .toLowerCase()
        .includes("docente");
      return enCategorias || enCategoriaSimple;
    });
  }, [todosLosEmpleados, mostrarTodosLosEmpleados]);

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
          materiaAEditar.idDocenteTitular || materiaAEditar.idDocente || "",
        idDocenteAuxiliar: materiaAEditar.idDocenteAuxiliar || "",
        tarifaHora: tarifaBase,
        observaciones: materiaAEditar.observaciones || "",
        forzarGuardado: false,
        tipoFrecuencia: materiaAEditar.tipoFrecuencia || "SEMANAL",
        repeticionesPeriodo: materiaAEditar.repeticionesPeriodo || 1,
        semanaAlterna: materiaAEditar.semanaAlterna || "PAR",
      });

      setTarifaClaseInput(Math.round(tarifaBase * duracionHoras));
    }
  }, [materiaAEditar, duracionHoras]);

  useEffect(() => {
    if (tipoIngresoTarifa === "HORA") {
      setTarifaClaseInput(Math.round(form.tarifaHora * duracionHoras));
    }
  }, [form.tarifaHora, duracionHoras, tipoIngresoTarifa]);

  const toggleDia = (id) => {
    setForm((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(id)
        ? prev.diasSemana.filter((d) => d !== id)
        : [...prev.diasSemana, id].sort((a, b) => a - b),
    }));
  };

  const handleCambioTarifaHora = (valorHora) => {
    const num = Number(valorHora);
    setForm((prev) => ({ ...prev, tarifaHora: num }));
    setTarifaClaseInput(Math.round(num * duracionHoras));
  };

  const handleCambioTarifaClase = (valorClase) => {
    setTarifaClaseInput(valorClase);
    const numClase = Number(valorClase);
    if (numClase >= 0 && duracionHoras > 0) {
      setForm((prev) => ({
        ...prev,
        tarifaHora: Math.round(numClase / duracionHoras),
      }));
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

    setGuardando(true);
    try {
      const payload = {
        idMateria: materiaAEditar
          ? materiaAEditar.idMateria || materiaAEditar.id
          : null,
        idHorario: materiaAEditar ? materiaAEditar.idHorario : null,
        nombre: form.nombre.trim(),
        codigo: form.codigo ? form.codigo.trim() : null,
        departamento: form.departamento,
        aula: form.aula ? form.aula.trim() : "",
        diasSemana: form.diasSemana || [],
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        idDocenteTitular: form.idDocenteTitular
          ? Number(form.idDocenteTitular)
          : null,
        idDocenteAuxiliar: form.idDocenteAuxiliar
          ? Number(form.idDocenteAuxiliar)
          : null,
        rolTitular: "TITULAR",
        rolAuxiliar: "AUXILIAR",
        tarifaHora: Number(form.tarifaHora || 5200),
        observaciones: form.observaciones,
        forzarGuardado: forzar,
        tipoFrecuencia: form.tipoFrecuencia || "SEMANAL",
        repeticionesPeriodo:
          form.tipoFrecuencia === "MENSUAL" || form.tipoFrecuencia === "ANUAL"
            ? parseInt(form.repeticionesPeriodo, 10) || 1
            : 1,
        semanaAlterna:
          form.tipoFrecuencia === "SEMANA_POR_MEDIO"
            ? form.semanaAlterna || "PAR"
            : null,
      };

      await postNuevaMateria(payload);
      window.dispatchEvent(new CustomEvent("datos:actualizados"));
      onCreado();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "";

      if (
        msg.includes("SOLAPAMIENTO_DOCENTE") ||
        msg.includes("SOLAPAMIENTO_AULA") ||
        msg.includes("SOLAPAMIENTO")
      ) {
        const esDocente = msg.includes("SOLAPAMIENTO_DOCENTE");
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
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {esEdicion
                  ? "Editar Materia / Cátedra"
                  : "Alta de Nueva Materia"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {esEdicion
                  ? "Modifique parámetros pedagógicos, días, horarios o docentes titular y auxiliar."
                  : "Se registrará en el catálogo y se reflejará en el cronograma institucional."}
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGuardar(false);
            }}
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
                  Aula / Laboratorio
                </label>
                <input
                  placeholder="Ej. Aula Magna 3"
                  value={form.aula}
                  onChange={(e) => setForm({ ...form, aula: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-slate-700">
                  Días de Cursada
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Hora Inicio
                </label>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) =>
                    setForm({ ...form, horaInicio: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Hora Fin
                </label>
                <input
                  type="time"
                  value={form.horaFin}
                  onChange={(e) =>
                    setForm({ ...form, horaFin: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* FRECUENCIA DE DICTADO */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  Frecuencia de Dictado
                </label>
                <span className="text-[10px] text-slate-400">Periodicidad</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "SEMANAL", label: "Todas las semanas" },
                  { id: "SEMANA_POR_MEDIO", label: "Semana por medio" },
                  { id: "MENSUAL", label: "Veces al mes" },
                  { id: "ANUAL", label: "Veces al año" },
                ].map((frec) => (
                  <button
                    key={frec.id}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, tipoFrecuencia: frec.id })
                    }
                    className={`px-2.5 py-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                      form.tipoFrecuencia === frec.id
                        ? "bg-[#4b35e6] text-white border-[#4b35e6] shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {frec.label}
                  </button>
                ))}
              </div>

              {form.tipoFrecuencia === "SEMANA_POR_MEDIO" && (
                <div className="flex items-center gap-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mt-2 text-xs">
                  <span className="text-slate-700 font-medium">Rotación:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="materiaSemanaAlterna"
                      value="PAR"
                      checked={form.semanaAlterna === "PAR"}
                      onChange={(e) =>
                        setForm({ ...form, semanaAlterna: e.target.value })
                      }
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Semanas Pares
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="materiaSemanaAlterna"
                      value="IMPAR"
                      checked={form.semanaAlterna === "IMPAR"}
                      onChange={(e) =>
                        setForm({ ...form, semanaAlterna: e.target.value })
                      }
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Semanas Impares
                  </label>
                </div>
              )}
            </div>

            {/* ASIGNACIÓN DE DOCENTES (TITULAR Y AUXILIAR/ALTERNO) */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Equipo Docente de Cátedra
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMostrarTodosLosEmpleados(!mostrarTodosLosEmpleados)
                  }
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  {mostrarTodosLosEmpleados
                    ? "Mostrar solo docentes"
                    : "+ Ver todo el personal"}
                </button>
              </div>

              {loadingEmpleados ? (
                <div className="text-slate-400 py-2 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando
                  nómina...
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Docente Titular */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Profesor Titular a Cargo
                    </label>
                    <select
                      value={form.idDocenteTitular}
                      onChange={(e) =>
                        setForm({ ...form, idDocenteTitular: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium bg-white"
                    >
                      <option value="">
                        -- Sin titular (Cátedra Vacante) --
                      </option>
                      {listaEmpleadosFiltrada.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.apellido}, {doc.nombre}{" "}
                          {doc.nroLegajo ? `(Leg: ${doc.nroLegajo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Docente Auxiliar / Reemplazante Alterno */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Docente Auxiliar / Alterno (Reemplazos y Licencias)
                    </label>
                    <select
                      value={form.idDocenteAuxiliar}
                      onChange={(e) =>
                        setForm({ ...form, idDocenteAuxiliar: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-medium bg-white"
                    >
                      <option value="">
                        -- Sin auxiliar designado (Opcional) --
                      </option>
                      {listaEmpleadosFiltrada
                        .filter(
                          (doc) =>
                            String(doc.id) !== String(form.idDocenteTitular),
                        )
                        .map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.apellido}, {doc.nombre}{" "}
                            {doc.nroLegajo ? `(Leg: ${doc.nroLegajo})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* TARIFA FLEXIBLE */}
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
                    ? `Calculado: $${tarifaClaseInput || 0} ÷ ${duracionHoras.toFixed(1)}h = $${form.tarifaHora.toLocaleString("es-AR")}/h`
                    : `Cálculo por clase: $${form.tarifaHora.toLocaleString("es-AR")}/h × ${duracionHoras.toFixed(1)}h = $${tarifaClaseInput || 0}`}
                </span>
              </div>
            </div>

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
                {esEdicion ? "Guardar Cambios" : "Guardar Cátedra"}
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
