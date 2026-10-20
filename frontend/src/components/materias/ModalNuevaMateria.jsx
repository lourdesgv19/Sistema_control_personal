import React, { useState, useEffect } from "react";
import { X, Clock, Users, Loader2 } from "lucide-react";
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

export default function ModalNuevaMateria({ onClose, onCreado }) {
  const [docentes, setDocentes] = useState([]);
  const [loadingDocentes, setLoadingDocentes] = useState(true);
  const [guardando, setGuardando] = useState(false);

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

  useEffect(() => {
    const cargarDocentes = async () => {
      try {
        const data = await getEmpleadosActivos();
        const lista = Array.isArray(data) ? data : [];
        setDocentes(lista);
        if (lista.length > 0) {
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
  }, []);

  const toggleDia = (id) => {
    setForm((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(id)
        ? prev.diasSemana.filter((d) => d !== id)
        : [...prev.diasSemana, id].sort((a, b) => a - b),
    }));
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
      const payload = {
        ...form,
        forzarGuardado: forzar,
      };

      await postNuevaMateria(payload);
      onCreado();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "";

      // Intercepción del solapamiento de persona o de aula
      if (
        msg.includes("SOLAPAMIENTO_DOCENTE") ||
        msg.includes("SOLAPAMIENTO_AULA")
      ) {
        const esDocente = msg.includes("SOLAPAMIENTO_DOCENTE");
        const detalle = msg
          .replace("SOLAPAMIENTO_DOCENTE: ", "")
          .replace("SOLAPAMIENTO_AULA: ", "");

        setModalAlerta({
          isOpen: true,
          tipo: "warning",
          titulo: esDocente
            ? "¿Superposición de Horario Docente?"
            : "¿Conflicto de Aula Ocupada?",
          mensaje: `${detalle} ¿Desea registrar la materia y asignarla de todas formas?`,
          textoConfirmar: "Sí, asignar igual",
          textoCancelar: "Corregir datos",
          mostrarCancelar: true,
          onConfirmar: async () => {
            setModalAlerta((p) => ({ ...p, isOpen: false }));
            await handleGuardar(true); // Reintento forzado
          },
        });
      } else {
        mostrarAviso(
          "danger",
          "Conflicto",
          msg || "No se pudo crear la materia.",
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Alta de Nueva Materia & Asignación
              </h3>
              <p className="text-[11px] text-slate-400">
                Se registrará en el catálogo y en la tabla de horarios de la
                persona.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
                  Aula / Laboratorio (Control de conflicto) *
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Docente a Cargo *
                </label>
                {loadingDocentes ? (
                  <div className="text-slate-400 py-2 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
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
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tarifa Cátedra ($/hora) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={form.tarifaHora}
                  onChange={(e) =>
                    setForm({ ...form, tarifaHora: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-bold"
                />
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
                Crear Materia y Asignar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Alerta Reutilizado */}
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
