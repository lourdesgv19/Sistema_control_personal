import { getBadgeColorClasses } from "../pages/TiposConfiguracion";

export const DIAS_MAP = [
  { clave: "Lun", nombre: "Lunes", diaNumero: 1 },
  { clave: "Mar", nombre: "Martes", diaNumero: 2 },
  { clave: "Mié", nombre: "Miércoles", diaNumero: 3 },
  { clave: "Jue", nombre: "Jueves", diaNumero: 4 },
  { clave: "Vie", nombre: "Viernes", diaNumero: 5 },
  { clave: "Sáb", nombre: "Sábado", diaNumero: 6 },
  { clave: "Dom", nombre: "Domingo", diaNumero: 7 },
];

export const MAPA_DIAS_NUMERO = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Domingo: 7,
  Lun: 1,
  Mar: 2,
  Mié: 3,
  Jue: 4,
  Vie: 5,
  Sáb: 6,
  Dom: 7,
};

// Estilo de fondo sólido para el botón de categoría activo
export const getPestanaBgClass = (color) => {
  switch (color?.toLowerCase()) {
    case "emerald":
      return "bg-[#10b981] text-white shadow-xs";
    case "amber":
      return "bg-[#f59e0b] text-white shadow-xs";
    case "purple":
      return "bg-[#a855f7] text-white shadow-xs";
    case "cyan":
      return "bg-[#06b6d4] text-white shadow-xs";
    case "rose":
      return "bg-[#f43f5e] text-white shadow-xs";
    case "indigo":
    default:
      return "bg-[#4338ca] text-white shadow-xs";
  }
};

// Punto indicador dentro del badge de la tabla
export const getDotColorClass = (color) => {
  switch (color?.toLowerCase()) {
    case "emerald":
      return "bg-emerald-600";
    case "amber":
      return "bg-amber-600";
    case "purple":
      return "bg-purple-600";
    case "cyan":
      return "bg-cyan-600";
    case "rose":
      return "bg-rose-600";
    case "indigo":
    default:
      return "bg-indigo-600";
  }
};

export { getBadgeColorClasses };
