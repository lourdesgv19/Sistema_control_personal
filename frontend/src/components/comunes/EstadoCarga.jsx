import React from "react";

/**
 * Opción 1: Reloj de arena donde cae la arena y gira 180° al completarse.
 */
function IconoRelojArenaAnimado({ className = "w-16 h-16 text-indigo-600" }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <style>{`
        @keyframes girarRelojArena {
          0%, 65% { transform: rotate(0deg); }
          85%, 100% { transform: rotate(180deg); }
        }
        @keyframes arenaSuperior {
          0% { transform: scaleY(1); opacity: 0.9; }
          65%, 100% { transform: scaleY(0.15); opacity: 0.25; }
        }
        @keyframes arenaInferior {
          0% { transform: scaleY(0.15); opacity: 0.25; }
          65%, 100% { transform: scaleY(1); opacity: 0.95; }
        }
        @keyframes hiloArena {
          0%, 5% { opacity: 0; }
          15%, 60% { opacity: 1; }
          68%, 100% { opacity: 0; }
        }
      `}</style>

      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ animation: "girarRelojArena 2.4s ease-in-out infinite" }}
      >
        {/* Tapas superior e inferior */}
        <line
          x1="16"
          y1="10"
          x2="48"
          y2="10"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="54"
          x2="48"
          y2="54"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Cristal del reloj de arena */}
        <path
          d="M20 10C20 22 32 28 32 32C32 36 20 42 20 54H44C44 42 32 36 32 32C32 28 44 22 44 10H20Z"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Arena superior vaciándose */}
        <path
          d="M24 16H40C39 22 32 26 32 28C32 26 25 22 24 16Z"
          fill="currentColor"
          style={{
            transformOrigin: "32px 28px",
            animation: "arenaSuperior 2.4s ease-in-out infinite",
          }}
        />

        {/* Hilo fino de arena cayendo */}
        <line
          x1="32"
          y1="32"
          x2="32"
          y2="48"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 3"
          style={{ animation: "hiloArena 2.4s linear infinite" }}
        />

        {/* Arena inferior llenándose */}
        <path
          d="M23 50H41C40 44 34 41 32 41C30 41 24 44 23 50Z"
          fill="currentColor"
          style={{
            transformOrigin: "32px 50px",
            animation: "arenaInferior 2.4s ease-in-out infinite",
          }}
        />
      </svg>
    </div>
  );
}

/**
 * Opción 2: Calendario donde se van marcando los días en secuencia.
 */
function IconoCalendarioAnimado({ className = "w-16 h-16 text-indigo-600" }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <style>{`
        @keyframes pulsoCalendario {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes celda1 { 0%, 15% { opacity: 0.2; } 25%, 85% { opacity: 1; } 100% { opacity: 0.2; } }
        @keyframes celda2 { 0%, 30% { opacity: 0.2; } 40%, 85% { opacity: 1; } 100% { opacity: 0.2; } }
        @keyframes celda3 { 0%, 45% { opacity: 0.2; } 55%, 85% { opacity: 1; } 100% { opacity: 0.2; } }
        @keyframes celda4 { 0%, 60% { opacity: 0.2; } 70%, 85% { opacity: 1; } 100% { opacity: 0.2; } }
      `}</style>

      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ animation: "pulsoCalendario 2s ease-in-out infinite" }}
      >
        <rect
          x="10"
          y="14"
          width="44"
          height="40"
          rx="7"
          stroke="currentColor"
          strokeWidth="3.2"
        />
        <line
          x1="10"
          y1="25"
          x2="54"
          y2="25"
          stroke="currentColor"
          strokeWidth="3"
        />
        <line
          x1="22"
          y1="9"
          x2="22"
          y2="18"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <line
          x1="42"
          y1="9"
          x2="42"
          y2="18"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        <rect
          x="18"
          y="31"
          width="7"
          height="6"
          rx="1.5"
          fill="currentColor"
          style={{ animation: "celda1 1.8s infinite" }}
        />
        <rect
          x="28.5"
          y="31"
          width="7"
          height="6"
          rx="1.5"
          fill="currentColor"
          style={{ animation: "celda2 1.8s infinite" }}
        />
        <rect
          x="39"
          y="31"
          width="7"
          height="6"
          rx="1.5"
          fill="currentColor"
          style={{ animation: "celda3 1.8s infinite" }}
        />
        <rect
          x="18"
          y="41"
          width="7"
          height="6"
          rx="1.5"
          fill="currentColor"
          style={{ animation: "celda4 1.8s infinite" }}
        />
        <rect
          x="28.5"
          y="41"
          width="7"
          height="6"
          rx="1.5"
          fill="currentColor"
          opacity="0.25"
        />
      </svg>
    </div>
  );
}

/**
 * Opción 3: Escáner biométrico de pulso con haz horizontal subiendo y bajando.
 */
