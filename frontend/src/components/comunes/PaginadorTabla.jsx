import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginadorTabla({
  paginaActual,
  totalPaginas,
  totalElementos,
  itemsPorPagina = 15,
  onCambiarPagina,
  etiqueta = "registros",
}) {
  if (totalElementos === 0) {
    return (
      <div className="bg-white px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Mostrando 0 de 0 {etiqueta}</span>
      </div>
    );
  }

  const inicio = (paginaActual - 1) * itemsPorPagina + 1;
  const fin = Math.min(paginaActual * itemsPorPagina, totalElementos);

  return (
    <div className="bg-white px-4 sm:px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="text-slate-500 text-center sm:text-left">
        Mostrando <span className="font-bold text-slate-800">{inicio}</span> a{" "}
        <span className="font-bold text-slate-800">{fin}</span> de{" "}
        <span className="font-bold text-slate-800">{totalElementos}</span>{" "}
        {etiqueta}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onCambiarPagina(paginaActual - 1)}
          disabled={paginaActual <= 1}
          className="p-1.5 sm:p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .filter((num) => {
            if (totalPaginas <= 7) return true;
            return (
              num === 1 ||
              num === totalPaginas ||
              (num >= paginaActual - 1 && num <= paginaActual + 1)
            );
          })
          .map((num, idx, arr) => {
            const prev = arr[idx - 1];
            const mostrarPuntos = prev && num - prev > 1;
            return (
              <React.Fragment key={num}>
                {mostrarPuntos && (
                  <span className="px-1 text-slate-400 font-bold">...</span>
                )}
                <button
                  type="button"
                  onClick={() => onCambiarPagina(num)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold transition cursor-pointer text-xs ${
                    paginaActual === num
                      ? "bg-[#4b35e6] text-white shadow-xs"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {num}
                </button>
              </React.Fragment>
            );
          })}

        <button
          type="button"
          onClick={() => onCambiarPagina(paginaActual + 1)}
          disabled={paginaActual >= totalPaginas}
          className="p-1.5 sm:p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          title="Página Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
