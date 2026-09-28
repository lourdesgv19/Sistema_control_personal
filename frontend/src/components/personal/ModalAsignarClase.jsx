import React, { useState } from "react";
import { X, Plus, BookOpen, Check } from "lucide-react";
import { createMateria } from "../../services/configuracionService";

export default function ModalAsignarClase({
  isOpen,
  onClose,
  onSubmit,
  formClase,
  setFormClase,
  empleado,
  materiasActivas = [],
  onMateriaCreada,
}) {
  const [creandoNuevaMateria, setCreandoNuevaMateria] = useState(false);
  const [guardandoMateria, setGuardandoMateria] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState("");

  const [formNuevaMateria, setFormNuevaMateria] = useState({
    nombre: "",
    codigo: "",
    aulaPredeterminada: "",
    departamento: "",
  });

  if (!isOpen || !empleado) return null;

  const handleCrearYMateriaRapida = async (e) => {
    e.preventDefault();
    if (!formNuevaMateria.nombre.trim()) {
      setErrorCreacion("El nombre de la materia es obligatorio.");
      return;
    }

    setGuardandoMateria(true);
    setErrorCreacion("");

    try {
      const payload = {
        nombre: formNuevaMateria.nombre.trim(),
        codigo: formNuevaMateria.codigo.trim(),
        aulaPredeterminada: formNuevaMateria.aulaPredeterminada.trim(),
        departamento: formNuevaMateria.departamento.trim() || "General",
        activo: true,
      };

      const materiaGuardada = await createMateria(payload);

      if (onMateriaCreada) {
        await onMateriaCreada(materiaGuardada);
      }

      setFormClase((prev) => ({
        ...prev,
        materiaId: materiaGuardada.id,
        materia: materiaGuardada.nombre,
        aula: materiaGuardada.aulaPredeterminada || prev.aula,
      }));

      setCreandoNuevaMateria(false);
      setFormNuevaMateria({
        nombre: "",
        codigo: "",
        aulaPredeterminada: "",
        departamento: "",
      });
    } catch (err) {
      console.error(err);
      setErrorCreacion("No se pudo registrar la nueva materia.");
    } finally {
      setGuardandoMateria(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="bg-[#6b21a8] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">
              Asignar Clase al Cronograma Docente
            </h3>
            <p className="text-[11px] text-purple-200">
              {empleado.apellido}, {empleado.nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Materia / Cátedra *
              </label>
              <button
                type="button"
                onClick={() => setCreandoNuevaMateria(!creandoNuevaMateria)}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                {creandoNuevaMateria ? "Cerrar creación" : "Nueva Materia"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                required={!creandoNuevaMateria}
                value={formClase.materiaId || ""}
                onChange={(e) => {
                  const idSel = e.target.value;
                  const mat = materiasActivas.find(
                    (m) => String(m.id) === String(idSel),
                  );
                  setFormClase({
                    ...formClase,
                    materiaId: idSel,
                    materia: mat ? mat.nombre : "",
                    aula: mat?.aulaPredeterminada || formClase.aula,
                  });
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-600 bg-white"
              >
                <option value="">Seleccione una cátedra del catálogo...</option>
                {materiasActivas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} {m.codigo ? `[${m.codigo}]` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCreandoNuevaMateria(!creandoNuevaMateria)}
                className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                  creandoNuevaMateria
                    ? "bg-purple-100 border-purple-300 text-purple-700"
                    : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                }`}
                title="Crear materia si no está en la lista"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {creandoNuevaMateria && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Registrar Cátedra en Catálogo</span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Nombre de la Materia / Asignatura *
                </label>
                <input
                  type="text"
                  placeholder="ej. Álgebra Lineal, Física II"
                  value={formNuevaMateria.nombre}
                  onChange={(e) =>
                    setFormNuevaMateria({
                      ...formNuevaMateria,
                      nombre: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Código de Cátedra
                  </label>
                  <input
                    type="text"
                    placeholder="ej. ALG-101"
                    value={formNuevaMateria.codigo}
                    onChange={(e) =>
                      setFormNuevaMateria({
                        ...formNuevaMateria,
                        codigo: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Aula Base
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Aula Magna 2"
                    value={formNuevaMateria.aulaPredeterminada}
                    onChange={(e) =>
                      setFormNuevaMateria({
                        ...formNuevaMateria,
                        aulaPredeterminada: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {errorCreacion && (
                <div className="text-[10px] text-rose-600 font-semibold">
                  {errorCreacion}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreandoNuevaMateria(false)}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-[11px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={guardandoMateria}
                  onClick={handleCrearYMateriaRapida}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  {guardandoMateria ? "Guardando..." : "Guardar y Elegir"}
                </button>
              </div>
            </div>
          )}

          {/* Días de Dictado (Lunes a Sábado) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Días de Dictado (Selección Múltiple) *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
              ].map((dia) => {
                const diasActuales = formClase.diasSemana || [];
                const sel = diasActuales.includes(dia);

                return (
                  <button
                    type="button"
                    key={dia}
                    onClick={() => {
                      const nuevosDias = sel
                        ? diasActuales.filter((d) => d !== dia)
                        : [...diasActuales, dia];
                      setFormClase({
                        ...formClase,
                        diasSemana: nuevosDias,
                      });
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                      sel
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {dia.substring(0, 3)}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Días marcados:{" "}
              {(formClase.diasSemana || []).join(", ") || "Ninguno"}
            </span>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hora Inicio *
              </label>
              <input
                type="time"
                required
                value={formClase.horaInicio}
                onChange={(e) =>
                  setFormClase({ ...formClase, horaInicio: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hora Fin *
              </label>
              <input
                type="time"
                required
                value={formClase.horaFin}
                onChange={(e) =>
                  setFormClase({ ...formClase, horaFin: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Aula */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Aula / Laboratorio (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Aula 102, Laboratorio Informática"
              value={formClase.aula || ""}
              onChange={(e) =>
                setFormClase({ ...formClase, aula: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md cursor-pointer"
            >
              + Asignar al Cronograma
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