function IconoEscanerAnimado({ className = "w-16 h-16 text-indigo-600" }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <style>{`
        @keyframes barridoEscaner {
          0%, 100% { transform: translateY(-16px); opacity: 0.4; }
          50% { transform: translateY(16px); opacity: 1; }
        }
        @keyframes pulsoHuella {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
      `}</style>

      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Esquinas del visor de escaneo */}
        <path
          d="M12 22V15C12 13.3431 13.3431 12 15 12H22"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M42 12H49C50.6569 12 52 13.3431 52 15V22"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M52 42V49C52 50.6569 50.6569 52 49 52H42"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M22 52H15C13.3431 52 12 50.6569 12 49V42"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Arcos biométricos centrales */}
        <g style={{ animation: "pulsoHuella 1.8s ease-in-out infinite" }}>
          <path
            d="M22 34C22 28.4772 26.4772 24 32 24C37.5228 24 42 28.4772 42 34"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M26 38V34C26 30.6863 28.6863 28 32 28C35.3137 28 38 30.6863 38 34V38"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <line
            x1="32"
            y1="32"
            x2="32"
            y2="42"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </g>

        {/* Línea láser de escaneo subiendo y bajando */}
        <line
          x1="14"
          y1="32"
          x2="50"
          y2="32"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ animation: "barridoEscaner 1.8s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}

/**
 * Opción 4: Reloj analógico minimalista con manecillas girando en sentido horario.
 */
function IconoRelojAnalogoAnimado({ className = "w-16 h-16 text-indigo-600" }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <style>{`
        @keyframes agujaMinutera {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes agujaHoraria {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Esfera exterior */}
        <circle
          cx="32"
          cy="32"
          r="22"
          stroke="currentColor"
          strokeWidth="3.2"
        />

        {/* Marcas cardinales sutiles */}
        <line
          x1="32"
          y1="14"
          x2="32"
          y2="17"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="32"
          x2="47"
          y2="32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="32"
          y1="50"
          x2="32"
          y2="47"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="14"
          y1="32"
          x2="17"
          y2="32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Aguja horaria (lenta) */}
        <line
          x1="32"
          y1="32"
          x2="41"
          y2="32"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          style={{
            transformOrigin: "32px 32px",
            animation: "agujaHoraria 6s linear infinite",
          }}
        />

        {/* Aguja minutera (rápida en sentido horario) */}
        <line
          x1="32"
          y1="32"
          x2="32"
          y2="18"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transformOrigin: "32px 32px",
            animation: "agujaMinutera 1.2s linear infinite",
          }}
        />

        {/* Punto central */}
        <circle cx="32" cy="32" r="2.8" fill="currentColor" />
      </svg>
    </div>
  );
}

/**
 * Componente reutilizable de estado de carga.
 *
 * @param {boolean} cargando - Controla si el componente se muestra o no.
 * @param {string} titulo - Título principal del aviso de carga.
 * @param {string|React.ReactNode} descripcion - Texto descriptivo o detalle del proceso.
 * @param {'relojArena' | 'calendario' | 'escaner' | 'reloj'} tipoIcono - Ícono animado a mostrar (por defecto 'relojArena').
 * @param {'modal' | 'inline' | 'overlay'} variante - Estilo de presentación ('modal' | 'inline' | 'overlay').
 */
export default function EstadoCarga({
  cargando = false,
  titulo = "Cargando...",
  descripcion = "",
  tipoIcono = "relojArena",
  variante = "modal",
}) {
  if (!cargando) return null;

  const renderIcono = (sizeClass) => {
    const props = { className: `${sizeClass} text-indigo-600` };
    switch (tipoIcono) {
      case "calendario":
        return <IconoCalendarioAnimado {...props} />;
      case "escaner":
        return <IconoEscanerAnimado {...props} />;
      case "reloj":
        return <IconoRelojAnalogoAnimado {...props} />;
      case "relojArena":
      default:
        return <IconoRelojArenaAnimado {...props} />;
    }
  };

  if (variante === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2.5 animate-fadeIn"
      >
        {renderIcono("w-12 h-12")}
        <div className="text-xs font-bold text-slate-700">{titulo}</div>
        {descripcion && (
          <p className="text-[11px] text-slate-500 max-w-md">{descripcion}</p>
        )}
      </div>
    );
  }

  if (variante === "overlay") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-30 bg-white/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2.5 animate-fadeIn"
      >
        {renderIcono("w-14 h-14")}
        <div>
          <div className="text-xs font-black text-indigo-950 uppercase tracking-wide">
            {titulo}
          </div>
          {descripcion && (
            <p className="text-[11px] text-slate-600 mt-0.5 max-w-sm">
              {descripcion}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Variante por defecto: 'modal' (cuadrado centrado con fondo traslúcido)
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-64 min-h-60 p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-center py-1">
          {renderIcono("w-16 h-16")}
        </div>

        <div className="space-y-1.5">
          <h4 className="text-sm font-black text-slate-900 leading-snug">
            {titulo}
          </h4>
          {descripcion && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {descripcion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
