import React, { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import MultiSelectDropdown from "../comunes/MultiSelectDropdown";

// Algoritmo de distancia de Levenshtein optimizado en memoria O(M)
function calcularSimilitudOptimizada(s1 = "", s2 = "") {
  const a = s1.trim().toLowerCase();
  const b = s2.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;

  // Descarte rápido por diferencia de longitud
  if (Math.abs(a.length - b.length) > 4 && !a.includes(b) && !b.includes(a)) {
    return 0;
  }

  const lenA = a.length;
  const lenB = b.length;
  let prev = new Array(lenB + 1);
  let curr = new Array(lenB + 1);

  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + costo);
    }
    [prev, curr] = [curr, prev];
  }

  const distancia = prev[lenB];
  return 1 - distancia / Math.max(lenA, lenB);
}

export default function ModalRegistroEmpleado({
  isOpen,
  onClose,
  onSubmit,
  formEmpleado,
  setFormEmpleado,
  editandoEmpleadoId,
  categoriasActivas = [],
  cargosFiltradosForm = [],
  empleadosExistentes = [],
}) {
  if (!isOpen) return null;

  // Estado con debounce para no sobrecargar el hilo de render al escribir
  const [textoDebounced, setTextoDebounced] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setTextoDebounced(
        `${formEmpleado.nombre || ""} ${formEmpleado.apellido || ""}`
          .trim()
          .toLowerCase(),
      );
    }, 250);

    return () => clearTimeout(handler);
  }, [formEmpleado.nombre, formEmpleado.apellido]);

  // Detección de duplicados o nombres similares
  const coincidenciasSimilares = useMemo(() => {
    if (textoDebounced.length < 3) return [];

    return empleadosExistentes
      .filter((emp) => String(emp.id) !== String(editandoEmpleadoId))
      .map((emp) => {
        const nombreEmp = `${emp.nombre || ""} ${emp.apellido || ""}`
          .trim()
          .toLowerCase();
        const similitud = calcularSimilitudOptimizada(
          textoDebounced,
          nombreEmp,
        );
        const contiene =
          nombreEmp.includes(textoDebounced) ||
          textoDebounced.includes(nombreEmp);

        return {
          emp,
          similitud,
          esExacto: textoDebounced === nombreEmp,
          esParecido: similitud >= 0.75 || contiene,
        };
      })
      .filter((item) => item.esExacto || item.esParecido);
  }, [textoDebounced, empleadosExistentes, editandoEmpleadoId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 font-sans">
        <div className="bg-[#111827] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">
              {editandoEmpleadoId
                ? "Editar Empleado"
                : "Registrar Nuevo Empleado"}
            </h3>
            <p className="text-[11px] text-slate-400">
              Nombre y apellido son obligatorios. El resto de datos puede
              completarse posteriormente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          {/* ADVERTENCIA DE NOMBRES DUPLICADOS O MUY PARECIDOS */}
          {coincidenciasSimilares.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Advertencia: Se detectaron empleados con nombres coincidentes
                  o similares
                </span>
              </div>
              <ul className="text-[11px] text-amber-900 space-y-1 pl-6 list-disc">
                {coincidenciasSimilares.map(({ emp, esExacto }) => (
                  <li key={emp.id}>
                    <strong className="font-semibold">
                      {emp.apellido}, {emp.nombre}
                    </strong>{" "}
                    (Legajo: {emp.nroLegajo || "Sin legajo"} | DNI:{" "}
                    {emp.dni || "Sin DNI"})
                    {esExacto && (
                      <span className="ml-1 text-rose-600 font-bold">
                        — ¡Nombre idéntico!
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 italic pt-0.5">
                Compruebe si no se trata de la misma persona antes de crear un
                nuevo registro.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos"
                value={formEmpleado.nombre}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, nombre: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Benítez"
                value={formEmpleado.apellido}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, apellido: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                DNI / Documento (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 28455912"
                value={formEmpleado.dni || ""}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, dni: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="carlos.benitez@instituto.edu.ar"
                value={formEmpleado.email || ""}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, email: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                placeholder="+54 11 4821-9901"
                value={formEmpleado.telefono || ""}
                onChange={(e) =>
                  setFormEmpleado({ ...formEmpleado, telefono: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nº Legajo (Opcional)
              </label>
              <input
                type="text"
                placeholder="001 o LEG-001"
                value={formEmpleado.nroLegajo || ""}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    nroLegajo: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ID Biométrico (Reloj)
              </label>
              <input
                type="text"
                placeholder="19"
                value={formEmpleado.idBiometrico || ""}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    idBiometrico: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <MultiSelectDropdown
              label="Categorías Laborales"
              placeholder="Seleccionar categorías..."
              options={categoriasActivas}
              selectedIds={formEmpleado.categoriasIds || []}
              onChange={(newIds) =>
                setFormEmpleado({ ...formEmpleado, categoriasIds: newIds })
              }
            />
          </div>

          <MultiSelectDropdown
            label="Cargos / Puestos Asignados"
            placeholder="Seleccionar cargos asignados..."
            options={cargosFiltradosForm}
            selectedIds={formEmpleado.cargosIds || []}
            onChange={(newIds) =>
              setFormEmpleado({ ...formEmpleado, cargosIds: newIds })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tolerancia Ingreso (min)
              </label>
              <input
                type="number"
                value={formEmpleado.toleranciaIngresoMin}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    toleranciaIngresoMin: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tolerancia Salida (min)
              </label>
              <input
                type="number"
                value={formEmpleado.toleranciaEgresoMin}
                onChange={(e) =>
                  setFormEmpleado({
                    ...formEmpleado,
                    toleranciaEgresoMin: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
              />
            </div>
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
              className="px-5 py-2 font-semibold text-white bg-[#4b35e6] hover:bg-[#3e2bc0] rounded-xl shadow-md cursor-pointer"
            >
              {editandoEmpleadoId ? "Guardar Cambios" : "Registrar Empleado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
