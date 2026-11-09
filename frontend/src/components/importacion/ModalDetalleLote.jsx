import React, { useState, useMemo } from "react";
import { FileText, X, Loader2 } from "lucide-react";
import PaginadorTabla from "../comunes/PaginadorTabla";
import {
  formatearFechaVisual,
  formatearHora24,
} from "../../utils/fechasFichaUtils";

const ITEMS_POR_PAGINA = 15;

export default function ModalDetalleLote({
  isOpen,
  item,
  fichajesLote = [],
  cargando = false,
  filtroFecha,
  setFiltroFecha,
  filtroNombre,
  setFiltroNombre,
  onClose,
}) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(fichajesLote.length / ITEMS_POR_PAGINA),
  );
  const fichajesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    return fichajesLote.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [fichajesLote, pagina]);

  if (!isOpen || !item) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 cursor-default flex flex-col max-h-[92vh]"
      >
        <div className="bg-[#111827] px-4 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="truncate">
              Detalle del Lote: {item.nombreArchivo}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Fecha Carga
              </span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">
                {formatearFechaVisual(item.fechaImportacion)},{" "}
                {formatearHora24(item.fechaImportacion)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Total Marcaciones
              </span>
              <span className="font-bold text-indigo-700 text-xs sm:text-sm">
                {item.totalFilas}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Guardadas Válidas
              </span>
              <span className="font-bold text-emerald-600 text-xs sm:text-sm">
                {item.procesadasOk}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Nulos Omitidos
              </span>
              <span className="font-bold text-amber-600 text-xs sm:text-sm">
                {item.registrosNulos || 0}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h4 className="font-bold text-slate-800">
                Marcaciones en este Lote:
              </h4>
              <span className="text-[11px] text-slate-500">
                Total {fichajesLote.length} marcaciones encontradas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => {
                  setFiltroFecha(e.target.value);
                  setPagina(1);
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white"
              />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={filtroNombre}
                onChange={(e) => {
                  setFiltroNombre(e.target.value);
                  setPagina(1);
                }}
                className="pl-3 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase sticky top-0 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Serial</th>
                  <th className="py-2.5 px-3">ID Biométrico</th>
                  <th className="py-2.5 px-3">Nombre Reloj</th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-1" />
                      Consultando marcaciones del lote...
                    </td>
                  </tr>
                ) : fichajesPaginados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-8 text-slate-400 italic"
                    >
                      No se encontraron marcaciones para este lote con los
                      filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  fichajesPaginados.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {f.serialNo || "-"}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600">
                        {f.idBiometrico}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {f.nombreReloj || "-"}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono font-medium">
                        {formatearFechaVisual(f.horaFichaje)},{" "}
                        {formatearHora24(f.horaFichaje)}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-indigo-600">
                        {f.tipoEvento}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <PaginadorTabla
              paginaActual={pagina}
              totalPaginas={totalPaginas}
              totalElementos={fichajesLote.length}
              onCambiarPagina={(pag) => setPagina(pag)}
              etiqueta="filas"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium cursor-pointer transition text-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
