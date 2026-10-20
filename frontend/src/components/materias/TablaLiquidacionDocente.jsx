import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const MOCK_DOCENTES = [
  {
    id: 1,
    nombre: "María Elena Soto",
    legajo: "DOC-1045",
    materiasCount: 2,
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face",
    clasesSemanales: 5,
    horasProg: 20.0,
    horasDictadas: 20.0,
    desviosFaltas: 0,
    cumplimiento: 100,
    tarifaHora: 6200,
    totalPagar: 126400,
    descuento: 0,
    desgloseMaterias: [
      {
        id: 101,
        nombre: "Física Universitaria I",
        dias: ["Lun", "Mié", "Vie"],
        horario: "08:30 - 12:30",
        aula: "Laboratorio de Física 1",
        horasProg: 12.0,
        horasDictadas: 12.0,
        cumplimiento: 100,
        tarifaHora: 6200,
        totalPagar: 74400,
        descuento: 0,
        desvios: [],
      },
      {
        id: 102,
        nombre: "Física Experimental Aplicada",
        dias: ["Mar", "Jue"],
        horario: "08:30 - 12:30",
        aula: "Laboratorio de Física 2",
        horasProg: 8.0,
        horasDictadas: 8.0,
        cumplimiento: 100,
        tarifaHora: 6200,
        totalPagar: 52000,
        descuento: 0,
        desvios: [],
      },
    ],
  },
  {
    id: 2,
    nombre: "Fernando Rossi",
    legajo: "DOC-1088",
    materiasCount: 2,
    horariosCount: 3,
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    clasesSemanales: 5,
    horasProg: 18.0,
    horasDictadas: 15.2,
    desviosFaltas: 3,
    cumplimiento: 85,
    tarifaHora: 5800,
    totalPagar: 89173,
    descuento: 16627,
    desgloseMaterias: [
      {
        id: 201,
        nombre: "Algoritmos y Estructuras de Datos",
        dias: ["Lun", "Mié"],
        horario: "18:30 - 22:00",
        aula: "Laboratorio de Informática B",
        horasProg: 7.0,
        horasDictadas: 7.0,
        cumplimiento: 100,
        tarifaHora: 5800,
        totalPagar: 40600,
        descuento: 0,
        desvios: [],
      },
      {
        id: 202,
        nombre: "Bases de Datos Relacionales y NoSQL",
        dias: ["Mar", "Jue"],
        horario: "18:30 - 22:00",
        aula: "Laboratorio de Cómputo 1",
        horasProg: 7.0,
        horasDictadas: 4.6,
        cumplimiento: 65,
        tarifaHora: 6000,
        totalPagar: 27500,
        descuento: 14500,
        desvios: [
          "Martes: Salida intermedia durante la clase",
          "Jueves: Salida intermedia durante la clase",
        ],
      },
      {
        id: 203,
        nombre: "Algoritmos y Estructuras de Datos",
        dias: ["Sáb"],
        horario: "09:00 - 13:00",
        aula: "Laboratorio de Informática B",
        horasProg: 4.0,
        horasDictadas: 3.6,
        cumplimiento: 91,
        tarifaHora: 5800,
        totalPagar: 21073,
        descuento: 2127,
        desvios: ["Sábado: Llegada tardía (ingreso 09:22 vs 09:00)"],
      },
    ],
  },
];

