import React, { useState, useEffect } from "react";
import { BookOpen, Users, ShieldCheck } from "lucide-react";

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
        <path
          d="M20 10C20 22 32 28 32 32C32 36 20 42 20 54H44C44 42 32 36 32 32C32 28 44 22 44 10H20Z"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 16H40C39 22 32 26 32 28C32 26 25 22 24 16Z"
          fill="currentColor"
          style={{
            transformOrigin: "32px 28px",
            animation: "arenaSuperior 2.4s ease-in-out infinite",
          }}
        />
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
        <circle
          cx="32"
          cy="32"
          r="22"
          stroke="currentColor"
          strokeWidth="3.2"
        />
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
        <circle cx="32" cy="32" r="2.8" fill="currentColor" />
      </svg>
    </div>
  );
}

/**
 * Envoltorio animado para cualquier componente de ícono (ej. Lucide React).
 * Le aplica un latido/flotación suave y destello para que tenga presencia visual.
 */
function IconoCustomAnimado({
  IconoComponent,
  className = "w-16 h-16 text-indigo-600",
}) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <style>{`
        @keyframes flotarLatirIcono {
          0%, 100% { transform: scale(1) translateY(0px); opacity: 0.85; }
          50% { transform: scale(1.1) translateY(-3px); opacity: 1; }
        }
      `}</style>
      <div
        className="relative flex items-center justify-center"
        style={{ animation: "flotarLatirIcono 1.6s ease-in-out infinite" }}
      >
        <IconoComponent className={className} strokeWidth={1.8} />
      </div>
    </div>
  );
}

const ICONOS_LUCIDE_POR_NOMBRE = {
  libro: BookOpen,
  materias: BookOpen,
  usuarios: Users,
  personal: Users,
  escudo: ShieldCheck,
  seguridad: ShieldCheck,
};

/**
 * Componente reutilizable de estado de carga con transiciones suaves de entrada y salida.
 *
 * @param {boolean} cargando - Controla si el componente debe mostrarse.
 * @param {string} titulo - Título principal del aviso de carga (usado en 'modal', 'inline' y 'overlay').
 * @param {string|React.ReactNode} descripcion - Texto descriptivo o detalle del proceso.
 * @param {'relojArena' | 'calendario' | 'escaner' | 'reloj' | 'libro' | 'usuarios' | 'escudo'} tipoIcono - Nombre del ícono animado a mostrar (por defecto 'relojArena').
 * @param {React.ComponentType} icono - Componente de ícono personalizado opcional (ej: `icono={ShieldCheck}`). Tiene prioridad sobre `tipoIcono`.
 * @param {'modal' | 'flotante' | 'inline' | 'overlay'} variante - Estilo de presentación.
 */
export default function EstadoCarga({
  cargando = false,
  titulo = "Cargando...",
  descripcion = "",
  tipoIcono = "relojArena",
  icono = null,
  variante = "modal",
}) {
  const [debeRenderizar, setDebeRenderizar] = useState(cargando);
  const [activoVisual, setActivoVisual] = useState(false);

  useEffect(() => {
    let timerSalida;
    let rafEntrada;

    if (cargando) {
      setDebeRenderizar(true);
      rafEntrada = requestAnimationFrame(() => {
        setActivoVisual(true);
      });
    } else {
      setActivoVisual(false);
      timerSalida = setTimeout(() => {
        setDebeRenderizar(false);
      }, 250);
    }

    return () => {
      if (timerSalida) clearTimeout(timerSalida);
      if (rafEntrada) cancelAnimationFrame(rafEntrada);
    };
  }, [cargando]);

  if (!debeRenderizar) return null;

  const renderIcono = (sizeClass) => {
    const colorClass = `${sizeClass} text-indigo-600`;

    // 1. Si se pasó un componente directo por la prop `icono` (ej: icono={ShieldCheck})
    if (icono) {
      return (
        <IconoCustomAnimado IconoComponent={icono} className={colorClass} />
      );
    }

    // 2. Si `tipoIcono` coincide con un alias de Lucide ('libro', 'usuarios', 'escudo', etc.)
    const claveNormalizada = String(tipoIcono || "").toLowerCase();
    if (ICONOS_LUCIDE_POR_NOMBRE[claveNormalizada]) {
      return (
        <IconoCustomAnimado
          IconoComponent={ICONOS_LUCIDE_POR_NOMBRE[claveNormalizada]}
          className={colorClass}
        />
      );
    }

    // 3. SVGs animados nativos del sistema
    switch (tipoIcono) {
      case "calendario":
        return <IconoCalendarioAnimado className={colorClass} />;
      case "escaner":
        return <IconoEscanerAnimado className={colorClass} />;
      case "reloj":
        return <IconoRelojAnalogoAnimado className={colorClass} />;
      case "relojArena":
      default:
        return <IconoRelojArenaAnimado className={colorClass} />;
    }
  };

  // 1. Variante 'flotante': Solo el ícono grande centrado sin recuadro blanco (ideal para cargas cortas)
  if (variante === "flotante") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[1.5px] flex items-center justify-center p-4 select-none transition-opacity duration-250 ease-out ${
          activoVisual ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`transform transition-all duration-250 ease-out drop-shadow-md ${
            activoVisual ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          {renderIcono("w-16 h-16")}
        </div>
      </div>
    );
  }

  // 2. Variante 'inline': Centrado dentro de tablas o contenedores
  if (variante === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex flex-col items-center justify-center py-10 px-4 text-center space-y-2.5 transition-all duration-250 ease-out ${
          activoVisual ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
      >
        {renderIcono("w-12 h-12")}
        {titulo && (
          <div className="text-xs font-bold text-slate-700">{titulo}</div>
        )}
        {descripcion && (
          <p className="text-[11px] text-slate-500 max-w-md">{descripcion}</p>
        )}
      </div>
    );
  }

  // 3. Variante 'overlay': Cubre un contenedor padre con `relative`
  if (variante === "overlay") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`absolute inset-0 z-30 bg-white/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2.5 transition-opacity duration-250 ease-out ${
          activoVisual ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`flex flex-col items-center space-y-2 transform transition-all duration-250 ease-out ${
            activoVisual ? "scale-100" : "scale-95"
          }`}
        >
          {renderIcono("w-14 h-14")}
          {titulo && (
            <div className="text-xs font-black text-indigo-950 uppercase tracking-wide">
              {titulo}
            </div>
          )}
          {descripcion && (
            <p className="text-[11px] text-slate-600 mt-0.5 max-w-sm">
              {descripcion}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 4. Variante por defecto 'modal': Recuadro cuadrado blanco centrado con fondo traslúcido
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 select-none transition-opacity duration-250 ease-out ${
        activoVisual ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-64 min-h-60 p-6 flex flex-col items-center justify-center text-center space-y-4 transform transition-all duration-250 ease-out ${
          activoVisual ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
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
