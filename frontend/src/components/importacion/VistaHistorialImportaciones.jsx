import React from "react";
import {
  Calendar,
  CalendarDays,
  FileText,
  Eye,
  Trash2,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import PaginadorTabla from "../comunes/PaginadorTabla";
import {
  formatearHora24,
  obtenerNombreDia,
  formatearFechaVisual,
} from "../../utils/fechasFichaUtils";

const esRegistroActivo = (activo) =>
  activo === true || activo === 1 || activo === "1";

const StatusBadge = ({ activo }) => {
  const isActivo = esRegistroActivo(activo);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
        isActivo
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isActivo ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      {isActivo ? "Activo" : "Eliminado"}
    </span>
  );
};

export default function VistaHistorialImportaciones({
  historial = [],
  loading = false,
  filtroEstado,
  setFiltroEstado,
  filtroFecha,
  setFiltroFecha,
  pagina,
  totalPaginas,
  totalElementos,
  onCambiarPagina,
  onRecargar,
  onAbrirModalLote,
  onEliminarHistorial,
  onReactivarHistorial,
  puedeEliminarLote = false,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Historial de Importaciones por Fecha
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Auditoría de lotes procesados organizados por fecha y hora de
              carga.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Estado:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-indigo-600 transition shadow-xs cursor-pointer"
              >
                <option value="ACTIVOS">Solo Activos</option>
                <option value="TODOS">Todos los lotes</option>
                <option value="INACTIVOS">Solo Eliminados</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
              />
              {filtroFecha && (
                <button
                  type="button"
                  onClick={() => setFiltroFecha("")}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onRecargar}
              disabled={loading}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Día y Fecha</th>
                <th className="py-3 px-4">Hora Carga</th>
                <th className="py-3 px-4">Archivo / Dispositivo</th>
                <th className="py-3 px-4 text-center">Total</th>
                <th className="py-3 px-4 text-center">Procesadas</th>
                <th className="py-3 px-4 text-center">Nulos</th>
                <th className="py-3 px-4 text-center">Errores</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="text-center py-8 text-slate-400 italic"
                  >
                    {loading
                      ? "Cargando historial..."
                      : "No se registran importaciones con los filtros aplicados."}
                  </td>
                </tr>
              ) : (
                historial.map((h) => {
                  const estaActivo = esRegistroActivo(h.activo);
                  const strIso = String(h.fechaImportacion || "").split("T")[0];
                  const diaNom = obtenerNombreDia(strIso);
                  const diaCapitalizado = diaNom
                    ? diaNom.charAt(0).toUpperCase() + diaNom.slice(1)
                    : "-";

                  return (
                    <tr
                      key={h.id}
                      className={`transition group ${!estaActivo ? "bg-slate-50/75 opacity-75" : "hover:bg-slate-50/60"}`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-800">
                            {diaCapitalizado}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-slate-600">
                            {formatearFechaVisual(strIso)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {formatearHora24(h.fechaImportacion)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <FileText
                            className={`w-3.5 h-3.5 shrink-0 ${estaActivo ? "text-indigo-500" : "text-slate-400"}`}
                          />
                          <span
                            className={
                              !estaActivo ? "line-through text-slate-500" : ""
                            }
                          >
                            {h.nombreArchivo}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {h.totalFilas}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                          {h.procesadasOk}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">
                          {h.registrosNulos || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${h.errores > 0 ? "bg-rose-50 text-rose-700" : "text-slate-400"}`}
                        >
                          {h.errores}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge activo={h.activo} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {h.usuarioResponsable || "Sistema"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-slate-400">
                          <button
                            type="button"
                            onClick={() => onAbrirModalLote(h)}
                            className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Ver filas de la importación"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {puedeEliminarLote &&
                            (estaActivo ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onEliminarHistorial(h.id, h.nombreArchivo)
                                }
                                className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Dar de baja este lote"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onReactivarHistorial(h.id, h.nombreArchivo)
                                }
                                className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Reactivar importación"
                              >
                                <RotateCcw className="w-4 h-4 text-emerald-600" />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
        etiqueta="importaciones"
      />
    </div>
  );
}
