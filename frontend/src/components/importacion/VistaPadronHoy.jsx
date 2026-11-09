import React from "react";
import { ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react";
import PaginadorTabla from "../comunes/PaginadorTabla";
import { formatearHora24 } from "../../utils/fechasFichaUtils";

export default function VistaPadronHoy({
  hoyInfo,
  fechaConsulta,
  setFechaConsulta,
  moverDia,
  hoyIso,
  busqueda,
  setBusqueda,
  fichajes = [],
  cargando = false,
  pagina,
  totalPaginas,
  totalElementos,
  onCambiarPagina,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Padrón de Marcaciones:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                {hoyInfo.textoCompleto}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Total de {totalElementos} marcaciones registradas para esta
              jornada.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => moverDia(-1)}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={fechaConsulta}
                onChange={(e) => setFechaConsulta(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold px-2 outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => moverDia(1)}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {fechaConsulta !== hoyIso && (
              <button
                type="button"
                onClick={() => setFechaConsulta(hoyIso)}
                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer"
              >
                Ir a Hoy
              </button>
            )}

            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar colaborador o ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">ID Biométrico</th>
                <th className="py-3 px-4">Colaborador Vinculado</th>
                <th className="py-3 px-4">Nombre en Reloj</th>
                <th className="py-3 px-4">Tipo Evento</th>
                <th className="py-3 px-4">Serial</th>
                <th className="py-3 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Cargando marcaciones de la jornada...
                  </td>
                </tr>
              ) : fichajes.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-12 text-slate-400 italic"
                  >
                    No se registran fichajes para el {hoyInfo.textoCompleto}.
                  </td>
                </tr>
              ) : (
                fichajes.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800 text-xs">
                      {formatearHora24(f.horaFichaje)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                      {f.idBiometrico}
                    </td>
                    <td className="py-2.5 px-4">
                      {f.empleado ? (
                        <span className="text-slate-800 font-semibold">
                          {f.empleado.nombre} {f.empleado.apellido}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">
                          Sin vincular
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {f.nombreReloj || "-"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-indigo-600 font-medium">
                      {f.tipoEvento}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {f.serialNo || "-"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {f.estadoFichaje}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginadorTabla
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        totalElementos={totalElementos}
        onCambiarPagina={onCambiarPagina}
        etiqueta="fichajes"
      />
    </div>
  );
}