function TablaLiquidacionDocente({ datos = MOCK_DOCENTES, onVerFicha }) {
  const [expandidos, setExpandidos] = useState([2]);

  const toggleDocente = (id) => {
    setExpandidos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleDesglosarTodos = () => {
    if (expandidos.length === datos.length) {
      setExpandidos([]);
    } else {
      setExpandidos(datos.map((d) => d.id));
    }
  };

  const exportarCSV = () => {
    let csv =
      "Docente,Legajo,Clases Semanales,Horas Prog,Horas Dictadas,Desvios,Cumplimiento,Tarifa,Total Pagar,Deduccion\n";
    datos.forEach((d) => {
      csv += `"${d.nombre}","${d.legajo}",${d.clasesSemanales},${d.horasProg},${d.horasDictadas},${d.desviosFaltas},"${d.cumplimiento}%",$${d.tarifaHora},$${d.totalPagar},-$${d.descuento}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Planilla_Liquidacion_Docente.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatearDinero = (val) =>
    "$" + Math.round(val).toLocaleString("es-AR");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* HEADER DE LA PLANILLA */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Planilla de Liquidación Docente
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Semana en Curso
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Línea consolidada por docente y desglose individual por materia con
            detalle forense de desvíos biométricos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleDesglosarTodos}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expandidos.length === datos.length ? "rotate-180" : ""
              }`}
            />
            {expandidos.length === datos.length
              ? "Colapsar todas las materias"
              : "Desglosar todas las materias"}
          </button>

          <button
            type="button"
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Exportar Planilla (CSV)
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Docente / Materia</th>
              <th className="py-3 px-4 text-center">Clases Semanales</th>
              <th className="py-3 px-4 text-center">Horas Prog.</th>
              <th className="py-3 px-4 text-center">Horas Dictadas</th>
              <th className="py-3 px-4 text-center">Desvíos / Faltas</th>
              <th className="py-3 px-4 text-center">% Cumplimiento</th>
              <th className="py-3 px-4 text-right">Tarifa / H</th>
              <th className="py-3 px-4 text-right">Total a Pagar</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {datos.map((doc) => {
              const estaExpandido = expandidos.includes(doc.id);

              return (
                <React.Fragment key={doc.id}>
                  {/* FILA CONSOLIDADA DOCENTE */}
                  <tr className="hover:bg-slate-50/70 transition-colors bg-white">
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleDocente(doc.id)}
                        className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1"
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-200 ${
                            estaExpandido ? "rotate-90 text-indigo-600" : ""
                          }`}
                        />
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={doc.avatar}
                          alt={doc.nombre}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            {doc.nombre}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {doc.materiasCount} materias
                              {doc.horariosCount
                                ? ` • ${doc.horariosCount} horarios`
                                : ""}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            Leg. {doc.legajo}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {doc.clasesSemanales} clases
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600 font-mono">
                      {doc.horasProg.toFixed(1)}h
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600 font-mono">
                      {doc.horasDictadas.toFixed(1)}h
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {doc.desviosFaltas === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          100% puntual (Sin desvíos)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          {doc.desviosFaltas} desvíos
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          doc.cumplimiento === 100
                            ? "bg-emerald-100 text-emerald-800"
                            : doc.cumplimiento >= 80
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {doc.cumplimiento}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatearDinero(doc.tarifaHora)}/h
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatearDinero(doc.totalPagar)}
                      </div>
                      {doc.descuento > 0 && (
                        <div className="text-[10px] text-rose-500 font-semibold">
                          Desc: -{formatearDinero(doc.descuento)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleDocente(doc.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                        >
                          {estaExpandido ? "Ocultar" : "Desglosar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onVerFicha && onVerFicha(doc)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
                        >
                          Ficha
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* DESGLOSE EXPANDIDO DE HORARIOS */}
                  {estaExpandido && (
                    <tr className="bg-indigo-50/20">
                      <td
                        colSpan={10}
                        className="p-4 border-t border-b border-indigo-100/60"
                      >
                        <div className="bg-white border border-indigo-100 rounded-xl overflow-hidden shadow-2xs">
                          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-950 flex items-center gap-2">
                              <span className="text-indigo-600 font-bold">
                                ↳
                              </span>
                              DESGLOSE DE HORARIOS POR MATERIA —{" "}
                              {doc.nombre.toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {doc.desgloseMaterias.length} materias / horarios
                              asignados
                            </span>
                          </div>

                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#fcfdfe] text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                              <tr>
                                <th className="py-2.5 px-4">
                                  Materia & Detalle de Horario
                                </th>
                                <th className="py-2.5 px-4 text-center">
                                  Horas Prog.
                                </th>
                                <th className="py-2.5 px-4 text-center">
                                  Horas Dictadas
                                </th>
                                <th className="py-2.5 px-4">Desvíos</th>
                                <th className="py-2.5 px-4 text-center">
                                  % Cumplimiento
                                </th>
                                <th className="py-2.5 px-4 text-right">
                                  Tarifa
                                </th>
                                <th className="py-2.5 px-4 text-right">
                                  Total a Pagar
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {doc.desgloseMaterias.map((mat) => (
                                <tr
                                  key={mat.id}
                                  className="hover:bg-slate-50/60 transition"
                                >
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900">
                                      {mat.nombre}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                      <span className="text-slate-700 font-medium">
                                        Días:
                                      </span>
                                      {mat.dias.map((d) => (
                                        <span
                                          key={d}
                                          className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                      <span>• Horario: {mat.horario} •</span>
                                      <span className="text-slate-400">
                                        {mat.aula}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                                    {mat.horasProg.toFixed(1)}h
                                  </td>

                                  <td className="py-3 px-4 text-center font-bold text-emerald-600 font-mono">
                                    {mat.horasDictadas.toFixed(1)}h
                                  </td>

                                  <td className="py-3 px-4">
                                    {mat.desvios.length === 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Sin desvíos (100% puntual)
                                      </span>
                                    ) : (
                                      <div className="space-y-1">
                                        {mat.desvios.map((desvio, idx) => (
                                          <div
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 block"
                                          >
                                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                            <span>{desvio}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        mat.cumplimiento === 100
                                          ? "bg-emerald-100 text-emerald-800"
                                          : mat.cumplimiento >= 80
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-800"
                                      }`}
                                    >
                                      {mat.cumplimiento}%
                                    </span>
                                  </td>

                                  <td className="py-3 px-4 text-right text-slate-600 font-medium">
                                    {formatearDinero(mat.tarifaHora)}/h
                                  </td>

                                  <td className="py-3 px-4 text-right">
                                    <div className="font-bold text-slate-900">
                                      {formatearDinero(mat.totalPagar)}
                                    </div>
                                    {mat.descuento > 0 && (
                                      <div className="text-[10px] text-rose-500 font-semibold">
                                        Desc: -{formatearDinero(mat.descuento)}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TablaLiquidacionDocente;
